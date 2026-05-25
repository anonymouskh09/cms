import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KpiCard, { KpiGrid, DashboardHeader } from '../../components/dashboard/KpiCard';
import DashboardCard from '../../components/dashboard/DashboardCard';
import {
  IconUsers,
  IconBook,
  IconCash,
  IconCheck,
  IconAlert,
  IconBuilding,
} from '../../components/dashboard/icons';
import { Spinner, Table } from '../../components/ui';
import { dashboardService } from '../../services/authService';

function formatRs(n) {
  const num = Number(n) || 0;
  if (num >= 100000) return `Rs. ${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `Rs. ${(num / 1000).toFixed(1)}K`;
  return `Rs. ${num}`;
}

export default function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [institutionFilter, setInstitutionFilter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = institutionFilter ? { institution_id: institutionFilter } : {};
    dashboardService.owner(params).then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, [institutionFilter]);

  if (loading) {
    return (
      <DashboardLayout institutionFilter={institutionFilter} onInstitutionFilterChange={setInstitutionFilter}>
        <Spinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout institutionFilter={institutionFilter} onInstitutionFilterChange={setInstitutionFilter}>
      <DashboardHeader badge="Owner Portal" title="Network Overview" subtitle="All institutions — live KPIs" />

      <KpiGrid className="mb-6">
        <KpiCard label="Students" value={data?.total_students} icon={IconUsers} variant="blue" />
        <KpiCard label="Teachers" value={data?.total_teachers} icon={IconBook} variant="violet" />
        <KpiCard label="Parents" value={data?.total_parents} icon={IconUsers} variant="indigo" />
        <KpiCard label="Active Users" value={data?.active_users} icon={IconBuilding} variant="slate" />
        <KpiCard label="Attendance Today" value={`${data?.today_attendance_percentage || 0}%`} icon={IconCheck} variant="emerald" />
        <KpiCard label="Monthly Revenue" value={formatRs(data?.monthly_revenue)} icon={IconCash} variant="emerald" />
        <KpiCard label="Pending Fees" value={formatRs(data?.pending_fees)} icon={IconCash} variant="amber" />
        <KpiCard label="Defaulters" value={data?.defaulter_count} icon={IconAlert} variant="rose" />
      </KpiGrid>

      <DashboardCard title="Recent Activity" subtitle="Latest system actions">
        <Table columns={[
          { key: 'action', label: 'Action' },
          { key: 'module', label: 'Module' },
          { key: 'created_at', label: 'Time', render: (r) => new Date(r.created_at).toLocaleString() },
        ]} data={data?.recent_activity || []} />
      </DashboardCard>
    </DashboardLayout>
  );
}
