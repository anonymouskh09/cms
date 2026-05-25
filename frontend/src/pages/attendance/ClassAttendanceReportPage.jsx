import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Input, Table, Alert, Spinner, EmptyState } from '../../components/ui';
import { attendanceService, academicService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/principal';
}

export default function ClassAttendanceReportPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', section_id: '', month_year: new Date().toISOString().slice(0, 7) });
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([academicService.classes.list(), academicService.sections.list()])
      .then(([c, s]) => { setClasses(c.data.data); setSections(s.data.data); });
  }, []);

  const load = () => {
    if (!filters.class_id) return;
    setLoading(true);
    attendanceService.classReport(filters)
      .then((r) => setRows(r.data.data))
      .catch(() => setErr('Failed to load report'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters.class_id, filters.section_id, filters.month_year]);

  const filteredSections = sections.filter((s) => !filters.class_id || s.class_id === parseInt(filters.class_id, 10));

  return (
    <DashboardLayout>
      <Link to={`${roleBase(user.role)}/attendance`} className="text-sm text-blue-600 hover:underline">← Attendance Hub</Link>
      <h2 className="text-2xl font-bold mt-2 mb-6">Class Attendance Report</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })}
            options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Section" value={filters.section_id} onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
            options={[{ value: '', label: 'All' }, ...filteredSections.map((s) => ({ value: s.id, label: s.name }))]} />
          <Input label="Month" type="month" value={filters.month_year} onChange={(e) => setFilters({ ...filters, month_year: e.target.value })} />
        </div>
      </Card>
      <Card>
        {loading ? <Spinner /> : rows.length ? (
          <Table columns={[
            { key: 'name', label: 'Student', render: (r) => `${r.student.first_name} ${r.student.last_name || ''}` },
            { key: 'roll', label: 'Roll', render: (r) => r.student.roll_no || '—' },
            { key: 'present', label: 'Present', render: (r) => r.counts.present },
            { key: 'absent', label: 'Absent', render: (r) => r.counts.absent },
            { key: 'late', label: 'Late', render: (r) => r.counts.late },
            { key: 'leave', label: 'Leave', render: (r) => r.counts.leave },
            { key: 'pct', label: '%', render: (r) => `${r.percentage}%` },
          ]} data={rows} />
        ) : filters.class_id ? <EmptyState message="No attendance data for this period." /> : <EmptyState message="Select a class to view report." />}
      </Card>
    </DashboardLayout>
  );
}
