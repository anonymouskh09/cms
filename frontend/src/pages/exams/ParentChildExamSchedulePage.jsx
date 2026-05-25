import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { ExamScheduleTable } from '../../components/exams/ExamScheduleTable';
import { examsService, parentsService } from '../../services/authService';

export default function ParentChildExamSchedulePage() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentsService.getChildren()
      .then((r) => {
        setChildren(r.data.data);
        if (r.data.data.length) setSelected(String(r.data.data[0].id));
      })
      .catch(() => setErr('Failed to load children'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    examsService.parentChild(selected)
      .then((r) => setData(r.data.data))
      .catch(() => setErr('Could not load child exam schedule'))
      .finally(() => setLoading(false));
  }, [selected]);

  const childName = children.find((c) => String(c.id) === selected);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Child Exam Schedule</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {children.length > 1 && (
        <Card className="mb-6">
          <Select label="Select Child" value={selected} onChange={(e) => setSelected(e.target.value)}
            options={children.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}` }))} />
        </Card>
      )}
      {loading ? <Spinner /> : data?.schedules?.length ? (
        <>
          {childName && <p className="text-gray-600 mb-4">Showing published exams for {childName.first_name} {childName.last_name || ''}</p>}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {(data.exams || []).map((e) => (
              <Card key={e.id}>
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{e.name}</h3>
                  <ExamStatusBadge status={e.status} />
                </div>
                <p className="text-sm text-gray-500 mt-2">{e.exam_type_name}</p>
              </Card>
            ))}
          </div>
          <Card title="Subject Schedules">
            <ExamScheduleTable schedules={data.schedules} />
          </Card>
        </>
      ) : (
        <EmptyState message="No published exam schedule for this child yet." />
      )}
    </DashboardLayout>
  );
}
