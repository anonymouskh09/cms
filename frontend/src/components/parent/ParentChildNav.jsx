import { NavLink, useParams } from 'react-router-dom';

const SECTIONS = [
  { key: 'timetable', label: 'Timetable' },
  { key: 'exams', label: 'Exams' },
  { key: 'results', label: 'Results' },
  { key: 'report-card', label: 'Report Card' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'attendance-calendar', label: 'Attendance' },
  { key: 'payment-history', label: 'Fees' },
];

export default function ParentChildNav() {
  const { studentId } = useParams();
  if (!studentId) return null;

  return (
    <nav className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-3">
      {SECTIONS.map((s) => (
        <NavLink
          key={s.key}
          to={`/parent/child/${studentId}/${s.key}`}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`
          }
        >
          {s.label}
        </NavLink>
      ))}
    </nav>
  );
}
