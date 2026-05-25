import { useEffect, useState } from 'react';
import { Card, Input } from '../../components/ui';
import { AttendanceCalendarGrid, AttendanceStatusBadge } from '../../components/attendance/AttendanceCalendar';
import { attendanceService } from '../../services/authService';
import ParentChildShell from './ParentChildShell';

export default function ParentChildAttendancePage() {
  return (
    <ParentChildShell title="Child Attendance Calendar">
      {({ studentId }) => <AttendanceContent studentId={studentId} />}
    </ParentChildShell>
  );
}

function AttendanceContent({ studentId }) {
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    attendanceService.calendar(studentId, { month_year: monthYear })
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [studentId, monthYear]);

  if (loading) return null;

  return (
    <>
      <Card className="mb-4">
        <Input label="Month" type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
      </Card>
      {data && (
        <>
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
    </>
  );
}
