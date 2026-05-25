import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Alert, Spinner, EmptyState } from '../../components/ui';
import { teachersService } from '../../services/authService';

const ROLE_LABEL = {
  subject_teacher: 'Subject teacher',
  class_teacher: 'Class teacher',
};

function formatSection(sectionName) {
  return sectionName ? `Section ${sectionName}` : 'All sections';
}

export default function TeacherMySubjectsPage() {
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teachersService.me()
      .then((res) => setProfile(res.data.data))
      .catch(() => setErr('Could not load your subject assignments'))
      .finally(() => setLoading(false));
  }, []);

  const assignments = profile?.assignments || [];

  const uniqueSubjects = useMemo(
    () => new Set(assignments.map((a) => a.subject_name).filter(Boolean)).size,
    [assignments]
  );

  const uniqueClasses = useMemo(
    () => new Set(assignments.map((a) => `${a.class_id}-${a.section_id || 'all'}`)).size,
    [assignments]
  );

  const bySubject = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      const key = a.subject_name || 'Unknown subject';
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [assignments]);

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-1">My Subjects &amp; Classes</h2>
      <p className="text-sm text-gray-500 mb-6">
        Subjects and classes assigned to you by the principal. You can mark attendance, assignments, and quizzes only for these.
      </p>
      <Alert type="error" message={err} onClose={() => setErr('')} />

      {profile && (
        <p className="text-sm text-gray-600 mb-4">
          <span className="font-medium">{profile.name}</span>
          {profile.institution_name && <> · {profile.institution_name}</>}
        </p>
      )}

      {assignments.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <p className="text-3xl font-bold text-indigo-600">{uniqueSubjects}</p>
            <p className="text-sm text-gray-500">Subject{uniqueSubjects !== 1 ? 's' : ''} assigned</p>
          </Card>
          <Card>
            <p className="text-3xl font-bold text-indigo-600">{uniqueClasses}</p>
            <p className="text-sm text-gray-500">Class / section combination{uniqueClasses !== 1 ? 's' : ''}</p>
          </Card>
        </div>
      )}

      {assignments.length === 0 ? (
        <EmptyState
          message="No subjects assigned yet. Ask your principal to open Teachers → Assign Subjects and link your classes."
        />
      ) : (
        <>
          <Card className="mb-6 overflow-x-auto">
            <h3 className="font-semibold mb-4">All assignments</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">Subject</th>
                  <th className="py-2 pr-4">Class</th>
                  <th className="py-2 pr-4">Section</th>
                  <th className="py-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium text-gray-900">{a.subject_name}</td>
                    <td className="py-3 pr-4">{a.class_name}</td>
                    <td className="py-3 pr-4">{formatSection(a.section_name)}</td>
                    <td className="py-3 text-gray-600">{ROLE_LABEL[a.role_type] || a.role_type || 'Subject teacher'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">By subject</h3>
            {bySubject.map(([subjectName, rows]) => (
              <Card key={subjectName}>
                <h4 className="font-semibold text-indigo-700 mb-3">{subjectName}</h4>
                <p className="text-sm text-gray-600 mb-2">You teach this subject in:</p>
                <ul className="space-y-2">
                  {rows.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded font-medium">
                        {a.class_name}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        {formatSection(a.section_name)}
                      </span>
                      {a.role_type === 'class_teacher' && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Class teacher</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <Card className="mt-6 bg-gray-50 border-dashed">
            <p className="text-sm text-gray-600 mb-3 font-medium">Quick links for your classes</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link to="/teacher/attendance/mark" className="text-blue-600 hover:underline">Mark attendance</Link>
              <Link to="/teacher/assignments" className="text-blue-600 hover:underline">Assignments</Link>
              <Link to="/teacher/quizzes" className="text-blue-600 hover:underline">Quizzes</Link>
              <Link to="/teacher/timetable" className="text-blue-600 hover:underline">Timetable</Link>
            </div>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
