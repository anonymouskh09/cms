import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Alert, Spinner, EmptyState } from '../../components/ui';
import { AssignmentStatusBadge, DueDateBadge } from '../../components/assignments/AssignmentBadges';
import { assignmentsService, parentsService } from '../../services/authService';

export default function ParentChildAssignmentsPage() {
  const [children, setChildren] = useState([]);
  const [selected, setSelected] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentsService.getChildren()
      .then((r) => {
        setChildren(r.data.data);
        if (r.data.data.length) setSelected(String(r.data.data[0].id));
      })
      .catch(() => setErr('Failed to load children'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    assignmentsService.parentChild(selected)
      .then((r) => setAssignments(r.data.data.assignments || []))
      .catch(() => setErr('Failed to load child assignments'))
      .finally(() => setLoading(false));
  }, [selected]);

  const childName = children.find((c) => String(c.id) === selected);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Child Assignments</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {children.length > 1 && (
        <Card className="mb-6">
          <Select label="Select Child" value={selected} onChange={(e) => setSelected(e.target.value)}
            options={children.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}` }))} />
        </Card>
      )}
      {loading ? <Spinner /> : assignments.length ? (
        <>
          {childName && (
            <p className="text-gray-600 mb-4">Assignments for {childName.first_name} {childName.last_name || ''}</p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {assignments.map((a) => (
              <Card key={a.id}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <AssignmentStatusBadge status={a.submission_status} />
                </div>
                <p className="text-sm text-gray-500 mb-2">{a.subject_name}</p>
                <div className="mb-3"><DueDateBadge dueDate={a.due_date} /></div>
                {a.submission?.marks_obtained != null && (
                  <p className="text-sm text-purple-700">Grade: {a.submission.marks_obtained}/{a.max_marks}</p>
                )}
                {a.submission?.feedback && (
                  <p className="text-sm text-gray-600 mt-2">Feedback: {a.submission.feedback}</p>
                )}
              </Card>
            ))}
          </div>
        </>
      ) : (
        <EmptyState message="No published assignments for this child yet." />
      )}
    </DashboardLayout>
  );
}
