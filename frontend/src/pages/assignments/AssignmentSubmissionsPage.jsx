import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Modal, Alert, Spinner, EmptyState } from '../../components/ui';
import { AssignmentStatusBadge } from '../../components/assignments/AssignmentBadges';
import { assignmentsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function AssignmentSubmissionsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = user.role === 'teacher' ? '/teacher' : user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/principal';
  const canGrade = user.role === 'teacher' || ['owner', 'principal', 'admin'].includes(user.role);
  const [data, setData] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [gradeModal, setGradeModal] = useState(null);
  const [gradeForm, setGradeForm] = useState({ marks_obtained: '', feedback: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    assignmentsService.submissions(id)
      .then((r) => setData(r.data.data))
      .catch(() => setErr('Failed to load submissions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const openGrade = (row) => {
    setGradeModal(row);
    setGradeForm({
      marks_obtained: row.submission?.marks_obtained ?? '',
      feedback: row.submission?.feedback || '',
    });
  };

  const handleGrade = async () => {
    if (!gradeModal?.submission) return;
    try {
      await assignmentsService.grade(gradeModal.submission.id, gradeForm);
      setMsg('Submission graded');
      setGradeModal(null);
      setViewRow(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Grading failed');
    }
  };

  const renderSubmissionBody = (submission) => {
    if (!submission) {
      return <p className="text-gray-500 text-sm">Student has not submitted yet.</p>;
    }
    return (
      <>
        {submission.submission_text && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Written answer</p>
            <p className="text-sm p-3 bg-gray-50 rounded whitespace-pre-wrap border">{submission.submission_text}</p>
          </div>
        )}
        {submission.attachment_url && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Uploaded file</p>
            <a
              href={submission.attachment_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium"
            >
              Open / download student file
            </a>
          </div>
        )}
        {!submission.submission_text && !submission.attachment_url && (
          <p className="text-gray-500 text-sm">Empty submission.</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}
          {' · '}Status: {submission.status}
        </p>
      </>
    );
  };

  const submittedCount = data?.submissions?.filter((r) => r.submission)?.length || 0;

  return (
    <DashboardLayout>
      <Link to={`${base}/assignments`} className="text-sm text-blue-600 hover:underline">← Back to Assignments</Link>
      <h2 className="text-2xl font-bold mt-2 mb-2">Submissions</h2>
      {data?.assignment && (
        <>
          <p className="text-gray-600 mb-1">{data.assignment.title} · {data.assignment.subject_name}</p>
          <p className="text-sm text-gray-500 mb-4">
            {data.assignment.class_name}{data.assignment.section_name ? ` / ${data.assignment.section_name}` : ''}
            {' · '}{submittedCount} of {data.submissions?.length || 0} students submitted
            {data.assignment.status === 'draft' && (
              <span className="text-amber-700 font-medium"> · Assignment is still Draft — students cannot see it</span>
            )}
          </p>
        </>
      )}
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        {loading ? <Spinner /> : data?.submissions?.length ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500">
              <th className="py-2">Student</th><th>Roll</th><th>Status</th><th>Submitted</th><th>Marks</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {data.submissions.map((row) => (
                <tr key={row.student.id} className="border-b">
                  <td className="py-2">{row.student.first_name} {row.student.last_name || ''}</td>
                  <td>{row.student.roll_no || '—'}</td>
                  <td><AssignmentStatusBadge status={row.submission_status} /></td>
                  <td>{row.submission?.submitted_at ? new Date(row.submission.submitted_at).toLocaleString() : '—'}</td>
                  <td>{row.submission?.marks_obtained != null ? `${row.submission.marks_obtained} / ${data.assignment.max_marks}` : '—'}</td>
                  <td className="py-2 space-x-2">
                    {row.submission ? (
                      <>
                        <Button variant="secondary" onClick={() => setViewRow(row)}>View work</Button>
                        {canGrade && <Button variant="secondary" onClick={() => openGrade(row)}>Grade</Button>}
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">Waiting</span>
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

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title={`Submission — ${viewRow?.student?.first_name || ''}`}>
        {viewRow && renderSubmissionBody(viewRow.submission)}
        {viewRow?.submission && canGrade && (
          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setViewRow(null)}>Close</Button>
            <Button onClick={() => { setViewRow(null); openGrade(viewRow); }}>Grade</Button>
          </div>
        )}
      </Modal>

      <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title="Grade Submission">
        {gradeModal?.submission && (
          <>
            <p className="text-sm text-gray-600 mb-4">{gradeModal.student.first_name} — Max: {data?.assignment?.max_marks}</p>
            {renderSubmissionBody(gradeModal.submission)}
            <Input label="Marks Obtained" type="number" value={gradeForm.marks_obtained} onChange={(e) => setGradeForm({ ...gradeForm, marks_obtained: e.target.value })} />
            <Input label="Feedback" value={gradeForm.feedback} onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })} />
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="secondary" onClick={() => setGradeModal(null)}>Cancel</Button>
              <Button onClick={handleGrade}>Save Grade</Button>
            </div>
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}
