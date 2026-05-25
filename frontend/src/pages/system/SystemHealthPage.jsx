import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button, Alert, Spinner, Badge } from '../../components/ui';
import { PageHeader, DashboardCard } from '../../components/dashboard';
import SystemNav from '../../components/phase3/SystemNav';
import { systemService } from '../../services/authService';

export default function SystemHealthPage() {
  const [health, setHealth] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    systemService.getHealth().then((res) => {
      setHealth(res.data.data);
      setMsg('');
    }).catch((e) => setMsg(e.response?.data?.message || 'Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout>
      <PageHeader title="System Health" subtitle="Monitor server, database and runtime status" action={<Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>} />
      <SystemNav />
      <Alert type="info" message={msg} onClose={() => setMsg('')} />

      {loading ? <Spinner /> : health && (
        <div className="grid md:grid-cols-2 gap-6">
          <DashboardCard title="API Status" subtitle="Application server health">
            <div className="flex items-center gap-3 mb-4">
              <Badge status={health.api_status === 'healthy' ? 'healthy' : 'degraded'}>{health.api_status}</Badge>
              <span className="text-sm text-gray-500">{health.environment} · {health.node_version}</span>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">Platform</dt><dd className="font-medium text-gray-900 mt-0.5">{health.platform}</dd></div>
              <div><dt className="text-gray-500">Uptime</dt><dd className="font-medium text-gray-900 mt-0.5">{health.uptime_seconds}s</dd></div>
              <div><dt className="text-gray-500">Memory</dt><dd className="font-medium text-gray-900 mt-0.5">{health.memory_usage_mb} MB</dd></div>
              <div><dt className="text-gray-500">Last Backup</dt><dd className="font-medium text-gray-900 mt-0.5">{health.last_backup || 'None'}</dd></div>
            </dl>
          </DashboardCard>
          <DashboardCard title="Database" subtitle="MySQL connection status">
            <Badge status={health.database_status === 'connected' ? 'healthy' : 'degraded'}>{health.database_status}</Badge>
          </DashboardCard>
        </div>
      )}
    </DashboardLayout>
  );
}
