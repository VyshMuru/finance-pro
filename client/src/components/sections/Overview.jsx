import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../api/index';
import KPICard from '../shared/KPICard';
import { fmt, CATEGORY_COLORS } from '../../utils/formatters';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import clsx from 'clsx';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Tooltips ──────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-xs shadow-xl">
      <p className="font-semibold mb-1 text-white">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt.currency(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Debt utilization bar ──────────────────────────────────────
function DebtBar({ debt }) {
  const pct = debt.credit_limit > 0
    ? Math.min(100, (debt.balance / debt.credit_limit) * 100)
    : 100;

  const color = pct >= 50 ? '#ef4444' : pct >= 30 ? '#f59e0b' : '#22c55e';
  const textColor = pct >= 50 ? 'text-red-400' : pct >= 30 ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate max-w-[140px]">{debt.name}</span>
          <span className={clsx('badge text-[10px]',
            debt.type === 'credit' ? 'bg-red-500/10 text-red-400' :
            debt.type === 'loc' ? 'bg-orange-500/10 text-orange-400' :
            'bg-purple-500/10 text-purple-400'
          )}>
            {debt.type.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[var(--text-muted)]">{fmt.currency(debt.balance)}</span>
          {debt.credit_limit > 0 && (
            <span className={clsx('font-semibold', textColor)}>
              {fmt.percent(pct)}
            </span>
          )}
        </div>
      </div>
      <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {debt.credit_limit > 0 && (
        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>$0</span>
          <span>Limit: {fmt.currency(debt.credit_limit)}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Dashboard() {
  const { periodMode, selectedYear, selectedMonth, refreshKey } = useStore();
  const [data, setData] = useState(null);
  const [debtData, setDebtData] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);

  const month = periodMode === 'month' ? selectedMonth : null;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.overview.get(selectedYear, month),
      api.accounts.debtTracker(),
      api.accounts.portfolioGrowth(selectedYear),
    ])
      .then(([overview, debt, portfolio]) => {
        setData(overview);
        setDebtData(debt);
        setPortfolioData(portfolio);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedYear, month, refreshKey]);

  // ── Cash flow chart data ──────────────────────────────────
  const chartData = useMemo(() => {
    if (!data?.monthly) return [];
    const map = {};
    for (const row of data.monthly) {
      const name = MONTH_NAMES[parseInt(row.month, 10) - 1];
      if (!map[name]) map[name] = { name, Income: 0, Expenses: 0 };
      if (row.type === 'income')  map[name].Income   = row.total;
      if (row.type === 'expense') map[name].Expenses = row.total;
    }
    return Object.values(map);
  }, [data]);

  // ── Portfolio chart data ──────────────────────────────────
  const portfolioChart = useMemo(() => {
    if (!portfolioData?.trend) return [];
    return portfolioData.trend.map(r => ({
      name: MONTH_NAMES[parseInt(r.month, 10) - 1],
      'Portfolio Value': r.portfolioValue,
      'Contributed': r.totalContributed,
      'Growth': r.growth,
    }));
  }, [portfolioData]);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading...
      </div>
    </div>
  );

  if (!data) return null;

  const numMonths = periodMode === 'year'
    ? (chartData.length || 1)
    : 1;

  // ── Overall utilization color ─────────────────────────────
  const utilPct = debtData?.overallUtilization || 0;
  const utilColor = utilPct >= 50 ? 'text-red-400' : utilPct >= 30 ? 'text-amber-400' : 'text-green-400';

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">

      {/* ── KPI Row 1 ───────────────────────────────────────── */}
      <div>
        <p className="section-title mb-3">Key Metrics</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Income"
            value={fmt.currency(data.totalIncome, true)}
            sub={`${fmt.currency(data.totalIncome / numMonths, true)} / month`}
            color="text-green-400" />
          <KPICard label="Total Expenses"
            value={fmt.currency(data.totalExpenses, true)}
            sub={`${fmt.currency(data.totalExpenses / numMonths, true)} / month`}
            color="text-red-400" />
          <KPICard label="Net Surplus"
            value={fmt.currency(data.netSurplus, true)}
            sub={`${fmt.percent(data.savingsRate)} savings rate`}
            color="text-blue-400" />
          <KPICard label="Net Worth"
            value={fmt.currency(data.netWorth, true)}
            sub="All accounts"
            color="text-purple-400" />
        </div>
      </div>

      {/* ── KPI Row 2 ───────────────────────────────────────── */}
      <div>
        <p className="section-title mb-3">Quick Stats</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Avg Monthly Income"
            value={fmt.currency(data.avgMonthlyIncome, true)}
            color="text-green-300" />
          <KPICard label="Avg Monthly Expenses"
            value={fmt.currency(data.avgMonthlyExpenses, true)}
            color="text-red-300" />
          <KPICard label="Savings Rate"
            value={fmt.percent(data.savingsRate)}
            color="text-blue-300" />
          <KPICard label="Total Assets"
            value={fmt.currency(data.totalAssets, true)}
            color="text-cyan-400" />
        </div>
      </div>

      {/* ── Charts Row 1 ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Cash flow */}
        <div className="card p-4 lg:col-span-3 flex flex-col">
          <p className="section-title mb-3">Monthly Cash Flow</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => fmt.currency(v, true)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                <Area type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2}
                  fill="url(#incomeGrad)" dot={false} />
                <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2}
                  fill="url(#expenseGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
              No data for this period
            </div>
          )}
        </div>

        {/* Income vs Expenses bar */}
        <div className="card p-4 lg:col-span-2 flex flex-col">
          <p className="section-title mb-3">Income vs Expenses</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[{
                name: 'Period',
                Income: data.totalIncome,
                Expenses: data.totalExpenses,
                Surplus: Math.max(0, data.netSurplus),
              }]}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => fmt.currency(v, true)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
              <Bar dataKey="Income" fill="#22c55e" radius={[4,4,0,0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="Surplus" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Charts Row 2 ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Debt Tracker */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="section-title">Debt Tracker</p>
            {debtData?.totalLimit > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--text-muted)]">Overall Utilization</span>
                <span className={clsx('font-bold text-sm', utilColor)}>
                  {fmt.percent(utilPct)}
                </span>
              </div>
            )}
          </div>

          {/* Utilization summary KPIs */}
          {debtData?.debts?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Total Debt
                </p>
                <p className="text-lg font-bold text-red-400">
                  {fmt.currency(debtData.totalDebt, true)}
                </p>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Total Limit
                </p>
                <p className="text-lg font-bold text-blue-400">
                  {fmt.currency(debtData.totalLimit, true)}
                </p>
              </div>
            </div>
          )}

          {/* Overall utilization bar */}
          {debtData?.totalLimit > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Overall Credit Utilization</span>
                <span className={clsx('font-semibold', utilColor)}>
                  {fmt.percent(utilPct)}
                </span>
              </div>
              <div className="w-full bg-[var(--bg-secondary)] rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, utilPct)}%`,
                    background: utilPct >= 50 ? '#ef4444' : utilPct >= 30 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span className="text-green-400">0-30% Healthy</span>
                <span className="text-amber-400">30-50% Watch</span>
                <span className="text-red-400">50%+ High</span>
              </div>
            </div>
          )}

          {/* Individual debts */}
          <div className="space-y-4 mt-1">
            {debtData?.debts?.length > 0 ? (
              debtData.debts.map(debt => (
                <DebtBar key={debt.id} debt={debt} />
              ))
            ) : (
              <div className="flex items-center justify-center py-8 text-[var(--text-muted)] text-sm">
                🎉 No active debts!
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Growth */}
        <div className="card p-4 flex flex-col gap-3">
          <p className="section-title">Portfolio Growth — {selectedYear}</p>

          {/* Portfolio KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Total Value
              </p>
              <p className="text-base font-bold text-purple-400">
                {fmt.currency(portfolioData?.totalValue || 0, true)}
              </p>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Contributed
              </p>
              <p className="text-base font-bold text-blue-400">
                {fmt.currency(portfolioData?.totalContributed || 0, true)}
              </p>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Growth
              </p>
              <p className={clsx(
                'text-base font-bold',
                (portfolioData?.totalGrowth || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {fmt.currency(portfolioData?.totalGrowth || 0, true)}
              </p>
            </div>
          </div>

          {/* Portfolio chart */}
          {portfolioChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={portfolioChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => fmt.currency(v, true)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                <Line type="monotone" dataKey="Portfolio Value" stroke="#a855f7"
                  strokeWidth={2.5} dot={{ fill: '#a855f7', r: 3 }} />
                <Line type="monotone" dataKey="Contributed" stroke="#3b82f6"
                  strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">
              Add savings or investment accounts to see portfolio growth
            </div>
          )}

          {/* Legend explanation */}
          <div className="flex gap-4 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-purple-400 inline-block" />
              Portfolio Value
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-blue-400 inline-block border-dashed border-t border-blue-400" />
              Amount Contributed
            </span>
            <span className="flex items-center gap-1 text-green-400">
              Gap = Growth 📈
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}