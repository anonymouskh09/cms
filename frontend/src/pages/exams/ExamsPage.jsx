import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Modal, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { examsService, academicService, institutionsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  return '/principal';
}

export default function ExamsPage() {
  const { user } = useAuth();
  const base = roleBase(user.role);
  const [exams, setExams] = useState([]);
  const [types, setTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState(user.institution_id || 1);
  const [filters, setFilters] = useState({ class_id: '', status: '' });
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = { ...filters };
    if (user.role === 'owner') params.institution_id = institutionId;
    examsService.list(params)
      .then((r) => setExams(r.data.data))
      .catch(() => setErr('Failed to load exams'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const typeParams = user.role === 'owner' ? { institution_id: institutionId } : {};
    Promise.all([
      academicService.classes.list(),
      examsService.types.list(typeParams),
      user.role === 'owner' ? institutionsService.list() : Promise.resolve({ data: { data: [] } }),
    ]).then(([c, t, i]) => {
      setClasses(c.data.data);
      setTypes(t.data.data);
      if (i.data.data.length) setInstitutions(i.data.data);
    });
    load();
  }, [institutionId, filters.class_id, filters.status]);

  const openCreate = () => {
    setEditId(null);
    setForm({ default_max_marks: 100, default_pass_marks: 33, academic_year: new Date().getFullYear().toString() });
    setModal(true);
  };

  const openEdit = (e) => {
    setEditId(e.id);
    setForm({
      exam_type_id: e.exam_type_id,
      name: e.name,
      academic_year: e.academic_year || '',
      class_id: e.class_id || '',
      start_date: e.start_date ? String(e.start_date).slice(0, 10) : '',
      end_date: e.end_date ? String(e.end_date).slice(0, 10) : '',
      default_max_marks: e.default_max_marks,
      default_pass_marks: e.default_pass_marks,
    });
    setModal(true);
  };

  const handleSave = async () => {
    setErr('');
    try {
      const payload = {
        ...form,
        exam_type_id: parseInt(form.exam_type_id, 10),
        class_id: form.class_id ? parseInt(form.class_id, 10) : null,
        default_max_marks: parseFloat(form.default_max_marks),
        default_pass_marks: parseFloat(form.default_pass_marks),
      };
      if (user.role === 'owner') payload.institution_id = institutionId;
      if (editId) await examsService.update(editId, payload);
      else await examsService.create(payload);
      setMsg(editId ? 'Exam updated' : 'Exam created');
      setModal(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this exam?')) return;
    try {
      await examsService.remove(id);
      setMsg('Exam cancelled');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Cannot cancel exam');
    }
  };

  const handlePublish = async (id, publish) => {
    try {
      if (publish) await examsService.publish(id);
      else await examsService.unpublish(id);
      setMsg(publish ? 'Exam published' : 'Exam unpublished');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <Link to={`${base}/exams/setup`} className="text-sm text-blue-600 hover:underline">← Exam Management</Link>
          <h2 className="text-2xl font-bold mt-1">Exams</h2>
        </div>
        <Button onClick={openCreate}>Create Exam</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-3 gap-4">
          {user.role === 'owner' && institutions.length > 0 && (
            <Select label="Institution" value={institutionId} onChange={(e) => setInstitutionId(parseInt(e.target.value, 10))}
              options={institutions.map((i) => ({ value: i.id, label: i.name }))} />
          )}
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
            options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} />
        </div>
      </Card>
      {loading ? <Spinner /> : exams.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {exams.map((e) => (
            <Card key={e.id}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{e.name}</h3>
                  <p className="text-sm text-gray-500">{e.exam_type_name} · {e.class_name || 'All classes'}</p>
                </div>
                <ExamStatusBadge status={e.status} />
              </div>
              <p className="text-sm text-gray-600 mb-2">Year: {e.academic_year || '—'}</p>
              <p className="text-sm text-gray-600 mb-4">
                {e.start_date ? String(e.start_date).slice(0, 10) : '—'} — {e.end_date ? String(e.end_date).slice(0, 10) : '—'}
              </p>
              <p className="text-sm text-gray-600 mb-4">Default marks: {e.default_max_marks} / Pass: {e.default_pass_marks}</p>
              <div className="flex flex-wrap gap-2">
                <Link to={`${base}/exams/${e.id}/schedule`}><Button variant="secondary">Schedule</Button></Link>
                <Button variant="secondary" onClick={() => openEdit(e)}>Edit</Button>
                {e.status === 'draft' && <Button variant="success" onClick={() => handlePublish(e.id, true)}>Publish</Button>}
                {e.status === 'published' && <Button variant="secondary" onClick={() => handlePublish(e.id, false)}>Unpublish</Button>}
                <Button variant="danger" onClick={() => handleCancel(e.id)}>Cancel</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState message="No exams found. Create an exam to begin scheduling." />
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Exam' : 'New Exam'}>
        <Select label="Exam Type" value={form.exam_type_id || ''} onChange={(ev) => setForm({ ...form, exam_type_id: ev.target.value })}
          options={[{ value: '', label: 'Select type' }, ...types.map((t) => ({ value: t.id, label: t.name }))]} />
        <Input label="Name" value={form.name || ''} onChange={(ev) => setForm({ ...form, name: ev.target.value })} />
        <Input label="Academic Year" value={form.academic_year || ''} onChange={(ev) => setForm({ ...form, academic_year: ev.target.value })} />
        <Select label="Class" value={form.class_id || ''} onChange={(ev) => setForm({ ...form, class_id: ev.target.value })}
          options={[{ value: '', label: 'None' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
        <Input label="Start Date" type="date" value={form.start_date || ''} onChange={(ev) => setForm({ ...form, start_date: ev.target.value })} />
        <Input label="End Date" type="date" value={form.end_date || ''} onChange={(ev) => setForm({ ...form, end_date: ev.target.value })} />
        <Input label="Default Total Marks" type="number" value={form.default_max_marks ?? 100} onChange={(ev) => setForm({ ...form, default_max_marks: ev.target.value })} />
        <Input label="Default Passing Marks" type="number" value={form.default_pass_marks ?? 33} onChange={(ev) => setForm({ ...form, default_pass_marks: ev.target.value })} />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
