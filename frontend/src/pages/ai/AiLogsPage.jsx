import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner, Badge } from '../../components/ui';
import { PageHeader, DashboardCard, FilterTable } from '../../components/dashboard';
import AiNav from '../../components/phase3/AiNav';
import { aiService } from '../../services/authService';

export default function AiLogsPage() {
  const { user } = useAuth();
  const [institutionId, setInstitutionId] = useState(user?.role === 'owner' ? '1' : null);
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const params = user?.role === 'owner' && institutionId
    ? { institution_id: institutionId, limit: 100 }
    : { limit: 100 };

  const load = useCallback(() => {
    setLoading(true);
    aiService.getLogs(params).then((res) => {
      setLogs(res.data.data || []);
      setMsg(res.data.message || '');
    }).catch((e) => setMsg(e.response?.data?.message || 'Failed to load logs')).finally(() => setLoading(false));
  }, [institutionId, user?.role]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout>
      <PageHeader title="AI Usage Logs" subtitle="Audit trail of AI connection tests and generation requests" />
      <AiNav />
      <Alert type="info" message={msg} onClose={() => setMsg('')} />

      {user?.role === 'owner' && (
        <DashboardCard title="Institution" className="mb-6" padding="p-5 md:p-6">
          <select
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            className="w-full max-w-md px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500/30 outline-none"
          >
            <option value="1">Schools</option>
            <option value="2">Primal Academy</option>
          </select>
        </DashboardCard>
      )}

      <DashboardCard title="Generation Logs" subtitle={`${logs.length} recent entries`}>
        {loading ? <Spinner /> : (
          <FilterTable
            columns={[
              { key: 'created_at', label: 'Time', render: (r) => new Date(r.created_at).toLocaleString() },
              { key: 'feature', label: 'Feature' },
              { key: 'provider', label: 'Provider' },
              { key: 'model', label: 'Model' },
              { key: 'user_name', label: 'User' },
              { key: 'status', label: 'Status', filterable: false, render: (r) => <Badge status={r.status === 'success' ? 'active' : r.status === 'failed' ? 'overdue' : 'pending'}>{r.status}</Badge> },
              { key: 'prompt_summary', label: 'Summary', render: (r) => r.prompt_summary || '—' },
              { key: 'error_message', label: 'Error', render: (r) => (r.error_message ? r.error_message.slice(0, 40) : '—') },
            ]}
            data={logs}
            emptyMessage="No AI usage logs yet. Run a connection test from AI Settings."
          />
        )}
      </DashboardCard>
    </DashboardLayout>
  );
}
