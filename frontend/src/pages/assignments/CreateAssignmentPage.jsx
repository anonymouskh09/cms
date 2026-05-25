import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Alert, Spinner } from '../../components/ui';
import { assignmentsService, teachersService } from '../../services/authService';
import { buildTeacherAssignmentOptions } from '../../utils/teacherAssignmentOptions';

export default function CreateAssignmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [assignOpts, setAssignOpts] = useState(null);
  const [form, setForm] = useState({ max_marks: 100 });
  const [publishForStudents, setPublishForStudents] = useState(true);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    const loadAssignments = teachersService.me()
      .then((res) => {
        const assignments = res.data.data?.assignments || [];
        const opts = buildTeacherAssignmentOptions(assignments);
        setAssignOpts(opts);
        if (!assignments.length) {
          setErr('No class/subject assigned to you. Principal must assign subjects in Teachers → Assign Subjects.');
        } else if (!isEdit && opts.classes.length === 1) {
          const c = opts.classes[0];
          const secs = opts.sectionsForClass(c.id);
          const subj = opts.subjectsForClassSection(c.id, secs[0]?.id ?? '');
          setForm((f) => ({
            ...f,
            class_id: String(c.id),
            section_id: secs.length === 1 ? String(secs[0].id ?? '') : '',
            subject_id: subj.length === 1 ? String(subj[0].id) : '',
          }));
        }
      })
      .catch(() => setErr('Could not load your assigned classes'));

    if (isEdit) {
      Promise.all([loadAssignments, assignmentsService.get(id)])
        .then(([, aRes]) => {
          const a = aRes.data.data;
          setForm({
            title: a.title,
            description: a.description || '',
            class_id: String(a.class_id),
            section_id: a.section_id ? String(a.section_id) : '',
            subject_id: String(a.subject_id),
            due_date: String(a.due_date).slice(0, 16),
            max_marks: a.max_marks,
          });
        })
        .catch(() => setErr('Failed to load assignment'))
        .finally(() => setInitLoading(false));
    } else {
      loadAssignments.finally(() => setInitLoading(false));
    }
  }, [id, isEdit]);

  const classes = assignOpts?.classes || [];
  const filteredSections = useMemo(
    () => assignOpts?.sectionsForClass(form.class_id) || [],
    [assignOpts, form.class_id]
  );
  const filteredSubjects = useMemo(
    () => assignOpts?.subjectsForClassSection(form.class_id, form.section_id) || [],
    [assignOpts, form.class_id, form.section_id]
  );

  const buildFormData = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '' && v != null) fd.append(k, v); });
    if (file) fd.append('attachment', file);
    return fd;
  };

  const handleSave = async () => {
    if (!form.title || !form.class_id || !form.subject_id || !form.due_date) {
      setErr('Title, class, subject and due date are required');
      return;
    }
    if (!assignOpts?.isValidCombo(form.class_id, form.section_id, form.subject_id)) {
      setErr('Select a class and subject from your assigned list (see My Subjects in menu).');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      if (isEdit) {
        await assignmentsService.update(id, buildFormData());
        setMsg('Assignment updated');
      } else {
        const res = await assignmentsService.create(buildFormData());
        const newId = res.data.data?.id;
        if (publishForStudents && newId) {
          await assignmentsService.publish(newId);
          setMsg('Assignment created and published — students in this class can see it now');
        } else {
          setMsg('Assignment saved as draft — click Publish on assignments list so students can see it');
        }
      }
      setTimeout(() => navigate('/teacher/assignments'), 800);
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <Link to="/teacher/assignments" className="text-sm text-blue-600 hover:underline">← Back to Assignments</Link>
      <h2 className="text-2xl font-bold mt-2 mb-6">{isEdit ? 'Edit Assignment' : 'Create Assignment'}</h2>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        {!classes.length && (
          <p className="text-sm text-amber-700 mb-4">
            No assignments found. Open <Link to="/teacher/classes" className="underline font-medium">My Subjects</Link> or ask the principal to assign you.
          </p>
        )}
        <Input label="Title" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input label="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Select label="Class (your assigned classes only)" value={form.class_id || ''} onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '', subject_id: '' })}
          options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
        <Select label="Section" value={form.section_id ?? ''} onChange={(e) => setForm({ ...form, section_id: e.target.value, subject_id: '' })}
          options={filteredSections.length
            ? filteredSections.map((s) => ({ value: s.id === '' ? '' : String(s.id), label: s.name }))
            : [{ value: '', label: form.class_id ? 'All sections' : 'Select class first' }]} />
        <Select label="Subject (must match your assignment)" value={form.subject_id || ''} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
          options={[{ value: '', label: form.class_id ? 'Select subject' : 'Select class first' }, ...filteredSubjects.map((s) => ({ value: s.id, label: s.name }))]} />
        <Input label="Due Date & Time" type="datetime-local" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        <Input label="Max Marks" type="number" value={form.max_marks ?? 100} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} />
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (optional)</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
        </div>
        {!isEdit && (
          <label className="flex items-center gap-2 text-sm mb-4 p-3 bg-green-50 border border-green-100 rounded-lg">
            <input type="checkbox" checked={publishForStudents} onChange={(e) => setPublishForStudents(e.target.checked)} />
            <span>Publish immediately so students in this class/section can see and submit</span>
          </label>
        )}
        <Button onClick={handleSave} disabled={loading || !classes.length}>{loading ? 'Saving…' : 'Save Assignment'}</Button>
      </Card>
    </DashboardLayout>
  );
}
