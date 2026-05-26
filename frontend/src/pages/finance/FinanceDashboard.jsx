import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KpiCard, { KpiGrid, DashboardHeader } from '../../components/dashboard/KpiCard';
import {
  IconCash,
  IconAlert,
  IconClipboard,
  IconCheck,
} from '../../components/dashboard/icons';
import { Spinner, Button } from '../../components/ui';
import { dashboardService } from '../../services/authService';

function formatRs(n) {
  const num = Number(n) || 0;
  if (num >= 100000) return `Rs. ${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `Rs. ${(num / 1000).toFixed(1)}K`;
  return `Rs. ${num}`;
}

export default function FinanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.finance().then((res) => setData(res.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <DashboardHeader
        badge="Finance Portal"
        title="Fee & Collection"
        subtitle="Monthly collection and outstanding balances"
        action={
          <div className="flex gap-2">
            {(data?.pending_fee_setups > 0) && (
              <Link to="/finance/new-student-fees">
                <Button size="sm" variant="secondary">{data.pending_fee_setups} fee setup(s)</Button>
              </Link>
            )}
            <Link to="/finance/challans">
              <Button size="sm">Manage Challans</Button>
            </Link>
          </div>
        }
      />

      <KpiGrid className="mb-2">
        <KpiCard label="Collected" value={formatRs(data?.collected_month)} subtitle="This month" icon={IconCheck} variant="emerald" to="/finance/payments" />
        <KpiCard label="Pending" value={formatRs(data?.total_pending)} icon={IconCash} variant="amber" to="/finance/challans" />
        <KpiCard label="Overdue" value={formatRs(data?.overdue_amount)} icon={IconAlert} variant="rose" to="/finance/challans" />
        <KpiCard label="Defaulters" value={data?.defaulter_count} icon={IconAlert} variant="rose" to="/finance/defaulters" />
        <KpiCard label="Challans" value={data?.challans_generated} subtitle="Generated this month" icon={IconClipboard} variant="blue" to="/finance/challans" />
      </KpiGrid>
    </DashboardLayout>
  );
}
