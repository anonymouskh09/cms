import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../components/ui';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { timetableService } from '../../services/authService';
import ParentChildShell from './ParentChildShell';

export default function ParentChildTimetablePage() {
  return (
    <ParentChildShell title="Child Timetable">
      {({ studentId }) => <TimetableContent studentId={studentId} />}
    </ParentChildShell>
  );
}

function TimetableContent({ studentId }) {
  const [entries, setEntries] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    Promise.all([
      timetableService.parentChild(studentId),
      timetableService.periods.list(),
    ])
      .then(([t, p]) => {
        setEntries(t.data.data.entries || []);
        setPeriods(p.data.data || []);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;
  if (!entries.length) return <EmptyState message="No published timetable for this child yet." />;
  return <Card><TimetableGrid entries={entries} periods={periods} /></Card>;
}
