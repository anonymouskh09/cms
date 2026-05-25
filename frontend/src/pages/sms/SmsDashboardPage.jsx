import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Spinner, Badge } from '../../components/ui';
import { PageHeader, DashboardCard, DashboardStatCard } from '../../components/dashboard';
import SmsNav, { SmsPlaceholderBanner } from '../../components/sms/SmsNav';
import { smsService } from '../../services/authService';

export default function SmsDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    smsService.dashboard()
      .then((res) => setDashboard(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="SMS Dashboard" subtitle="Overview of SMS activity and campaign performance" pill="UI Only" />
      <SmsPlaceholderBanner />
      <SmsNav />

      {loading ? <Spinner /> : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            <DashboardStatCard title="SMS Balance" value={dashboard?.sms_balance?.toLocaleString()} subtitle="Credits remaining" />
            <DashboardStatCard title="Sent Today" value={dashboard?.sent_today} />
            <DashboardStatCard title="Failed Today" value={dashboard?.failed_today} />
            <DashboardStatCard title="Pending" value={dashboard?.pending_messages} />
            <DashboardStatCard title="Last Campaign" value={dashboard?.last_campaign} />
          </div>

          <DashboardCard title="Reminder Templates" subtitle="Active SMS templates" action={<Link to="/finance/sms/templates"><span className="text-sm font-medium text-violet-600 hover:text-violet-800">Manage all →</span></Link>}>
            {!dashboard?.reminder_templates?.length ? (
              <p className="text-gray-500 text-sm text-center py-8">No reminder templates configured.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {dashboard.reminder_templates.map((t) => (
                  <li key={t.id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{t.template_name}</p>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">{t.template_type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge status="active">Active</Badge>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </>
      )}
    </DashboardLayout>
  );
}
