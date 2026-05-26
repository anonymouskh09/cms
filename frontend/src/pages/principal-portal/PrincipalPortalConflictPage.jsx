import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { useMonitoring } from '../monitoring/MonitoringContext';
import { Card, Button, Input, Select, Alert, Spinner } from '../../components/ui';
import { timetableService, academicService, teachersService, DAYS } from '../../services/authService';
import { DAY_LABELS } from '../../components/timetable/TimetableGrid';
import { useAuth } from '../../context/AuthContext';

export default function PrincipalPortalConflictPage() {
  const { user } = useAuth();
  const { basePath, scopeParams, readOnly, showBanner } = useMonitoring();
  const [periods, setPeriods] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ day_of_week: 'monday' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      timetableService.periods.list(scopeParams),
      academicService.classes.list(scopeParams),
      teachersService.list(scopeParams),
    ]).then(([p, c, t]) => {
      setPeriods(p.data.data || []);
      setClasses(c.data.data || []);
      setTeachers(t.data.data || []);
    });
  }, [scopeParams.institution_id]);

  const handleCheck = async () => {
    if (!form.class_id || !form.timetable_period_id) {
      setErr('Please select class and period');
      return;
    }
    setLoading(true);
    setErr('');
    setResult(null);
    try {
      const payload = {
        ...form,
        class_id: parseInt(form.class_id, 10),
        teacher_id: form.teacher_id ? parseInt(form.teacher_id, 10) : null,
        timetable_period_id: parseInt(form.timetable_period_id, 10),
        section_id: form.section_id && form.section_id !== 'none' ? parseInt(form.section_id, 10) : null,
        institution_id: user.institution_id,
      };
      const res = await timetableService.checkConflicts(payload);
      setResult(res.data.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Check failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <Link to={`${basePath}/timetable/class`} className="text-sm text-indigo-600 mb-4 inline-block hover:underline">
        ← Class timetable
      </Link>
      <h2 className="text-2xl font-bold mb-2">Timetable conflicts</h2>
      <p className="text-sm text-slate-500 mb-6">
        {readOnly
          ? 'Scheduling conflict checks are run by school staff. View class and teacher timetables from the menu.'
          : 'Check whether a proposed period clashes with existing class or teacher bookings (view only).'}
      </p>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {readOnly ? (
        <Card><p className="text-sm text-slate-600">Conflict checker is not available in owner view-only mode.</p></Card>
      ) : (
        <>
          <Card className="mb-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Select label="Day" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                options={DAYS.map((d) => ({ value: d, label: DAY_LABELS[d] }))} />
              <Select label="Period" value={form.timetable_period_id || ''} onChange={(e) => setForm({ ...form, timetable_period_id: e.target.value })}
                options={[{ value: '', label: 'Select period' }, ...periods.map((p) => ({ value: p.id, label: p.name }))]} />
              <Select label="Class" value={form.class_id || ''} onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
              <Select label="Teacher (optional)" value={form.teacher_id || ''} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                options={[{ value: '', label: 'Any' }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]} />
              <Input label="Room (optional)" value={form.room || ''} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={handleCheck} disabled={loading}>
              {loading ? 'Checking…' : 'Check conflicts'}
            </Button>
          </Card>
          {result && (
            <Card title={result.has_conflicts ? 'Conflicts found' : 'No conflicts'}>
              {result.conflicts?.length ? (
                <ul className="text-sm space-y-2">
                  {result.conflicts.map((c, i) => (
                    <li key={i} className="text-red-700">{c.type}: {c.message}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-emerald-700 text-sm">This slot appears free for the selected class and teacher.</p>
              )}
            </Card>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
