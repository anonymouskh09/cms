import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
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
import { useOwnerFilter } from '../../context/OwnerFilterContext';

function formatRs(n) {
  const num = Number(n) || 0;
  if (num >= 100000) return `Rs. ${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `Rs. ${(num / 1000).toFixed(1)}K`;
  return `Rs. ${num}`;
}

export default function OwnerDashboard() {
  const { queryParams } = useOwnerFilter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dashboardService.owner(queryParams).then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, [queryParams.institution_id]);

  if (loading) {
    return (
      <DashboardLayout>
        <Spinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ViewOnlyBanner />
      <DashboardHeader
        badge="Owner Portal · View only"
        title="Network overview"
        subtitle="Monitor students, fees, attendance, and activity across all schools"
      />

      <KpiGrid className="mb-6">
        <KpiCard label="Students" value={data?.total_students} icon={IconUsers} variant="blue" to="/owner/students" />
        <KpiCard label="Teachers" value={data?.total_teachers} icon={IconBook} variant="violet" to="/owner/teachers" />
        <KpiCard label="Parents" value={data?.total_parents} icon={IconUsers} variant="indigo" to="/owner/parents" />
        <KpiCard label="Active users" value={data?.active_users} icon={IconBuilding} variant="slate" />
        <KpiCard label="Attendance today" value={`${data?.today_attendance_percentage || 0}%`} icon={IconCheck} variant="emerald" to="/owner/attendance" />
        <KpiCard label="Monthly revenue" value={formatRs(data?.monthly_revenue)} icon={IconCash} variant="emerald" to="/owner/fees" />
        <KpiCard label="Pending fees" value={formatRs(data?.pending_fees)} icon={IconCash} variant="amber" to="/owner/fees" />
        <KpiCard label="Defaulters" value={data?.defaulter_count} icon={IconAlert} variant="rose" to="/owner/fees" />
      </KpiGrid>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Link to="/owner/students" className="p-4 rounded-xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-sm transition">
          <p className="font-semibold text-slate-900">Students</p>
          <p className="text-sm text-slate-500 mt-1">Profiles, parents, fee history</p>
        </Link>
        <Link to="/owner/teachers" className="p-4 rounded-xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-sm transition">
          <p className="font-semibold text-slate-900">Teachers</p>
          <p className="text-sm text-slate-500 mt-1">Assignments and timetables</p>
        </Link>
        <Link to="/owner/institutions" className="p-4 rounded-xl bg-white border border-slate-200 hover:border-violet-300 hover:shadow-sm transition">
          <p className="font-semibold text-slate-900">Institutions</p>
          <p className="text-sm text-slate-500 mt-1">Schools in your network</p>
        </Link>
      </div>

      <DashboardCard title="Recent activity" subtitle="Latest actions in the system">
        <Table
          columns={[
            { key: 'action', label: 'Action' },
            { key: 'module', label: 'Module' },
            { key: 'created_at', label: 'Time', render: (r) => new Date(r.created_at).toLocaleString() },
          ]}
          data={data?.recent_activity || []}
        />
      </DashboardCard>
    </DashboardLayout>
  );
}
