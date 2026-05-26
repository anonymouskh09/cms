import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Table, Badge, Modal, Alert, Spinner } from '../../components/ui';
import { financeService, academicService } from '../../services/authService';
import ChallanStatusBadge from '../../components/finance/ChallanStatusBadge';
import SmsActionButton from '../../components/sms/SmsActionButton';

export function FeeStructuresPage() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ frequency: 'monthly', applicable_to: 'class' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => financeService.feeStructures.list().then((res) => setItems(res.data.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await financeService.feeStructures.create(form);
    setMsg('Fee structure created');
    setModal(false);
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Fee Structures</h2>
        <Button onClick={() => setModal(true)}>Add Fee Structure</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Card>{loading ? <Spinner /> : (
        <Table columns={[
          { key: 'fee_type', label: 'Fee Type' },
          { key: 'applicable_to', label: 'Applicable To' },
          { key: 'amount', label: 'Amount', render: (r) => `Rs. ${r.amount}` },
          { key: 'frequency', label: 'Frequency' },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
        ]} data={items} />
      )}</Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Add Fee Structure">
        <Input label="Fee Type" value={form.fee_type || ''} onChange={(e) => setForm({ ...form, fee_type: e.target.value })} />
        <Select label="Applicable To" value={form.applicable_to} onChange={(e) => setForm({ ...form, applicable_to: e.target.value })}
          options={[{ value: 'grade', label: 'Grade' }, { value: 'class', label: 'Class' }, { value: 'subject', label: 'Subject' }, { value: 'student', label: 'Student' }]} />
        <Input label="Applicable ID" type="number" value={form.applicable_id || ''} onChange={(e) => setForm({ ...form, applicable_id: e.target.value })} />
        <Input label="Amount" type="number" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Select label="Frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
          options={[{ value: 'monthly', label: 'Monthly' }, { value: 'one_time', label: 'One Time' }, { value: 'per_subject', label: 'Per Subject' }]} />
        <Button onClick={handleCreate} className="w-full mt-4">Create</Button>
      </Modal>
    </DashboardLayout>
  );
}

