import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  return '/principal';
}

export default function ExamSetupPage() {
  const { user } = useAuth();
  const base = roleBase(user.role);
  const links = [
    { title: 'Exam Types', desc: 'Midterm, Final, Monthly Test', path: `${base}/exams/types` },
    { title: 'Exams', desc: 'Create and manage exams', path: `${base}/exams/list` },
    { title: 'Exam Calendar', desc: 'View all schedules by date', path: `${base}/exams/calendar` },
    { title: 'Published Exams', desc: 'Overview of published exam schedules', path: `${base}/exams/published` },
  ];
  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Exam Management</h2>
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
