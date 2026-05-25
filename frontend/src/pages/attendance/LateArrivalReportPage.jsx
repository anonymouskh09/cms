import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Input, Table, Alert, Spinner, EmptyState } from '../../components/ui';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceCalendar';
import { attendanceService, academicService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/principal';
}

export default function LateArrivalReportPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({
    class_id: '',
    date_from: new Date().toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
  });
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    academicService.classes.list().then((r) => setClasses(r.data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    attendanceService.lateArrivals(filters)
      .then((r) => setRows(r.data.data))
      .catch(() => setErr('Failed to load report'))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <DashboardLayout>
      <Link to={`${roleBase(user.role)}/attendance`} className="text-sm text-blue-600 hover:underline">← Attendance Hub</Link>
      <h2 className="text-2xl font-bold mt-2 mb-6">Late Arrival Report</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="From" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          <Input label="To" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
            options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
        </div>
      </Card>
      <Card>
        {loading ? <Spinner /> : rows.length ? (
          <Table columns={[
            { key: 'date', label: 'Date', render: (r) => String(r.attendance_date).slice(0, 10) },
            { key: 'name', label: 'Student', render: (r) => `${r.first_name} ${r.last_name || ''}` },
            { key: 'roll_no', label: 'Roll' },
            { key: 'class', label: 'Class', render: (r) => r.class_name || '—' },
            { key: 'status', label: 'Status', render: () => <AttendanceStatusBadge status="late" /> },
            { key: 'remarks', label: 'Remarks', render: (r) => r.remarks || '—' },
          ]} data={rows} />
        ) : (
          <EmptyState message="No late arrivals in this period." />
        )}
      </Card>
    </DashboardLayout>
  );
}
