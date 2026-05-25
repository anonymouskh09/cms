import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Alert, Spinner, EmptyState } from '../../components/ui';
import { AssignmentStatusBadge, DueDateBadge } from '../../components/assignments/AssignmentBadges';
import { assignmentsService } from '../../services/authService';

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [student, setStudent] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assignmentsService.studentMe()
      .then((r) => {
        setAssignments(r.data.data.assignments || []);
        setStudent(r.data.data.student || null);
      })
      .catch(() => setErr('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">My Assignments</h2>
      {student && (
        <p className="text-sm text-violet-700 font-medium mb-4">
          Your class: {student.class_name || '—'}
          {student.section_name ? ` · Section ${student.section_name}` : ''}
          {' '}(only published assignments for your class appear here)
        </p>
      )}
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : assignments.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <Card key={a.id}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{a.title}</h3>
                <AssignmentStatusBadge status={a.submission_status} />
              </div>
              <p className="text-sm text-gray-500 mb-2">{a.subject_name} · {a.teacher_name}</p>
              <div className="mb-3"><DueDateBadge dueDate={a.due_date} /></div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{a.description || 'No description'}</p>
              {a.attachment_url && (
                <a href={a.attachment_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm block mb-3">
                  Download teacher attachment
                </a>
              )}
              {a.submission?.marks_obtained != null && (
                <p className="text-sm text-purple-700 mb-2">Grade: {a.submission.marks_obtained}/{a.max_marks}</p>
              )}
              <Link to={`/student/assignments/${a.id}`}>
                <Button variant="secondary">
                  {['submitted', 'late', 'graded'].includes(a.submission_status) ? 'View / Update Submission' : 'Submit Assignment'}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          message={student?.class_id
            ? 'No published assignments for your class yet. Ask your teacher to Publish the assignment (not Draft).'
            : 'Your profile has no class assigned. Contact the school office.'}
        />
      )}
    </DashboardLayout>
  );
}
