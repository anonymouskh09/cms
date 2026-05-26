import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Card, Table, Spinner, Button, Input, Select, Textarea, Modal, Alert } from '../../components/ui';
import { parentsService, studentsService, principalPortalService } from '../../services/authService';
import { useMonitoring, mergeScope } from '../monitoring/MonitoringContext';

const emptyMeetingForm = {
  admission_no: '',
  parent_id: '',
  student_id: '',
  reason: '',
  meeting_date: '',
  meeting_time: '',
};

export default function PrincipalPortalParentsPage() {
  const { scopeParams, readOnly, showBanner } = useMonitoring();
  const [parents, setParents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyMeetingForm);
  const [lookupMsg, setLookupMsg] = useState('');
  const [lookupType, setLookupType] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      parentsService.list(scopeParams),
      readOnly ? Promise.resolve({ data: { data: [] } }) : principalPortalService.listMeetings(),
    ])
      .then(([p, m]) => {
        setParents(p.data.data || []);
        setMeetings(m.data.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (!readOnly) {
      studentsService.list(mergeScope(scopeParams, { status: 'active', limit: 500 })).then((res) => setStudents(res.data.data || []));
    }
  }, [scopeParams.institution_id, readOnly]);

  const openMeetingModal = () => {
    setForm(emptyMeetingForm);
    setLookupMsg('');
    setLookupType('');
    setModal(true);
  };

  const applyStudentToForm = (student) => {
    if (!student) return;
    setForm((f) => ({
      ...f,
      admission_no: student.admission_no || f.admission_no,
      student_id: String(student.id),
      parent_id: student.parent_id ? String(student.parent_id) : '',
    }));
    if (student.parent_id && student.parent_name) {
      setLookupMsg(`Student: ${student.first_name} ${student.last_name || ''} — Parent: ${student.parent_name}`);
      setLookupType('success');
    } else if (student.parent_id) {
      const parent = parents.find((p) => String(p.id) === String(student.parent_id));
      setLookupMsg(`Student: ${student.first_name} ${student.last_name || ''} — Parent: ${parent?.name || 'Linked'}`);
      setLookupType('success');
    } else {
      setLookupMsg('Student found but no parent is linked. Link parent in School Administrator portal first.');
      setLookupType('error');
    }
  };

  const lookupByAdmission = (admissionNo) => {
    const trimmed = (admissionNo || '').trim();
    setForm((f) => ({ ...f, admission_no: admissionNo }));
    if (!trimmed) {
      setLookupMsg('');
      setLookupType('');
      return;
    }
    const student = students.find(
      (s) => (s.admission_no || '').trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (student) {
      applyStudentToForm(student);
    } else {
      setForm((f) => ({ ...f, student_id: '', parent_id: '' }));
      setLookupMsg(`No student found with admission ID "${trimmed}"`);
      setLookupType('error');
    }
  };

  const onStudentSelect = (studentId) => {
    const student = students.find((s) => String(s.id) === String(studentId));
    if (student) {
      applyStudentToForm(student);
    } else {
      setForm((f) => ({ ...f, student_id: '', parent_id: '' }));
      setLookupMsg('');
      setLookupType('');
    }
  };

  const requestMeeting = async () => {
    if (!form.parent_id || !form.student_id) {
      setLookupMsg('Please enter a valid admission ID or select student and parent.');
      setLookupType('error');
      return;
    }
    await principalPortalService.createMeeting({
      parent_id: form.parent_id,
      student_id: form.student_id,
      reason: form.reason,
      meeting_date: form.meeting_date,
      meeting_time: form.meeting_time,
      requested_by: 'principal',
      status: 'pending',
    });
    setModal(false);
    load();
  };

  const updateMeeting = async (id, status) => {
    await principalPortalService.updateMeeting(id, { status });
    load();
  };

  const selectedParent = parents.find((p) => String(p.id) === String(form.parent_id));
  const selectedStudent = students.find((s) => String(s.id) === String(form.student_id));

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Parents</h1>
          <p className="text-slate-500 text-sm">{readOnly ? 'Parent contacts across your schools' : 'Parent list and meeting requests'}</p>
        </div>
        {!readOnly && <Button onClick={openMeetingModal}>Request meeting</Button>}
      </div>
      {loading ? <Spinner /> : (
        <>
          <h2 className="font-semibold mb-2">Parents</h2>
          <Table
            className="mb-8"
            columns={[
              { key: 'name', label: 'Parent' },
              { key: 'phone', label: 'Phone' },
              { key: 'email', label: 'Email' },
            ]}
            data={parents}
          />
          {!readOnly && (
            <>
              <h2 className="font-semibold mb-2">Meeting requests</h2>
              <Table
                columns={[
                  { key: 'parent_name', label: 'Parent' },
                  { key: 'student_first_name', label: 'Student', render: (r) => `${r.student_first_name} ${r.student_last_name || ''}` },
                  { key: 'reason', label: 'Reason' },
                  { key: 'meeting_date', label: 'Date' },
                  { key: 'status', label: 'Status' },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (r) => r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateMeeting(r.id, 'approved')}>Approve</Button>
                        <Button size="sm" variant="secondary" onClick={() => updateMeeting(r.id, 'rejected')}>Reject</Button>
                      </div>
                    ) : '—',
                  },
                ]}
                data={meetings}
              />
            </>
          )}
        </>
      )}
      {!readOnly && (
      <Modal open={modal} onClose={() => setModal(false)} title="Request parent meeting">
        <p className="text-sm text-slate-500 mb-4">
          Enter the student admission ID — parent and student will fill in automatically.
        </p>
        <Input
          label="Student admission ID"
          placeholder="e.g. ADM001"
          value={form.admission_no}
          onChange={(e) => lookupByAdmission(e.target.value)}
          onBlur={(e) => lookupByAdmission(e.target.value)}
        />
        {lookupMsg && (
          <Alert type={lookupType === 'success' ? 'success' : 'error'} message={lookupMsg} />
        )}
        <Select
          label="Parent"
          value={form.parent_id}
          onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
          options={[
            { value: '', label: 'Select parent' },
            ...parents.map((p) => ({ value: p.id, label: `${p.name}${p.phone ? ` (${p.phone})` : ''}` })),
          ]}
        />
        {selectedParent && (
          <p className="text-xs text-slate-500 -mt-2 mb-3">
            {selectedParent.email || 'No email'} · {selectedParent.phone || 'No phone'}
          </p>
        )}
        <Select
          label="Student"
          value={form.student_id}
          onChange={(e) => onStudentSelect(e.target.value)}
          options={[
            { value: '', label: 'Select student' },
            ...students.map((s) => ({
              value: s.id,
              label: `${s.first_name} ${s.last_name || ''}${s.admission_no ? ` (${s.admission_no})` : ''}${s.parent_name ? ` — ${s.parent_name}` : ''}`,
            })),
          ]}
        />
        {selectedStudent && (
          <p className="text-xs text-slate-500 -mt-2 mb-3">
            Class: {selectedStudent.class_name || '—'} · Roll: {selectedStudent.roll_no || '—'}
          </p>
        )}
        <Textarea label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <Input type="date" label="Date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} />
        <Input type="time" label="Time" value={form.meeting_time} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} />
        <Button className="mt-4" onClick={requestMeeting}>Send request</Button>
      </Modal>
      )}
    </DashboardLayout>
  );
}
