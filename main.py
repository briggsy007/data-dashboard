import os
import json
import time
import glob as globmod
from pathlib import Path
from datetime import datetime, date

import pandas as pd
import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

load_dotenv()

app = FastAPI(title="Kalshi Intelligence Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Kalshi API helpers ---

KALSHI_BASE = os.getenv("KALSHI_BASE_URL", "https://api.elections.kalshi.com/trade-api/v2")
KALSHI_API_KEY = os.getenv("KALSHI_API_KEY", "")
PRIVATE_KEY_PATH = os.getenv("KALSHI_PRIVATE_KEY_PATH", "")

DATA_ROOT = Path(r"C:\Users\hunte\.openclaw\workspace\polymarket-btc\data")
ECON_ROOT = Path(r"C:\Users\hunte\.openclaw\workspace\kalshi-econ\data")
MODELS_ROOT = Path(r"C:\Users\hunte\.openclaw\workspace\kalshi-econ\models")


def kalshi_headers():
    return {
        "Authorization": f"Bearer {KALSHI_API_KEY}",
        "Content-Type": "application/json",
    }


def get_kalshi_balance():
    try:
        r = requests.get(f"{KALSHI_BASE}/portfolio/balance", headers=kalshi_headers(), timeout=5)
        if r.status_code == 200:
            data = r.json()
            return data.get("balance", 0) / 100.0
    except Exception:
        pass
    return None


def get_kalshi_positions():
    try:
        r = requests.get(f"{KALSHI_BASE}/portfolio/positions", headers=kalshi_headers(), timeout=5)
        if r.status_code == 200:
            return r.json().get("market_positions", [])
    except Exception:
        pass
    return []


# --- Hardcoded positions ---

HARDCODED_POSITIONS = [
    {
        "ticker": "KXGDP-26APR30-T2.0",
        "side": "yes",
        "qty": 32,
        "avg_cost_cents": 57.4,
        "settlement_date": "2026-04-30",
    },
    {
        "ticker": "KXGDP-26APR30-T2.5",
        "side": "yes",
        "qty": 10,
        "avg_cost_cents": 36.0,
        "settlement_date": "2026-04-30",
    },
]


def fetch_live_price(ticker: str) -> float | None:
    try:
        r = requests.get(f"{KALSHI_BASE}/markets/{ticker}", headers=kalshi_headers(), timeout=5)
        if r.status_code == 200:
            market = r.json().get("market", {})
            return market.get("yes_ask", market.get("last_price", None))
    except Exception:
        pass
    return None


# --- Endpoints ---

@app.get("/api/status")
def api_status():
    balance = get_kalshi_balance()
    positions = get_kalshi_positions()
    total_pnl = 0.0
    for p in HARDCODED_POSITIONS:
        live = fetch_live_price(p["ticker"])
        if live is not None:
            total_pnl += p["qty"] * (live - p["avg_cost_cents"]) / 100.0
    return {
        "timestamp": datetime.now().isoformat(),
        "balance": balance,
        "total_positions": len(HARDCODED_POSITIONS),
        "total_pnl": round(total_pnl, 2),
    }


@app.get("/api/positions")
def api_positions():
    results = []
    for p in HARDCODED_POSITIONS:
        live = fetch_live_price(p["ticker"])
        current = live if live is not None else p["avg_cost_cents"]
        pnl = p["qty"] * (current - p["avg_cost_cents"]) / 100.0
        results.append({
            "ticker": p["ticker"],
            "side": p["side"],
            "qty": p["qty"],
            "avg_cost_cents": p["avg_cost_cents"],
            "current_price_cents": current,
            "pnl_dollars": round(pnl, 2),
            "settlement_date": p["settlement_date"],
            "status": "active",
        })
    return results


@app.get("/api/models")
def api_models():
    model_defs = [
        {"name": "CPI", "file": "xgb_cpi.joblib", "auroc": 0.6528, "win_rate": 0.604},
        {"name": "GDP", "file": "xgb_gdp_monthly_prod.joblib", "auroc": 0.6925, "win_rate": 0.879},
        {"name": "Fed", "file": "xgb_fomc_prod.joblib", "auroc": 0.9919, "win_rate": 0.977},
    ]

    paper_trades = []
    pt_path = ECON_ROOT / "paper_trades.jsonl"
    if pt_path.exists():
        with open(pt_path) as f:
            for line in f:
                line = line.strip()
                if line:
                    paper_trades.append(json.loads(line))

    results = []
    for m in model_defs:
        model_path = MODELS_ROOT / m["file"]
        exists = model_path.exists()
        model_pts = [t for t in paper_trades if t.get("model", "").lower() == m["name"].lower()]
        paper_pnl = sum(t.get("pnl", 0) for t in model_pts)
        last_pred = model_pts[-1] if model_pts else None
        results.append({
            "name": m["name"],
            "auroc": m["auroc"] if exists else None,
            "win_rate": m["win_rate"] if exists else None,
            "model_exists": exists,
            "last_prediction": last_pred.get("prediction") if last_pred else None,
            "last_prob": last_pred.get("probability") if last_pred else None,
            "paper_trades_count": len(model_pts),
            "paper_pnl": round(paper_pnl, 2),
        })
    return results


@app.get("/api/data-layer")
def api_data_layer():
    def count_parquet_rows(directory: Path) -> int:
        total = 0
        if not directory.exists():
            return 0
        for f in directory.glob("*.parquet"):
            try:
                df = pd.read_parquet(f)
                total += len(df)
            except Exception:
                pass
        return total

    btc_dir = DATA_ROOT / "raw" / "btc"
    eth_dir = DATA_ROOT / "raw" / "eth"
    spy_dir = DATA_ROOT / "raw" / "spy"
    ob_file = DATA_ROOT / "orderbook_snapshots.parquet"

    ob_rows = 0
    if ob_file.exists():
        try:
            ob_rows = len(pd.read_parquet(ob_file))
        except Exception:
            pass

    last_updated = None
    for d in [btc_dir, eth_dir, spy_dir]:
        if d.exists():
            for f in d.glob("*.parquet"):
                mtime = f.stat().st_mtime
                if last_updated is None or mtime > last_updated:
                    last_updated = mtime

    return {
        "btc_rows": count_parquet_rows(btc_dir),
        "eth_rows": count_parquet_rows(eth_dir),
        "spy_rows": count_parquet_rows(spy_dir),
        "orderbook_rows": ob_rows,
        "last_updated": datetime.fromtimestamp(last_updated).isoformat() if last_updated else None,
    }


@app.get("/api/releases")
def api_releases():
    releases = [
        {"name": "CPI", "date": "2026-03-12", "model_call": "ABOVE", "trade_type": "YES"},
        {"name": "FOMC", "date": "2026-03-19", "model_call": "HOLD", "trade_type": "YES"},
        {"name": "GDP", "date": "2026-04-30", "model_call": "ABOVE 2.0%", "trade_type": "YES"},
    ]
    today = date.today()
    for r in releases:
        rd = date.fromisoformat(r["date"])
        days = (rd - today).days
        r["days_away"] = days
        r["status"] = "upcoming" if days > 0 else ("today" if days == 0 else "passed")
    return releases


@app.get("/api/backtest")
def api_backtest():
    bt_path = ECON_ROOT / "backtest_results.json"
    if bt_path.exists():
        with open(bt_path) as f:
            return json.load(f)
    return {
        "sharpe": 3.39,
        "combined_pnl": 377.50,
        "cpi_win_rate": 0.604,
        "gdp_win_rate": 0.879,
        "fed_win_rate": 0.977,
        "total_bets": 1079,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
