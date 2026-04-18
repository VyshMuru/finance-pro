import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../api/index';
import KPICard from '../shared/KPICard';
import { fmt } from '../../utils/formatters';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-xs shadow-xl">
      <p className="font-semibold mb-1 text-white">{MONTH_NAMES[parseInt(label,10)-1] || label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt.currency(p.value)}</p>
      ))}
    </div>
  );
}

export default function NetWorth() {
  const { selectedYear, refreshKey } = useStore();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.accounts.summary(),
      api.overview.networthTrend(selectedYear),
    ]).then(([s, t]) => {
      setSummary(s);
      setTrend(t);
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedYear, refreshKey]);

  // YTD change
  const ytdChange = trend.length >= 2
    ? trend[trend.length - 1].netWorth - trend[0].netWorth
    : null;

  const chartData = trend.map(r => ({
    month: MONTH_NAMES[parseInt(r.month, 10) - 1],
    Assets: r.assets,
    Liabilities: r.liabilities,
    'Net Worth': r.netWorth,
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* KPIs */}
      <div>
        <p className="section-title mb-3">Net Worth Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Assets" value={fmt.currency(summary?.totalAssets, true)} color="text-blue-400" />
          <KPICard label="Total Liabilities" value={fmt.currency(summary?.totalLiabilities, true)} color="text-red-400" />
          <KPICard label="Net Worth" value={fmt.currency(summary?.netWorth, true)} color="text-purple-400" />
          <KPICard label="YTD Change" value={ytdChange != null ? fmt.currency(ytdChange, true) : '—'}
            color={ytdChange >= 0 ? 'text-green-400' : 'text-red-400'}
            sub={ytdChange != null ? (ytdChange >= 0 ? '▲ Growth this year' : '▼ Decline this year') : 'Insufficient data'} />
        </div>
      </div>

      {/* Net Worth Trend */}
      <div className="card p-4">
        <p className="section-title mb-3">Net Worth Trend — {selectedYear}</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt.currency(v, true)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
              <Area type="monotone" dataKey="Net Worth" stroke="#a855f7" strokeWidth={2.5} fill="url(#nwGrad)" dot={{ fill: '#a855f7', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-[var(--text-muted)] text-sm">No data for {selectedYear}</div>
        )}
      </div>

      {/* Assets vs Liabilities chart */}
      <div className="card p-4">
        <p className="section-title mb-3">Assets vs Liabilities — {selectedYear}</p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt.currency(v, true)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
              <Line type="monotone" dataKey="Assets" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Liabilities" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">No data</div>
        )}
      </div>

      {/* Monthly snapshot table */}
      {trend.length > 0 && (
        <div className="card p-4">
          <p className="section-title mb-3">Monthly Snapshot</p>
          <div className="overflow-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-secondary)]">
                <tr>
                  {['Month', 'Assets', 'Liabilities', 'Net Worth', 'Change'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trend.map((r, i) => {
                  const prev = i > 0 ? trend[i - 1].netWorth : null;
                  const change = prev != null ? r.netWorth - prev : null;
                  return (
                    <tr key={r.month} className="table-row">
                      <td className="px-4 py-2.5 font-medium text-white">{MONTH_NAMES[parseInt(r.month, 10) - 1]}</td>
                      <td className="px-4 py-2.5 font-mono text-sm text-blue-400">{fmt.currency(r.assets)}</td>
                      <td className="px-4 py-2.5 font-mono text-sm text-red-400">{fmt.currency(r.liabilities)}</td>
                      <td className="px-4 py-2.5 font-mono text-sm font-semibold text-purple-400">{fmt.currency(r.netWorth)}</td>
                      <td className="px-4 py-2.5 font-mono text-sm">
                        {change != null ? (
                          <span className={change >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {change >= 0 ? '+' : ''}{fmt.currency(change)}
                          </span>
                        ) : <span className="text-[var(--text-muted)]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
