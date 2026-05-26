import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui';

export default function PrincipalPortalTimetablePage() {
  const links = [
    { title: 'Class timetable', path: '/principal-portal/timetable/class', desc: 'View weekly schedule by class and section' },
    { title: 'Teacher timetable', path: '/principal-portal/timetable/teacher', desc: 'View periods assigned to each teacher' },
    { title: 'Conflict check', path: '/principal-portal/timetable/conflicts', desc: 'See scheduling clashes (read-only)' },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Timetable</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {links.map((l) => (
          <Link key={l.path} to={l.path}>
            <Card className="hover:border-indigo-300 transition h-full">
              <h3 className="font-semibold text-indigo-700">{l.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{l.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
