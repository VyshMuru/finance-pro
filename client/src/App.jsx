import React from 'react';
import { useStore } from './store/useStore';
import Sidebar from './components/Layout/Sidebar';
import PeriodSelector from './components/Layout/PeriodSelector';
import AddTransactionModal from './components/shared/AddTransactionModal';
import Overview from './components/sections/Overview';
import Income from './components/sections/Income';
import Expense from './components/sections/Expense';
import Accounts from './components/sections/Accounts';
import NetWorth from './components/sections/NetWorth';
import Budget from './components/sections/Budget';
import { fmt, MONTHS } from './utils/formatters';

const SECTION_META = {
  overview: { label: 'Overview',  emoji: '📊' },
  income:   { label: 'Income',    emoji: '💰' },
  expense:  { label: 'Expense',   emoji: '💸' },
  accounts: { label: 'Accounts',  emoji: '🏦' },
  networth: { label: 'Net Worth', emoji: '📈' },
  budget:   { label: 'Budget',    emoji: '🎯' },
};

const SECTIONS = { overview: Overview, income: Income, expense: Expense, accounts: Accounts, networth: NetWorth, budget: Budget };

export default function App() {
  const { activeSection, periodMode, selectedYear, selectedMonth } = useStore();
  const ActiveSection = SECTIONS[activeSection] || Overview;
  const meta = SECTION_META[activeSection] || SECTION_META.overview;

  const periodLabel = periodMode === 'month'
    ? `${MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}`
    : `${selectedYear}`;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">{meta.emoji}</span>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">{meta.label}</h1>
              <p className="text-xs text-[var(--text-muted)]">{periodLabel}</p>
            </div>
          </div>
          <PeriodSelector />
        </header>

        {/* Section content */}
        <main className="flex-1 overflow-hidden p-5">
          <ActiveSection />
        </main>
      </div>

      {/* Global modal */}
      <AddTransactionModal />
    </div>
  );
}
