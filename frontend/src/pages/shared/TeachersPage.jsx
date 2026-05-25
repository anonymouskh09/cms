import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Badge, Modal, Alert, Spinner, EmptyState } from '../../components/ui';
import { teachersService, academicService, classSubjectsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function formatTime(t) {
  if (!t) return '—';
  return String(t).slice(0, 5);
}

function formatDay(d) {
  if (!d) return '—';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export default function TeachersPage() {
  const { user } = useAuth();
  const timetablePath = user?.role === 'owner' ? '/owner/timetable/class' : user?.role === 'admin' ? '/admin/timetable/class' : '/principal/timetable/class';
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({});
  const [assignForm, setAssignForm] = useState({ class_id: '', section_id: '', subject_id: '', role_type: 'subject_teacher' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    teachersService.overview()
      .then((res) => setTeachers(res.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    Promise.all([
      academicService.classes.list(),
      academicService.sections.list(),
      academicService.subjects.list(),
      classSubjectsService.list(),
    ]).then(([c, sec, sub, cs]) => {
      setClasses(c.data.data || []);
      setSections(sec.data.data || []);
      setSubjects(sub.data.data || []);
      setClassSubjects(cs.data.data || []);
    });
  }, []);

  const filteredSections = sections.filter((s) => !assignForm.class_id || String(s.class_id) === String(assignForm.class_id));

  const subjectsForClass = useMemo(() => {
    if (!assignForm.class_id) return subjects;
    const mapped = classSubjects.filter((cs) => String(cs.class_id) === String(assignForm.class_id));
    if (mapped.length) return mapped.map((m) => ({ id: m.subject_id, name: m.subject_name, code: m.subject_code }));
    return subjects.filter((s) => !s.class_id || String(s.class_id) === String(assignForm.class_id));
  }, [assignForm.class_id, classSubjects, subjects]);

  const handleCreate = async () => {
    await teachersService.create(form);
    setMsg('Teacher created');
    setModal(false);
    load();
  };

  const openAssign = async (teacher) => {
    setSelectedTeacher(teacher);
    setAssignForm({ class_id: '', section_id: '', subject_id: '', role_type: 'subject_teacher' });
    setAssignments(teacher.assignments || []);
    setAssignModal(true);
  };

  const refreshSelectedAssignments = async () => {
    if (!selectedTeacher) return;
    const res = await teachersService.get(selectedTeacher.id);
    setAssignments(res.data.data.assignments || []);
    load();
  };

  const handleAssign = async () => {
    if (!assignForm.class_id || !assignForm.subject_id) {
      setMsg('Class and subject required');
      return;
    }
    await teachersService.assign({
      teacher_id: selectedTeacher.id,
      class_id: parseInt(assignForm.class_id, 10),
      section_id: assignForm.section_id ? parseInt(assignForm.section_id, 10) : null,
      subject_id: parseInt(assignForm.subject_id, 10),
      role_type: assignForm.role_type,
    });
    setMsg('Subject assigned to teacher');
    setAssignForm({ class_id: '', section_id: '', subject_id: '', role_type: 'subject_teacher' });
    await refreshSelectedAssignments();
  };

  const handleRemoveAssignment = async (id) => {
    await teachersService.removeAssignment(id);
    await refreshSelectedAssignments();
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Teachers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Har teacher ki assigned classes, subjects aur weekly timetable yahan dikhega.
            Timetable set karne ke liye <Link to={timetablePath} className="text-violet-600 hover:underline">Class Timetable</Link> kholen.
          </p>
        </div>
        <Button onClick={() => setModal(true)}>Add Teacher</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />

      {loading ? <Spinner /> : !teachers.length ? (
        <EmptyState message="No teachers yet. Add a teacher first." />
      ) : (
        <div className="space-y-4">
          {teachers.map((t) => {
            const expanded = expandedId === t.id;
            const assignList = t.assignments || [];
            const ttList = t.timetable || [];
            return (
              <Card key={t.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{t.name}</h3>
                      <Badge status={t.status} />
                    </div>
                    <p className="text-sm text-gray-500">
                      {t.employee_no || '—'} · {t.user_email || t.email || '—'} · {t.qualification || '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {assignList.length} assignment{assignList.length !== 1 ? 's' : ''}
                      {' · '}
                      {ttList.length} timetable period{ttList.length !== 1 ? 's' : ''}/week
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => toggleExpand(t.id)}>
                      {expanded ? 'Hide details' : 'View details'}
                    </Button>
                    <Button variant="secondary" onClick={() => openAssign(t)}>Assign Subjects</Button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-6 pt-6 border-t grid lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Classes &amp; subjects (assigned)</h4>
                      {assignList.length ? (
                        <ul className="text-sm divide-y border rounded-lg">
                          {assignList.map((a) => (
                            <li key={a.id} className="px-3 py-2 flex justify-between gap-2">
                              <span>
                                <span className="font-medium text-violet-800">{a.subject_name}</span>
                                <span className="text-gray-500"> → </span>
                                {a.class_name}
                                {a.section_name ? ` / ${a.section_name}` : ' (all sections)'}
                              </span>
                              <span className="text-xs text-gray-400 shrink-0">
                                {(a.role_type || 'subject_teacher').replace('_', ' ')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                          Abhi koi class/subject assign nahi. <strong>Assign Subjects</strong> use karein.
                        </p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Weekly timetable</h4>
                      {ttList.length ? (
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-left text-gray-500 text-xs">
                                <th className="px-3 py-2">Day</th>
                                <th className="px-3 py-2">Time</th>
                                <th className="px-3 py-2">Subject</th>
                                <th className="px-3 py-2">Class</th>
                                <th className="px-3 py-2">Room</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ttList.map((e) => (
                                <tr key={e.id} className="border-t">
                                  <td className="px-3 py-2">{formatDay(e.day_of_week)}</td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    {formatTime(e.start_time)} – {formatTime(e.end_time)}
                                    {e.period_name && <span className="text-gray-400 text-xs block">{e.period_name}</span>}
                                  </td>
                                  <td className="px-3 py-2 font-medium">{e.subject_name || '—'}</td>
                                  <td className="px-3 py-2">
                                    {e.class_name}
                                    {e.section_name ? ` / ${e.section_name}` : ''}
                                  </td>
                                  <td className="px-3 py-2">{e.room || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                          Timetable abhi set nahi.{' '}
                          <Link to={timetablePath} className="text-violet-600 hover:underline">
                            Class Timetable
                          </Link>
                          {' '}se period assign karein aur teacher select karein.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add Teacher">
        <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Employee No" value={form.employee_no || ''} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} />
        <Input label="Qualification" value={form.qualification || ''} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
        <Input label="Password" type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button onClick={handleCreate} className="w-full mt-4">Create Teacher</Button>
      </Modal>

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title={`Assign — ${selectedTeacher?.name || ''}`}>
        <Select label="Class" value={assignForm.class_id} onChange={(e) => setAssignForm({ ...assignForm, class_id: e.target.value, section_id: '', subject_id: '' })}
          options={[{ value: '', label: 'Select' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]} />
        <Select label="Section (optional)" value={assignForm.section_id} onChange={(e) => setAssignForm({ ...assignForm, section_id: e.target.value })}
          options={[{ value: '', label: 'All sections' }, ...filteredSections.map((s) => ({ value: String(s.id), label: s.name }))]} />
        <Select label="Subject" value={assignForm.subject_id} onChange={(e) => setAssignForm({ ...assignForm, subject_id: e.target.value })}
          options={[{ value: '', label: 'Select' }, ...subjectsForClass.map((s) => ({ value: String(s.id), label: s.name }))]} />
        <Select label="Role" value={assignForm.role_type} onChange={(e) => setAssignForm({ ...assignForm, role_type: e.target.value })}
          options={[{ value: 'subject_teacher', label: 'Subject Teacher' }, { value: 'class_teacher', label: 'Class Teacher' }]} />
        <Button onClick={handleAssign} className="w-full mt-4 mb-6">Assign</Button>

        <h4 className="font-semibold text-gray-900 mb-3">Current Assignments</h4>
        {!assignments.length ? <p className="text-sm text-gray-500">No assignments yet.</p> : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-200 text-sm">
                <span>{a.class_name}{a.section_name ? ` / ${a.section_name}` : ''} — {a.subject_name}</span>
                <Button size="sm" variant="danger" onClick={() => handleRemoveAssignment(a.id)}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
