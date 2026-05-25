import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Modal, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { ExamScheduleTable } from '../../components/exams/ExamScheduleTable';
import SmsActionButton from '../../components/sms/SmsActionButton';
import { examsService, academicService, teachersService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  return '/principal';
}

export default function ExamSchedulePage() {
  const { examId } = useParams();
  const { user } = useAuth();
  const base = roleBase(user.role);
  const [exam, setExam] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', section_id: '', subject_id: '', exam_date: '' });
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [smsMsg, setSmsMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSchedules = () => {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    Promise.all([
      examsService.list({}),
      examsService.schedules.list(examId, params),
    ]).then(([examsRes, schedRes]) => {
      const found = examsRes.data.data.find((e) => String(e.id) === String(examId));
      setExam(found || null);
      setSchedules(schedRes.data.data);
    }).catch(() => setErr('Failed to load schedule'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([
      academicService.classes.list(),
      academicService.sections.list(),
      academicService.subjects.list(),
      teachersService.list(),
    ]).then(([c, s, sub, t]) => {
      setClasses(c.data.data);
      setSections(s.data.data);
      setSubjects(sub.data.data);
      setTeachers(t.data.data);
    });
    loadSchedules();
  }, [examId, filters.class_id, filters.section_id, filters.subject_id, filters.exam_date]);

  const filteredSections = sections.filter((s) => !form.class_id || s.class_id === parseInt(form.class_id, 10));

  const openCreate = () => {
    setEditId(null);
    setForm({
      class_id: exam?.class_id || '',
      exam_date: '',
      start_time: '',
      end_time: '',
      max_marks: exam?.default_max_marks || 100,
      pass_marks: exam?.default_pass_marks || 33,
    });
    setModal(true);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    setForm({
      class_id: s.class_id || '',
      section_id: s.section_id || '',
      subject_id: s.subject_id,
      exam_date: String(s.exam_date).slice(0, 10),
      start_time: s.start_time ? String(s.start_time).slice(0, 5) : '',
      end_time: s.end_time ? String(s.end_time).slice(0, 5) : '',
      room: s.room || '',
      invigilator_id: s.invigilator_id || '',
      max_marks: s.max_marks,
      pass_marks: s.pass_marks,
    });
    setModal(true);
  };

  const handleSave = async () => {
    setErr('');
    try {
      const payload = {
        class_id: form.class_id ? parseInt(form.class_id, 10) : null,
        section_id: form.section_id ? parseInt(form.section_id, 10) : null,
        subject_id: parseInt(form.subject_id, 10),
        exam_date: form.exam_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        room: form.room || null,
        invigilator_id: form.invigilator_id ? parseInt(form.invigilator_id, 10) : null,
        max_marks: parseFloat(form.max_marks),
        pass_marks: parseFloat(form.pass_marks),
      };
      if (editId) await examsService.schedules.update(editId, payload);
      else await examsService.schedules.create(examId, payload);
      setMsg(editId ? 'Schedule updated' : 'Schedule added');
      setModal(false);
      loadSchedules();
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Cancel this schedule entry?')) return;
    try {
      await examsService.schedules.remove(id);
      setMsg('Schedule cancelled');
      loadSchedules();
    } catch (e) {
      setErr(e.response?.data?.message || 'Remove failed');
    }
  };

  const handlePublish = async (publish) => {
    try {
      if (publish) await examsService.publish(examId);
      else await examsService.unpublish(examId);
      setMsg(publish ? 'Exam published' : 'Exam unpublished');
      loadSchedules();
    } catch (e) {
      setErr(e.response?.data?.message || 'Publish action failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link to={`${base}/exams/list`} className="text-sm text-blue-600 hover:underline">← Back to Exams</Link>
        <div className="flex flex-wrap justify-between items-center gap-4 mt-1">
          <div>
            <h2 className="text-2xl font-bold">{exam?.name || 'Exam Schedule'}</h2>
            {exam && (
              <p className="text-sm text-gray-500 mt-1">
                {exam.exam_type_name} · {exam.class_name || 'All classes'}
                {' · '}
                <ExamStatusBadge status={exam.status} />
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {exam?.status === 'draft' && <Button variant="success" onClick={() => handlePublish(true)}>Publish</Button>}
            {exam?.status === 'published' && <Button variant="secondary" onClick={() => handlePublish(false)}>Unpublish</Button>}
            <Button onClick={openCreate}>Add Subject Schedule</Button>
            <SmsActionButton label="Send Exam SMS Notice" onNotify={setSmsMsg} />
          </div>
        </div>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="warning" message={smsMsg} onClose={() => setSmsMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-4 gap-4">
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
            options={[{ value: '', label: 'All' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Section" value={filters.section_id} onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
            options={[{ value: '', label: 'All' }, ...sections.map((s) => ({ value: s.id, label: s.name }))]} />
          <Select label="Subject" value={filters.subject_id} onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}
            options={[{ value: '', label: 'All' }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]} />
          <Input label="Date" type="date" value={filters.exam_date} onChange={(e) => setFilters({ ...filters, exam_date: e.target.value })} />
        </div>
      </Card>
      <Card>
        {loading ? <Spinner /> : schedules.length ? (
          <ExamScheduleTable
            schedules={schedules}
            renderActions={(s) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(s)}>Edit</Button>
                <Button variant="danger" onClick={() => handleRemove(s.id)}>Cancel</Button>
              </div>
            )}
          />
        ) : (
          <EmptyState message="No subject schedules yet. Add schedules before publishing." />
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Schedule' : 'Add Schedule'}>
        <Select label="Class" value={form.class_id || ''} onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })}
          options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
        <Select label="Section" value={form.section_id || ''} onChange={(e) => setForm({ ...form, section_id: e.target.value })}
          options={[{ value: '', label: 'All sections' }, ...filteredSections.map((s) => ({ value: s.id, label: s.name }))]} />
        <Select label="Subject" value={form.subject_id || ''} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
          options={[{ value: '', label: 'Select subject' }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]} />
        <Input label="Exam Date" type="date" value={form.exam_date || ''} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} />
        <Input label="Start Time" type="time" value={form.start_time || ''} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        <Input label="End Time" type="time" value={form.end_time || ''} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        <Input label="Room" value={form.room || ''} onChange={(e) => setForm({ ...form, room: e.target.value })} />
        <Select label="Invigilator" value={form.invigilator_id || ''} onChange={(e) => setForm({ ...form, invigilator_id: e.target.value })}
          options={[{ value: '', label: 'None' }, ...teachers.map((t) => ({ value: t.id, label: t.name }))]} />
        <Input label="Total Marks" type="number" value={form.max_marks ?? 100} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} />
        <Input label="Passing Marks" type="number" value={form.pass_marks ?? 33} onChange={(e) => setForm({ ...form, pass_marks: e.target.value })} />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