export function ChallansPage() {
  const [challans, setChallans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ status: '', month_year: '', class_id: '', section_id: '' });
  const [cancelModal, setCancelModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [cancelReason, setCancelReason] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    academicService.classes.list().then((r) => setClasses(r.data.data || []));
    academicService.sections.list().then((r) => setSections(r.data.data || []));
  }, []);

  const filteredSections = filters.class_id
    ? sections.filter((s) => String(s.class_id) === String(filters.class_id))
    : sections;

  const load = () => {
    setLoading(true);
    financeService.challans.list(filters)
      .then((res) => setChallans(res.data.data))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load challans'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filters]);

  const handleMarkPaid = async (id) => {
    setActionLoading(true);
    try {
      await financeService.challans.markPaid(id, { payment_method: 'cash' });
      setMsg('Marked as paid');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to mark paid');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payModal) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      setErr('Enter a valid payment amount');
      return;
    }
    setActionLoading(true);
    setErr('');
    try {
      await financeService.payments.create({
        challan_id: payModal.id,
        amount,
        payment_method: payMethod,
      });
      setMsg(amount >= parseFloat(payModal.total_amount) - parseFloat(payModal.amount_paid || 0) ? 'Challan fully paid' : 'Partial payment recorded');
      setPayModal(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async (id) => {
    setActionLoading(true);
    try {
      await financeService.challans.regenerate(id);
      setMsg('Challan regenerated');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Regeneration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { setErr('Cancellation reason is required'); return; }
    setActionLoading(true);
    try {
      await financeService.challans.cancel(cancelModal.id, { reason: cancelReason });
      setMsg('Challan cancelled');
      setCancelModal(null);
      setCancelReason('');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Cancellation failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Challans</h2>
          <p className="text-sm text-gray-500 mt-1">View and manage challans. Generate new challans from New Student Fee Setup.</p>
        </div>
        <Link to="/finance/new-student-fees">
          <Button variant="secondary">New Student Fee Setup</Button>
        </Link>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="!mb-0"
            options={[{ value: '', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }, { value: 'cancelled', label: 'Cancelled' }]} />
          <Input type="month" value={filters.month_year} onChange={(e) => setFilters({ ...filters, month_year: e.target.value })} className="!mb-0" />
          <Select value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })} className="!mb-0"
            options={[{ value: '', label: 'All Classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select value={filters.section_id} onChange={(e) => setFilters({ ...filters, section_id: e.target.value })} className="!mb-0"
            options={[{ value: '', label: 'All Sections' }, ...filteredSections.map((s) => ({ value: s.id, label: s.name }))]} />
        </div>
        {loading ? <Spinner /> : (
          <Table columns={[
            { key: 'challan_no', label: 'Challan No' },
            { key: 'first_name', label: 'Student', render: (r) => `${r.first_name} ${r.last_name || ''}` },
            { key: 'class_name', label: 'Class' },
            { key: 'month_year', label: 'Month' },
            { key: 'total_amount', label: 'Amount', render: (r) => `Rs. ${r.total_amount}` },
            { key: 'fine_amount', label: 'Fine', render: (r) => `Rs. ${r.fine_amount || 0}` },
            { key: 'status', label: 'Status', render: (r) => <ChallanStatusBadge status={r.status} /> },
            { key: 'actions', label: 'Actions', render: (r) => (
              <div className="flex flex-wrap gap-2">
                {r.status !== 'paid' && r.status !== 'cancelled' && (
                  <>
                    <Button variant="success" disabled={actionLoading} onClick={() => handleMarkPaid(r.id)}>Mark Paid</Button>
                    <Button variant="secondary" disabled={actionLoading} onClick={() => { setPayModal(r); setPayAmount(String(Math.max(0, parseFloat(r.total_amount) - parseFloat(r.amount_paid || 0)))); setPayMethod('cash'); }}>Record Payment</Button>
                    <Button variant="secondary" disabled={actionLoading} onClick={() => handleRegenerate(r.id)}>Regenerate</Button>
                    <Button variant="danger" disabled={actionLoading} onClick={() => { setCancelModal(r); setCancelReason(''); }}>Cancel</Button>
                  </>
                )}
                {r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm self-center">PDF</a>}
              </div>
            )},
          ]} data={challans} />
        )}
      </Card>
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Record Payment">
        {payModal && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Challan <strong>{payModal.challan_no}</strong> · Total Rs. {payModal.total_amount}
              {payModal.amount_paid > 0 && <> · Paid Rs. {payModal.amount_paid}</>}
            </p>
            <Input label="Amount (Rs)" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <Select label="Method" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
              options={[{ value: 'cash', label: 'Cash' }, { value: 'bank', label: 'Bank transfer' }, { value: 'online', label: 'Online' }]} />
            <Button onClick={handleRecordPayment} className="w-full mt-4" disabled={actionLoading}>Save payment</Button>
          </>
        )}
      </Modal>
      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title="Cancel Challan">
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to cancel challan <strong>{cancelModal?.challan_no}</strong>? This action cannot be undone.
        </p>
        <Input label="Cancellation Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Enter reason for cancellation" />
        <div className="flex gap-3 mt-4">
          <Button variant="danger" onClick={handleCancel} disabled={actionLoading} className="flex-1">Confirm Cancel</Button>
          <Button variant="secondary" onClick={() => setCancelModal(null)} className="flex-1">Keep Challan</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

export function DefaultersPage() {
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', section_id: '', month_year: '', status: '' });
  const [smsMsg, setSmsMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academicService.classes.list().then((r) => setClasses(r.data.data || []));
    academicService.sections.list().then((r) => setSections(r.data.data || []));
  }, []);

  const filteredSections = filters.class_id
    ? sections.filter((s) => String(s.class_id) === String(filters.class_id))
    : sections;

  const load = () => {
    setLoading(true);
    financeService.reports.defaulters(filters)
      .then((res) => setItems(res.data.data))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load defaulters'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filters]);

  const sendSmsReminder = (message) => setSmsMsg(message);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Defaulter Reports</h2>
      <Alert type="warning" message={smsMsg} onClose={() => setSmsMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <Input type="month" value={filters.month_year} onChange={(e) => setFilters({ ...filters, month_year: e.target.value })} className="!mb-0" />
          <Select value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })} className="!mb-0"
            options={[{ value: '', label: 'All Classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select value={filters.section_id} onChange={(e) => setFilters({ ...filters, section_id: e.target.value })} className="!mb-0"
            options={[{ value: '', label: 'All Sections' }, ...filteredSections.map((s) => ({ value: s.id, label: s.name }))]} />
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="!mb-0"
            options={[{ value: '', label: 'Pending & Overdue' }, { value: 'pending', label: 'Pending' }, { value: 'overdue', label: 'Overdue' }]} />
        </div>
        {loading ? <Spinner /> : (
          <Table columns={[
            { key: 'first_name', label: 'Student', render: (r) => `${r.first_name} ${r.last_name || ''}` },
            { key: 'roll_no', label: 'Roll No' },
            { key: 'class_name', label: 'Class' },
            { key: 'section_name', label: 'Section' },
            { key: 'month_year', label: 'Month' },
            { key: 'due_date', label: 'Due Date' },
            { key: 'total_amount', label: 'Amount', render: (r) => `Rs. ${r.total_amount}` },
            { key: 'fine_amount', label: 'Fine', render: (r) => `Rs. ${r.fine_amount || 0}` },
            { key: 'status', label: 'Status', render: (r) => <ChallanStatusBadge status={r.status} /> },
            { key: 'actions', label: 'Actions', render: () => <SmsActionButton label="Send SMS Reminder" onNotify={sendSmsReminder} /> },
          ]} data={items} />
        )}
      </Card>
    </DashboardLayout>
  );
}
