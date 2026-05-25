import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Alert, Spinner, EmptyState, Table } from '../../components/ui';
import { financeService } from '../../services/authService';
import StudentFeeSummary from '../../components/finance/StudentFeeSummary';
import ChallanStatusBadge from '../../components/finance/ChallanStatusBadge';

export default function StudentPaymentHistoryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    financeService.payments.listMe()
      .then((res) => setData(res.data.data))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load fee history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-1">Meri Fee — History</h2>
      <p className="text-sm text-gray-500 mb-6">Kitni fee jama ho chuki, kitni baqi hai, aur har month ka status</p>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : !data ? (
        <EmptyState message="No fee records found." />
      ) : (
        <>
          <Card className="mb-6">
            <StudentFeeSummary data={data} loading={false} showPreview={false} showTimeline showPayments />
          </Card>
          <Card title="All Challans">
            <Table columns={[
              { key: 'challan_no', label: 'Challan No' },
              { key: 'month_year', label: 'Month' },
              { key: 'due_date', label: 'Due Date' },
              { key: 'total_amount', label: 'Amount', render: (r) => `Rs. ${r.total_amount}` },
              { key: 'fine_amount', label: 'Fine', render: (r) => `Rs. ${r.fine_amount || 0}` },
              { key: 'status', label: 'Status', render: (r) => <ChallanStatusBadge status={r.status} /> },
              { key: 'pdf', label: 'PDF', render: (r) => r.pdf_url ? <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-violet-600">Download</a> : '—' },
            ]} data={data.challans || []} />
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
