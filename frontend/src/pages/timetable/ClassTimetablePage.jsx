import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Table, Modal, Alert, Spinner } from '../../components/ui';
import { TimetableGrid, DAY_LABELS } from '../../components/timetable/TimetableGrid';
import { timetableService, academicService, classSubjectsService, teachersService, DAYS } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function ClassTimetablePage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [teachersOverview, setTeachersOverview] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', section_id: '', mode: 'section' });
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ day_of_week: 'monday' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    Promise.all([
      academicService.classes.list(),
      academicService.sections.list(),
      classSubjectsService.list(),
      teachersService.overview(),
      timetableService.periods.list(),
    ]).then(([c, s, cs, t, p]) => {
      setClasses(c.data.data || []);
      setSections(s.data.data || []);
      setClassSubjects(cs.data.data || []);
      setTeachersOverview(t.data.data || []);
      setPeriods(p.data.data || []);
    });
  }, []);

  const classSections = useMemo(
    () => sections.filter((s) => String(s.class_id) === String(filters.class_id)),
    [sections, filters.class_id]
  );

  const subjectsForClass = useMemo(() => {
    if (!filters.class_id) return [];
    const mapped = classSubjects.filter((cs) => String(cs.class_id) === String(filters.class_id));
    const uniq = new Map();
    mapped.forEach((m) => {
      if (!uniq.has(m.subject_id)) {
        uniq.set(m.subject_id, { id: m.subject_id, name: m.subject_name, code: m.subject_code });
      }
    });
    return [...uniq.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [filters.class_id, classSubjects]);

  const sectionIdForApi = () => (filters.mode === 'class' ? null : (filters.section_id ? parseInt(filters.section_id, 10) : null));

  const teachersForForm = useMemo(() => {
    if (!form.subject_id || !filters.class_id) return teachersOverview;
    const cid = parseInt(filters.class_id, 10);
    const sid = sectionIdForApi();
    const subId = parseInt(form.subject_id, 10);
    return teachersOverview.filter((t) => (t.assignments || []).some((a) => {
      if (Number(a.class_id) !== cid || Number(a.subject_id) !== subId) return false;
      if (sid == null) return true;
      return a.section_id == null || Number(a.section_id) === sid;
    }));
  }, [form.subject_id, filters.class_id, filters.section_id, filters.mode, teachersOverview]);

  useEffect(() => {
    if (!filters.class_id) return;
    const secs = classSections;
    if (filters.mode === 'section' && secs.length && !filters.section_id) {
      setFilters((f) => ({ ...f, section_id: String(secs[0].id) }));
    }
  }, [filters.class_id, filters.mode, classSections.length]);

  const loadTimetable = async () => {
    if (!filters.class_id) return;
    setLoading(true);
    setErr('');
    try {
      const sectionParam = filters.mode === 'class' ? 'none' : (filters.section_id || 'none');
      const res = await timetableService.classSection(filters.class_id, sectionParam);
      const data = res.data.data || {};
      setEntries(data.entries || []);
      setPublished(!!data.is_published);
    } catch {
      setErr('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTimetable(); }, [filters.class_id, filters.section_id, filters.mode]);

  const handleSave = async (force = false) => {
    setErr('');
    setConflicts([]);
    const payload = {
      ...form,
      class_id: parseInt(filters.class_id, 10),
      section_id: sectionIdForApi(),
      subject_id: parseInt(form.subject_id, 10),
      teacher_id: form.teacher_id ? parseInt(form.teacher_id, 10) : null,
      timetable_period_id: parseInt(form.timetable_period_id, 10),
      force,
    };
    try {
      if (editId) await timetableService.entries.update(editId, payload);
      else await timetableService.entries.create(payload);
      setMsg(editId ? 'Entry updated' : 'Entry created');
      setModal(false);
      loadTimetable();
    } catch (e) {
      if (e.response?.status === 409) {
        setConflicts(e.response.data.data?.conflicts || []);
        setErr('Conflicts detected. Review below or save with force if allowed.');
      } else {
        setErr(e.response?.data?.message || 'Save failed');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    await timetableService.entries.remove(id);
    setMsg('Entry deleted');
    loadTimetable();
  };

  const handlePublish = async (publish) => {
    const body = { class_id: parseInt(filters.class_id, 10), section_id: sectionIdForApi() };
    if (publish) await timetableService.publish(body);
    else await timetableService.unpublish(body);
    setMsg(publish ? 'Timetable published — students & teachers can see it' : 'Timetable unpublished');
    loadTimetable();
  };

  const openEdit = (entry) => {
    setEditId(entry.id);
    setForm({
      subject_id: entry.subject_id,
      teacher_id: entry.teacher_id,
      timetable_period_id: entry.timetable_period_id,
      day_of_week: entry.day_of_week,
      room: entry.room,
    });
    setModal(true);
  };

  const selectedClassName = classes.find((c) => String(c.id) === String(filters.class_id))?.name;
  const selectedSectionName = classSections.find((s) => String(s.id) === String(filters.section_id))?.name;

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">Class Timetable</h2>
      <p className="text-sm text-gray-500 mb-6">
        Har class ka alag timetable. Class select karein — sirf us class ke subjects dikhenge.
        Publish ke baad students apni class ka aur teachers apna timetable dekhenge.
      </p>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {conflicts.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-medium text-red-800 mb-2">Conflict warnings</p>
          {conflicts.map((c, i) => (
            <p key={i} className="text-sm text-red-700">{c.type}: {c.message}</p>
          ))}
        </div>
      )}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <Select label="Timetable Type" value={filters.mode} onChange={(e) => setFilters({ ...filters, mode: e.target.value, section_id: '' })}
            options={[
              { value: 'section', label: 'Section-wise (recommended)' },
              { value: 'class', label: 'Whole class (no section)' },
            ]} />
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })}
            options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          {filters.mode === 'section' && (
            <Select label="Section" value={filters.section_id} onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
              options={classSections.length
                ? classSections.map((s) => ({ value: s.id, label: s.name }))
                : [{ value: '', label: 'No sections — create in Sections menu' }]} />
          )}
          {filters.class_id && (
            <>
              <Button onClick={() => { setEditId(null); setForm({ day_of_week: 'monday' }); setModal(true); }} disabled={!subjectsForClass.length}>
                Add Entry
              </Button>
              <Button variant="success" onClick={() => handlePublish(true)}>Publish</Button>
              <Button variant="secondary" onClick={() => handlePublish(false)}>Unpublish</Button>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {published ? 'Published' : 'Draft'}
              </span>
            </>
          )}
        </div>
        {filters.class_id && !subjectsForClass.length && (
          <p className="text-sm text-amber-700 mt-4">
            Is class ke subjects assign nahi. Pehle <strong>Class Subjects</strong> se subjects assign karein.
          </p>
        )}
      </Card>
      {loading ? <Spinner /> : filters.class_id ? (
        <>
          <Card className="mb-4 bg-violet-50 border-violet-100">
            <p className="font-semibold text-violet-900">
              {selectedClassName}
              {filters.mode === 'section' && selectedSectionName ? ` · Section ${selectedSectionName}` : filters.mode === 'class' ? ' · (all sections share this grid)' : ''}
            </p>
            <p className="text-sm text-violet-700 mt-1">
              {subjectsForClass.length} subject(s) for this class · {entries.length} timetable slot(s)
            </p>
          </Card>
          <Card title="Weekly Grid" className="mb-6">
            <TimetableGrid entries={entries} periods={periods} showPublishBadge={user?.role !== 'student'} />
          </Card>
          <Card title="Entries List">
            <Table columns={[
              { key: 'day', label: 'Day', render: (r) => DAY_LABELS[r.day_of_week] },
              { key: 'period_name', label: 'Period' },
              { key: 'subject_name', label: 'Subject' },
              { key: 'teacher_name', label: 'Teacher' },
              { key: 'room', label: 'Room' },
              { key: 'is_published', label: 'Status', render: (r) => (
                <span className={`px-2 py-0.5 rounded-full text-xs ${r.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {r.is_published ? 'Published' : 'Draft'}
                </span>
              )},
              { key: 'actions', label: '', render: (r) => (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                  <Button variant="danger" onClick={() => handleDelete(r.id)}>Delete</Button>
                </div>
              )},
            ]} data={entries} />
          </Card>
        </>
      ) : (
        <p className="text-gray-500 text-center py-12">Select a class to manage its timetable.</p>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Entry' : 'Add Entry'}>
        <p className="text-sm text-gray-500 mb-4">
          Class: <strong>{selectedClassName}</strong>
          {filters.mode === 'section' && selectedSectionName && <> · Section: <strong>{selectedSectionName}</strong></>}
        </p>
        <Select label="Day" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
          options={DAYS.map((d) => ({ value: d, label: DAY_LABELS[d] }))} />
        <Select label="Period" value={form.timetable_period_id || ''} onChange={(e) => setForm({ ...form, timetable_period_id: e.target.value })}
          options={[{ value: '', label: 'Select' }, ...periods.filter((p) => !p.is_break).map((p) => ({ value: p.id, label: `${p.name} (${String(p.start_time).slice(0, 5)})` }))]} />
        <Select label="Subject (this class only)" value={form.subject_id || ''} onChange={(e) => setForm({ ...form, subject_id: e.target.value, teacher_id: '' })}
          options={[{ value: '', label: 'Select' }, ...subjectsForClass.map((s) => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` }))]} />
        <Select label="Teacher (assigned to this class/subject)" value={form.teacher_id || ''} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
          options={[
            { value: '', label: teachersForForm.length ? 'Select teacher' : 'No teacher assigned — assign in Teachers' },
            ...teachersForForm.map((t) => ({ value: t.id, label: t.name })),
          ]} />
        <Input label="Room / Lab" value={form.room || ''} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Room 101 / Lab A" />
        <Button onClick={() => handleSave(false)} className="w-full mt-4">Save</Button>
      </Modal>
    </DashboardLayout>
  );
}
