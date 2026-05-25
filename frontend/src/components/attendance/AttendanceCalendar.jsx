const statusStyles = {
  present: 'bg-green-50 border-green-200',
  absent: 'bg-red-50 border-red-200',
  late: 'bg-orange-50 border-orange-200',
  leave: 'bg-blue-50 border-blue-200',
};

export function AttendanceStatusBadge({ status }) {
  const badgeColors = {
    present: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    late: 'bg-orange-100 text-orange-800',
    leave: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const label = (status || 'not marked').replace(/_/g, ' ');
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${badgeColors[status] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}

export function AttendanceCalendarGrid({ days, monthYear }) {
  const [year, month] = monthYear.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const map = {};
  (days || []).forEach((d) => {
    map[String(d.attendance_date).slice(0, 10)] = d.status;
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, status: map[dateStr] || null, dateStr });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => (
          cell ? (
            <div
              key={cell.dateStr}
              className={`min-h-[52px] p-1 rounded-lg border text-center ${cell.status ? statusStyles[cell.status] : 'bg-gray-50 border-gray-100'}`}
            >
              <div className="text-sm font-medium text-gray-800">{cell.day}</div>
              {cell.status && <div className="text-[10px] capitalize mt-1 text-gray-600">{cell.status}</div>}
            </div>
          ) : <div key={`empty-${i}`} />
        ))}
      </div>
    </div>
  );
}
