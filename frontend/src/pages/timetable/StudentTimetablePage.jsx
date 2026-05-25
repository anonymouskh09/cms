import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Alert, Spinner, EmptyState } from '../../components/ui';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { timetableService } from '../../services/authService';

export default function StudentTimetablePage() {
  const [entries, setEntries] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([timetableService.studentMe(), timetableService.periods.list()])
      .then(([t, p]) => {
        const data = t.data.data || {};
        setEntries(data.entries || []);
        setInfo(data);
        setPeriods(p.data.data || []);
      })
      .catch(() => setErr('Could not load your timetable. Ask principal to publish timetable for your class.'))
      .finally(() => setLoading(false));
  }, []);

  const classLabel = info?.class_name || info?.student?.class_name;
  const sectionLabel = info?.section_name || info?.student?.section_name;

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">My Timetable</h2>
      {classLabel && (
        <p className="text-sm text-violet-700 font-medium mb-1">
          {classLabel}{sectionLabel ? ` · Section ${sectionLabel}` : ''}
        </p>
      )}
      <p className="text-sm text-gray-500 mb-6">Aapki class ka weekly schedule — sirf published periods dikhte hain.</p>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : entries.length ? (
        <Card><TimetableGrid entries={entries} periods={periods} /></Card>
      ) : (
        <EmptyState message="No published timetable for your class yet. Principal will publish from Class Timetable." />
      )}
    </DashboardLayout>
  );
}
