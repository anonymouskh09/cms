import { useEffect, useState } from 'react';
import { Card, Table, EmptyState } from '../../components/ui';
import { financeService } from '../../services/authService';
import StudentFeeSummary from '../../components/finance/StudentFeeSummary';
import ChallanStatusBadge from '../../components/finance/ChallanStatusBadge';
import ParentChildShell from './ParentChildShell';

export default function ParentChildPaymentPage() {
  return (
    <ParentChildShell title="Child Fee History">
      {({ studentId }) => <PaymentContent studentId={studentId} />}
    </ParentChildShell>
  );
}

function PaymentContent({ studentId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    financeService.payments.listStudent(studentId)
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;
  if (!data) return <EmptyState message="No fee records found for this child." />;

  return (
    <>
      <p className="text-sm text-gray-500 mb-4">
        Is bache ki total jama fee, baqi amount, aur har month ki detail neeche hai.
      </p>
      <Card className="mb-6">
        <StudentFeeSummary data={data} loading={false} showPreview={false} showTimeline showPayments />
      </Card>
      <Card title="All Challans">
        <Table columns={[
          { key: 'challan_no', label: 'Challan No' },
          { key: 'month_year', label: 'Month' },
          { key: 'due_date', label: 'Due Date' },
          { key: 'total_amount', label: 'Amount', render: (r) => `Rs. ${r.total_amount}` },
          { key: 'status', label: 'Status', render: (r) => <ChallanStatusBadge status={r.status} /> },
          { key: 'pdf', label: 'PDF', render: (r) => r.pdf_url ? <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-violet-600">Download</a> : '—' },
        ]} data={data.challans || []} />
      </Card>
      <Card title="Payments received" className="mt-6">
        <Table columns={[
          { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleString() },
          { key: 'challan_no', label: 'Challan' },
          { key: 'amount', label: 'Amount', render: (r) => `Rs. ${r.amount}` },
          { key: 'payment_method', label: 'Method' },
        ]} data={data.payments || []} />
      </Card>
    </>
  );
}
