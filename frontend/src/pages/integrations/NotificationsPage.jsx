import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Badge } from '../../components/ui';
import { PageHeader, DashboardCard } from '../../components/dashboard';
import { Phase3IntegrationBanner } from '../../components/phase3/Phase3Banner';
import IntegrationsNav from '../../components/phase3/IntegrationsNav';
import { integrationsService } from '../../services/authService';

export default function NotificationsPage() {
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    integrationsService.getNotifications().then((res) => {
      setInfo(res.data.data);
      setMsg(res.data.message || '');
    }).catch((e) => setMsg(e.response?.data?.message || ''));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="Advanced Notification System" subtitle="Push notifications, email digests and alert rules" pill="UI Only" />
      <Phase3IntegrationBanner />
      <IntegrationsNav />
      <Alert type="warning" message={msg} onClose={() => setMsg('')} />

      <div className="grid lg:grid-cols-2 gap-6">
        <DashboardCard title="Notification Channels" subtitle="All external channels are inactive in Phase 3">
          <div className="grid sm:grid-cols-2 gap-3">
            {(info?.channels || []).map((ch) => (
              <div key={ch} className="p-4 rounded-xl border border-gray-200 bg-gray-50/80">
                <p className="font-medium text-gray-900 text-sm">{ch}</p>
              </div>
            ))}
          </div>
        </DashboardCard>
        <DashboardCard title="Channel Settings" subtitle="Configuration overview">
          <div className="space-y-4">
            {[
              ['Push Notifications', info?.push_enabled],
              ['Email Digests', info?.email_enabled],
              ['SMS Linked', info?.sms_linked],
            ].map(([label, enabled]) => (
              <div key={label} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <Badge status={enabled ? 'active' : 'inactive'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>
            ))}
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-600">Pending Notifications</span>
              <span className="text-sm font-bold text-violet-700">{info?.pending_notifications ?? 0}</span>
            </div>
          </div>
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}
