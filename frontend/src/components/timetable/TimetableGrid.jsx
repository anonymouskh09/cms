export const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

export function TimetableGrid({ entries, periods, days, emptyMessage, showPublishBadge = false }) {
  const activePeriods = (periods || []).filter((p) => p.status !== 'inactive' && !p.is_break);
  const displayDays = days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  if (!activePeriods.length) {
    return <p className="text-center text-gray-500 py-8">{emptyMessage || 'No periods configured yet.'}</p>;
  }

  const cell = (day, periodId) => {
    const entry = (entries || []).find((e) => e.day_of_week === day && Number(e.timetable_period_id) === Number(periodId));
    if (!entry) return <span className="text-gray-300">—</span>;
    return (
      <div className="text-xs space-y-0.5">
        <p className="font-medium text-gray-900">{entry.subject_name}</p>
        {entry.teacher_name && <p className="text-gray-500">{entry.teacher_name}</p>}
        {entry.room && <p className="text-gray-400">{entry.room}</p>}
        {showPublishBadge && (
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {entry.is_published ? 'Published' : 'Draft'}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-gray-50">
            <th className="border p-2 text-left font-medium text-gray-600 w-28">Period</th>
            {displayDays.map((d) => (
              <th key={d} className="border p-2 text-left font-medium text-gray-600">{DAY_LABELS[d]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activePeriods.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="border p-2 align-top">
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-gray-500">{String(p.start_time || '').slice(0, 5)} – {String(p.end_time || '').slice(0, 5)}</p>
              </td>
              {displayDays.map((d) => (
                <td key={d} className="border p-2 align-top min-w-[120px]">{cell(d, p.id)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
