import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  return '/principal';
}

export default function ReportCardsSetupPage() {
  const { user } = useAuth();
  const base = roleBase(user.role);
  const links = [
    { title: 'Generate Report Card', desc: 'Create a single student report card PDF', path: `${base}/report-cards/generate` },
    { title: 'Class Report Cards', desc: 'Bulk generate and download class report cards', path: `${base}/report-cards/class` },
  ];
  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Report Cards</h2>
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
