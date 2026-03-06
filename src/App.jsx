import { useState, useEffect } from 'react'

const API = 'http://localhost:8000/api'

function useFetch(endpoint, interval = 60000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const load = () =>
      fetch(`${API}/${endpoint}`)
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(() => setLoading(false))
    load()
    const id = setInterval(load, interval)
    return () => clearInterval(id)
  }, [endpoint, interval])
  return { data, loading }
}

function pnlColor(v) {
  if (v > 0) return 'text-emerald-400'
  if (v < 0) return 'text-red-400'
  return 'text-gray-400'
}

function aurocColor(v) {
  if (v >= 0.9) return 'text-emerald-400'
  if (v >= 0.7) return 'text-teal-400'
  if (v >= 0.6) return 'text-yellow-400'
  return 'text-red-400'
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-navy-900 border border-slate-700/50 rounded-lg p-4 ${className}`}>
      {children}
    </div>
  )
}

function Label({ children }) {
  return <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{children}</div>
}

// --- Header ---
function Header({ status }) {
  const ts = status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : '--:--:--'
  return (
    <header className="bg-navy-900 border-b border-slate-700/50 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold tracking-tight text-teal-400 font-mono">
          🥜 PEANUT'S ECON INTELLIGENCE PLATFORM
        </h1>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      </div>
      <div className="flex items-center gap-6 text-sm font-mono">
        <span className="text-slate-400">
          Balance: <span className="text-white font-semibold">
            {status?.balance != null ? `$${status.balance.toFixed(2)}` : '---'}
          </span>
        </span>
        <span className="text-slate-500">Last: {ts}</span>
      </div>
    </header>
  )
}

// --- Portfolio Stats ---
function PortfolioRow({ status, releases }) {
  const nextRelease = releases?.filter(r => r.days_away > 0).sort((a, b) => a.days_away - b.days_away)[0]
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <Label>Net P&L</Label>
        <div className={`text-2xl font-bold font-mono ${pnlColor(status?.total_pnl || 0)}`}>
          {status?.total_pnl != null ? `${status.total_pnl >= 0 ? '+' : ''}$${status.total_pnl.toFixed(2)}` : '---'}
        </div>
      </Card>
      <Card>
        <Label>Open Positions</Label>
        <div className="text-2xl font-bold font-mono text-white">
          {status?.total_positions ?? '--'}
        </div>
      </Card>
      <Card>
        <Label>Next Release</Label>
        <div className="text-2xl font-bold font-mono text-gold-400">
          {nextRelease ? `${nextRelease.name} — ${nextRelease.days_away}d` : '---'}
        </div>
      </Card>
    </div>
  )
}

// --- Positions Table ---
function PositionsTable({ positions }) {
  if (!positions) return null
  return (
    <Card>
      <Label>Active Positions</Label>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-slate-500 text-xs uppercase border-b border-slate-700/50">
              <th className="text-left py-2 pr-4">Contract</th>
              <th className="text-left py-2 pr-4">Side</th>
              <th className="text-right py-2 pr-4">Qty</th>
              <th className="text-right py-2 pr-4">Avg</th>
              <th className="text-right py-2 pr-4">Live</th>
              <th className="text-right py-2 pr-4">P&L</th>
              <th className="text-left py-2 pr-4">Settlement</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p, i) => (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="py-2 pr-4 text-teal-400">{p.ticker}</td>
                <td className="py-2 pr-4 uppercase">{p.side}</td>
                <td className="py-2 pr-4 text-right">{p.qty}</td>
                <td className="py-2 pr-4 text-right">{p.avg_cost_cents.toFixed(1)}c</td>
                <td className="py-2 pr-4 text-right">{p.current_price_cents.toFixed(1)}c</td>
                <td className={`py-2 pr-4 text-right font-semibold ${pnlColor(p.pnl_dollars)}`}>
                  {p.pnl_dollars >= 0 ? '+' : ''}${p.pnl_dollars.toFixed(2)}
                </td>
                <td className="py-2 pr-4 text-slate-400">{p.settlement_date}</td>
                <td className="py-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-emerald-900/50 text-emerald-400">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// --- Models Grid ---
function ModelsGrid({ models }) {
  if (!models) return null
  return (
    <div>
      <Label>Model Performance</Label>
      <div className="grid grid-cols-3 gap-4 mt-2">
        {models.map((m, i) => (
          <Card key={i} className="relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-300">{m.name} Model</span>
              {m.model_exists
                ? <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-400">LIVE</span>
                : <span className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-400">MISSING</span>
              }
            </div>
            <div className={`text-3xl font-bold font-mono ${aurocColor(m.auroc || 0)}`}>
              {m.auroc != null ? m.auroc.toFixed(4) : '---'}
            </div>
            <div className="text-xs text-slate-500 mb-3">AUROC</div>
            {m.win_rate != null && (
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="text-white font-mono">{(m.win_rate * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{ width: `${m.win_rate * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className="text-xs text-slate-500 mt-2">
              {m.last_prediction != null
                ? `Last: ${m.last_prediction} (${(m.last_prob * 100).toFixed(0)}%)`
                : 'No predictions yet'}
            </div>
            <div className="text-xs text-slate-500">
              Paper: {m.paper_trades_count} trades | P&L: ${m.paper_pnl.toFixed(2)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// --- Data Layer ---
function DataLayer({ dataLayer }) {
  if (!dataLayer) return null
  const items = [
    { label: 'BTC', value: dataLayer.btc_rows },
    { label: 'ETH', value: dataLayer.eth_rows },
    { label: 'SPY', value: dataLayer.spy_rows },
    { label: 'Order Book', value: dataLayer.orderbook_rows },
  ]
  const maxVal = Math.max(...items.map(i => i.value), 1)
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <Label>Shared Data Layer</Label>
        <span className="text-xs text-slate-600 font-mono">polymarket-btc/data</span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{item.label}</span>
              <span className="text-white font-mono">{item.value.toLocaleString()} rows</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(item.value / maxVal) * 100}%`,
                  background: `linear-gradient(90deg, #14b8a6, #2dd4bf)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {dataLayer.last_updated && (
        <div className="text-xs text-slate-600 mt-3 font-mono">
          Last updated: {new Date(dataLayer.last_updated).toLocaleString()}
        </div>
      )}
    </Card>
  )
}

