export default function PageHeader({ title, subtitle, pill, action }) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-1.5 text-base max-w-2xl">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {pill ? (
          <span className="px-4 py-2 rounded-full bg-violet-50 border border-violet-200 text-sm font-medium text-violet-800 shadow-sm">
            {pill}
          </span>
        ) : (
          <span className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-600 shadow-sm">
            {dateStr}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}
