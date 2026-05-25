import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/principal';
}

export default function AttendanceHubPage() {
  const { user } = useAuth();
  const base = roleBase(user.role);
  const links = [
    { title: 'Mark Attendance', path: `${base}/attendance/mark`, desc: 'Daily attendance marking' },
    { title: 'Attendance Calendar', path: `${base}/attendance/calendar`, desc: 'Monthly calendar view' },
    { title: 'Class Report', path: `${base}/attendance/reports/class`, desc: 'Class-wise summary' },
    { title: 'Student Report', path: `${base}/attendance/reports/student`, desc: 'Individual student report' },
    { title: 'Absentee List', path: `${base}/attendance/reports/absentees`, desc: 'Daily absent students' },
    { title: 'Late Arrivals', path: `${base}/attendance/reports/late`, desc: 'Late arrival report' },
    { title: 'Correction Requests', path: `${base}/attendance/corrections`, desc: 'Review correction requests' },
  ];
  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Attendance</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
