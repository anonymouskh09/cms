import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Alert, Spinner, EmptyState } from '../../components/ui';
import { DueDateBadge } from '../../components/assignments/AssignmentBadges';
import { quizzesService } from '../../services/authService';

const TYPE_LABEL = { mcq: 'MCQ', form: 'Form' };

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [student, setStudent] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizzesService.studentMe()
      .then((r) => {
        setQuizzes(r.data.data.quizzes || []);
        setStudent(r.data.data.student || null);
      })
      .catch(() => setErr('Failed to load quizzes'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">My Quizzes</h2>
      {student && (
        <p className="text-sm text-violet-700 font-medium mb-4">
          Your class: {student.class_name || '—'}
          {student.section_name ? ` · Section ${student.section_name}` : ''}
          {' '}(only published quizzes for your class appear here)
        </p>
      )}
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : quizzes.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {quizzes.map((q) => {
            const done = q.submission_status === 'submitted';
            const score = q.submission?.score;
            return (
              <Card key={q.id}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{q.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${done ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {done ? 'Submitted' : 'Pending'}
                  </span>
                </div>
                <p className="text-xs text-indigo-600 mb-1">{TYPE_LABEL[q.quiz_type]} · {q.subject_name}</p>
                <div className="mb-3"><DueDateBadge dueDate={q.due_date} /></div>
                {done && score != null && (
                  <p className="text-sm text-purple-700 mb-3">Score: {score} / {q.submission?.max_score ?? q.total_marks}</p>
                )}
                <Link to={`/student/quizzes/${q.id}`}>
                  <Button variant="secondary">{done ? 'View submission' : 'Start quiz'}</Button>
                </Link>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          message={student?.class_id
            ? 'No published quizzes for your class yet. Ask your teacher to Publish the quiz (not Draft).'
            : 'Your profile has no class assigned. Contact the school office.'}
        />
      )}
    </DashboardLayout>
  );
}
