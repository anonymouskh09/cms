import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Alert, Spinner, EmptyState } from '../../components/ui';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { timetableService, teachersService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function TeacherTimetablePage({ adminView = false }) {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [entries, setEntries] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    timetableService.periods.list().then((r) => setPeriods(r.data.data || []));
    if (adminView) {
      teachersService.list().then((r) => setTeachers(r.data.data || [])).finally(() => setLoading(false));
    } else {
      Promise.all([timetableService.teacherMe(), teachersService.me()])
        .then(([tt, me]) => {
          setEntries(Array.isArray(tt.data.data) ? tt.data.data : []);
          setMyAssignments(me.data.data?.assignments || []);
        })
        .catch(() => setErr('Could not load timetable'))
        .finally(() => setLoading(false));
    }
  }, [adminView]);

  useEffect(() => {
    if (!adminView || !teacherId) return;
    setLoading(true);
    timetableService.teacher(teacherId)
      .then((r) => setEntries(Array.isArray(r.data.data) ? r.data.data : []))
      .catch(() => setErr('Failed to load'))
      .finally(() => setLoading(false));
  }, [teacherId, adminView]);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">{adminView ? 'Teacher Timetable' : 'My Timetable'}</h2>
      {!adminView && (
        <p className="text-sm text-gray-500 mb-4">
          Signed in as <strong>{user?.name}</strong> ({user?.email}). Only periods where <em>you</em> are selected as teacher in Class Timetable appear here (not other teachers&apos; slots).
        </p>
      )}
      <Alert type="error" message={err} onClose={() => setErr('')} />

      {!adminView && myAssignments.length > 0 && (
        <Card className="mb-6 bg-violet-50 border-violet-100">
          <h3 className="font-semibold text-violet-900 mb-2">My assigned classes &amp; subjects</h3>
          <ul className="text-sm space-y-1 text-violet-800">
            {myAssignments.map((a) => (
              <li key={a.id}>
                {a.subject_name} → {a.class_name}{a.section_name ? ` / ${a.section_name}` : ''}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {adminView && (
        <Card className="mb-6">
          <Select label="Teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
            options={[{ value: '', label: 'Select teacher' }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]} />
        </Card>
      )}

      {loading ? <Spinner /> : entries.length ? (
        <Card>
          <p className="text-sm text-gray-500 mb-4">{entries.length} period(s) per week</p>
          <TimetableGrid entries={entries} periods={periods} />
        </Card>
      ) : (
        <EmptyState
          message={adminView && !teacherId
            ? 'Select a teacher to view timetable.'
            : myAssignments.length
              ? 'No published slots where you are the assigned teacher. In Class Timetable, each period must list you (not another teacher), then Publish.'
              : 'No class assignments yet. School admin must assign you to subjects in Teachers, then add timetable slots.'}
        />
      )}
    </DashboardLayout>
  );
}
