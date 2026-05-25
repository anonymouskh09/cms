import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Table, Alert, Spinner, EmptyState } from '../../components/ui';
import { reportCardsService } from '../../services/authService';

export default function StudentResultsPage() {
  const [exams, setExams] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportCardsService.studentResultsMe()
      .then((r) => setExams(r.data.data?.exams || []))
      .catch((e) => setErr(e.response?.data?.message || 'Could not load published results'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">My Results</h2>
      <p className="text-sm text-gray-500 mb-6">Only published exam results are shown here.</p>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : exams.length ? (
        <div className="space-y-6">
          {exams.map((exam) => (
            <Card key={exam.exam_id} title={exam.exam_name}>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-sm text-gray-500">{exam.exam_type_name}</span>
                {exam.start_date && (
                  <span className="text-sm text-gray-500">
                    {exam.start_date}{exam.end_date && exam.end_date !== exam.start_date ? ` – ${exam.end_date}` : ''}
                  </span>
                )}
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
                { key: 'pass_marks', label: 'Pass' },
                { key: 'grade', label: 'Grade', render: (r) => r.grade || '—' },
              ]} data={exam.subjects} />
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="No published results available yet." />
      )}
    </DashboardLayout>
  );
}
