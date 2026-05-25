import { Link } from 'react-router-dom';

const LINKS = [
  { label: 'Timetable', path: '/student/timetable', desc: 'View weekly class schedule', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { label: 'Exam Schedule', path: '/student/exams', desc: 'Upcoming published exams', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  { label: 'Results', path: '/student/results', desc: 'Published exam results', color: 'bg-green-50 text-green-700 border-green-100' },
  { label: 'Report Card', path: '/student/report-card', desc: 'Download report cards', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { label: 'Assignments', path: '/student/assignments', desc: 'View and submit work', color: 'bg-orange-50 text-orange-700 border-orange-100' },
  { label: 'Attendance', path: '/student/attendance-calendar', desc: 'Monthly attendance calendar', color: 'bg-teal-50 text-teal-700 border-teal-100' },
  { label: 'Fee History', path: '/student/payment-history', desc: 'Challans and payments', color: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  { label: 'Announcements', path: '/student/announcements', desc: 'School notices', color: 'bg-gray-50 text-gray-700 border-gray-100' },
];

export default function StudentQuickLinks() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {LINKS.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`block rounded-xl border p-4 transition-shadow hover:shadow-md ${item.color}`}
        >
          <p className="font-semibold">{item.label}</p>
          <p className="text-xs opacity-75 mt-1">{item.desc}</p>
        </Link>
      ))}
    </div>
  );
}
