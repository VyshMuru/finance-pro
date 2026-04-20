import React from 'react';
import { useStore } from '../../store/useStore';
import clsx from 'clsx';
import {
  LayoutDashboard, TrendingUp, TrendingDown, Landmark,
  LineChart, PieChart, PanelLeftClose, PanelLeftOpen, Plus,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard',  icon: LayoutDashboard, color: 'text-blue-400' },
  { id: 'income',   label: 'Income',    icon: TrendingUp,      color: 'text-green-400' },
  { id: 'expense',  label: 'Expense',   icon: TrendingDown,    color: 'text-red-400' },
  { id: 'accounts', label: 'Accounts',  icon: Landmark,        color: 'text-cyan-400' },
  { id: 'networth', label: 'Net Worth', icon: LineChart,       color: 'text-purple-400' },
  { id: 'budget',   label: 'Budget',    icon: PieChart,        color: 'text-amber-400' },
];

export default function Sidebar() {
  const { activeSection, setActiveSection, sidebarCollapsed, toggleSidebar, openAddModal } = useStore();

  return (
    <aside
      className={clsx(
        'flex flex-col h-full border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-all duration-300 shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-52'
      )}
    >
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]',
        sidebarCollapsed && 'justify-center px-0'
      )}>
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          FP
        </div>
        {!sidebarCollapsed && (
          <div>
            <div className="font-bold text-sm text-white leading-tight">Finance Pro</div>
            <div className="text-[10px] text-[var(--text-muted)]">2026 Tracker</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              sidebarCollapsed ? 'justify-center' : '',
              activeSection === id
                ? 'bg-blue-600/15 text-white border border-blue-500/30'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-white border border-transparent'
            )}
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon size={18} className={activeSection === id ? color : ''} />
            {!sidebarCollapsed && <span>{label}</span>}
            {!sidebarCollapsed && activeSection === id && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
            )}
          </button>
        ))}
      </nav>

      {/* Add transaction button */}
      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={() => openAddModal('expense')}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-colors',
            sidebarCollapsed ? 'justify-center' : ''
          )}
          title={sidebarCollapsed ? 'Add Transaction' : undefined}
        >
          <Plus size={16} />
          {!sidebarCollapsed && 'Add Transaction'}
        </button>
      </div>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
    </aside>
  );
}
