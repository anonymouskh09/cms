import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Spinner, Badge } from '../../components/ui';
import { PageHeader, DashboardCard, FilterTable } from '../../components/dashboard';
import SmsNav, { SmsPlaceholderBanner } from '../../components/sms/SmsNav';
import { smsService } from '../../services/authService';

function logStatusBadge(status) {
  const map = { sent: 'paid', failed: 'overdue', pending: 'pending' };
  return <Badge status={map[status] || 'inactive'}>{status}</Badge>;
}

export default function SmsLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    smsService.logs().then((res) => setLogs(res.data.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="SMS Logs" subtitle="History of SMS delivery attempts (placeholder data)" pill="UI Only" />
      <SmsPlaceholderBanner />
      <SmsNav />

      <DashboardCard title="Delivery Log" subtitle={`${logs.length} records`}>
        {loading ? <Spinner /> : (
          <FilterTable
            columns={[
              { key: 'recipient', label: 'Recipient' },
              { key: 'message_type', label: 'Type', render: (r) => r.message_type.replace(/_/g, ' ') },
              { key: 'message_preview', label: 'Preview' },
              { key: 'status', label: 'Status', filterable: false, render: (r) => logStatusBadge(r.status) },
              { key: 'sent_at', label: 'Sent Time', filterable: false, render: (r) => r.sent_at || '—' },
              { key: 'institution', label: 'Institution' },
              { key: 'sent_by', label: 'Sent By' },
            ]}
            data={logs}
          />
        )}
      </DashboardCard>
    </DashboardLayout>
  );
}
