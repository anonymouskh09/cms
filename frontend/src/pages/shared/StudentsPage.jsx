import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Textarea, Table, Badge, Modal, Alert, Spinner } from '../../components/ui';
import { studentsService, academicService } from '../../services/authService';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ search: '', class_id: '', status: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
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

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        class_id: form.class_id ? parseInt(form.class_id, 10) : null,
        section_id: form.section_id ? parseInt(form.section_id, 10) : null,
      };
      const res = await studentsService.create(payload);
      const d = res.data.data;
      setMsg(`Student created — Login: ${d.login_email} / Password: ${d.initial_password || form.password || 'password123'} | Admission: ${d.admission_no}, Roll: ${d.roll_no}`);
      setModal(false);
      setForm({});
      load();
    } catch (e) {
      setMsg(e.response?.data?.message || 'Create failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Students</h2>
          <p className="text-sm text-gray-500 mt-1">Admission No & Roll No auto-generate. <strong>Class + Section</strong> select karein — student us class mein add ho jayega.</p>
        </div>
        <Button onClick={() => setModal(true)}>Add Student</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
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
            { key: 'login_email', label: 'Login Email', render: (r) => r.login_email || '—' },
            { key: 'student_cnic', label: 'CNIC', render: (r) => r.student_cnic || '—' },
            { key: 'father_name', label: 'Father', render: (r) => r.father_name || '—' },
            { key: 'class_name', label: 'Class' },
            { key: 'section_name', label: 'Section' },
            { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
          ]} data={students} onRowClick={(r) => navigate(`${basePath}/students/${r.id}`)} />
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Student">
        <p className="text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-2 mb-4">Admission No, Roll No & Student ID auto-generate if empty. Login email auto-generates from admission no if left blank (e.g. adm20260001@peersschool.students.local).</p>
        <Input label="Login Email (optional)" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="student@school.com" help="Leave blank to auto-generate from admission number" />
        <Input label="Login Password (optional)" type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} help="Default: password123 — share this with the student" />
        <Input label="First Name" value={form.first_name || ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
        <Input label="Last Name" value={form.last_name || ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <Input label="Student CNIC" value={form.student_cnic || ''} onChange={(e) => setForm({ ...form, student_cnic: e.target.value })} placeholder="35202-1234567-1" />
        <Input label="Father Name" value={form.father_name || ''} onChange={(e) => setForm({ ...form, father_name: e.target.value })} />
        <Input label="Father CNIC" value={form.father_cnic || ''} onChange={(e) => setForm({ ...form, father_cnic: e.target.value })} />
        <Select label="Gender" value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}
          options={[{ value: '', label: 'Select' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
        <Input label="Date of Birth" type="date" value={form.date_of_birth || ''} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
        <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Textarea label="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
        <Select label="Class" value={form.class_id || ''} onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })}
          options={[{ value: '', label: 'Select' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]} />
        <Select label="Section" value={form.section_id || ''} onChange={(e) => setForm({ ...form, section_id: e.target.value })}
          options={[{ value: '', label: 'Select' }, ...filteredSections.map((s) => ({ value: String(s.id), label: s.name }))]} />
        <Input label="Admission No (optional)" value={form.admission_no || ''} onChange={(e) => setForm({ ...form, admission_no: e.target.value })} help="Leave blank for auto: ADM-2026-0001" />
        <Input label="Roll No (optional)" value={form.roll_no || ''} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} help="Leave blank for auto based on class/section" />
        <Button onClick={handleCreate} className="w-full mt-4">Create Student</Button>
      </Modal>
    </DashboardLayout>
  );
}
