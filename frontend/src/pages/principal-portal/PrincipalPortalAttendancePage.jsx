import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Card, Input, Table, Spinner, Badge } from '../../components/ui';
import { attendanceService } from '../../services/authService';
import { useMonitoring, mergeScope } from '../monitoring/MonitoringContext';

export default function PrincipalPortalAttendancePage() {
  const { scopeParams, showBanner } = useMonitoring();
  const [summary, setSummary] = useState(null);
  const [absentees, setAbsentees] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      attendanceService.summary(mergeScope(scopeParams, { date })),
      attendanceService.absentees(mergeScope(scopeParams, { date })),
    ]).then(([s, a]) => {
      setSummary(s.data.data);
      setAbsentees(a.data.data?.students || a.data.data || []);
    }).finally(() => setLoading(false));
  }, [date, scopeParams.institution_id]);

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <h1 className="text-2xl font-bold mb-2">Attendance</h1>
      <p className="text-slate-500 text-sm mb-4">View-only monitoring</p>
      <Card className="mb-4">
        <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Card>
      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><p className="text-sm text-slate-500">Present</p><p className="text-2xl font-bold">{summary?.present ?? 0}</p></Card>
            <Card><p className="text-sm text-slate-500">Absent</p><p className="text-2xl font-bold text-rose-600">{summary?.absent ?? 0}</p></Card>
            <Card><p className="text-sm text-slate-500">Late</p><p className="text-2xl font-bold text-amber-600">{summary?.late ?? 0}</p></Card>
            <Card><p className="text-sm text-slate-500">Marked %</p><p className="text-2xl font-bold">{summary?.percentage ?? 0}%</p></Card>
          </div>
          <h2 className="font-semibold mb-2">Absentees today</h2>
          <Table
            columns={[
              { key: 'first_name', label: 'Student', render: (r) => `${r.first_name || r.student_name || ''} ${r.last_name || ''}` },
              { key: 'class_name', label: 'Class' },
              { key: 'status', label: 'Status', render: () => <Badge variant="danger">Absent</Badge> },
            ]}
            data={Array.isArray(absentees) ? absentees : []}
          />
        </>
      )}
    </DashboardLayout>
  );
}
