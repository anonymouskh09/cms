import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Alert, Spinner, EmptyState } from '../../components/ui';
import { AssignmentStatusBadge, DueDateBadge } from '../../components/assignments/AssignmentBadges';
import { quizzesService } from '../../services/authService';

const TYPE_LABEL = { mcq: 'MCQ Quiz', form: 'Form Quiz' };

export default function TeacherQuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    quizzesService.list()
      .then((r) => setQuizzes(r.data.data))
      .catch(() => setErr('Failed to load quizzes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePublish = async (id, publish) => {
    try {
      if (publish) await quizzesService.publish(id);
      else await quizzesService.unpublish(id);
      setMsg(publish ? 'Quiz published for students' : 'Quiz unpublished');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed');
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm('Close this quiz?')) return;
    try {
      await quizzesService.remove(id);
      setMsg('Quiz closed');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Cannot close');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Quizzes</h2>
          <p className="text-sm text-gray-500 mt-1">MCQ (auto-marked) or Form quiz (Google Classroom style)</p>
        </div>
        <Link to="/teacher/quizzes/create"><Button>Create Quiz</Button></Link>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {!loading && quizzes.some((q) => q.status === 'draft') && (
        <Card className="mb-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-900 font-medium">
            {quizzes.filter((q) => q.status === 'draft').length} quiz(zes) are still Draft.
            Students will NOT see them until you click <strong>Publish</strong>.
          </p>
        </Card>
      )}
      {loading ? <Spinner /> : quizzes.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {quizzes.map((q) => (
            <Card key={q.id}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{q.title}</h3>
                <AssignmentStatusBadge status={q.status} />
              </div>
              <p className="text-xs font-medium text-indigo-600 mb-1">{TYPE_LABEL[q.quiz_type] || q.quiz_type}</p>
              <p className="text-sm text-gray-500 mb-2">{q.subject_name} · {q.class_name}{q.section_name ? ` / ${q.section_name}` : ''}</p>
              <div className="mb-3"><DueDateBadge dueDate={q.due_date} /></div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">{q.description || 'No description'}</p>
              <div className="flex flex-wrap gap-2">
                <Link to={`/teacher/quizzes/${q.id}/submissions`}><Button variant="secondary">Responses</Button></Link>
                <Link to={`/teacher/quizzes/${q.id}/edit`}><Button variant="secondary">Edit</Button></Link>
                {q.status === 'draft' && <Button variant="success" onClick={() => handlePublish(q.id, true)}>Publish</Button>}
                {q.status === 'published' && <Button variant="secondary" onClick={() => handlePublish(q.id, false)}>Unpublish</Button>}
                <Button variant="danger" onClick={() => handleClose(q.id)}>Close</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="No quizzes yet. Create an MCQ or Form quiz for your class." />
      )}
    </DashboardLayout>
  );
}
