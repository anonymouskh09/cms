import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Alert, Spinner } from '../../components/ui';
import { AssignmentStatusBadge, DueDateBadge } from '../../components/assignments/AssignmentBadges';
import { assignmentsService } from '../../services/authService';

export default function SubmitAssignmentPage() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [status, setStatus] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      assignmentsService.get(id),
      assignmentsService.studentMe(),
    ]).then(([a, me]) => {
      setAssignment(a.data.data);
      const found = (me.data.data.assignments || []).find((x) => String(x.id) === String(id));
      if (found) {
        setSubmission(found.submission);
        setStatus(found.submission_status);
        if (found.submission?.submission_text) setText(found.submission.submission_text);
      }
    }).catch(() => setErr('Failed to load assignment'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!text && !file) {
      setErr('Enter text or attach a file');
      return;
    }
    if (status === 'graded') {
      setErr('This assignment has already been graded');
      return;
    }
    setSubmitting(true);
    setErr('');
    const fd = new FormData();
    if (text) fd.append('submission_text', text);
    if (file) fd.append('attachment', file);
    try {
      const res = await assignmentsService.submit(id, fd);
      setSubmission(res.data.data);
      setStatus(res.data.data.status);
      setMsg('Assignment submitted successfully');
    } catch (e) {
      setErr(e.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <Link to="/student/assignments" className="text-sm text-blue-600 hover:underline">← Back to Assignments</Link>
      <h2 className="text-2xl font-bold mt-2 mb-6">{assignment?.title || 'Assignment'}</h2>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {assignment && (
        <Card className="mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            <AssignmentStatusBadge status={status || 'not_submitted'} />
            <DueDateBadge dueDate={assignment.due_date} />
          </div>
          <p className="text-sm text-gray-500 mb-2">{assignment.subject_name} · {assignment.teacher_name}</p>
          <p className="text-gray-700 mb-4">{assignment.description || 'No description'}</p>
          {assignment.attachment_url && (
            <a href={assignment.attachment_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">Download assignment attachment</a>
          )}
        </Card>
      )}
      {status === 'graded' ? (
        <Card title="Your Grade">
          <p className="text-lg font-semibold mb-2">{submission.marks_obtained} / {assignment.max_marks}</p>
          {submission.feedback && <p className="text-gray-600">Feedback: {submission.feedback}</p>}
          {submission.attachment_url && (
            <a href={submission.attachment_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm mt-2 block">Your submitted file</a>
          )}
        </Card>
      ) : (
        <Card title={submission ? 'Update Submission' : 'Submit Assignment'}>
          <Input label="Your Answer / Notes" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Attach File (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
          {submission?.attachment_url && (
            <p className="text-sm text-gray-500 mb-4">Current file: <a href={submission.attachment_url} className="text-blue-600" target="_blank" rel="noreferrer">view</a></p>
          )}
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : submission ? 'Update Submission' : 'Submit Assignment'}
          </Button>
        </Card>
      )}
    </DashboardLayout>
  );
}
