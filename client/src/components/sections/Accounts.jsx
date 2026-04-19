import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/index';
import KPICard from '../shared/KPICard';
import { fmt, ACCOUNT_TYPES } from '../../utils/formatters';
import { Plus, Pencil, Trash2, Check, X, ArrowLeftRight } from 'lucide-react';
import clsx from 'clsx';

const TYPE_BADGES = {
  checking:   'bg-blue-500/10 text-blue-400',
  savings:    'bg-green-500/10 text-green-400',
  credit:     'bg-red-500/10 text-red-400',
  investment: 'bg-purple-500/10 text-purple-400',
  loan:       'bg-orange-500/10 text-orange-400',
  other:      'bg-gray-500/10 text-gray-400',
};

function AccountRow({ account, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: account.name,
    type: account.type,
    starting_balance: account.starting_balance,
  });

  const isLiability = ['credit', 'loan'].includes(account.type);

  const save = async () => {
    await onUpdate(account.id, form);
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="table-row bg-[var(--bg-hover)]">
        <td className="px-4 py-2">
          <input value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="input text-sm py-1 h-8" />
        </td>
        <td className="px-4 py-2">
          <select value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="select text-sm py-1 h-8">
            {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>
        <td className="px-4 py-2">
          <input type="number" step="0.01"
            value={form.starting_balance}
            onChange={e => setForm(f => ({ ...f, starting_balance: parseFloat(e.target.value) || 0 }))}
            className="input text-sm py-1 h-8" />
        </td>
        <td className="px-4 py-2 text-[var(--text-muted)]">—</td>
        <td className="px-4 py-2 text-[var(--text-muted)]">—</td>
        <td className="px-4 py-2 text-[var(--text-muted)]">—</td>
        <td className="px-4 py-2 text-[var(--text-muted)]">—</td>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            <button onClick={save}
              className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20">
              <Check size={14} />
            </button>
            <button onClick={() => setEditing(false)}
              className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">
              <X size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="table-row">
      <td className="px-4 py-3 font-medium text-white">{account.name}</td>
      <td className="px-4 py-3">
        <span className={clsx('badge', TYPE_BADGES[account.type] || TYPE_BADGES.other)}>
          {account.type}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-sm">
        {fmt.currency(account.starting_balance)}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-green-400">
        {fmt.currency(account.total_inflows)}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-red-400">
        {fmt.currency(account.total_outflows)}
      </td>
      <td className="px-4 py-3 font-mono text-sm text-blue-400">
        {fmt.currency(account.total_transfers_in)}↓{' '}
        <span className="text-purple-400">{fmt.currency(account.total_transfers_out)}↑</span>
      </td>
      <td className={clsx(
        'px-4 py-3 font-mono text-sm font-semibold',
        isLiability ? 'text-red-400' : 'text-blue-400'
      )}>
        {fmt.currency(account.current_balance)}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(account.id)}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    type: 'checking',
    starting_balance: 0,
  });

  const load = async () => {
    setLoading(true);
    const [accs, sum] = await Promise.all([
      api.accounts.list(),
      api.accounts.summary(),
    ]);
    setAccounts(accs);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (id, data) => {
    await api.accounts.update(id, data);
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this account? Transactions will be unlinked.')) return;
    await api.accounts.delete(id);
    await load();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    await api.accounts.create(addForm);
    setShowAdd(false);
    setAddForm({ name: '', type: 'checking', starting_balance: 0 });
    await load();
  };

  // ── Group accounts by type ───────────────────────────────
  const assetAccounts = accounts.filter(a => !['credit', 'loan'].includes(a.type));
  const liabilityAccounts = accounts.filter(a => ['credit', 'loan'].includes(a.type));

  if (loading) return (
    <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const TableSection = ({ title, rows, color }) => (
    <div className="mb-4">
      <p className={clsx('text-xs font-semibold uppercase tracking-wider mb-2', color)}>
        {title}
      </p>
      {rows.map(acc => (
        <AccountRow
          key={acc.id}
          account={acc}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
      {rows.length === 0 && (
        <tr>
          <td colSpan={8} className="px-4 py-4 text-center text-[var(--text-muted)] text-sm">
            No {title.toLowerCase()} yet
          </td>
        </tr>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto pr-1">

      {/* KPIs */}
      <div>
        <p className="section-title mb-3">Account Summary</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Assets"
            value={fmt.currency(summary?.totalAssets, true)}
            color="text-blue-400" />
          <KPICard label="Total Liabilities"
            value={fmt.currency(summary?.totalLiabilities, true)}
            color="text-red-400" />
          <KPICard label="Net Worth"
            value={fmt.currency(summary?.netWorth, true)}
            color="text-purple-400" />
          <KPICard label="Total Accounts"
            value={summary?.totalAccounts || 0}
            color="text-cyan-400"
            sub="Across all types" />
        </div>
      </div>

      {/* Accounts table */}
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="section-title">All Accounts</p>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors">
            <Plus size={13} /> Add Account
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <form onSubmit={handleAdd}
            className="flex gap-3 items-end p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Account Name *</label>
              <input
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. TD Chequing"
                className="input text-sm" required />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Type *</label>
              <select
                value={addForm.type}
                onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
                className="select text-sm">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Starting Balance</label>
              <input
                type="number" step="0.01"
                value={addForm.starting_balance}
                onChange={e => setAddForm(f => ({ ...f, starting_balance: parseFloat(e.target.value) || 0 }))}
                className="input text-sm w-36" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className="overflow-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                {['Account Name', 'Type', 'Starting Balance', 'Inflows', 'Outflows', 'Transfers', 'Current Balance', 'Actions'].map(h => (
                  <th key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Assets */}
              {assetAccounts.length > 0 && (
                <tr className="bg-[var(--bg-secondary)]/50">
                  <td colSpan={8} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Assets
                  </td>
                </tr>
              )}
              {assetAccounts.map(acc => (
                <AccountRow key={acc.id} account={acc} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}

              {/* Liabilities */}
              {liabilityAccounts.length > 0 && (
                <tr className="bg-[var(--bg-secondary)]/50">
                  <td colSpan={8} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                    Liabilities
                  </td>
                </tr>
              )}
              {liabilityAccounts.map(acc => (
                <AccountRow key={acc.id} account={acc} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}

              {accounts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[var(--text-muted)]">
                    No accounts yet — add one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-[var(--text-muted)] pt-1">
          <span className="flex items-center gap-1">
            <ArrowLeftRight size={12} className="text-blue-400" />
            Transfers column shows: incoming ↓ / outgoing ↑
          </span>
        </div>
      </div>
    </div>
  );
}