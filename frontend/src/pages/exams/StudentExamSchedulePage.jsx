import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { ExamScheduleTable } from '../../components/exams/ExamScheduleTable';
import { examsService } from '../../services/authService';

export default function StudentExamSchedulePage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examsService.studentMe()
      .then((r) => setData(r.data.data))
      .catch(() => setErr('Could not load your exam schedule'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">My Exam Schedule</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : data?.schedules?.length ? (
        <>
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
        <EmptyState message="No published exam schedule available yet." />
      )}
    </DashboardLayout>
  );
}
