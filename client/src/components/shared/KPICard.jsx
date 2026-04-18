import React from 'react';
import clsx from 'clsx';

export default function KPICard({ label, value, sub, color = 'text-white', icon, trend, className }) {
  return (
    <div className={clsx('card p-4 flex flex-col gap-1 min-w-0', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="kpi-label truncate">{label}</span>
        {icon && <span className="text-lg shrink-0">{icon}</span>}
      </div>
      <div className={clsx('kpi-value truncate', color)}>{value}</div>
      {sub && (
        <div className="text-xs text-[var(--text-muted)] truncate">{sub}</div>
      )}
      {trend != null && (
        <div className={clsx('text-xs font-medium', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
