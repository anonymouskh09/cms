import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Input, Alert, Spinner, EmptyState } from '../../components/ui';
import { AttendanceCalendarGrid, AttendanceStatusBadge } from '../../components/attendance/AttendanceCalendar';
import { attendanceService, studentsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/principal';
}

export default function AttendanceCalendarPage() {
  const { user } = useAuth();
  const base = roleBase(user.role);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    studentsService.list().then((r) => {
      setStudents(r.data.data);
      if (r.data.data.length) setStudentId(String(r.data.data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    attendanceService.calendar(studentId, { month_year: monthYear })
      .then((r) => setData(r.data.data))
      .catch(() => setErr('Failed to load calendar'))
      .finally(() => setLoading(false));
  }, [studentId, monthYear]);

  return (
    <DashboardLayout>
      <Link to={`${base}/attendance`} className="text-sm text-blue-600 hover:underline">← Attendance Hub</Link>
      <h2 className="text-2xl font-bold mt-2 mb-6">Attendance Calendar</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Student" value={studentId} onChange={(e) => setStudentId(e.target.value)}
            options={[{ value: '', label: 'Select student' }, ...students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name || ''}` }))]} />
          <Input label="Month" type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
        </div>
      </Card>
      {loading ? <Spinner /> : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><p className="text-sm text-gray-500">Present</p><p className="text-2xl font-bold text-green-700">{data.counts?.present || 0}</p></Card>
            <Card><p className="text-sm text-gray-500">Absent</p><p className="text-2xl font-bold text-red-700">{data.counts?.absent || 0}</p></Card>
            <Card><p className="text-sm text-gray-500">Late</p><p className="text-2xl font-bold text-orange-700">{data.counts?.late || 0}</p></Card>
            <Card><p className="text-sm text-gray-500">Attendance %</p><p className="text-2xl font-bold text-blue-700">{data.percentage || 0}%</p></Card>
          </div>
          <Card title={`${monthYear} Calendar`}>
            <div className="flex flex-wrap gap-3 mb-4 text-xs">
              {['present', 'absent', 'late', 'leave'].map((s) => <AttendanceStatusBadge key={s} status={s} />)}
            </div>
            <AttendanceCalendarGrid days={data.days} monthYear={monthYear} />
          </Card>
        </>
      ) : (
        <EmptyState message="Select a student to view calendar." />
      )}
    </DashboardLayout>
  );
}
