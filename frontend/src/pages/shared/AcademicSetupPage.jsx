import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button } from '../../components/ui';

const STEPS = [
  {
    step: 1,
    title: 'Create classes',
    desc: 'Add your school classes first — Grade 1, Grade 2, etc.',
    path: 'classes',
    btn: 'Open Classes',
  },
  {
    step: 2,
    title: 'Create sections',
    desc: 'Add sections for each class — A, B, C (e.g. Grade 1 → Section A).',
    path: 'sections',
    btn: 'Open Sections',
  },
  {
    step: 3,
    title: 'Create subjects',
    desc: 'Build the master subjects list — English, Math, Urdu, Science, etc.',
    path: 'subjects',
    btn: 'Open Subjects',
  },
  {
    step: 4,
    title: 'Map class subjects',
    desc: 'Choose which subjects are taught in each class — e.g. Grade 1 = English + Math + ...',
    path: 'class-subjects',
    btn: 'Class Subjects',
  },
  {
    step: 5,
    title: 'Add teachers',
    desc: 'Create teacher accounts with email and password for login.',
    path: 'teachers',
    btn: 'Open Teachers',
  },
  {
    step: 6,
    title: 'Assign class & subject to teachers',
    desc: 'Teachers → Assign Subjects: pick class, section, and subject each teacher will teach.',
    path: 'teachers',
    btn: 'Assign Teachers',
    note: 'Click "Assign Subjects" on each teacher row.',
  },
  {
    step: 7,
    title: 'Register students',
    desc: 'Add students and select their class and section — they will appear in that class list.',
    path: 'students',
    btn: 'Open Students',
  },
  {
    step: 8,
    title: 'Link parents (optional)',
    desc: 'Create parent accounts and link them to their children.',
    path: 'parents',
    btn: 'Open Parents',
  },
];

const FLOW = 'Classes → Sections → Subjects → Class Subjects → Teachers → Teacher Assign → Students';

export default function AcademicSetupPage() {
  const { user } = useAuth();
  const base = user?.role === 'admin' ? '/admin' : user?.role === 'owner' ? '/owner' : '/principal';

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">Academic Setup Guide</h2>
      <p className="text-sm text-gray-500 mb-2">
        Complete these steps in order — then teachers can mark attendance and the student portal will work correctly.
      </p>
      <p className="text-xs text-violet-700 bg-violet-50 rounded-lg px-3 py-2 mb-8 font-medium">{FLOW}</p>

      <div className="grid md:grid-cols-2 gap-4">
        {STEPS.map((s) => (
          <Card key={s.step} className="!p-5">
            <div className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white font-bold text-sm">
                {s.step}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
                {s.note && <p className="text-xs text-amber-700 mt-2">Tip: {s.note}</p>}
                <Link to={`${base}/${s.path}`}>
                  <Button size="sm" className="mt-3">{s.btn}</Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Quick reference" className="mt-8">
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How does a student join a class?</h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Students → Add Student</li>
              <li>Select class and section from the dropdowns</li>
              <li>Save — the student will appear in that class list</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How does a teacher get a class?</h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>Teachers → Assign Subjects on the teacher row</li>
              <li>Choose class, section (optional), and subject</li>
              <li>Assign — the teacher can only mark attendance for assigned classes</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Where are a teacher&apos;s subjects shown?</h4>
            <p className="text-gray-600">
              Teachers → Assign Subjects modal → Current Assignments list. Each line: Class / Section — Subject (role).
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Demo login</h4>
            <p className="text-gray-600">
              Principal: principal@peers.local / password123<br />
              Teacher: teacher@peers.local / password123
            </p>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
