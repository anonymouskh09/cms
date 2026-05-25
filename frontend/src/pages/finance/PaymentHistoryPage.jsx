import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Input, Select, Table, Alert, Spinner } from '../../components/ui';
import { financeService, studentsService } from '../../services/authService';
import ChallanStatusBadge from '../../components/finance/ChallanStatusBadge';
import StudentFeeSummary from '../../components/finance/StudentFeeSummary';

export default function PaymentHistoryPage() {
  const [studentId, setStudentId] = useState('');
  const [students, setStudents] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    studentsService.list({ limit: 200 }).then((r) => setStudents(r.data.data || []));
  }, []);

  const load = (id) => {
    if (!id) return;
    setLoading(true);
    setErr('');
    financeService.payments.listStudent(id)
      .then((res) => setData(res.data.data))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load payment history'))
      .finally(() => setLoading(false));
  };

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Payment History</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <Select label="Student" value={studentId} onChange={(e) => { setStudentId(e.target.value); load(e.target.value); }}
          options={[{ value: '', label: 'Select student' }, ...students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name || ''} (${s.roll_no || s.id})` }))]} />
      </Card>
      {loading && <Spinner />}
      {data && !loading && (
        <>
          <Card title="Fee Summary" className="mt-6">
            <StudentFeeSummary data={data} loading={false} showPreview={false} showTimeline showPayments />
          </Card>
          <Card title="Challans" className="mt-6">
            <Table columns={[
              { key: 'challan_no', label: 'Challan No' },
              { key: 'month_year', label: 'Month' },
              { key: 'total_amount', label: 'Amount', render: (r) => `Rs. ${r.total_amount}` },
              { key: 'fine_amount', label: 'Fine', render: (r) => `Rs. ${r.fine_amount || 0}` },
              { key: 'status', label: 'Status', render: (r) => <ChallanStatusBadge status={r.status} /> },
              { key: 'paid_at', label: 'Paid At', render: (r) => r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—' },
            ]} data={data.challans || []} />
          </Card>
          <Card title="Payments" className="mt-6">
            <Table columns={[
              { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleString() },
              { key: 'challan_no', label: 'Challan' },
              { key: 'month_year', label: 'Month' },
              { key: 'amount', label: 'Amount', render: (r) => `Rs. ${r.amount}` },
              { key: 'payment_method', label: 'Method' },
              { key: 'received_by_name', label: 'Received By' },
              { key: 'notes', label: 'Notes', render: (r) => r.notes || '—' },
            ]} data={data.payments || []} />
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
