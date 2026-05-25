import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function TimetableSetupPage() {
  const { user } = useAuth();
  const base = `/${user.role === 'owner' ? 'owner' : user.role === 'admin' ? 'admin' : 'principal'}`;

  const links = [
    { title: 'Period Management', desc: 'Create and manage school periods / time slots', path: `${base}/timetable/periods` },
    { title: 'Class Timetable', desc: 'Build class-wise or section-wise timetable', path: `${base}/timetable/class` },
    { title: 'Teacher Timetable', desc: 'View timetable by teacher', path: `${base}/timetable/teacher` },
    { title: 'Conflict Checker', desc: 'Check scheduling conflicts before saving', path: `${base}/timetable/conflicts` },
  ];

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Timetable Setup</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {links.map((l) => (
          <Link key={l.path} to={l.path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <h3 className="font-semibold text-gray-900">{l.title}</h3>
              <p className="text-sm text-gray-500 mt-2">{l.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}
