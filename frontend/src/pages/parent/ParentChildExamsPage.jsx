import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { ExamScheduleTable } from '../../components/exams/ExamScheduleTable';
import { examsService } from '../../services/authService';
import ParentChildShell from './ParentChildShell';

export default function ParentChildExamsPage() {
  return (
    <ParentChildShell title="Child Exam Schedule">
      {({ studentId }) => <ExamsContent studentId={studentId} />}
    </ParentChildShell>
  );
}

function ExamsContent({ studentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    examsService.parentChild(studentId)
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;
  if (!data?.schedules?.length) return <EmptyState message="No published exam schedule for this child yet." />;

  return (
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
  );
}
