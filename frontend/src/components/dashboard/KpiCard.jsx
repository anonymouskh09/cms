import { Link } from 'react-router-dom';

const VARIANTS = {
  violet: {
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    shadow: 'shadow-violet-500/25',
    ring: 'ring-violet-400/20',
  },
  blue: {
    gradient: 'from-blue-600 via-blue-500 to-cyan-600',
    shadow: 'shadow-blue-500/25',
    ring: 'ring-blue-400/20',
  },
  emerald: {
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    shadow: 'shadow-emerald-500/25',
    ring: 'ring-emerald-400/20',
  },
  amber: {
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    shadow: 'shadow-amber-500/25',
    ring: 'ring-amber-400/20',
  },
  rose: {
    gradient: 'from-rose-600 via-pink-600 to-red-600',
    shadow: 'shadow-rose-500/25',
    ring: 'ring-rose-400/20',
  },
  indigo: {
    gradient: 'from-indigo-600 via-violet-600 to-purple-700',
    shadow: 'shadow-indigo-500/25',
    ring: 'ring-indigo-400/20',
  },
  slate: {
    gradient: 'from-slate-700 via-slate-600 to-slate-800',
    shadow: 'shadow-slate-500/20',
    ring: 'ring-slate-400/20',
  },
};

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

export default function KpiCard({
  label,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant = 'violet',
  to,
  className = '',
}) {
  const v = VARIANTS[variant] || VARIANTS.violet;

  const inner = (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${v.gradient} p-4 sm:p-5 text-white shadow-lg ${v.shadow} ring-1 ${v.ring} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${className}`}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-black/10 blur-xl" />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white/80 truncate">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold mt-1.5 tracking-tight leading-none">
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-white/70 mt-1.5 truncate">{subtitle}</p>
          )}
          {trend && (
            <p className="text-[10px] sm:text-xs font-medium text-white/90 mt-2 inline-flex items-center gap-1">
              <span className="opacity-80">↗</span> {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-2xl">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function KpiGrid({ children, className = '' }) {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {children}
    </div>
  );
}

export function DashboardHeader({ title, subtitle, badge, action }) {
  const dateStr = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        {badge && (
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full mb-2">
            {badge}
          </span>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle || dateStr}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
