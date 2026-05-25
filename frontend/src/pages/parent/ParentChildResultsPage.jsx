import { useEffect, useState } from 'react';
import { Card, Table, EmptyState } from '../../components/ui';
import { reportCardsService } from '../../services/authService';
import ParentChildShell from './ParentChildShell';

export default function ParentChildResultsPage() {
  return (
    <ParentChildShell title="Child Published Results">
      {({ studentId }) => <ResultsContent studentId={studentId} />}
    </ParentChildShell>
  );
}

function ResultsContent({ studentId }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    reportCardsService.parentChildResults(studentId)
      .then((r) => setExams(r.data.data?.exams || []))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;
  if (!exams.length) return <EmptyState message="No published results for this child yet." />;

  return (
    <div className="space-y-6">
      {exams.map((exam) => (
        <Card key={exam.exam_id} title={exam.exam_name}>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-sm text-gray-500">{exam.exam_type_name}</span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${exam.pass_fail === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {exam.pass_fail}
            </span>
            <span className="text-sm font-medium ml-auto">
              {exam.obtained_marks} / {exam.total_marks} ({exam.percentage}%) · Grade {exam.grade}
            </span>
          </div>
          <Table columns={[
            { key: 'subject_name', label: 'Subject' },
            { key: 'marks_obtained', label: 'Marks', render: (r) => r.is_absent ? 'Absent' : (r.marks_obtained ?? '—') },
            { key: 'max_marks', label: 'Max' },
            { key: 'grade', label: 'Grade', render: (r) => r.grade || '—' },
          ]} data={exam.subjects} />
        </Card>
      ))}
    </div>
  );
}
