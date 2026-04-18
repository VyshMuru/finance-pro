import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../api/index';
import KPICard from '../shared/KPICard';
import { fmt } from '../../utils/formatters';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import clsx from 'clsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';

function ProgressBar({ value, max, color = '#3b82f6' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = pct >= 100;
  return (
    <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: over ? '#ef4444' : color }}
      />
    </div>
  );
}

function BudgetRow({ item, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ category: item.category, type: item.type, monthly_amount: item.monthly_amount });

  const save = async () => {
    await onUpdate(item.id, form);
    setEditing(false);
  };

  const pct = item.percentage;
  const statusColor = pct >= 100 ? 'text-red-400' : pct >= 80 ? 'text-amber-400' : 'text-green-400';

  if (editing) {
    return (
      <tr className="table-row bg-[var(--bg-hover)]">
        <td className="px-4 py-2"><input value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="input text-sm py-1 h-8" /></td>
        <td className="px-4 py-2">
          <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className="select text-sm py-1 h-8">
            <option value="expense">expense</option>
            <option value="income">income</option>
          </select>
        </td>
        <td className="px-4 py-2"><input type="number" step="0.01" value={form.monthly_amount} onChange={e => setForm(f => ({...f, monthly_amount: parseFloat(e.target.value)||0}))} className="input text-sm py-1 h-8 w-28" /></td>
        <td className="px-4 py-2 text-[var(--text-muted)]">—</td>
        <td className="px-4 py-2 text-[var(--text-muted)]">—</td>
        <td className="px-4 py-2 text-[var(--text-muted)]">—</td>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            <button onClick={save} className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20"><Check size={14}/></button>
            <button onClick={() => setEditing(false)} className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"><X size={14}/></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="table-row">
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-white">{item.category}</span>
          <ProgressBar value={item.spent} max={item.budget_amount} color={pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e'} />
        </div>
      </td>
      <td className="px-4 py-3"><span className={clsx('badge', item.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')}>{item.type}</span></td>
      <td className="px-4 py-3 font-mono text-sm">{fmt.currency(item.monthly_amount)}<span className="text-[var(--text-muted)]">/mo</span></td>
      <td className="px-4 py-3 font-mono text-sm">{fmt.currency(item.budget_amount)}</td>
      <td className="px-4 py-3 font-mono text-sm text-amber-400">{fmt.currency(item.spent)}</td>
      <td className="px-4 py-3">
        <span className={clsx('font-mono text-sm font-semibold', statusColor)}>
          {fmt.percent(pct)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={14}/></button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14}/></button>
        </div>
      </td>
    </tr>
  );
}

export default function Budget() {
  const { periodMode, selectedYear, selectedMonth } = useStore();
  const [budgets, setBudgets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ category: '', type: 'expense', monthly_amount: 0 });

  const month = periodMode === 'month' ? selectedMonth : null;

  const load = async () => {
    setLoading(true);
    const [b, s] = await Promise.all([api.budget.list(selectedYear, month), api.budget.summary(selectedYear, month)]);
    setBudgets(b);
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedYear, month]);

  const handleUpdate = async (id, data) => { await api.budget.update(id, data); load(); };
  const handleDelete = async (id) => { if (!confirm('Delete budget item?')) return; await api.budget.delete(id); load(); };
  const handleAdd = async (e) => {
    e.preventDefault();
    await api.budget.create(addForm);
    setShowAdd(false);
    setAddForm({ category: '', type: 'expense', monthly_amount: 0 });
    load();
  };

  // Chart data
  const chartData = budgets.filter(b => b.type === 'expense').map(b => ({
    name: b.category, Budget: b.budget_amount, Spent: b.spent,
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">
      {/* KPIs */}
      <div>
        <p className="section-title mb-3">Budget Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard label="Monthly Budget" value={fmt.currency(summary?.totalMonthly, true)} color="text-amber-400" />
          <KPICard label="Yearly Budget" value={fmt.currency(summary?.totalYearly, true)} color="text-amber-300" />
          <KPICard label="Total Budget (Period)" value={fmt.currency(summary?.totalBudget, true)} color="text-blue-400" />
          <KPICard label="Spent So Far" value={fmt.currency(summary?.spent, true)} color="text-red-400" />
          <KPICard label="Remaining" value={fmt.currency(summary?.remaining, true)}
            color={summary?.remaining >= 0 ? 'text-green-400' : 'text-red-400'}
            sub={`${fmt.percent(summary?.adherence)} used`} />
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card p-4">
          <p className="section-title mb-3">Budget vs Actual by Category</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmt.currency(v, true)} />
              <Tooltip formatter={(v) => fmt.currency(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
              <Bar dataKey="Budget" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.6} />
              <Bar dataKey="Spent" radius={[4,4,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.Spent > entry.Budget ? '#ef4444' : entry.Spent / entry.Budget > 0.8 ? '#f59e0b' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Budget table */}
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="section-title">Budget Items</p>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors">
            <Plus size={13} /> Add Budget Item
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="flex gap-3 items-end p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Category *</label>
              <input value={addForm.category} onChange={e => setAddForm(f => ({...f, category: e.target.value}))} placeholder="e.g. Groceries" className="input text-sm" required />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Type</label>
              <select value={addForm.type} onChange={e => setAddForm(f => ({...f, type: e.target.value}))} className="select text-sm">
                <option value="expense">expense</option>
                <option value="income">income</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Monthly Amount</label>
              <input type="number" step="0.01" value={addForm.monthly_amount} onChange={e => setAddForm(f => ({...f, monthly_amount: parseFloat(e.target.value)||0}))} className="input text-sm w-32" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        <div className="overflow-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                {['Category', 'Type', 'Monthly', 'Period Budget', 'Spent', '% Used', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {budgets.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[var(--text-muted)]">No budget items</td></tr>
              ) : budgets.map(b => (
                <BudgetRow key={b.id} item={b} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
