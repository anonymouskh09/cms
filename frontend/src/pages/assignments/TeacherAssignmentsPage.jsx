import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Alert, Spinner, EmptyState } from '../../components/ui';
import { AssignmentStatusBadge, DueDateBadge } from '../../components/assignments/AssignmentBadges';
import { assignmentsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function TeacherAssignmentsPage({ adminView = false }) {
  const { user } = useAuth();
  const base = adminView
    ? (user.role === 'owner' ? '/owner' : user.role === 'admin' ? '/admin' : '/principal')
    : '/teacher';
  const canCreate = user.role === 'teacher';
  const [assignments, setAssignments] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    assignmentsService.list()
      .then((r) => setAssignments(r.data.data))
      .catch(() => setErr('Failed to load assignments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handlePublish = async (id, publish) => {
    try {
      if (publish) await assignmentsService.publish(id);
      else await assignmentsService.unpublish(id);
      setMsg(publish ? 'Published' : 'Unpublished');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed');
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm('Close this assignment?')) return;
    try {
      await assignmentsService.remove(id);
      setMsg('Assignment closed');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Cannot close');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{adminView ? 'Institution Assignments' : 'My Assignments'}</h2>
        {canCreate && (
          <Link to="/teacher/assignments/create"><Button>Create Assignment</Button></Link>
        )}
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {!loading && assignments.some((a) => a.status === 'draft') && (
        <Card className="mb-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-900 font-medium">
            {assignments.filter((a) => a.status === 'draft').length} assignment(s) are still Draft.
            Students will NOT see them until you click <strong>Publish</strong>.
          </p>
        </Card>
      )}
      {loading ? <Spinner /> : assignments.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <Card key={a.id}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{a.title}</h3>
                <AssignmentStatusBadge status={a.status} />
              </div>
              <p className="text-sm text-gray-500 mb-2">{a.subject_name} · {a.class_name}{a.section_name ? ` / ${a.section_name}` : ''}</p>
              <div className="mb-3"><DueDateBadge dueDate={a.due_date} /></div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-4">{a.description || 'No description'}</p>
              <div className="flex flex-wrap gap-2">
                {(canCreate || adminView) && (
                  <Link to={`${base}/assignments/${a.id}/submissions`}><Button variant="secondary">Submissions</Button></Link>
                )}
                {canCreate && (
                  <>
                    <Link to={`/teacher/assignments/${a.id}/edit`}><Button variant="secondary">Edit</Button></Link>
                    {a.status === 'draft' && <Button variant="success" onClick={() => handlePublish(a.id, true)}>Publish</Button>}
                    {a.status === 'published' && <Button variant="secondary" onClick={() => handlePublish(a.id, false)}>Unpublish</Button>}
                    <Button variant="danger" onClick={() => handleClose(a.id)}>Close</Button>
                  </>
                )}
                {a.attachment_url && (
                  <a href={a.attachment_url} target="_blank" rel="noreferrer"><Button variant="secondary">Attachment</Button></a>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message={canCreate ? 'No assignments yet. Create one for your class.' : 'No assignments found.'} />
      )}
    </DashboardLayout>
  );
}
