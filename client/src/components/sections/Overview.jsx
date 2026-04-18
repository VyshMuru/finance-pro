import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../api/index';
import KPICard from '../shared/KPICard';
import { fmt, CATEGORY_COLORS } from '../../utils/formatters';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-3 text-xs shadow-xl">
      <p className="font-semibold mb-1 text-white">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt.currency(p.value)}</p>
      ))}
    </div>
  );
}

export default function Overview() {
  const { periodMode, selectedYear, selectedMonth, refreshKey } = useStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const month = periodMode === 'month' ? selectedMonth : null;

  useEffect(() => {
    setLoading(true);
    api.overview.get(selectedYear, month)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedYear, month, refreshKey]);

  // Build chart data from monthly breakdown
  const chartData = React.useMemo(() => {
    if (!data?.monthly) return [];
    const map = {};
    for (const row of data.monthly) {
      const name = MONTH_NAMES[parseInt(row.month, 10) - 1];
      if (!map[name]) map[name] = { name, Income: 0, Expenses: 0 };
      if (row.type === 'income')  map[name].Income  = row.total;
      if (row.type === 'expense') map[name].Expenses = row.total;
    }
    return Object.values(map);
  }, [data]);

  if (loading) return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading...
      </div>
    </div>
  );

  if (!data) return null;

  const numMonths = periodMode === 'year' ? (chartData.length || 1) : 1;

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* KPI Row 1 */}
      <div>
        <p className="section-title mb-3">Key Metrics</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Income" value={fmt.currency(data.totalIncome, true)}
            sub={`${fmt.currency(data.totalIncome / numMonths, true)} / month`} color="text-green-400" />
          <KPICard label="Total Expenses" value={fmt.currency(data.totalExpenses, true)}
            sub={`${fmt.currency(data.totalExpenses / numMonths, true)} / month`} color="text-red-400" />
          <KPICard label="Net Surplus" value={fmt.currency(data.netSurplus, true)}
            sub={`${fmt.percent(data.savingsRate)} savings rate`} color="text-blue-400" />
          <KPICard label="Net Worth" value={fmt.currency(data.netWorth, true)}
            sub="All accounts" color="text-purple-400" />
        </div>
      </div>

      {/* KPI Row 2 */}
      <div>
        <p className="section-title mb-3">Quick Stats</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Avg Monthly Income" value={fmt.currency(data.avgMonthlyIncome, true)} color="text-green-300" />
          <KPICard label="Avg Monthly Expenses" value={fmt.currency(data.avgMonthlyExpenses, true)} color="text-red-300" />
          <KPICard label="Savings Rate" value={fmt.percent(data.savingsRate)} color="text-blue-300" />
          <KPICard label="Total Assets" value={fmt.currency(data.totalAssets, true)} color="text-cyan-400" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* Cash flow chart */}
        <div className="card p-4 lg:col-span-3 flex flex-col">
          <p className="section-title mb-3">Monthly Cash Flow</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
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
                <Area type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
                <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">No data for this period</div>
          )}
        </div>

        {/* Summary donut/bar */}
        <div className="card p-4 lg:col-span-2 flex flex-col">
          <p className="section-title mb-3">Income vs Expenses</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[{ name: 'Period', Income: data.totalIncome, Expenses: data.totalExpenses, Surplus: Math.max(0, data.netSurplus) }]}
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
    </div>
  );
}
