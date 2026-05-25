import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { ExamScheduleTable } from '../../components/exams/ExamScheduleTable';
import { examsService, academicService, institutionsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  return '/principal';
}

export default function PublishedExamsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState(user.institution_id || 1);
  const [classFilter, setClassFilter] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { status: 'published' };
    if (user.role === 'owner') params.institution_id = institutionId;
    if (classFilter) params.class_id = classFilter;
    Promise.all([
      examsService.list(params),
      examsService.calendar({ ...(user.role === 'owner' ? { institution_id: institutionId } : {}), ...(classFilter ? { class_id: classFilter } : {}) }),
      academicService.classes.list(),
      user.role === 'owner' ? institutionsService.list() : Promise.resolve({ data: { data: [] } }),
    ]).then(([e, s, c, i]) => {
      setExams(e.data.data);
      setSchedules(s.data.data);
      setClasses(c.data.data);
      if (i.data.data.length) setInstitutions(i.data.data);
    }).catch(() => setErr('Failed to load published exams'))
      .finally(() => setLoading(false));
  }, [institutionId, classFilter]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <Link to={`${roleBase(user.role)}/exams/setup`} className="text-sm text-blue-600 hover:underline">← Exam Management</Link>
        <h2 className="text-2xl font-bold mt-1">Published Exams</h2>
      </div>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {user.role === 'owner' && institutions.length > 0 && (
            <Select label="Institution" value={institutionId} onChange={(e) => setInstitutionId(parseInt(e.target.value, 10))}
              options={institutions.map((i) => ({ value: i.id, label: i.name }))} />
          )}
          <Select label="Class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
            options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
        </div>
      </Card>
      {loading ? <Spinner /> : (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {exams.map((e) => (
              <Card key={e.id}>
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{e.name}</h3>
                  <ExamStatusBadge status={e.status} />
                </div>
                <p className="text-sm text-gray-500 mt-2">{e.exam_type_name}</p>
                <p className="text-sm text-gray-600 mt-1">{e.class_name || 'All classes'}</p>
              </Card>
            ))}
          </div>
          {schedules.length ? (
            <Card title="Published Schedules">
              <ExamScheduleTable schedules={schedules} showExam />
            </Card>
          ) : (
            <EmptyState message="No published schedules found." />
          )}
        </>
      )}
    </DashboardLayout>
  );
}
