import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner } from '../../components/ui';
import { parentsService } from '../../services/authService';

const SECTIONS = [
  { key: 'timetable', label: 'Timetable', desc: 'Weekly class schedule' },
  { key: 'exams', label: 'Exam Schedule', desc: 'Published exam dates' },
  { key: 'results', label: 'Results', desc: 'Published marks' },
  { key: 'report-card', label: 'Report Card', desc: 'Download PDF' },
  { key: 'assignments', label: 'Assignments', desc: 'Pending & submitted' },
  { key: 'attendance-calendar', label: 'Attendance', desc: 'Monthly calendar' },
  { key: 'payment-history', label: 'Fee History', desc: 'Challans & payments' },
];

export default function ParentChildrenPage() {
  const [children, setChildren] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentsService.getChildren()
      .then((r) => setChildren(r.data.data || []))
      .catch(() => setErr('Failed to load linked children'))
      .finally(() => setLoading(false));
  }, []);

  const hasMultipleInstitutions = new Set(children.map((c) => c.institution_id)).size > 1;

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">My Children</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : !children.length ? (
        <p className="text-gray-600">No linked children found. Contact the school administrator.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {children.map((child) => (
            <div key={child.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">
                  {child.first_name} {child.last_name || ''}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {child.class_name}{child.section_name ? ` · ${child.section_name}` : ''}
                </p>
                {hasMultipleInstitutions && child.institution_name && (
                  <span className="inline-block mt-2 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                    {child.institution_name}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS.map((s) => (
                  <Link
                    key={s.key}
                    to={`/parent/child/${child.id}/${s.key}`}
                    className="block rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm hover:bg-blue-50 hover:border-blue-100 transition-colors"
                  >
                    <span className="font-medium text-gray-800">{s.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
