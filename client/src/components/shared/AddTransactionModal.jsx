import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { api } from '../../api/index';
import { X, Plus } from 'lucide-react';
import clsx from 'clsx';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investments', 'Rental', 'Bonus', 'Other Income'];
const EXPENSE_CATEGORIES = ['Housing', 'Groceries', 'Transport', 'Dining', 'Utilities', 'Health', 'Entertainment', 'Shopping', 'Subscriptions', 'Savings', 'Education', 'Other'];

export default function AddTransactionModal() {
  const { addModalOpen, addModalType, closeAddModal, triggerRefresh } = useStore();
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: addModalType,
    date: new Date().toISOString().split('T')[0],
    category: '',
    subcategory: '',
    account_id: '',
    amount: '',
    notes: '',
  });

  useEffect(() => {
    if (addModalOpen) {
      setForm(f => ({ ...f, type: addModalType, category: '', amount: '' }));
      api.accounts.list().then(setAccounts).catch(() => {});
    }
  }, [addModalOpen, addModalType]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.category || !form.amount) return;
    setSaving(true);
    try {
      await api.transactions.create({
        ...form,
        amount: parseFloat(form.amount),
        account_id: form.account_id ? parseInt(form.account_id) : null,
      });
      triggerRefresh();
      closeAddModal();
    } catch (err) {
      alert('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!addModalOpen) return null;

  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

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
          {['income','expense'].map((t) => (
            <button
              key={t}
              onClick={() => set('type', t)}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all',
                form.type === t
                  ? t === 'income' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  : 'text-[var(--text-muted)] hover:text-white'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="input text-sm" required />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Amount *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0.00" className="input text-sm" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Category *</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="select text-sm" required>
                <option value="">Select...</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Subcategory</label>
              <input type="text" value={form.subcategory} onChange={e => set('subcategory', e.target.value)}
                placeholder="Optional" className="input text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Account</label>
            <select value={form.account_id} onChange={e => set('account_id', e.target.value)} className="select text-sm">
              <option value="">None</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Notes</label>
            <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Optional description" className="input text-sm" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeAddModal} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className={clsx('flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white transition-colors',
                form.type === 'income' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
              )}>
              {saving ? 'Saving...' : <><Plus size={15}/> Add {form.type}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
