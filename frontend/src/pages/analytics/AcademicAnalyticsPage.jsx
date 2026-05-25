import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner } from '../../components/ui';
import { PageHeader, DashboardCard, DashboardStatCard } from '../../components/dashboard';
import AnalyticsNav from '../../components/phase3/AnalyticsNav';
import { analyticsService } from '../../services/authService';

export default function AcademicAnalyticsPage() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getAcademicOverview().then((res) => {
      setData(res.data.data);
      setMsg(res.data.message || '');
    }).catch((e) => setMsg(e.response?.data?.message || 'Failed to load')).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Academic Analytics" subtitle="Institution-wide performance overview and trends" />
      <AnalyticsNav />
      <Alert type="info" message={msg} onClose={() => setMsg('')} />

      {loading ? <Spinner /> : data && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <DashboardStatCard title="Students" value={data.student_count} />
            <DashboardStatCard title="Teachers" value={data.teacher_count} />
            <DashboardStatCard title="Published Exams" value={data.published_exams} />
            <DashboardStatCard title="Avg Result %" value={data.average_result_percentage} />
            <DashboardStatCard title="Pass Rate %" value={data.pass_rate} />
            <DashboardStatCard title="Attendance %" value={data.attendance_rate} />
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <DashboardCard title="Top Subjects" subtitle="Average scores by subject">
              <ul className="space-y-3">
                {(data.top_subjects || []).map((s) => (
                  <li key={s.subject} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-28 shrink-0">{s.subject}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-violet-500 to-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, s.avg)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-violet-700 w-10 text-right">{s.avg}%</span>
                  </li>
                ))}
              </ul>
            </DashboardCard>
            <DashboardCard title="Class Performance" subtitle="Results by class">
              <ul className="space-y-3">
                {(data.class_performance || []).map((c) => (
                  <li key={c.class_name} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{c.class_name} <span className="text-gray-400">({c.students} students)</span></span>
                    <span className="text-sm font-bold text-violet-700">{c.avg}%</span>
                  </li>
                ))}
              </ul>
            </DashboardCard>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
