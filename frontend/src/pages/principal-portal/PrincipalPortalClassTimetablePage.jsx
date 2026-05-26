import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { useMonitoring } from '../monitoring/MonitoringContext';
import { Card, Select, Alert, Spinner, EmptyState } from '../../components/ui';
import { TimetableGrid, DAY_LABELS } from '../../components/timetable/TimetableGrid';
import { timetableService, academicService, classSubjectsService, DAYS } from '../../services/authService';

export default function PrincipalPortalClassTimetablePage() {
  const { basePath, scopeParams, showBanner } = useMonitoring();
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', section_id: '', mode: 'section' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      academicService.classes.list(scopeParams),
      academicService.sections.list(scopeParams),
      classSubjectsService.list(scopeParams),
      timetableService.periods.list(scopeParams),
    ])
      .then(([c, s, cs, p]) => {
        setClasses(c.data.data || []);
        setSections(s.data.data || []);
        setClassSubjects(cs.data.data || []);
        setPeriods(p.data.data || []);
      })
      .catch(() => setErr('Failed to load classes and timetable data'))
      .finally(() => setInitialLoading(false));
  }, [scopeParams.institution_id]);

  const classSections = useMemo(
    () => sections.filter((s) => String(s.class_id) === String(filters.class_id)),
    [sections, filters.class_id]
  );

  const effectiveMode = filters.mode === 'section' && classSections.length === 0 ? 'class' : filters.mode;

  const sectionIdForApi = () => (effectiveMode === 'class' ? null : (filters.section_id ? parseInt(filters.section_id, 10) : null));

  useEffect(() => {
    if (!filters.class_id) return;
    if (effectiveMode === 'section' && classSections.length && !filters.section_id) {
      setFilters((f) => ({ ...f, section_id: String(classSections[0].id) }));
    }
  }, [filters.class_id, effectiveMode, classSections.length]);

  const loadTimetable = async () => {
    if (!filters.class_id) return;
    setLoading(true);
    setErr('');
    try {
      const sectionParam = effectiveMode === 'class' ? 'none' : (filters.section_id || 'none');
      const res = await timetableService.classSection(filters.class_id, sectionParam);
      const data = res.data.data || {};
      setEntries(data.entries || []);
      setPublished(!!data.is_published);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to load timetable');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [filters.class_id, filters.section_id, effectiveMode]);

  const subjectsForClass = useMemo(() => {
    if (!filters.class_id) return [];
    const mapped = classSubjects.filter((cs) => String(cs.class_id) === String(filters.class_id));
    const uniq = new Map();
    mapped.forEach((m) => {
      if (!uniq.has(m.subject_id)) {
        uniq.set(m.subject_id, { id: m.subject_id, name: m.subject_name });
      }
    });
    return [...uniq.values()];
  }, [filters.class_id, classSubjects]);

  const selectedClassName = classes.find((c) => String(c.id) === String(filters.class_id))?.name;
  const selectedSectionName = classSections.find((s) => String(s.id) === String(filters.section_id))?.name;

  if (initialLoading) {
    return <DashboardLayout><Spinner /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <div className="flex flex-wrap gap-4 text-sm mb-4">
        <Link to={`${basePath}/timetable/teacher`} className="text-indigo-600 hover:underline">Teacher timetable</Link>
        <Link to={`${basePath}/timetable/conflicts`} className="text-indigo-600 hover:underline">Conflicts</Link>
      </div>
      <h2 className="text-2xl font-bold mb-2">Class Timetable</h2>
      <p className="text-sm text-slate-500 mb-6">
        View the weekly schedule for each class. Select a class to see subjects, teachers, and periods.
        After the school administrator publishes a timetable, students and teachers see it in their portals.
      </p>
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <Select
            label="View type"
            value={filters.mode}
            onChange={(e) => setFilters({ ...filters, mode: e.target.value, section_id: '' })}
            options={[
              { value: 'section', label: 'By section (recommended)' },
              { value: 'class', label: 'Whole class (all sections)' },
            ]}
          />
          <Select
            label="Class"
            value={filters.class_id}
            onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })}
            options={[
              { value: '', label: classes.length ? 'Select class' : 'No classes available' },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          {filters.mode === 'section' && filters.class_id && (
            <Select
              label="Section"
              value={filters.section_id}
              onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
              options={
                classSections.length
                  ? classSections.map((s) => ({ value: s.id, label: s.name }))
                  : [{ value: '', label: 'No sections — viewing whole class instead' }]
              }
            />
          )}
          {filters.class_id && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${published ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {published ? 'Published' : 'Draft'}
            </span>
          )}
        </div>
        {filters.class_id && !subjectsForClass.length && (
          <p className="text-sm text-amber-700 mt-4">
            No subjects are assigned to this class yet. The school administrator can assign them under Class Subjects.
          </p>
        )}
      </Card>

      {!classes.length ? (
        <EmptyState message="No classes found for your school. Please contact the school administrator." />
      ) : loading ? (
        <Spinner />
      ) : !filters.class_id ? (
        <p className="text-slate-500 text-center py-12">Select a class to view its timetable.</p>
      ) : (
        <>
          <Card className="mb-4 bg-violet-50 border-violet-100">
            <p className="font-semibold text-violet-900">
              {selectedClassName}
              {effectiveMode === 'section' && selectedSectionName ? ` · Section ${selectedSectionName}` : effectiveMode === 'class' ? ' · All sections' : ''}
            </p>
            <p className="text-sm text-violet-700 mt-1">
              {subjectsForClass.length} subject(s) · {entries.length} period(s) this week
            </p>
          </Card>
          {entries.length === 0 ? (
            <EmptyState message="No timetable entries yet for this class. The school administrator can build the schedule in the School Administrator portal." />
          ) : (
            <>
              <Card title="Weekly schedule" className="mb-6">
                <TimetableGrid entries={entries} periods={periods} showPublishBadge />
              </Card>
              <Card title="Period list">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left py-2 px-3">Day</th>
                        <th className="text-left py-2 px-3">Period</th>
                        <th className="text-left py-2 px-3">Subject</th>
                        <th className="text-left py-2 px-3">Teacher</th>
                        <th className="text-left py-2 px-3">Room</th>
                        <th className="text-left py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100">
                          <td className="py-2 px-3">{DAY_LABELS[r.day_of_week] || r.day_of_week}</td>
                          <td className="py-2 px-3">{r.period_name}</td>
                          <td className="py-2 px-3">{r.subject_name}</td>
                          <td className="py-2 px-3">{r.teacher_name || '—'}</td>
                          <td className="py-2 px-3">{r.room || '—'}</td>
                          <td className="py-2 px-3">{r.is_published ? 'Published' : 'Draft'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
