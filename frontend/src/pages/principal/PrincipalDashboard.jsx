import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KpiCard, { KpiGrid, DashboardHeader } from '../../components/dashboard/KpiCard';
import DashboardCard from '../../components/dashboard/DashboardCard';
import {
  IconUsers,
  IconBook,
  IconCash,
  IconAlert,
  IconCheck,
  IconBuilding,
  IconClipboard,
} from '../../components/dashboard/icons';
import { Card, Spinner, Table, Button } from '../../components/ui';
import { dashboardService } from '../../services/authService';

function formatRs(n) {
  const num = Number(n) || 0;
  if (num >= 100000) return `Rs. ${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `Rs. ${(num / 1000).toFixed(1)}K`;
  return `Rs. ${num}`;
}

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const badge = user?.role === 'school_administrator'
    ? 'School Administrator Portal'
    : user?.role === 'admin'
      ? 'Admin Portal'
      : 'Dashboard';

  useEffect(() => {
    dashboardService.principal().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <DashboardHeader
        badge={badge}
        title="School Overview"
        subtitle="Key metrics for your campus today"
        action={
          <Link to="/principal/academic-setup">
            <Button size="sm">Academic Setup</Button>
          </Link>
        }
      />

      <KpiGrid className="mb-6">
        <KpiCard label="Students" value={data?.total_students} icon={IconUsers} variant="blue" to="/principal/students" />
        <KpiCard label="Teachers" value={data?.total_teachers} icon={IconBook} variant="violet" to="/principal/teachers" />
        <KpiCard label="Classes" value={data?.total_classes} icon={IconBuilding} variant="indigo" to="/principal/classes" />
        <KpiCard label="Present Today" value={data?.present_today} trend={`${data?.attendance_pct || 0}% marked`} icon={IconCheck} variant="emerald" to="/principal/attendance" />
        <KpiCard label="Absent Today" value={data?.absent_today} icon={IconAlert} variant="rose" to="/principal/attendance" />
        <KpiCard label="Fee Defaulters" value={data?.defaulter_count} icon={IconAlert} variant="amber" to="/principal/reports" />
        <KpiCard label="Collected" value={formatRs(data?.monthly_collected)} subtitle="This month" icon={IconCash} variant="emerald" to="/principal/reports" />
        <KpiCard label="Pending Fees" value={formatRs(data?.pending_fees)} icon={IconCash} variant="slate" to="/principal/reports" />
      </KpiGrid>

      <div className="grid lg:grid-cols-2 gap-6">
        <DashboardCard title="Recent Students" icon={<IconUsers className="w-5 h-5" />}>
          <Table columns={[
            { key: 'first_name', label: 'Name', render: (r) => `${r.first_name} ${r.last_name || ''}` },
            { key: 'admission_no', label: 'Admission No' },
            { key: 'roll_no', label: 'Roll No' },
          ]} data={data?.recent_students || []} />
        </DashboardCard>
        <DashboardCard title="Announcements" icon={<IconClipboard className="w-5 h-5" />}>
          <Table columns={[
            { key: 'title', label: 'Title' },
            { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
          ]} data={data?.recent_announcements || []} />
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}
