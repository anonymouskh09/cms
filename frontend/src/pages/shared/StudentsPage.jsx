import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RecordActions from '../../components/shared/RecordActions';
import { Card, Button, Input, Select, Textarea, Table, Badge, Modal, Alert, Spinner } from '../../components/ui';
import { studentsService, academicService, parentsService } from '../../services/authService';

const emptyAddForm = {
  parent_mode: 'new',
  parent_relationship: 'father',
  parent_name: '',
  parent_email: '',
  parent_phone: '',
  parent_password: '',
  parent_id: '',
};

function FormSection({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 mb-4">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {subtitle ? <p className="text-xs text-slate-500 mt-0.5 mb-3">{subtitle}</p> : <div className="mb-3" />}
      {children}
    </div>
  );
}

function FieldGrid({ children, cols = 2 }) {
  return (
    <div className={cols === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4' : ''}>
      {children}
    </div>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [parents, setParents] = useState([]);
  const [filters, setFilters] = useState({ search: '', class_id: '', status: '' });
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAddForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === 'admin' ? '/admin' : user?.role === 'owner' ? '/owner' : '/principal';

  const filteredSections = sections.filter((s) => !form.class_id || String(s.class_id) === String(form.class_id));

  const load = () => {
    setLoading(true);
    Promise.all([
      studentsService.list(filters),
      academicService.classes.list(),
      academicService.sections.list(),
    ]).then(([s, c, sec]) => {
      setStudents(s.data.data);
      setClasses(c.data.data);
      setSections(sec.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const loadParents = () => {
    parentsService.list({ status: 'active' }).then((res) => setParents(res.data.data || [])).catch(() => setParents([]));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyAddForm });
    setErr('');
    loadParents();
    setModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      student_cnic: row.student_cnic || '',
      father_name: row.father_name || '',
      father_cnic: row.father_cnic || '',
      gender: row.gender || '',
      date_of_birth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : '',
      phone: row.phone || '',
      address: row.address || '',
      class_id: row.class_id ? String(row.class_id) : '',
      section_id: row.section_id ? String(row.section_id) : '',
      admission_no: row.admission_no || '',
      roll_no: row.roll_no || '',
      student_code: row.student_code || '',
      status: row.status || 'active',
      email: row.login_email || '',
      password: '',
      parent_id: row.parent_id ? String(row.parent_id) : '',
      parent_mode: 'none',
    });
    setErr('');
    loadParents();
    setModal(true);
  };

  const setFatherName = (value) => {
    setForm((f) => ({
      ...f,
      father_name: value,
      parent_name: f.parent_mode === 'new' && (!f.parent_name || f.parent_name === f.father_name) ? value : f.parent_name,
    }));
  };

  const buildPayload = () => {
    const payload = {
      ...form,
      class_id: form.class_id ? parseInt(form.class_id, 10) : null,
      section_id: form.section_id ? parseInt(form.section_id, 10) : null,
    };
    if (!payload.password) delete payload.password;
    if (editingId) {
      delete payload.parent_mode;
      delete payload.parent_email;
      delete payload.parent_password;
      delete payload.parent_name;
      delete payload.parent_phone;
      delete payload.parent_relationship;
      if (payload.parent_id) payload.parent_id = parseInt(payload.parent_id, 10);
      else delete payload.parent_id;
    } else if (payload.parent_mode === 'none') {
      delete payload.parent_id;
      delete payload.parent_email;
      delete payload.parent_password;
      delete payload.parent_name;
      delete payload.parent_phone;
      delete payload.parent_relationship;
    } else if (payload.parent_mode === 'existing') {
      payload.parent_id = payload.parent_id ? parseInt(payload.parent_id, 10) : null;
      delete payload.parent_email;
      delete payload.parent_password;
      delete payload.parent_name;
      delete payload.parent_phone;
    } else {
      delete payload.parent_id;
    }
    return payload;
  };

  const handleSave = async () => {
    if (!form.first_name?.trim()) {
      setErr('First name is required');
      return;
    }
    if (!editingId && form.parent_mode === 'new' && !form.parent_email?.trim()) {
      setErr('Parent login email is required (or choose Link existing / Skip parent)');
      return;
    }
    if (!editingId && form.parent_mode === 'existing' && !form.parent_id) {
      setErr('Select an existing parent to link');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      const payload = buildPayload();
      if (editingId) {
        await studentsService.update(editingId, payload);
        setMsg('Student updated');
      } else {
        const res = await studentsService.create(payload);
        const d = res.data.data;
        let successText = `Student login: ${d.login_email} / ${d.initial_password || form.password || 'password123'} · Admission ${d.admission_no}, Roll ${d.roll_no || '—'}`;
        if (d.parent_login_email) {
          successText += ` · Parent login: ${d.parent_login_email} / ${d.parent_initial_password || form.parent_password || 'password123'}`;
        }
        setMsg(successText);
      }
      setModal(false);
      setForm(emptyAddForm);
      setEditingId(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const name = `${row.first_name} ${row.last_name || ''}`.trim();
    if (!window.confirm(`Permanently delete "${name}"? All linked fee and attendance data for this student will also be removed.`)) return;
    try {
      await studentsService.remove(row.id);
      setMsg('Student deleted');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Delete failed');
    }
  };

  const parentModeOptions = [
    { value: 'new', label: 'Create new parent login' },
    { value: 'existing', label: 'Link existing parent' },
    { value: 'none', label: 'No parent portal account' },
  ];

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Students</h2>
          <p className="text-sm text-gray-500 mt-1">Add student and parent portal logins in one step. Click a row for full profile.</p>
        </div>
        <Button onClick={openAdd}>Add Student</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <Input placeholder="Search name, CNIC, father..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="!mb-0 max-w-xs" />
          <Select value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })} className="!mb-0 max-w-xs"
            options={[{ value: '', label: 'All Classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="!mb-0 max-w-xs"
            options={[{ value: '', label: 'All Status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
        {loading ? <Spinner /> : (
          <Table columns={[
            { key: 'name', label: 'Name', render: (r) => `${r.first_name} ${r.last_name || ''}` },
            { key: 'admission_no', label: 'Admission No' },
            { key: 'roll_no', label: 'Roll No' },
            { key: 'login_email', label: 'Student Login', render: (r) => r.login_email || '—' },
            { key: 'class_name', label: 'Class' },
            { key: 'section_name', label: 'Section' },
            { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <RecordActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} />
              ),
            },
          ]} data={students} onRowClick={(r) => navigate(`${basePath}/students/${r.id}`)} />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? 'Edit Student' : 'Add Student'} size="xl">
        <Alert type="error" message={err} onClose={() => setErr('')} />

        <FormSection title="Student details" subtitle="Basic information and class placement">
          <FieldGrid>
            <Input label="First name *" value={form.first_name || ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="!mb-4" />
            <Input label="Last name" value={form.last_name || ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="!mb-4" />
            <Input label="Father / guardian name" value={form.father_name || ''} onChange={(e) => setFatherName(e.target.value)} className="!mb-4" />
            <Select label="Gender" value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="!mb-4"
              options={[{ value: '', label: 'Select' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
            <Input label="Date of birth" type="date" value={form.date_of_birth || ''} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className="!mb-4" />
            <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="!mb-4" />
            <Input label="Student CNIC" value={form.student_cnic || ''} onChange={(e) => setForm({ ...form, student_cnic: e.target.value })} className="!mb-4" />
            <Input label="Father CNIC" value={form.father_cnic || ''} onChange={(e) => setForm({ ...form, father_cnic: e.target.value })} className="!mb-4" />
          </FieldGrid>
          <Textarea label="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="!mb-0" />
        </FormSection>

        <FormSection title="Class & admission" subtitle="Admission no, roll no auto-generate if left empty">
          <FieldGrid>
            <Select label="Class *" value={form.class_id || ''} onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })} className="!mb-4"
              options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]} />
            <Select label="Section" value={form.section_id || ''} onChange={(e) => setForm({ ...form, section_id: e.target.value })} className="!mb-4"
              options={[{ value: '', label: 'Select section' }, ...filteredSections.map((s) => ({ value: String(s.id), label: s.name }))]} />
            <Input label="Admission no (optional)" value={form.admission_no || ''} onChange={(e) => setForm({ ...form, admission_no: e.target.value })} className="!mb-4" />
            <Input label="Roll no (optional)" value={form.roll_no || ''} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} className="!mb-4" />
          </FieldGrid>
          {editingId && (
            <FieldGrid>
              <Input label="Student ID" value={form.student_code || ''} onChange={(e) => setForm({ ...form, student_code: e.target.value })} className="!mb-4" />
              <Select label="Status" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })} className="!mb-4"
                options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            </FieldGrid>
          )}
        </FormSection>

        <FormSection title="Student portal login" subtitle="Credentials for the student app">
          <FieldGrid>
            <Input label="Login email (optional)" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} className="!mb-4" placeholder="Auto from admission no if empty" />
            <Input label={editingId ? 'New password (optional)' : 'Password (optional)'} type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} className="!mb-4" help="Default: password123" />
          </FieldGrid>
        </FormSection>

        {!editingId ? (
          <FormSection title="Parent portal login" subtitle="Create parent account and link to this student in one save">
            <Select label="Parent account" value={form.parent_mode || 'new'} onChange={(e) => setForm({ ...form, parent_mode: e.target.value })} className="!mb-4"
              options={parentModeOptions} />
            {form.parent_mode === 'new' && (
              <FieldGrid>
                <Input label="Parent name" value={form.parent_name || ''} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} className="!mb-4" placeholder="Usually father / guardian name" />
                <Select label="Relationship" value={form.parent_relationship || 'father'} onChange={(e) => setForm({ ...form, parent_relationship: e.target.value })} className="!mb-4"
                  options={[
                    { value: 'father', label: 'Father' },
                    { value: 'mother', label: 'Mother' },
                    { value: 'guardian', label: 'Guardian' },
                    { value: 'parent', label: 'Parent' },
                  ]} />
                <Input label="Parent login email *" type="email" value={form.parent_email || ''} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} className="!mb-4" />
                <Input label="Parent phone" value={form.parent_phone || ''} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} className="!mb-4" />
                <Input label="Parent password (optional)" type="password" value={form.parent_password || ''} onChange={(e) => setForm({ ...form, parent_password: e.target.value })} className="!mb-4 sm:col-span-2" help="Default: password123" />
              </FieldGrid>
            )}
            {form.parent_mode === 'existing' && (
              <FieldGrid>
                <Select label="Select parent *" value={form.parent_id || ''} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="!mb-4 sm:col-span-2"
                  options={[
                    { value: '', label: 'Choose parent' },
                    ...parents.map((p) => ({
                      value: String(p.id),
                      label: `${p.name} (${p.email || p.user_email || 'no email'})`,
                    })),
                  ]} />
                <Select label="Relationship" value={form.parent_relationship || 'parent'} onChange={(e) => setForm({ ...form, parent_relationship: e.target.value })} className="!mb-4"
                  options={[
                    { value: 'father', label: 'Father' },
                    { value: 'mother', label: 'Mother' },
                    { value: 'guardian', label: 'Guardian' },
                    { value: 'parent', label: 'Parent' },
                  ]} />
              </FieldGrid>
            )}
          </FormSection>
        ) : (
          <FormSection title="Linked parent" subtitle="Optional — assign an existing parent record">
            <Select label="Parent" value={form.parent_id || ''} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="!mb-0"
              options={[
                { value: '', label: 'No change / none' },
                ...parents.map((p) => ({
                  value: String(p.id),
                  label: `${p.name} (${p.email || p.user_email || '—'})`,
                })),
              ]} />
          </FormSection>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create student & parent'}
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
