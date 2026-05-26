import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RecordActions from '../../components/shared/RecordActions';
import { Card, Button, Input, Select, Table, Badge, Modal, Alert, Spinner } from '../../components/ui';
import { parentsService, studentsService } from '../../services/authService';

export default function ParentsPage() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [linkModal, setLinkModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [form, setForm] = useState({ student_ids: [], relationship: 'parent' });
  const [linkForm, setLinkForm] = useState({ student_id: '', relationship: 'parent' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => parentsService.list().then((res) => setParents(res.data.data)).finally(() => setLoading(false));

  useEffect(() => {
    load();
    studentsService.list({ status: 'active' }).then((res) => setStudents(res.data.data || []));
  }, []);

  const toggleStudent = (id) => {
    const ids = form.student_ids || [];
    setForm({
      ...form,
      student_ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ student_ids: [], relationship: 'parent' });
    setErr('');
    setModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      email: row.email || row.user_email || '',
      phone: row.phone || '',
      password: '',
      status: row.status || 'active',
    });
    setErr('');
    setModal(true);
  };

  const handleSave = async () => {
    setErr('');
    try {
      if (editingId) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await parentsService.update(editingId, payload);
        setMsg('Parent updated');
      } else {
        await parentsService.create({
          ...form,
          student_ids: (form.student_ids || []).map((id) => parseInt(id, 10)),
        });
        setMsg('Parent created and linked to selected students');
      }
      setModal(false);
      setForm({ student_ids: [], relationship: 'parent' });
      setEditingId(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Permanently delete parent "${row.name}"? Their login and parent links will be removed.`)) return;
    try {
      await parentsService.remove(row.id);
      setMsg('Parent deleted');
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Delete failed');
    }
  };

  const openLink = (parent) => {
    setSelectedParent(parent);
    setLinkForm({ student_id: '', relationship: 'parent' });
    setLinkModal(true);
  };

  const handleLink = async () => {
    if (!linkForm.student_id) {
      setMsg('Select a student');
      return;
    }
    await parentsService.link({
      parent_user_id: selectedParent.user_id,
      student_id: parseInt(linkForm.student_id, 10),
      relationship: linkForm.relationship,
    });
    setMsg('Student linked to parent');
    setLinkModal(false);
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Parents</h2>
          <p className="text-sm text-gray-500 mt-1">Create, edit, delete parent accounts and link them to students.</p>
        </div>
        <Button onClick={openAdd}>Add Parent</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Card>{loading ? <Spinner /> : (
        <Table columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email', render: (r) => r.email || r.user_email || '—' },
          { key: 'phone', label: 'Phone' },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => (
              <div className="flex flex-wrap gap-2">
                <RecordActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} />
                <Button size="sm" variant="ghost" onClick={() => openLink(r)}>Link Student</Button>
              </div>
            ),
          },
        ]} data={parents} />
      )}</Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? 'Edit Parent' : 'Add Parent'}>
        <Alert type="error" message={err} onClose={() => setErr('')} />
        <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label={editingId ? 'New Password (optional)' : 'Password'} type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {editingId && (
          <Select label="Status" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        )}
        {!editingId && (
          <>
            <Select label="Relationship" value={form.relationship || 'parent'} onChange={(e) => setForm({ ...form, relationship: e.target.value })}
              options={[{ value: 'parent', label: 'Parent' }, { value: 'guardian', label: 'Guardian' }, { value: 'father', label: 'Father' }, { value: 'mother', label: 'Mother' }]} />
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Link Students (optional)</p>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {!students.length ? <p className="text-sm text-gray-500 p-2">No students found.</p> : students.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 p-2 text-sm hover:bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" checked={(form.student_ids || []).includes(s.id)} onChange={() => toggleStudent(s.id)} />
                    <span>{s.first_name} {s.last_name} — {s.admission_no || s.roll_no || s.id}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
        <Button onClick={handleSave} className="w-full mt-4">{editingId ? 'Save Changes' : 'Create Parent'}</Button>
      </Modal>

      <Modal open={linkModal} onClose={() => setLinkModal(false)} title={`Link Student — ${selectedParent?.name || ''}`}>
        <Select label="Student" value={linkForm.student_id} onChange={(e) => setLinkForm({ ...linkForm, student_id: e.target.value })}
          options={[{ value: '', label: 'Select student' }, ...students.map((s) => ({ value: String(s.id), label: `${s.first_name} ${s.last_name || ''} (${s.admission_no || s.roll_no || s.id})` }))]} />
        <Select label="Relationship" value={linkForm.relationship} onChange={(e) => setLinkForm({ ...linkForm, relationship: e.target.value })}
          options={[{ value: 'parent', label: 'Parent' }, { value: 'guardian', label: 'Guardian' }, { value: 'father', label: 'Father' }, { value: 'mother', label: 'Mother' }]} />
        <Button onClick={handleLink} className="w-full mt-4">Link Student</Button>
      </Modal>
    </DashboardLayout>
  );
}
