import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Alert, Spinner, EmptyState } from '../../components/ui';
import { quizzesService } from '../../services/authService';

export default function QuizSubmissionsPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizzesService.submissions(id)
      .then((r) => setData(r.data.data))
      .catch(() => setErr('Failed to load responses'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <DashboardLayout>
      <Link to="/teacher/quizzes" className="text-sm text-blue-600 hover:underline">← Back to Quizzes</Link>
      <h2 className="text-2xl font-bold mt-2 mb-2">Quiz responses</h2>
      {data?.quiz && (
        <div className="mb-6">
          <p className="text-gray-600">{data.quiz.title} · {data.quiz.quiz_type === 'mcq' ? 'MCQ (auto-graded)' : 'Form (manual grading)'}</p>
          <p className="text-sm text-gray-500">
            {data.quiz.class_name}{data.quiz.section_name ? ` / ${data.quiz.section_name}` : ''}
            {data.quiz.status === 'draft' && (
              <span className="text-amber-700 font-medium"> · Quiz is Draft — students cannot see it until Published</span>
            )}
          </p>
        </div>
      )}
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        {loading ? <Spinner /> : data?.submissions?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Student</th>
                <th>Roll</th>
                <th>Status</th>
                <th>Score</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.submissions.map((row) => (
                <tr key={row.student.id} className="border-b">
                  <td className="py-2">{row.student.first_name} {row.student.last_name || ''}</td>
                  <td>{row.student.roll_no || '—'}</td>
                  <td>{row.submission?.status || <span className="text-gray-400">Not submitted</span>}</td>
                  <td>
                    {row.submission?.score != null
                      ? `${row.submission.score} / ${row.submission.max_score ?? data.quiz.total_marks}`
                      : '—'}
                  </td>
                  <td>{row.submission?.submitted_at ? new Date(row.submission.submitted_at).toLocaleString() : '—'}</td>
                  <td>
                    {row.submission ? (
                      <Link to={`/teacher/quizzes/submissions/${row.submission.id}`}>
                        <Button variant="secondary">View answers</Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">Student must submit from portal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No students in this class." />
        )}
      </Card>
    </DashboardLayout>
  );
}
