import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KpiCard, { KpiGrid, DashboardHeader } from '../../components/dashboard/KpiCard';
import {
  IconCheck,
  IconCash,
  IconClipboard,
  IconQuiz,
  IconCalendar,
  IconBook,
} from '../../components/dashboard/icons';
import { Card, Badge, Alert, Spinner } from '../../components/ui';
import StudentQuickLinks from '../../components/student/StudentQuickLinks';
import { dashboardService } from '../../services/authService';

function formatTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.student()
      .then((res) => setData(res.data.data))
      .catch(() => setErr('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  const stats = data?.stats || {};
  const student = data?.student || {};
  const subjects = data?.subjects || [];
  const todayTimetable = data?.today_timetable || [];
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const feeStatus = data?.current_challan?.status || '—';

  return (
    <DashboardLayout>
      <DashboardHeader
        badge="Student Portal"
        title={`Welcome${student.first_name ? `, ${student.first_name}` : ''}`}
        subtitle={`${student.class_name || 'Your class'}${student.section_name ? ` · Section ${student.section_name}` : ''}`}
      />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <KpiGrid className="mb-6">
        <KpiCard label="Attendance" value={`${data?.attendance_percentage || 0}%`} subtitle="This month" icon={IconCheck} variant="emerald" to="/student/attendance" />
        <KpiCard label="Fee Status" value={feeStatus} icon={IconCash} variant="amber" to="/student/fees" />
        <KpiCard label="Assignments Due" value={stats.pending_assignments ?? 0} icon={IconClipboard} variant="rose" to="/student/assignments" />
        <KpiCard label="Quizzes Due" value={stats.pending_quizzes ?? 0} icon={IconQuiz} variant="indigo" to="/student/quizzes" />
        <KpiCard label="Upcoming Exams" value={stats.upcoming_exams ?? 0} icon={IconCalendar} variant="violet" to="/student/exams" />
        <KpiCard label="Results" value={stats.published_results ?? 0} icon={IconBook} variant="blue" to="/student/results" />
        <KpiCard label="Report Cards" value={stats.report_cards ?? 0} icon={IconBook} variant="slate" to="/student/report-cards" />
      </KpiGrid>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card title={`My Subjects — ${student.class_name || 'Class'}`}>
          {!subjects.length ? (
            <p className="text-sm text-gray-500">No subjects assigned to your class yet.</p>
          ) : (
            <ul className="space-y-2">
              {subjects.map((s, i) => (
                <li key={`${s.subject_code || s.subject_name}-${i}`} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{s.subject_name}</p>
                    {s.subject_code && <p className="text-xs text-gray-400">{s.subject_code}</p>}
                  </div>
                  <span className="text-gray-500 text-xs">{s.teacher_name || 'Teacher TBA'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Today's Classes — ${todayLabel}`} action={<Link to="/student/timetable" className="text-blue-600 text-sm">Full timetable →</Link>}>
          {!todayTimetable.length ? (
            <p className="text-sm text-gray-500">No classes scheduled for today. View full weekly timetable.</p>
          ) : (
            <ul className="space-y-2">
              {todayTimetable.map((slot) => (
                <li key={slot.id} className="flex gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                  <span className="text-gray-400 w-24 shrink-0">{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</span>
                  <div>
                    <p className="font-medium">{slot.subject_name}</p>
                    <p className="text-xs text-gray-500">{slot.teacher_name || '—'}{slot.room ? ` · Room ${slot.room}` : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data?.current_challan && (
        <Card title="Current Challan" className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">Month</p>
              <p className="font-medium">{data.current_challan.month_year}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium">Rs. {data.current_challan.total_amount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <Badge status={data.current_challan.status} />
            </div>
            <div className="ml-auto flex gap-3">
              {data.current_challan.pdf_url && (
                <a href={data.current_challan.pdf_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm">Download PDF</a>
              )}
              <Link to="/student/payment-history" className="text-blue-600 text-sm">View history →</Link>
            </div>
          </div>
        </Card>
      )}

      {data?.announcements?.length > 0 && (
        <Card title="Recent Announcements" className="mb-6">
          <ul className="space-y-2">
            {data.announcements.slice(0, 3).map((a) => (
              <li key={a.id} className="text-sm border-b border-gray-100 pb-2 last:border-0">
                <span className="font-medium">{a.title}</span>
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{a.content}</p>
              </li>
            ))}
          </ul>
          <Link to="/student/announcements" className="text-blue-600 text-sm mt-3 inline-block">View all →</Link>
        </Card>
      )}

      <h3 className="text-lg font-semibold mb-4">Quick Access</h3>
      <StudentQuickLinks />
    </DashboardLayout>
  );
}
