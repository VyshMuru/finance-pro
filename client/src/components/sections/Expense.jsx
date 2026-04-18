import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../api/index';
import KPICard from '../shared/KPICard';
import DataTable from '../shared/DataTable';
import { fmt, CATEGORY_COLORS } from '../../utils/formatters';
import { Plus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
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

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="card p-3 text-xs shadow-xl">
      <p className="font-semibold text-white">{d.name}</p>
      <p style={{ color: d.payload.fill }}>{fmt.currency(d.value)} ({fmt.percent(d.payload.percent * 100)})</p>
    </div>
  );
}

export default function Expense() {
  const { periodMode, selectedYear, selectedMonth, refreshKey, openAddModal } = useStore();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(null);

  const month = periodMode === 'month' ? selectedMonth : null;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.transactions.summary(selectedYear, month, 'expense'),
      api.transactions.list(selectedYear, month, 'expense'),
    ]).then(([s, tx]) => {
      setSummary(s);
      setTransactions(tx);
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedYear, month, refreshKey]);

  const monthlyChart = useMemo(() => {
    if (!summary?.monthly) return [];
    const map = {};
    for (const r of summary.monthly) {
      const name = MONTH_NAMES[parseInt(r.month, 10) - 1];
      if (!map[name]) map[name] = { name, Expenses: 0 };
      map[name].Expenses += r.total;
    }
    return Object.values(map);
  }, [summary]);

  const pieData = useMemo(() => {
    if (!summary?.byCategory) return [];
    const map = {};
    for (const r of summary.byCategory) {
      if (!map[r.category]) map[r.category] = { name: r.category, value: 0 };
      map[r.category].value += r.total;
    }
    const arr = Object.values(map).sort((a, b) => b.value - a.value);
    const total = arr.reduce((s, r) => s + r.value, 0);
    return arr.map(r => ({ ...r, percent: r.value / total }));
  }, [summary]);

  const numMonths = periodMode === 'year' ? (monthlyChart.length || 1) : 1;

  const columns = useMemo(() => [
    { accessorKey: 'date',        header: 'Date',        cell: i => <span className="font-mono text-xs">{fmt.date(i.getValue())}</span> },
    { accessorKey: 'category',    header: 'Category',    cell: i => <span className="badge bg-red-500/10 text-red-400">{i.getValue()}</span> },
    { accessorKey: 'subcategory', header: 'Subcategory', cell: i => i.getValue() || <span className="text-[var(--text-muted)]">—</span> },
    { accessorKey: 'account_name',header: 'Account',     cell: i => i.getValue() || <span className="text-[var(--text-muted)]">—</span> },
    { accessorKey: 'amount',      header: 'Amount',      cell: i => <span className="font-semibold text-red-400">{fmt.currency(i.getValue())}</span> },
    { accessorKey: 'notes',       header: 'Notes',       cell: i => <span className="text-[var(--text-muted)] text-xs">{i.getValue() || '—'}</span> },
  ], []);

  const handleDelete = async (row) => {
    if (!confirm('Delete this transaction?')) return;
    await api.transactions.delete(row.id);
    setTransactions(t => t.filter(x => x.id !== row.id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* KPIs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="section-title">Expense Overview</p>
          <button onClick={() => openAddModal('expense')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors">
            <Plus size={13} /> Add Expense
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KPICard label="Total Expenses" value={fmt.currency(summary?.total, true)}
            sub={`${transactions.length} transactions`} color="text-red-400" />
          <KPICard label="Average / Month" value={fmt.currency((summary?.total || 0) / numMonths, true)}
            sub="Monthly average" color="text-red-300" />
          <KPICard label="Largest Expense" value={summary?.largest ? fmt.currency(summary.largest.amount, true) : '—'}
            sub={summary?.largest?.category || ''} color="text-orange-400" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="card p-4 lg:col-span-3 flex flex-col">
          <p className="section-title mb-3">
            {periodMode === 'year' ? 'Expense Trend (Monthly)' : 'Expenses This Month'}
          </p>
          {monthlyChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt.currency(v, true)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">No data for this period</div>
          )}
        </div>

        <div className="card p-4 lg:col-span-2 flex flex-col">
          <p className="section-title mb-3">By Category</p>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value"
                    onMouseEnter={(_, i) => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                        opacity={activeIndex === null || activeIndex === i ? 1 : 0.5} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-1 overflow-y-auto max-h-24">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-[var(--text-muted)]">{d.name}</span>
                    </div>
                    <span className="text-red-400 font-medium">{fmt.currency(d.value, true)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-4 flex-1 flex flex-col min-h-0" style={{ minHeight: '320px' }}>
        <p className="section-title mb-3">Transactions</p>
        <DataTable columns={columns} data={transactions} onDelete={handleDelete} searchPlaceholder="Search expenses..." />
      </div>
    </div>
  );
}
