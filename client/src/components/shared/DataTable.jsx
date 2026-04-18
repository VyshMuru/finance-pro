import React, { useState, useMemo } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender } from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Trash2, Search } from 'lucide-react';
import clsx from 'clsx';

export default function DataTable({ columns, data, onDelete, onUpdate, pageSize = 15, searchPlaceholder = 'Search...' }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnId }
  const [editValue, setEditValue] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const startEdit = (rowId, columnId, value) => {
    setEditingCell({ rowId, columnId });
    setEditValue(String(value ?? ''));
  };

  const commitEdit = (row, columnId) => {
    if (onUpdate) {
      onUpdate(row.original, columnId, editValue);
    }
    setEditingCell(null);
  };

  const SortIcon = ({ col }) => {
    const sorted = col.getIsSorted();
    if (sorted === 'asc') return <ChevronUp size={12} />;
    if (sorted === 'desc') return <ChevronDown size={12} />;
    return <ChevronsUpDown size={12} className="opacity-30" />;
  };

  const { rows } = table.getRowModel();
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="input pl-9 text-sm h-9"
        />
      </div>

      {/* Table container */}
      <div className="flex-1 overflow-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className={clsx(
                      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border)] whitespace-nowrap',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-white'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && <SortIcon col={header.column} />}
                    </div>
                  </th>
                ))}
                {(onDelete || onUpdate) && (
                  <th className="px-4 py-3 border-b border-[var(--border)] w-12" />
                )}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="text-center py-12 text-[var(--text-muted)]">
                  No data found
                </td>
              </tr>
            ) : rows.map(row => (
              <tr key={row.id} className="table-row">
                {row.getVisibleCells().map(cell => {
                  const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === cell.column.id;
                  const editable = cell.column.columnDef.editable;
                  return (
                    <td
                      key={cell.id}
                      className={clsx('px-4 py-2.5 text-[var(--text-dim)] whitespace-nowrap', editable && 'editable-cell')}
                      onDoubleClick={() => editable && startEdit(row.id, cell.column.id, cell.getValue())}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(row, cell.column.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') commitEdit(row, cell.column.id);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="w-full bg-[var(--bg-secondary)] border border-blue-500 rounded px-2 py-1 text-sm text-white outline-none"
                        />
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  );
                })}
                {onDelete && (
                  <td className="px-2 py-2.5 text-center">
                    <button
                      onClick={() => onDelete(row.original)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-xs text-[var(--text-muted)]">
        <span>{totalRows} row{totalRows !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
