import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Badge, Spinner, StatCard, Table, Button, Input, Select, Textarea, Modal, Alert } from '../../components/ui';
import { studentsService, academicService } from '../../services/authService';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === 'admin' ? '/admin' : user?.role === 'owner' ? '/owner' : '/principal';
  const [data, setData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [form, setForm] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const filteredSections = sections.filter((s) => !form.class_id || String(s.class_id) === String(form.class_id));

  const load = () => {
    setLoading(true);
    Promise.all([
      studentsService.get(id),
      academicService.classes.list(),
      academicService.sections.list(),
    ]).then(([res, c, sec]) => {
      setData(res.data.data);
      setClasses(c.data.data || []);
      setSections(sec.data.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const openEdit = () => {
    setForm({
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      student_cnic: data.student_cnic || '',
      father_name: data.father_name || '',
      father_cnic: data.father_cnic || '',
      gender: data.gender || '',
      date_of_birth: data.date_of_birth ? String(data.date_of_birth).slice(0, 10) : '',
      phone: data.phone || '',
      address: data.address || '',
      class_id: data.class_id ? String(data.class_id) : '',
      section_id: data.section_id ? String(data.section_id) : '',
      admission_no: data.admission_no || '',
      roll_no: data.roll_no || '',
      student_code: data.student_code || '',
      status: data.status || 'active',
      email: data.login_email || '',
      password: '',
    });
    setErr('');
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setErr('');
    try {
      const payload = {
        ...form,
        class_id: form.class_id ? parseInt(form.class_id, 10) : null,
        section_id: form.section_id ? parseInt(form.section_id, 10) : null,
      };
      if (!payload.password) delete payload.password;
      const res = await studentsService.update(id, payload);
      await load();
      setMsg('Student updated successfully');
      setEditOpen(false);
    } catch (e) {
      setErr(e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;
  if (!data) return <DashboardLayout><p>Student not found</p></DashboardLayout>;

  const present = data.attendance_summary?.find((a) => a.status === 'present')?.count || 0;
  const total = data.attendance_summary?.reduce((s, a) => s + a.count, 0) || 0;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-start mb-6 gap-3 flex-wrap">
        <h2 className="text-2xl font-bold">{data.first_name} {data.last_name}</h2>
        <div className="flex gap-2">
          <Button onClick={openEdit}>Edit Student</Button>
          <Button
            variant="danger"
            onClick={async () => {
              const name = `${data.first_name} ${data.last_name || ''}`.trim();
              if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
              try {
                await studentsService.remove(id);
                navigate(`${basePath}/students`);
              } catch (e) {
                setErr(e.response?.data?.message || 'Delete failed');
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <StatCard title="Attendance" value={total ? `${Math.round((present / total) * 100)}%` : '—'} color="green" />
        <StatCard title="Class" value={data.class_name} color="blue" />
        <StatCard title="Status" value={data.status} color="purple" />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Personal Details">
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Admission No:</span> {data.admission_no}</p>
            <p><span className="text-gray-500">Roll No:</span> {data.roll_no}</p>
            <p><span className="text-gray-500">Login Email:</span> {data.login_email || '—'}</p>
            <p><span className="text-gray-500">Student ID:</span> {data.student_code || '—'}</p>
            <p><span className="text-gray-500">Student CNIC:</span> {data.student_cnic || '—'}</p>
            <p><span className="text-gray-500">Father Name:</span> {data.father_name || '—'}</p>
            <p><span className="text-gray-500">Father CNIC:</span> {data.father_cnic || '—'}</p>
            <p><span className="text-gray-500">Gender:</span> {data.gender || '—'}</p>
            <p><span className="text-gray-500">Date of Birth:</span> {data.date_of_birth ? String(data.date_of_birth).slice(0, 10) : '—'}</p>
            <p><span className="text-gray-500">Phone:</span> {data.phone || '—'}</p>
            <p><span className="text-gray-500">Address:</span> {data.address || '—'}</p>
            <p><span className="text-gray-500">Institution:</span> {data.institution_name}</p>
            <p><span className="text-gray-500">Parent:</span> {data.parent_name || '—'}</p>
          </div>
        </Card>
        <Card title="Recent Challans">
          <Table columns={[
            { key: 'month_year', label: 'Month' },
            { key: 'total_amount', label: 'Amount', render: (r) => `Rs. ${r.total_amount}` },
            { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
          ]} data={data.recent_challans || []} />
        </Card>
        <Card title="Announcements" className="lg:col-span-2">
          <Table columns={[
            { key: 'title', label: 'Title' },
            { key: 'message', label: 'Message' },
            { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
          ]} data={data.announcements || []} />
        </Card>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Student">
        <Alert type="error" message={err} onClose={() => setErr('')} />
        <Input label="First Name" value={form.first_name || ''} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <Input label="Last Name" value={form.last_name || ''} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <Input label="Student CNIC" value={form.student_cnic || ''} onChange={(e) => setForm({ ...form, student_cnic: e.target.value })} />
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
        <Input label="Admission No" value={form.admission_no || ''} onChange={(e) => setForm({ ...form, admission_no: e.target.value })} />
        <Input label="Roll No" value={form.roll_no || ''} onChange={(e) => setForm({ ...form, roll_no: e.target.value })} />
        <Input label="Student ID" value={form.student_code || ''} onChange={(e) => setForm({ ...form, student_code: e.target.value })} />
        <Select label="Status" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}
          options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <Input label="Login Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="New Password" type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} help="Leave blank to keep current password" />
        <Button onClick={handleSave} className="w-full mt-4" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
      </Modal>
    </DashboardLayout>
  );
}