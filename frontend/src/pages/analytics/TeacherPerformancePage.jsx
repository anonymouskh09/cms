import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner, Badge } from '../../components/ui';
import { PageHeader, DashboardCard, FilterTable } from '../../components/dashboard';
import AnalyticsNav from '../../components/phase3/AnalyticsNav';
import { analyticsService } from '../../services/authService';

export default function TeacherPerformancePage() {
  const [data, setData] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getTeacherPerformance().then((res) => {
      setData(res.data.data || []);
      setMsg(res.data.message || '');
    }).catch((e) => setMsg(e.response?.data?.message || 'Failed to load')).finally(() => setLoading(false));
  }, []);

  const ratingBadge = (rating) => {
    const map = { Excellent: 'active', Good: 'approved', 'Needs Support': 'pending' };
    return <Badge status={map[rating] || 'inactive'}>{rating}</Badge>;
  };

  return (
    <DashboardLayout>
      <PageHeader title="Teacher Performance Analytics" subtitle="Teacher effectiveness metrics based on class results and engagement" />
      <AnalyticsNav />
      <Alert type="info" message={msg} onClose={() => setMsg('')} />

      <DashboardCard title="Teacher Performance" subtitle="Sample analytics data for Phase 3">
        {loading ? <Spinner /> : (
          <FilterTable columns={[
            { key: 'teacher_name', label: 'Teacher' },
            { key: 'classes', label: 'Classes', filterable: false },
            { key: 'avg_class_result', label: 'Avg Score %', filterable: false },
            { key: 'attendance_marked_days', label: 'Attendance Days', filterable: false },
            { key: 'assignments_created', label: 'Assignments', filterable: false },
            { key: 'rating', label: 'Rating', filterable: false, render: (r) => ratingBadge(r.rating) },
          ]} data={data} />
        )}
      </DashboardCard>
    </DashboardLayout>
  );
}
