import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Table, Alert, Spinner } from '../../components/ui';
import { financeService, parentsService } from '../../services/authService';
import ChallanStatusBadge from '../../components/finance/ChallanStatusBadge';

export default function ParentChildPaymentHistoryPage() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    parentsService.getChildren().then((r) => {
      const list = r.data.data || [];
      setChildren(list);
      if (list.length) {
        setChildId(String(list[0].id));
      }
    });
  }, []);

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    setErr('');
    financeService.payments.listStudent(childId)
      .then((res) => setData(res.data.data))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load child payment history'))
      .finally(() => setLoading(false));
  }, [childId]);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Child Fees & Payment History</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <Select label="Select Child" value={childId} onChange={(e) => setChildId(e.target.value)}
          options={children.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name || ''}` }))} />
      </Card>
      {loading ? <Spinner /> : data && (
        <>
          <Card title="Challans" className="mt-6">
            <Table columns={[
              { key: 'challan_no', label: 'Challan No' },
              { key: 'month_year', label: 'Month' },
              { key: 'due_date', label: 'Due Date' },
              { key: 'total_amount', label: 'Amount', render: (r) => `Rs. ${r.total_amount}` },
              { key: 'status', label: 'Status', render: (r) => <ChallanStatusBadge status={r.status} /> },
              { key: 'pdf', label: 'PDF', render: (r) => r.pdf_url ? <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-blue-600">Download</a> : '—' },
            ]} data={data.challans || []} />
          </Card>
          <Card title="Payments" className="mt-6">
            <Table columns={[
              { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleString() },
              { key: 'challan_no', label: 'Challan' },
              { key: 'amount', label: 'Amount', render: (r) => `Rs. ${r.amount}` },
              { key: 'payment_method', label: 'Method' },
            ]} data={data.payments || []} />
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
