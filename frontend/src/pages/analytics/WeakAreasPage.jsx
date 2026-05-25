import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner } from '../../components/ui';
import { PageHeader, DashboardCard, FilterTable } from '../../components/dashboard';
import AnalyticsNav from '../../components/phase3/AnalyticsNav';
import { analyticsService } from '../../services/authService';

export default function WeakAreasPage() {
  const [data, setData] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService.getWeakAreas().then((res) => {
      setData(res.data.data || []);
      setMsg(res.data.message || '');
    }).catch((e) => setMsg(e.response?.data?.message || 'Failed to load')).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Student Weak Area Reports" subtitle="Identify subjects and topics where students need improvement" />
      <AnalyticsNav />
      <Alert type="info" message={msg} onClose={() => setMsg('')} />

      <DashboardCard title="Weak Areas by Student" subtitle="Sample analytics data for Phase 3">
        {loading ? <Spinner /> : (
          <FilterTable columns={[
            { key: 'student_name', label: 'Student' },
            { key: 'class_name', label: 'Class' },
            { key: 'weak_subjects', label: 'Weak Subjects', render: (r) => (Array.isArray(r.weak_subjects) ? r.weak_subjects.join(', ') : r.weak_subjects) },
            { key: 'avg_percentage', label: 'Avg %', filterable: false },
            { key: 'recommendation', label: 'Recommendation', render: (r) => (r.recommendation?.length > 40 ? `${r.recommendation.slice(0, 40)}...` : r.recommendation) },
          ]} data={data} />
        )}
      </DashboardCard>
    </DashboardLayout>
  );
}