// --- Releases Timeline ---
function ReleasesTimeline({ releases }) {
  if (!releases) return null
  const upcoming = releases.filter(r => r.days_away >= 0).sort((a, b) => a.days_away - b.days_away)
  return (
    <Card>
      <Label>Upcoming Releases</Label>
      <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
        {upcoming.map((r, i) => (
          <div key={i} className="flex-none">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${r.days_away === 0 ? 'bg-gold-400 animate-pulse' : r.days_away <= 7 ? 'bg-teal-400' : 'bg-slate-600'}`} />
              <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700/30 min-w-[140px]">
                <div className="text-sm font-semibold text-white">{r.name}</div>
                <div className="text-xs text-slate-400 font-mono">{r.date}</div>
                <div className={`text-lg font-bold font-mono mt-1 ${r.days_away <= 7 ? 'text-gold-400' : 'text-slate-300'}`}>
                  {r.days_away === 0 ? 'TODAY' : `${r.days_away}d`}
                </div>
                <div className="text-xs text-teal-400 mt-1">{r.model_call}</div>
              </div>
              {i < upcoming.length - 1 && (
                <div className="w-8 h-px bg-slate-700" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// --- Backtest ---
function BacktestPanel({ backtest }) {
  if (!backtest) return null
  // API returns nested structure: backtest.cpi.win_pct, backtest.combined_sharpe
  const sharpe = backtest.combined_sharpe ?? backtest.sharpe ?? 0
  const combinedPnl = backtest.combined_pnl ?? 0
  const totalBets = backtest.total_bets ?? 0
  const bars = [
    { label: 'CPI', rate: (backtest.cpi?.win_pct ?? backtest.cpi_win_rate * 100 ?? 0) / 100, color: '#facc15' },
    { label: 'GDP', rate: (backtest.gdp?.win_pct ?? backtest.gdp_win_rate * 100 ?? 0) / 100, color: '#14b8a6' },
    { label: 'Fed', rate: (backtest.fed?.win_pct ?? backtest.fed_win_rate * 100 ?? 0) / 100, color: '#2dd4bf' },
  ]
  return (
    <Card>
      <Label>Backtest Performance</Label>
      <div className="grid grid-cols-2 gap-6 mt-2">
        <div>
          <div className="text-4xl font-bold font-mono text-yellow-400">{sharpe.toFixed(2)}</div>
          <div className="text-xs text-slate-500">Sharpe Ratio</div>
          <div className="mt-3 text-sm font-mono">
            <span className="text-slate-400">Combined P&L: </span>
            <span className="text-emerald-400 font-semibold">${combinedPnl.toFixed(2)}</span>
          </div>
          <div className="text-sm font-mono">
            <span className="text-slate-400">Total Bets: </span>
            <span className="text-white">{totalBets.toLocaleString()}</span>
          </div>
        </div>
        <div className="space-y-3">
          {bars.map((b, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">{b.label} Win Rate</span>
                <span className="text-white font-mono">{(b.rate * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${b.rate * 100}%`, backgroundColor: b.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// --- Signal Cascade ---
function SignalCascade({ models }) {
  if (!models) return null
  const flow = ['CPI', 'Fed', 'GDP', 'BTC']
  return (
    <Card>
      <Label>Signal Cascade</Label>
      <div className="flex items-center gap-2 mt-3 justify-center flex-wrap">
        {flow.map((name, i) => {
          const model = models.find(m => m.name === name)
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg px-4 py-3 text-center min-w-[100px]">
                <div className="text-xs text-slate-500 mb-1">{name}</div>
                {model ? (
                  <>
                    <div className={`text-sm font-bold font-mono ${aurocColor(model.auroc || 0)}`}>
                      {model.auroc?.toFixed(3) || '---'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {model.last_prediction || 'awaiting'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-bold font-mono text-slate-500">TBD</div>
                    <div className="text-xs text-slate-600">downstream</div>
                  </>
                )}
              </div>
              {i < flow.length - 1 && (
                <svg className="w-5 h-5 text-slate-600 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// --- App ---
export default function App() {
  const { data: status } = useFetch('status')
  const { data: positions } = useFetch('positions')
  const { data: models } = useFetch('models')
  const { data: dataLayer } = useFetch('data-layer')
  const { data: releases } = useFetch('releases')
  const { data: backtest } = useFetch('backtest')

  return (
    <div className="min-h-screen bg-navy-950">
      <Header status={status} />
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <PortfolioRow status={status} releases={releases} />
        <PositionsTable positions={positions} />
        <ModelsGrid models={models} />
        <div className="grid grid-cols-2 gap-4">
          <DataLayer dataLayer={dataLayer} />
          <BacktestPanel backtest={backtest} />
        </div>
        <ReleasesTimeline releases={releases} />
        <SignalCascade models={models} />
        <footer className="text-center text-xs text-slate-700 py-4 font-mono">
          🥜 PEANUT'S ECON INTELLIGENCE PLATFORM — OPENCLAW SYSTEMS
        </footer>
      </main>
    </div>
  )
}
