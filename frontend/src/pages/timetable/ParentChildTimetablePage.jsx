import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Alert, Spinner, EmptyState } from '../../components/ui';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { timetableService, parentsService } from '../../services/authService';

export default function ParentChildTimetablePage() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState('');
  const [entries, setEntries] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([parentsService.getChildren(), timetableService.periods.list()])
      .then(([c, p]) => {
        setChildren(c.data.data);
        setPeriods(p.data.data);
        if (c.data.data.length) setSelected(String(c.data.data[0].id));
      })
      .catch(() => setErr('Failed to load children'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    timetableService.parentChild(selected)
      .then((r) => setEntries(r.data.data.entries || []))
      .catch(() => setErr('Could not load child timetable'))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Child Timetable</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {children.length > 1 && (
        <Card className="mb-6">
          <Select label="Select Child" value={selected} onChange={(e) => setSelected(e.target.value)}
            options={children.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}` }))} />
        </Card>
      )}
      {loading ? <Spinner /> : entries.length ? (
        <Card><TimetableGrid entries={entries} periods={periods} /></Card>
      ) : (
        <EmptyState message="No published timetable for this child yet." />
      )}
    </DashboardLayout>
  );
}
