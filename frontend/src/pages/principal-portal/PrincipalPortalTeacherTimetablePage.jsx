import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { useMonitoring } from '../monitoring/MonitoringContext';
import { Card, Select, Alert, Spinner, EmptyState } from '../../components/ui';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { timetableService, teachersService } from '../../services/authService';

export default function PrincipalPortalTeacherTimetablePage() {
  const { basePath, scopeParams, showBanner } = useMonitoring();
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [entries, setEntries] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTt, setLoadingTt] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      timetableService.periods.list(scopeParams),
      teachersService.list(scopeParams),
    ])
      .then(([p, t]) => {
        setPeriods(p.data.data || []);
        setTeachers(t.data.data || []);
      })
      .catch(() => setErr('Failed to load teachers'))
      .finally(() => setLoading(false));
  }, [scopeParams.institution_id]);

  useEffect(() => {
    if (!teacherId) {
      setEntries([]);
      return;
    }
    setLoadingTt(true);
    setErr('');
    timetableService.teacher(teacherId)
      .then((r) => setEntries(Array.isArray(r.data.data) ? r.data.data : []))
      .catch((e) => {
        setErr(e.response?.data?.message || 'Failed to load timetable');
        setEntries([]);
      })
      .finally(() => setLoadingTt(false));
  }, [teacherId]);

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <div className="flex flex-wrap gap-4 text-sm mb-4">
        <Link to={`${basePath}/timetable/class`} className="text-indigo-600 hover:underline">Class timetable</Link>
        <Link to={`${basePath}/timetable/conflicts`} className="text-indigo-600 hover:underline">Conflicts</Link>
      </div>
      <h2 className="text-2xl font-bold mb-2">Teacher Timetable</h2>
      <p className="text-sm text-slate-500 mb-6">
        View weekly periods for each teacher. Only slots assigned in the class timetable are shown here.
      </p>
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <Card className="mb-6">
        <Select
          label="Teacher"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          options={[
            { value: '', label: teachers.length ? 'Select teacher' : 'No teachers available' },
            ...teachers.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
      </Card>

      {loading ? <Spinner /> : !teacherId ? (
        <p className="text-slate-500 text-center py-12">Select a teacher to view their timetable.</p>
      ) : loadingTt ? (
        <Spinner />
      ) : entries.length ? (
        <Card>
          <p className="text-sm text-slate-500 mb-4">{entries.length} period(s) per week</p>
          <TimetableGrid entries={entries} periods={periods} />
        </Card>
      ) : (
        <EmptyState message="No timetable entries for this teacher yet." />
      )}
    </DashboardLayout>
  );
}
