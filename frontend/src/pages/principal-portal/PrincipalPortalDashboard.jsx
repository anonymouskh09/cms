import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KpiCard, { KpiGrid, DashboardHeader } from '../../components/dashboard/KpiCard';
import DashboardCard from '../../components/dashboard/DashboardCard';
import { IconUsers, IconBook, IconBuilding, IconCheck, IconAlert, IconCash, IconClipboard } from '../../components/dashboard/icons';
import { Card, Spinner, Table } from '../../components/ui';
import { dashboardService } from '../../services/authService';

function formatRs(n) {
  const num = Number(n) || 0;
  if (num >= 100000) return `Rs. ${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `Rs. ${(num / 1000).toFixed(1)}K`;
  return `Rs. ${num}`;
}

export default function PrincipalPortalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.principalPortal().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <DashboardHeader
        badge="Principal Portal"
        title="Campus Overview"
        subtitle="Monitor attendance, exams, results, fees, and parent communication"
      />
      <KpiGrid className="mb-6">
        <KpiCard label="Students" value={data?.total_students} icon={IconUsers} variant="blue" to="/principal-portal/students" />
        <KpiCard label="Teachers" value={data?.total_teachers} icon={IconBook} variant="violet" to="/principal-portal/teachers" />
        <KpiCard label="Classes" value={data?.total_classes} icon={IconBuilding} variant="indigo" to="/principal-portal/classes" />
        <KpiCard label="Student Attendance %" value={`${data?.student_attendance_pct || 0}%`} icon={IconCheck} variant="emerald" to="/principal-portal/attendance" />
        <KpiCard label="Absent Students" value={data?.absent_students_today} icon={IconAlert} variant="rose" to="/principal-portal/attendance" />
        <KpiCard label="Upcoming Exams" value={data?.upcoming_exams} icon={IconClipboard} variant="amber" to="/principal-portal/exams" />
        <KpiCard label="Pending Results" value={data?.pending_results} icon={IconClipboard} variant="slate" to="/principal-portal/results" />
        <KpiCard label="Fee Collection %" value={`${data?.fee_collection_pct || 0}%`} icon={IconCash} variant="emerald" to="/principal-portal/fees" />
        <KpiCard label="Pending Fees" value={formatRs(data?.pending_fees)} icon={IconCash} variant="amber" to="/principal-portal/fees" />
        <KpiCard label="Defaulters" value={data?.defaulter_count} icon={IconAlert} variant="rose" to="/principal-portal/fees" />
        <KpiCard label="Parent Messages" value={data?.unread_messages} icon={IconUsers} variant="blue" to="/principal-portal/parents" />
        <KpiCard label="Meeting Requests" value={data?.pending_meetings} icon={IconClipboard} variant="violet" to="/principal-portal/parents" />
      </KpiGrid>
      <div className="grid lg:grid-cols-2 gap-6">
        <DashboardCard title="Class Attendance Today">
          <Table
            columns={[
              { key: 'class_name', label: 'Class' },
              { key: 'pct', label: 'Present %', render: (r) => `${r.pct}%` },
            ]}
            data={data?.class_attendance || []}
          />
        </DashboardCard>
        <DashboardCard title="Repeated Absentees (7 days)">
          <Table
            columns={[
              { key: 'first_name', label: 'Name', render: (r) => `${r.first_name} ${r.last_name || ''}` },
              { key: 'roll_no', label: 'Roll' },
              { key: 'absent_days', label: 'Absent days' },
            ]}
            data={data?.repeated_absentees || []}
          />
        </DashboardCard>
        <DashboardCard title="Recent Announcements">
          <Table
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
            ]}
            data={data?.recent_announcements || []}
          />
        </DashboardCard>
        <Card>
          <h3 className="font-semibold text-slate-800 mb-2">Quick links</h3>
          <ul className="space-y-1 text-sm text-indigo-600">
            <li><Link to="/principal-portal/timetable">View timetables</Link></li>
            <li><Link to="/principal-portal/announcements">Create announcement</Link></li>
            <li><Link to="/principal-portal/results">Approve results</Link></li>
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}
