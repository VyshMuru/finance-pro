import React from 'react';
import { useStore } from '../../store/useStore';
import { MONTHS, YEARS } from '../../utils/formatters';
import { Calendar, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export default function PeriodSelector() {
  const { periodMode, setPeriodMode, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useStore();

  return (
    <div className="flex items-center gap-2">
      <Calendar size={14} className="text-[var(--text-muted)]" />

      {/* Mode toggle */}
      <div className="flex bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
        {['year', 'month'].map((m) => (
          <button
            key={m}
            onClick={() => setPeriodMode(m)}
            className={clsx(
              'px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all',
              periodMode === m
                ? 'bg-blue-600 text-white shadow'
                : 'text-[var(--text-muted)] hover:text-white'
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Year selector */}
      <div className="relative">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="select text-xs py-1.5 pl-3 pr-7 h-8"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
      </div>

      {/* Month selector - only when mode = month */}
      {periodMode === 'month' && (
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="select text-xs py-1.5 pl-3 pr-7 h-8"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        </div>
      )}
    </div>
  );
}
