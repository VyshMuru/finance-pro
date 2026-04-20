export const fmt = {
  currency: (n, compact = false) => {
    if (n == null || isNaN(n)) return '$0';
    if (compact && Math.abs(n) >= 1000) {
      return new Intl.NumberFormat('en-CA', {
        style: 'currency', currency: 'CAD',
        notation: 'compact', maximumFractionDigits: 1,
      }).format(n);
    }
    return new Intl.NumberFormat('en-CA', {
      style: 'currency', currency: 'CAD', minimumFractionDigits: 2,
    }).format(n);
  },

  percent: (n) => {
    if (n == null || isNaN(n)) return '0.0%';
    return `${Number(n).toFixed(1)}%`;
  },

  date: (str) => {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  },

  monthName: (mm) => {
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return names[parseInt(mm, 10) - 1] || mm;
  },

  number: (n) => {
    if (n == null || isNaN(n)) return '0';
    return new Intl.NumberFormat('en-CA').format(n);
  },
};

export const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September'},{ value: 10, label: 'October' },
  { value: 11, label: 'November'},{ value: 12, label: 'December' },
];

export const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i);

export const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'loan', 'loc', 'other'];

export const TYPE_COLORS = {
  income:  '#22c55e',
  expense: '#ef4444',
  asset:   '#3b82f6',
  worth:   '#a855f7',
  budget:  '#f59e0b',
  loc:     '#f97316',
};

export const CATEGORY_COLORS = [
  '#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7',
  '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
  '#8b5cf6','#fb923c','#0ea5e9','#a3e635','#f43f5e',
];
