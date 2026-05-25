import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Input, Table, Alert, Spinner, EmptyState } from '../../components/ui';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceCalendar';
import SmsActionButton from '../../components/sms/SmsActionButton';
import { attendanceService, academicService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/principal';
}

export default function AbsenteeReportPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', section_id: '', date: new Date().toISOString().split('T')[0] });
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [smsMsg, setSmsMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([academicService.classes.list(), academicService.sections.list()])
      .then(([c, s]) => { setClasses(c.data.data); setSections(s.data.data); });
  }, []);

  useEffect(() => {
    if (!filters.class_id) return;
    setLoading(true);
    attendanceService.absentees(filters)
      .then((r) => setRows(r.data.data.absentees || []))
      .catch(() => setErr('Failed to load absentees'))
      .finally(() => setLoading(false));
  }, [filters]);

  const filteredSections = sections.filter((s) => !filters.class_id || s.class_id === parseInt(filters.class_id, 10));

  return (
    <DashboardLayout>
      <Link to={`${roleBase(user.role)}/attendance`} className="text-sm text-blue-600 hover:underline">← Attendance Hub</Link>
      <h2 className="text-2xl font-bold mt-2 mb-6">Absentee Report</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Alert type="warning" message={smsMsg} onClose={() => setSmsMsg('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Date" type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })}
            options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Section" value={filters.section_id} onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
            options={[{ value: '', label: 'All' }, ...filteredSections.map((s) => ({ value: s.id, label: s.name }))]} />
        </div>
      </Card>
      <Card>
        {rows.length > 0 && (
          <div className="mb-4 flex justify-end">
            <SmsActionButton label="Send SMS to All Absentees" onNotify={setSmsMsg} />
          </div>
        )}
        {loading ? <Spinner /> : rows.length ? (
          <Table columns={[
            { key: 'name', label: 'Student', render: (r) => `${r.first_name} ${r.last_name || ''}` },
            { key: 'roll_no', label: 'Roll' },
            { key: 'status', label: 'Status', render: (r) => <AttendanceStatusBadge status={r.status === 'not_marked' ? 'absent' : r.status} /> },
            { key: 'remarks', label: 'Remarks', render: (r) => r.remarks || '—' },
            { key: 'actions', label: 'SMS', render: () => <SmsActionButton label="Send SMS" onNotify={setSmsMsg} /> },
          ]} data={rows} />
        ) : filters.class_id ? <EmptyState message="No absentees for this date." /> : <EmptyState message="Select class and date." />}
      </Card>
    </DashboardLayout>
  );
}
