import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../api/index';
import { X, Plus } from 'lucide-react';
import clsx from 'clsx';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Rental', 'Bonus', 'Other Income'];
const EXPENSE_CATEGORIES = ['Housing', 'Groceries', 'Transport', 'Dining', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Subscriptions', 'Education', 'Other'];

const TYPE_STYLES = {
  income:   { bg: 'bg-green-600 hover:bg-green-500',  border: 'border-green-500/30',  label: 'Income'   },
  expense:  { bg: 'bg-red-600 hover:bg-red-500',      border: 'border-red-500/30',    label: 'Expense'  },
  transfer: { bg: 'bg-blue-600 hover:bg-blue-500',    border: 'border-blue-500/30',   label: 'Transfer' },
};

export default function AddTransactionModal() {
  const { addModalOpen, addModalType, closeAddModal, triggerRefresh } = useStore();
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: '',
    subcategory: '',
    account_id: '',
    to_account_id: '',
    amount: '',
    notes: '',
  });

  useEffect(() => {
    if (addModalOpen) {
      setForm(f => ({
        ...f,
        type: addModalType,
        category: '',
        amount: '',
        to_account_id: '',
        subcategory: '',
        notes: '',
      }));
      setError('');
      api.accounts.list().then(setAccounts).catch(() => {});
    }
  }, [addModalOpen, addModalType]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ── Validation ─────────────────────────────────────────
    if (!form.date || !form.amount) {
      setError('Date and amount are required');
      return;
    }

    if (form.type === 'transfer') {
      if (!form.account_id || !form.to_account_id) {
        setError('Please select both From and To accounts');
        return;
      }
      if (form.account_id === form.to_account_id) {
        setError('From and To accounts must be different');
        return;
      }
    }

    if ((form.type === 'income' || form.type === 'expense') && !form.category) {
      setError('Please select a category');
      return;
    }

    setSaving(true);
    try {
      await api.transactions.create({
        ...form,
        amount: parseFloat(form.amount),
        account_id: form.account_id ? parseInt(form.account_id) : null,
        to_account_id: form.to_account_id ? parseInt(form.to_account_id) : null,
        category: form.type === 'transfer' ? 'Transfer' : form.category,
      });
      triggerRefresh();
      closeAddModal();
    } catch (err) {
      setError(err.message || 'Error saving transaction');
    } finally {
      setSaving(false);
    }
  };

  if (!addModalOpen) return null;

  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const style = TYPE_STYLES[form.type];

  // Filter out the selected from account for to_account dropdown
  const toAccountOptions = accounts.filter(a => String(a.id) !== String(form.account_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAddModal} />
      <div className="relative card w-full max-w-md p-6 shadow-2xl z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Add Transaction</h2>
          <button onClick={closeAddModal} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 mb-5 gap-1">
          {['income', 'expense', 'transfer'].map((t) => (
            <button
              key={t}
              onClick={() => set('type', t)}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all',
                form.type === t
                  ? TYPE_STYLES[t].bg + ' text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Date *</label>
              <input type="date" value={form.date}
                onChange={e => set('date', e.target.value)}
                className="input text-sm" required />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Amount *</label>
              <input type="number" step="0.01" min="0"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00" className="input text-sm" required />
            </div>
          </div>

          {/* Transfer fields */}
          {form.type === 'transfer' && (
            <>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">From Account *</label>
                <select value={form.account_id}
                  onChange={e => set('account_id', e.target.value)}
                  className="select text-sm" required>
                  <option value="">Select account...</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">To Account *</label>
                <select value={form.to_account_id}
                  onChange={e => set('to_account_id', e.target.value)}
                  className="select text-sm" required>
                  <option value="">Select account...</option>
                  {toAccountOptions.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Income/Expense fields */}
          {form.type !== 'transfer' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Category *</label>
                  <select value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className="select text-sm" required>
                    <option value="">Select...</option>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">Subcategory</label>
                  <input type="text" value={form.subcategory}
                    onChange={e => set('subcategory', e.target.value)}
                    placeholder="Optional" className="input text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Account</label>
                <select value={form.account_id}
                  onChange={e => set('account_id', e.target.value)}
                  className="select text-sm">
                  <option value="">None</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Notes - always visible */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Notes</label>
            <input type="text" value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional description" className="input text-sm" />
          </div>

          {/* Transfer summary preview */}
          {form.type === 'transfer' && form.account_id && form.to_account_id && form.amount && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              <p className="font-semibold mb-1">Transfer Summary</p>
              <p>{accounts.find(a => String(a.id) === String(form.account_id))?.name} → {accounts.find(a => String(a.id) === String(form.to_account_id))?.name}</p>
              <p className="font-bold text-blue-400 mt-1">${parseFloat(form.amount || 0).toFixed(2)}</p>
              <p className="text-blue-400/70 mt-1">Net worth will not change ✓</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeAddModal} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white transition-colors',
                style.bg
              )}>
              {saving ? 'Saving...' : <><Plus size={15} /> Add {style.label}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}