import { useEffect, useState, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Table, Badge, Modal, Alert, Spinner } from '../../components/ui';
import { financeService, academicService, studentsService } from '../../services/authService';
import ChallanStatusBadge from '../../components/finance/ChallanStatusBadge';
import StudentFeeSummary from '../../components/finance/StudentFeeSummary';
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
  const [modal, setModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [form, setForm] = useState({});
  const [admissionInput, setAdmissionInput] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupErr, setLookupErr] = useState('');
  const lookupTimer = useRef(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const openGenerateModal = () => {
    setForm({ month_year: new Date().toISOString().slice(0, 7) });
    setAdmissionInput('');
    setSelectedStudent(null);
    setFeeData(null);
    setLookupErr('');
    setModal(true);
  };

  const loadFeeData = useCallback(async (studentId, monthYear) => {
    if (!studentId) {
      setFeeData(null);
      return;
    }
    setFeeLoading(true);
    try {
      const res = await financeService.payments.listStudent(studentId, { month_year: monthYear });
      setFeeData(res.data.data);
    } catch {
      setFeeData(null);
    } finally {
      setFeeLoading(false);
    }
  }, []);

  const lookupStudent = useCallback(async (query) => {
    const q = String(query || '').trim();
    if (!q) {
      setSelectedStudent(null);
      setForm((f) => ({ ...f, student_id: '' }));
      setLookupErr('');
      return;
    }
    setLookupLoading(true);
    setLookupErr('');
    try {
      const res = await studentsService.list({ search: q, limit: 15, status: 'active' });
      const rows = res.data.data || [];
      const qLower = q.toLowerCase();
      const exact = rows.find(
        (s) =>
          String(s.admission_no || '').toLowerCase() === qLower
          || String(s.roll_no || '').toLowerCase() === qLower
          || String(s.student_code || '').toLowerCase() === qLower
      );
      const student = exact || (rows.length === 1 ? rows[0] : null);
      if (student) {
        setSelectedStudent(student);
        setForm((f) => ({ ...f, student_id: student.id, month_year: f.month_year || new Date().toISOString().slice(0, 7) }));
        setLookupErr('');
        const month = new Date().toISOString().slice(0, 7);
        loadFeeData(student.id, month);
      } else if (rows.length > 1) {
        setSelectedStudent(null);
        setForm((f) => ({ ...f, student_id: '' }));
        setLookupErr('Multiple students match — enter the full admission number');
      } else {
        setSelectedStudent(null);
        setForm((f) => ({ ...f, student_id: '' }));
        setLookupErr('No student found with this admission number');
      }
    } catch {
      setSelectedStudent(null);
      setForm((f) => ({ ...f, student_id: '' }));
      setLookupErr('Could not search student');
    } finally {
      setLookupLoading(false);
    }
  }, [loadFeeData]);

  useEffect(() => {
    if (form.student_id && form.month_year) {
      loadFeeData(form.student_id, form.month_year);
    }
  }, [form.student_id, form.month_year, loadFeeData]);

  const onAdmissionChange = (value) => {
    setAdmissionInput(value);
    setSelectedStudent(null);
    setFeeData(null);
    setForm((f) => ({ ...f, student_id: '' }));
    setLookupErr('');
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(() => lookupStudent(value), 450);
  };

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

  const handleGenerate = async () => {
    if (!form.student_id) {
      setLookupErr('Enter admission number and wait for student to appear');
      return;
    }
    if (feeData?.fee_preview && !feeData.fee_preview.can_generate) {
      setLookupErr(feeData.fee_preview.message || 'Cannot generate challan for this month');
      return;
    }
    try {
      await financeService.challans.generate(form);
      setMsg('Challan generated');
      setModal(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Generation failed');
    }
  };

  const canGenerate = feeData?.fee_preview?.can_generate ?? false;

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Challans</h2>
        <Button onClick={openGenerateModal}>Generate Challan</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="!mb-0"
            options={[{ value: '', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }, { value: 'cancelled', label: 'Cancelled' }]} />
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
      <Modal open={modal} onClose={() => setModal(false)} title="Generate Challan" size="lg">
        <Input
          label="Admission No"
          value={admissionInput}
          onChange={(e) => onAdmissionChange(e.target.value)}
          onBlur={() => lookupStudent(admissionInput)}
          onKeyDown={(e) => e.key === 'Enter' && lookupStudent(admissionInput)}
          placeholder="e.g. ADM-2024-001 or roll no"
          help="Type admission number — student details will load automatically"
        />
        {lookupLoading && (
          <p className="text-sm text-violet-600 -mt-3 mb-4 flex items-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            Searching student…
          </p>
        )}
        {lookupErr && !lookupLoading && (
          <p className="text-sm text-red-600 -mt-3 mb-4">{lookupErr}</p>
        )}
        {selectedStudent && !lookupLoading && (
          <div className="mb-5 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 mb-2">Student found</p>
            <p className="text-lg font-bold text-gray-900">
              {selectedStudent.first_name} {selectedStudent.last_name || ''}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
              <span>Admission: <strong className="text-gray-900">{selectedStudent.admission_no || '—'}</strong></span>
              <span>Roll: <strong className="text-gray-900">{selectedStudent.roll_no || '—'}</strong></span>
              <span>Class: <strong className="text-gray-900">{selectedStudent.class_name || '—'}</strong></span>
              <span>Section: <strong className="text-gray-900">{selectedStudent.section_name || '—'}</strong></span>
            </div>
          </div>
        )}
        <Input
          label="Month (YYYY-MM)"
          type="month"
          value={form.month_year || new Date().toISOString().slice(0, 7)}
          onChange={(e) => setForm({ ...form, month_year: e.target.value })}
        />

        {selectedStudent && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <StudentFeeSummary
              data={feeData}
              loading={feeLoading}
              showPreview
              showTimeline
              showPayments={false}
              compact
            />
          </div>
        )}

        <Button
          onClick={handleGenerate}
          className="w-full mt-4"
          disabled={!selectedStudent || lookupLoading || feeLoading || (feeData?.fee_preview && !canGenerate)}
        >
          {feeData?.fee_preview?.existing_challan ? 'Challan already exists' : 'Generate Challan'}
        </Button>
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
