import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KpiCard, { KpiGrid, DashboardHeader } from '../../components/dashboard/KpiCard';
import {
  IconUsers,
  IconClipboard,
  IconCheck,
  IconCash,
} from '../../components/dashboard/icons';
import { Card, Badge, Alert, Spinner } from '../../components/ui';
import { dashboardService } from '../../services/authService';

export default function ParentDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.parent()
      .then((res) => setData(res.data.data))
      .catch(() => setErr('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  const children = data?.children || [];
  const hasMultipleInstitutions = new Set(children.map((c) => c.institution_id)).size > 1;
  const presentToday = children.filter((c) => c.today_attendance === 'present').length;
  const absentToday = children.filter((c) => c.today_attendance === 'absent').length;
  const pendingTotal = children.reduce((s, c) => s + (c.pending_assignments || 0), 0);
  const avgAttendance = children.length
    ? Math.round(children.reduce((s, c) => s + (c.attendance_percentage || 0), 0) / children.length)
    : 0;
  const feePending = children.filter((c) => c.current_challan && ['pending', 'overdue'].includes(c.current_challan.status)).length;

  return (
    <DashboardLayout>
      <DashboardHeader badge="Parent Portal" title="Family Overview" subtitle="Track all your children in one place" />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      {!children.length ? (
        <Card>
          <p className="text-gray-600">No linked children found. Contact the school administrator.</p>
        </Card>
      ) : (
        <>
          <KpiGrid className="mb-6">
            <KpiCard label="Children" value={children.length} icon={IconUsers} variant="blue" to="/parent/children" />
            <KpiCard label="Present Today" value={presentToday} subtitle={absentToday ? `${absentToday} absent` : undefined} icon={IconCheck} variant="emerald" />
            <KpiCard label="Avg Attendance" value={`${avgAttendance}%`} subtitle="This month" icon={IconCheck} variant="violet" />
            <KpiCard label="Pending Work" value={pendingTotal} icon={IconClipboard} variant="amber" />
            <KpiCard label="Fee Pending" value={feePending} icon={IconCash} variant="rose" />
          </KpiGrid>

          <div className="grid md:grid-cols-2 gap-6">
            {children.map((child) => (
              <Card key={child.id} title={`${child.first_name} ${child.last_name || ''}`} className="!rounded-2xl">
                {hasMultipleInstitutions && child.institution_name && (
                  <span className="inline-block mb-2 px-2 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-medium">
                    {child.institution_name}
                  </span>
                )}
                <p className="text-sm text-gray-600 mb-4">
                  {child.class_name}{child.section_name ? ` · ${child.section_name}` : ''}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-gray-500 text-xs">Today</p>
                    <Badge status={child.today_attendance === 'present' ? 'present' : child.today_attendance === 'absent' ? 'absent' : 'pending'} />
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-gray-500 text-xs">Monthly %</p>
                    <p className="font-bold text-lg text-gray-900">{child.attendance_percentage}%</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-gray-500 text-xs">Pending Work</p>
                    <p className="font-bold text-lg text-gray-900">{child.pending_assignments || 0}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-gray-500 text-xs">Fee</p>
                    <Badge status={child.current_challan?.status || 'pending'} />
                  </div>
                </div>
                <Link
                  to={`/parent/child/${child.id}/timetable`}
                  className="text-violet-600 text-sm font-medium mt-4 inline-block hover:underline"
                >
                  View all details →
                </Link>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <Link to="/parent/children" className="text-violet-600 font-medium hover:underline">
              Browse all children →
            </Link>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
