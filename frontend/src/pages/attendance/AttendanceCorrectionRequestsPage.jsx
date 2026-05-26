import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Select, Input, Modal, Table, Alert, Spinner, EmptyState } from '../../components/ui';
import { AttendanceStatusBadge } from '../../components/attendance/AttendanceCalendar';
import { attendanceService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/principal';
}

export default function AttendanceCorrectionRequestsPage() {
  const { user } = useAuth();
  const canReview = ['owner', 'school_administrator', 'admin', 'principal'].includes(user.role);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ attendance_id: '', requested_status: 'present', reason: '' });
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    attendanceService.corrections.list(params)
      .then((r) => setRequests(r.data.data))
      .catch(() => setErr('Failed to load requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async () => {
    try {
      await attendanceService.corrections.create(form);
      setMsg('Correction request submitted');
      setModal(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Request failed');
    }
  };

  const handleReview = async (id, approve) => {
    try {
      if (approve) await attendanceService.corrections.approve(id, { review_remarks: reviewRemarks });
      else await attendanceService.corrections.reject(id, { review_remarks: reviewRemarks });
      setMsg(approve ? 'Request approved' : 'Request rejected');
      setReviewRemarks('');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Review failed');
    }
  };

  return (
    <DashboardLayout>
      <Link to={`${roleBase(user.role)}/attendance`} className="text-sm text-blue-600 hover:underline">← Attendance Hub</Link>
      <div className="flex justify-between items-center mt-2 mb-6">
        <h2 className="text-2xl font-bold">Correction Requests</h2>
        {!canReview && <Button onClick={() => setModal(true)}>New Request</Button>}
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <Select label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          options={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
      </Card>
      <Card>
        {loading ? <Spinner /> : requests.length ? (
          <Table columns={[
            { key: 'student', label: 'Student', render: (r) => `${r.first_name} ${r.last_name || ''}` },
            { key: 'date', label: 'Date', render: (r) => String(r.attendance_date).slice(0, 10) },
            { key: 'change', label: 'Change', render: (r) => <><AttendanceStatusBadge status={r.current_status} /> → <AttendanceStatusBadge status={r.requested_status} /></> },
            { key: 'reason', label: 'Reason', render: (r) => r.reason?.slice(0, 40) },
            { key: 'status', label: 'Status', render: (r) => <AttendanceStatusBadge status={r.status} /> },
            { key: 'actions', label: 'Actions', render: (r) => (
              canReview && r.status === 'pending' ? (
                <div className="flex gap-2">
                  <Button variant="success" onClick={() => handleReview(r.id, true)}>Approve</Button>
                  <Button variant="danger" onClick={() => handleReview(r.id, false)}>Reject</Button>
                </div>
              ) : '—'
            )},
          ]} data={requests} />
        ) : (
          <EmptyState message="No correction requests found." />
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Request Correction">
        <Input label="Attendance Record ID" value={form.attendance_id} onChange={(e) => setForm({ ...form, attendance_id: e.target.value })}
          placeholder="ID from attendance list" />
        <Select label="Requested Status" value={form.requested_status} onChange={(e) => setForm({ ...form, requested_status: e.target.value })}
          options={['present', 'absent', 'late', 'leave'].map((s) => ({ value: s, label: s }))} />
        <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Submit Request</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
