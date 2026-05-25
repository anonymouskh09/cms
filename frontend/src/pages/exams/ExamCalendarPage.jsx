import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Input, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamScheduleTable } from '../../components/exams/ExamScheduleTable';
import { examsService, academicService, institutionsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  return '/principal';
}

export default function ExamCalendarPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState(user.institution_id || 1);
  const [filters, setFilters] = useState({ class_id: '', exam_date_from: '', exam_date_to: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = { ...filters };
    if (user.role === 'owner') params.institution_id = institutionId;
    examsService.calendar(params)
      .then((r) => setSchedules(r.data.data))
      .catch(() => setErr('Failed to load calendar'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([
      academicService.classes.list(),
      user.role === 'owner' ? institutionsService.list() : Promise.resolve({ data: { data: [] } }),
    ]).then(([c, i]) => {
      setClasses(c.data.data);
      if (i.data.data.length) setInstitutions(i.data.data);
    });
    load();
  }, [institutionId, filters.class_id, filters.exam_date_from, filters.exam_date_to]);

  const grouped = useMemo(() => {
    const map = {};
    schedules.forEach((s) => {
      const key = String(s.exam_date).slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [schedules]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link to={`${roleBase(user.role)}/exams/setup`} className="text-sm text-blue-600 hover:underline">← Exam Management</Link>
        <h2 className="text-2xl font-bold mt-1">Exam Calendar</h2>
      </div>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-4 gap-4">
          {user.role === 'owner' && institutions.length > 0 && (
            <Select label="Institution" value={institutionId} onChange={(e) => setInstitutionId(parseInt(e.target.value, 10))}
              options={institutions.map((i) => ({ value: i.id, label: i.name }))} />
          )}
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
            options={[{ value: '', label: 'All' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Input label="From Date" type="date" value={filters.exam_date_from} onChange={(e) => setFilters({ ...filters, exam_date_from: e.target.value })} />
          <Input label="To Date" type="date" value={filters.exam_date_to} onChange={(e) => setFilters({ ...filters, exam_date_to: e.target.value })} />
        </div>
      </Card>
      {loading ? <Spinner /> : grouped.length ? (
        grouped.map(([date, items]) => (
          <Card key={date} className="mb-4" title={new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
            <ExamScheduleTable schedules={items} showExam />
          </Card>
        ))
      ) : (
        <EmptyState message="No exam schedules match your filters." />
      )}
    </DashboardLayout>
  );
}
