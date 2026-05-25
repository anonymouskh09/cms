import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../components/ui';
import { AssignmentStatusBadge, DueDateBadge } from '../../components/assignments/AssignmentBadges';
import { assignmentsService } from '../../services/authService';
import ParentChildShell from './ParentChildShell';

const PENDING = ['not_submitted', 'draft'];
const SUBMITTED = ['submitted', 'late', 'graded'];

export default function ParentChildAssignmentsPage() {
  return (
    <ParentChildShell title="Child Assignments">
      {({ studentId }) => <AssignmentsContent studentId={studentId} />}
    </ParentChildShell>
  );
}

function AssignmentsContent({ studentId }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    assignmentsService.parentChild(studentId)
      .then((r) => setAssignments(r.data.data?.assignments || []))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;
  if (!assignments.length) return <EmptyState message="No published assignments for this child yet." />;

  const pending = assignments.filter((a) => PENDING.includes(a.submission_status));
  const submitted = assignments.filter((a) => SUBMITTED.includes(a.submission_status));

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold mb-4">Pending Assignments ({pending.length})</h3>
        {pending.length ? (
          <div className="grid md:grid-cols-2 gap-4">
            {pending.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No pending assignments.</p>
        )}
      </section>
      <section>
        <h3 className="text-lg font-semibold mb-4">Submitted / Graded ({submitted.length})</h3>
        {submitted.length ? (
          <div className="grid md:grid-cols-2 gap-4">
            {submitted.map((a) => <AssignmentCard key={a.id} assignment={a} showGrade />)}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No submitted assignments yet.</p>
        )}
      </section>
    </div>
  );
}

function AssignmentCard({ assignment: a, showGrade }) {
  return (
    <Card>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold">{a.title}</h4>
        <AssignmentStatusBadge status={a.submission_status} />
      </div>
      <p className="text-sm text-gray-500 mb-2">{a.subject_name} · {a.teacher_name}</p>
      <div className="mb-3"><DueDateBadge dueDate={a.due_date} /></div>
      {showGrade && a.submission?.marks_obtained != null && (
        <p className="text-sm text-purple-700 mb-2">Grade: {a.submission.marks_obtained}/{a.max_marks}</p>
      )}
      {a.submission?.feedback && (
        <p className="text-sm text-gray-600">Feedback: {a.submission.feedback}</p>
      )}
      {a.submission?.submitted_at && (
        <p className="text-xs text-gray-400 mt-2">Submitted: {new Date(a.submission.submitted_at).toLocaleString()}</p>
      )}
    </Card>
  );
}
