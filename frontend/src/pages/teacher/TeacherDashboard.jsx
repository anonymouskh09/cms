import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KpiCard, { KpiGrid, DashboardHeader } from '../../components/dashboard/KpiCard';
import DashboardCard from '../../components/dashboard/DashboardCard';
import {
  IconUsers,
  IconBook,
  IconClipboard,
  IconQuiz,
  IconCalendar,
  IconAlert,
} from '../../components/dashboard/icons';
import { Card, Spinner, Button } from '../../components/ui';
import { dashboardService } from '../../services/authService';

function formatTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.teacher().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  const stats = data?.stats || {};
  const name = data?.teacher?.name || 'Teacher';
  const todaySlots = data?.today_slots || [];
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <DashboardLayout>
      <DashboardHeader
        badge="Teacher Portal"
        title={`Welcome, ${name.split(' ')[0]}`}
        subtitle="Your classes, assignments & quizzes at a glance"
      />

      <KpiGrid className="mb-6">
        <KpiCard label="My Classes" value={stats.assigned_classes} icon={IconUsers} variant="violet" to="/teacher/classes" />
        <KpiCard label="Subjects" value={stats.assigned_subjects} icon={IconBook} variant="blue" to="/teacher/classes" />
        <KpiCard label="Assignments" value={stats.published_assignments} subtitle={`${stats.draft_assignments || 0} drafts`} icon={IconClipboard} variant="emerald" to="/teacher/assignments" />
        <KpiCard label="Quizzes Live" value={stats.published_quizzes} icon={IconQuiz} variant="indigo" to="/teacher/quizzes" />
        <KpiCard label="Work to Grade" value={stats.pending_submissions} icon={IconAlert} variant="amber" to="/teacher/assignments" />
        <KpiCard label="Quiz Submissions" value={stats.quiz_submissions_pending} icon={IconQuiz} variant="rose" to="/teacher/quizzes" />
      </KpiGrid>

      <div className="grid lg:grid-cols-2 gap-6">
        <DashboardCard title={`Today — ${todayLabel}`} subtitle="Your timetable slots" icon={<IconCalendar className="w-5 h-5" />}>
          {!todaySlots.length ? (
            <p className="text-sm text-gray-500">No classes scheduled today.</p>
          ) : (
            <ul className="space-y-2">
              {todaySlots.map((slot) => (
                <li key={slot.id} className="flex gap-3 text-sm border-b border-gray-100 pb-2 last:border-0">
                  <span className="text-gray-400 w-24 shrink-0">{formatTime(slot.start_time)}–{formatTime(slot.end_time)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{slot.subject_name || '—'}</p>
                    <p className="text-xs text-gray-500">{slot.class_name}{slot.room ? ` · ${slot.room}` : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/teacher/timetable" className="text-violet-600 text-sm font-medium mt-4 inline-block hover:underline">
            Full timetable →
          </Link>
        </DashboardCard>

        <Card title="Quick actions" className="!p-6">
          <div className="flex flex-wrap gap-3">
            <Link to="/teacher/assignments/create"><Button size="sm">New Assignment</Button></Link>
            <Link to="/teacher/quizzes/create"><Button size="sm" variant="secondary">New Quiz</Button></Link>
            <Link to="/teacher/classes"><Button size="sm" variant="ghost">My Subjects</Button></Link>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
