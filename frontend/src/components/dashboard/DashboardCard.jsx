export default function DashboardCard({ title, subtitle, icon, action, children, className = '', padding = 'p-6 md:p-8' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${padding} ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex gap-3 min-w-0">
            {icon && (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
