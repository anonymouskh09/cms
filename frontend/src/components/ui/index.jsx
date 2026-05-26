export function Button({ children, variant = 'primary', className = '', size = 'md', ...props }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-5 py-3 text-base rounded-xl',
  };
  const variants = {
    primary: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-200/50',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm',
    danger: 'bg-white hover:bg-red-50 text-red-600 border border-red-200',
    success: 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-md',
    ghost: 'bg-transparent hover:bg-violet-50 text-violet-700',
  };
  return (
    <button
      className={`font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, help, error, className = '', ...props }) {
  return (
    <div className="mb-5">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <input
        className={`w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 placeholder:text-gray-400 transition-colors outline-none ${
          error ? 'border-red-300 focus:ring-2 focus:ring-red-500/30 focus:border-red-400' : 'border-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400'
        } ${className}`}
        {...props}
      />
      {help && !error && <p className="text-xs text-gray-500 mt-1.5">{help}</p>}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}

export function Select({ label, options = [], className = '', ...props }) {
  return (
    <div className="mb-5">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <select
        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 outline-none ${className}`}
        {...props}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Textarea({ label, help, error, className = '', rows = 4, ...props }) {
  return (
    <div className="mb-5">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <textarea
        rows={rows}
        className={`w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 placeholder:text-gray-400 transition-colors outline-none min-h-[120px] ${
          error ? 'border-red-300 focus:ring-2 focus:ring-red-500/30' : 'border-gray-200 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400'
        } ${className}`}
        {...props}
      />
      {help && !error && <p className="text-xs text-gray-500 mt-1.5">{help}</p>}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}

export function Card({ title, children, className = '', action }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Badge({ status, children }) {
  const colors = {
    active: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    inactive: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
    disabled: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    pending: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    paid: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    partial: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    overdue: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    cancelled: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    present: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    absent: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    late: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200',
    leave: 'bg-violet-100 text-violet-800 ring-1 ring-violet-200',
    draft: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    generated: 'bg-violet-100 text-violet-800 ring-1 ring-violet-200',
    approved: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    archived: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    pending_review: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    easy: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    medium: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    hard: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    completed: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    failed: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    healthy: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    degraded: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  };
  const label = children || status;
  return (
    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${colors[status] || 'bg-gray-100 text-gray-800 ring-1 ring-gray-200'}`}>
      {label}
    </span>
  );
}

export function Alert({ type = 'info', message, onClose }) {
  const colors = {
    info: 'bg-violet-50 text-violet-900 border-violet-200',
    error: 'bg-red-50 text-red-900 border-red-200',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
  };
  if (!message) return null;
  return (
    <div className={`p-4 rounded-2xl border mb-6 flex justify-between items-start gap-4 ${colors[type]}`}>
      <span className="text-sm">{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100">&times;</button>
      )}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-200 border-t-violet-600" />
    </div>
  );
}

export function EmptyState({ message = 'No data found' }) {
  return (
    <div className="text-center py-14 px-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 text-gray-500 text-sm">
      {message}
    </div>
  );
}

export function Table({ columns, data, onRowClick }) {
  if (!data?.length) return <EmptyState />;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              className={`border-b border-gray-100 last:border-0 hover:bg-violet-50/40 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-4 px-4 text-gray-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${sizes[size] || sizes.md} max-h-[90vh] overflow-y-auto border border-gray-200`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({ title, value, subtitle, color = 'purple' }) {
  const colors = {
    blue: 'from-blue-50 to-indigo-50 text-blue-700 border-blue-100',
    green: 'from-emerald-50 to-green-50 text-emerald-700 border-emerald-100',
    red: 'from-red-50 to-rose-50 text-red-700 border-red-100',
    yellow: 'from-amber-50 to-yellow-50 text-amber-700 border-amber-100',
    purple: 'from-violet-50 to-purple-50 text-violet-700 border-violet-100',
  };
  return (
    <div className={`rounded-2xl p-6 bg-gradient-to-br border shadow-sm ${colors[color]}`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-3xl font-bold mt-1 tracking-tight">{value ?? '—'}</p>
      {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
    </div>
  );
}
