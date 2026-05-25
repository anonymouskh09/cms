import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Input, Table, Alert, Spinner, EmptyState } from '../../components/ui';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceCalendar';
import { attendanceService, studentsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/principal';
}

export default function StudentAttendanceReportPage() {
  const { user } = useAuth();
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
    attendanceService.studentReport(studentId, { month_year: monthYear })
      .then((r) => setData(r.data.data))
      .catch(() => setErr('Failed to load report'))
      .finally(() => setLoading(false));
  }, [studentId, monthYear]);

  return (
    <DashboardLayout>
      <Link to={`${roleBase(user.role)}/attendance`} className="text-sm text-blue-600 hover:underline">← Attendance Hub</Link>
      <h2 className="text-2xl font-bold mt-2 mb-6">Student Attendance Report</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Student" value={studentId} onChange={(e) => setStudentId(e.target.value)}
            options={students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name || ''}` }))} />
          <Input label="Month" type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
        </div>
      </Card>
      {loading ? <Spinner /> : data ? (
        <>
          <Card className="mb-4">
            <p className="text-lg font-semibold">{data.percentage}% attendance</p>
            <p className="text-sm text-gray-500">Present: {data.counts?.present || 0} / {data.total || 0} days</p>
          </Card>
          <Card>
            <Table columns={[
              { key: 'date', label: 'Date', render: (r) => String(r.attendance_date).slice(0, 10) },
              { key: 'status', label: 'Status', render: (r) => <AttendanceStatusBadge status={r.status} /> },
              { key: 'remarks', label: 'Remarks', render: (r) => r.remarks || '—' },
            ]} data={data.records || []} />
          </Card>
        </>
      ) : (
        <EmptyState message="Select a student to view report." />
      )}
    </DashboardLayout>
  );
}
