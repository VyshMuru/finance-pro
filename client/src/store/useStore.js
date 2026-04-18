import { create } from 'zustand';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export const useStore = create((set) => ({
  // ── Navigation ────────────────────────────────────────────
  activeSection: 'overview',
  setActiveSection: (section) => set({ activeSection: section }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // ── Period selection ──────────────────────────────────────
  periodMode: 'year',       // 'year' | 'month'
  selectedYear: currentYear,
  selectedMonth: currentMonth,

  setPeriodMode: (mode) => set({ periodMode: mode }),
  setSelectedYear: (year) => set({ selectedYear: year }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),

  // ── Add transaction modal ─────────────────────────────────
  addModalOpen: false,
  addModalType: 'expense',  // 'income' | 'expense'
  openAddModal: (type = 'expense') => set({ addModalOpen: true, addModalType: type }),
  closeAddModal: () => set({ addModalOpen: false }),

  // ── Global refresh trigger ────────────────────────────────
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
