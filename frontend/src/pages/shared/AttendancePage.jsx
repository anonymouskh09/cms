import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Alert, Spinner, Badge } from '../../components/ui';
import { attendanceService, academicService } from '../../services/authService';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'leave', label: 'Leave', color: 'bg-blue-100 text-blue-800 border-blue-200' },
];

export default function AttendancePage({ canMark = true }) {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const hubPath = isTeacher ? '/teacher/attendance' : user?.role === 'admin' ? '/admin/attendance' : user?.role === 'owner' ? '/owner/attendance' : '/principal/attendance';

  const [teacherClasses, setTeacherClasses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [roster, setRoster] = useState(null);
  const [markData, setMarkData] = useState({});
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    class_id: '',
    section_id: '',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const filteredSections = sections.filter(
    (s) => !filters.class_id || String(s.class_id) === String(filters.class_id)
  );

  useEffect(() => {
    const loadMeta = isTeacher
      ? attendanceService.myClasses().then((res) => {
          const rows = res.data.data || [];
          setTeacherClasses(rows);
          if (rows.length === 1) {
            setFilters((f) => ({
              ...f,
              class_id: String(rows[0].class_id),
              section_id: rows[0].section_id ? String(rows[0].section_id) : '',
            }));
          }
        })
      : Promise.all([academicService.classes.list(), academicService.sections.list()]).then(([c, sec]) => {
          setClasses(c.data.data || []);
          setSections(sec.data.data || []);
        });
    loadMeta.finally(() => setLoading(false));
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher) return;
    academicService.sections.list().then((res) => setSections(res.data.data || []));
  }, [isTeacher]);

  useEffect(() => {
    if (!isTeacher || !filters.class_id) return;
    const secs = teacherClasses.filter((r) => String(r.class_id) === String(filters.class_id));
    if (secs.length === 1 && secs[0].section_id && !filters.section_id) {
      setFilters((f) => ({ ...f, section_id: String(secs[0].section_id) }));
    }
  }, [filters.class_id, isTeacher, teacherClasses]);

  useEffect(() => {
    if (!canMark || !filters.class_id || !filters.date) {
      setRoster(null);
      return;
    }
    setLoading(true);
    setErr('');
    const params = {
      date: filters.date,
      class_id: filters.class_id,
      ...(filters.section_id ? { section_id: filters.section_id } : {}),
    };
    attendanceService.markSheet(params)
      .then((res) => {
        const sheet = res.data.data;
        setRoster(sheet);
        const init = {};
        (sheet.students || []).forEach((st) => {
          init[st.id] = st.attendance_status || 'present';
        });
        setMarkData(init);
      })
      .catch((e) => {
        setErr(e.response?.data?.message || 'Could not load student list');
        setRoster(null);
      })
      .finally(() => setLoading(false));
  }, [filters.class_id, filters.section_id, filters.date, canMark]);

  const classOptions = isTeacher
    ? [...new Map(teacherClasses.map((r) => [r.class_id, { value: String(r.class_id), label: r.class_name }])).values()]
    : [{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))];

  const sectionOptions = isTeacher
    ? [...new Map(
        teacherClasses
          .filter((r) => String(r.class_id) === String(filters.class_id))
          .map((r) => [
            r.section_id ? String(r.section_id) : '',
            {
              value: r.section_id ? String(r.section_id) : '',
              label: r.section_name || 'All sections',
            },
          ])
      ).values()]
    : [{ value: '', label: 'Select section' }, ...filteredSections.map((s) => ({ value: String(s.id), label: s.name }))];

  const setAllStatus = (status) => {
    if (!roster?.students) return;
    const next = {};
    roster.students.forEach((st) => { next[st.id] = status; });
    setMarkData(next);
  };

  const handleMark = async () => {
    if (!roster?.students?.length) return;
    setSaving(true);
    setErr('');
    try {
      const records = roster.students.map((st) => ({
        student_id: st.id,
        status: markData[st.id] || 'present',
      }));
      await attendanceService.mark({
        attendance_date: filters.date,
        class_id: parseInt(filters.class_id, 10),
        section_id: filters.section_id ? parseInt(filters.section_id, 10) : null,
        records,
      });
      setMsg(`Attendance saved for ${records.length} students`);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const counts = STATUS_OPTIONS.reduce((acc, o) => {
    acc[o.value] = Object.values(markData).filter((s) => s === o.value).length;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <Link to={hubPath} className="text-sm text-blue-600 hover:underline">← Attendance</Link>
      <h2 className="text-2xl font-bold mt-2 mb-1">Mark Attendance</h2>
      <p className="text-sm text-gray-500 mb-6">
        {isTeacher ? 'Select your class — all students will appear in the list below.' : 'Select class, section and date to mark attendance.'}
      </p>

      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <Input type="date" label="Date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className="!mb-0 min-w-[160px]" />
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })}
            options={classOptions.length ? classOptions : [{ value: '', label: 'No class assigned' }]} className="!mb-0 min-w-[180px]" />
          <Select label="Section" value={filters.section_id} onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
            options={sectionOptions.length ? sectionOptions : [{ value: '', label: '—' }]} className="!mb-0 min-w-[160px]" />
        </div>
      </Card>

      {loading ? <Spinner /> : !filters.class_id ? (
        <Card><p className="text-gray-500 text-sm">Please select a class to load students.</p></Card>
      ) : roster && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                {roster.class_name}{roster.section_name ? ` — Section ${roster.section_name}` : ''}
              </h3>
              <p className="text-sm text-gray-500">{roster.students.length} students · {filters.date}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setAllStatus('present')}>All Present</Button>
              <Button size="sm" variant="secondary" onClick={() => setAllStatus('absent')}>All Absent</Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {STATUS_OPTIONS.map((o) => (
              <span key={o.value} className={`text-xs px-2 py-1 rounded-full border ${o.color}`}>
                {o.label}: {counts[o.value] || 0}
              </span>
            ))}
          </div>

          {!roster.students.length ? (
            <Card><p className="text-gray-500 text-sm">No active students in this class/section.</p></Card>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {roster.students.map((st, idx) => (
                  <li key={st.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 text-sm font-semibold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{st.first_name} {st.last_name || ''}</p>
                        <p className="text-xs text-gray-500">Roll: {st.roll_no || '—'} · Adm: {st.admission_no || '—'}</p>
                      </div>
                      {st.attendance_status && (
                        <Badge status={st.attendance_status} />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:shrink-0">
                      {STATUS_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setMarkData({ ...markData, [st.id]: o.value })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            (markData[st.id] || 'present') === o.value
                              ? o.color + ' ring-2 ring-offset-1 ring-violet-400'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {roster.students.length > 0 && (
            <Button onClick={handleMark} className="w-full sm:w-auto mt-4" disabled={saving}>
              {saving ? 'Saving...' : `Save Attendance (${roster.students.length} students)`}
            </Button>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
