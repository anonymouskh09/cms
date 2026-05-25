import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Alert, Spinner } from '../../components/ui';
import { timetableService, academicService, teachersService, DAYS } from '../../services/authService';
import { DAY_LABELS } from '../../components/timetable/TimetableGrid';
import { useAuth } from '../../context/AuthContext';

export default function ConflictCheckerPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ day_of_week: 'monday', institution_id: user.institution_id || 1 });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([timetableService.periods.list(), academicService.classes.list(), teachersService.list()])
      .then(([p, c, t]) => {
        setPeriods(p.data.data);
        setClasses(c.data.data);
        setTeachers(t.data.data);
      });
  }, []);

  const handleCheck = async () => {
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
        institution_id: user.role === 'owner' ? parseInt(form.institution_id, 10) : undefined,
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
      <h2 className="text-2xl font-bold mb-6">Timetable Conflict Checker</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          {user.role === 'owner' && (
            <Input label="Institution ID" type="number" value={form.institution_id || ''} onChange={(e) => setForm({ ...form, institution_id: e.target.value })} />
          )}
          <Select label="Class" value={form.class_id || ''} onChange={(e) => setForm({ ...form, class_id: e.target.value })}
            options={[{ value: '', label: 'Select' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Section ID (optional)" value={form.section_id || 'none'} onChange={(e) => setForm({ ...form, section_id: e.target.value })}
            options={[{ value: 'none', label: 'Class-wide (no section)' }]} />
          <Select label="Day" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
            options={DAYS.map((d) => ({ value: d, label: DAY_LABELS[d] }))} />
          <Select label="Period" value={form.timetable_period_id || ''} onChange={(e) => setForm({ ...form, timetable_period_id: e.target.value })}
            options={[{ value: '', label: 'Select' }, ...periods.filter((p) => !p.is_break).map((p) => ({ value: p.id, label: p.name }))]} />
          <Select label="Teacher" value={form.teacher_id || ''} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
            options={[{ value: '', label: 'None' }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]} />
          <Input label="Room / Lab" value={form.room || ''} onChange={(e) => setForm({ ...form, room: e.target.value })} />
        </div>
        <Button onClick={handleCheck} className="mt-6" disabled={loading}>{loading ? 'Checking...' : 'Check Conflicts'}</Button>
      </Card>
      {loading && <Spinner />}
      {result && (
        <Card title="Result" className="mt-6">
          {result.has_conflicts ? (
            <div className="space-y-4">
              <p className="text-red-700 font-medium">Conflicts found — cannot schedule safely.</p>
              {result.conflicts.map((c, i) => (
                <div key={i} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-red-800 capitalize">{c.type} conflict</p>
                  <p className="text-sm text-red-700 mt-1">{c.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-700 font-medium">No conflicts detected for this slot.</p>
          )}
        </Card>
      )}
    </DashboardLayout>
  );
}
