import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Input, Alert, Spinner } from '../../components/ui';
import { AttendanceCalendarGrid, AttendanceStatusBadge } from '../../components/attendance/AttendanceCalendar';
import { attendanceService, parentsService } from '../../services/authService';

export default function ParentAttendancePortal() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState('');
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentsService.getChildren()
      .then((r) => {
        setChildren(r.data.data);
        if (r.data.data.length) setSelected(String(r.data.data[0].id));
      })
      .catch(() => setErr('Failed to load children'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    attendanceService.calendar(selected, { month_year: monthYear })
      .then((r) => setData(r.data.data))
      .catch(() => setErr('Failed to load child attendance'))
      .finally(() => setLoading(false));
  }, [selected, monthYear]);

  const child = children.find((c) => String(c.id) === selected);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Child Attendance</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {children.length > 1 && (
        <Card className="mb-4">
          <Select label="Select Child" value={selected} onChange={(e) => setSelected(e.target.value)}
            options={children.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}` }))} />
        </Card>
      )}
      <Card className="mb-4">
        <Input label="Month" type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
      </Card>
      {loading ? <Spinner /> : data && (
        <>
          {child && <p className="text-gray-600 mb-4">Attendance for {child.first_name} {child.last_name || ''}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><p className="text-sm text-gray-500">Present</p><p className="text-2xl font-bold text-green-700">{data.counts?.present || 0}</p></Card>
            <Card><p className="text-sm text-gray-500">Absent</p><p className="text-2xl font-bold text-red-700">{data.counts?.absent || 0}</p></Card>
            <Card><p className="text-sm text-gray-500">Late</p><p className="text-2xl font-bold text-orange-700">{data.counts?.late || 0}</p></Card>
            <Card><p className="text-sm text-gray-500">Attendance %</p><p className="text-2xl font-bold text-blue-700">{data.percentage || 0}%</p></Card>
          </div>
          <Card title="Monthly Calendar">
            <div className="flex flex-wrap gap-2 mb-4">
              {['present', 'absent', 'late', 'leave'].map((s) => <AttendanceStatusBadge key={s} status={s} />)}
            </div>
            <AttendanceCalendarGrid days={data.days} monthYear={monthYear} />
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
