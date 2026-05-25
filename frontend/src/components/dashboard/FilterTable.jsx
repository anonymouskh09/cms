import { useState, useMemo } from 'react';
import EmptyState from './EmptyState';

function cellValue(row, col) {
  if (col.render) return col.render(row);
  return row[col.key];
}

function filterValue(row, col) {
  const raw = col.filterKey ? row[col.filterKey] : row[col.key];
  if (raw == null) return '';
  return String(raw).toLowerCase();
}

export default function FilterTable({ columns, data = [], onRowClick, filterable = true, emptyMessage }) {
  const [filters, setFilters] = useState({});

  const filtered = useMemo(() => {
    if (!filterable) return data;
    return data.filter((row) =>
      columns.every((col) => {
        const f = (filters[col.key] || '').trim().toLowerCase();
        if (!f) return true;
        return filterValue(row, col).includes(f);
      })
    );
  }, [data, columns, filters, filterable]);

  if (!data?.length) return <EmptyState message={emptyMessage || 'No data found'} />;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 align-top">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  {col.label}
                </span>
                {filterable && col.filterable !== false && (
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filters[col.key] || ''}
                    onChange={(e) => setFilters((prev) => ({ ...prev, [col.key]: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs font-normal normal-case tracking-normal border border-gray-200 rounded-lg bg-white text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none"
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                No rows match your filters.
              </td>
            </tr>
          ) : (
            filtered.map((row, i) => (
              <tr
                key={row.id || i}
                className={`border-b border-gray-100 last:border-0 transition-colors hover:bg-violet-50/40 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-4 text-gray-700 align-middle">
                    {cellValue(row, col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
