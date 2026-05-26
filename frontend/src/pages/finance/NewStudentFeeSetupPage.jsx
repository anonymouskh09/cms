import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Table, Modal, Alert, Spinner } from '../../components/ui';
import { studentFeeProfilesService, financeService } from '../../services/authService';

const emptyLine = () => ({
  fee_type: '',
  amount: '',
  frequency: 'monthly',
  is_discount: false,
});

function defaultDueDate() {
  const d = new Date();
  d.setDate(10);
  return d.toISOString().slice(0, 10);
}

function nextMonthLabel() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function nextMonthValue() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function NewStudentFeeSetupPage() {
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState([]);
  const [presets, setPresets] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([emptyLine()]);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkDueDate, setBulkDueDate] = useState(defaultDueDate);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const nextMonth = useMemo(() => nextMonthValue(), []);

  const loadPending = () => {
    setLoading(true);
    Promise.all([
      studentFeeProfilesService.listPending(),
      financeService.challans.activeProfilesCount(),
    ])
      .then(([pendingRes, countRes]) => {
        setPending(pendingRes.data.data || []);
        setPresets(pendingRes.data.presets || []);
        setActiveCount(countRes.data.data?.count ?? 0);
      })
      .catch(() => setErr('Failed to load fee setups'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPending(); }, []);

  const openStudent = async (row) => {
    setSelected(row);
    setErr('');
    setMsg('');
    try {
      const res = await studentFeeProfilesService.get(row.student_id);
      const p = res.data.data;
      setProfile(p);
      setNotes(p.notes || '');
      if (p.due_day) {
        const d = new Date();
        d.setDate(Math.min(p.due_day, 28));
        setDueDate(d.toISOString().slice(0, 10));
      } else {
        setDueDate(defaultDueDate());
      }
      const lines = (p.items || []).length
        ? p.items.map((i) => ({
          fee_type: i.fee_type,
          amount: String(Math.abs(parseFloat(i.amount))),
          frequency: i.frequency,
          is_discount: !!i.is_discount,
        }))
        : [emptyLine()];
      setItems(lines);
    } catch {
      setErr('Failed to load student fee profile');
    }
  };

  useEffect(() => {
    const sid = searchParams.get('student_id');
    if (sid && pending.length) {
      const row = pending.find((p) => String(p.student_id) === sid);
      if (row) openStudent(row);
    }
  }, [searchParams, pending.length]);

  const addPreset = (preset) => {
    setItems((prev) => [
      ...prev,
      {
        fee_type: preset.fee_type,
        amount: '',
        frequency: preset.frequency,
        is_discount: preset.is_discount,
      },
    ]);
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const removeItem = (idx) => {
    setItems((prev) => (prev.length <= 1 ? [emptyLine()] : prev.filter((_, i) => i !== idx)));
  };

  const handleSave = async (andGenerateFirst = false) => {
    if (!selected) return;
    if (!dueDate) {
      setErr('Please select a due date');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const res = await studentFeeProfilesService.save(selected.student_id, {
        items,
        notes,
        activate: true,
        due_date: dueDate,
      });
      setProfile(res.data.data);
      loadPending();

      if (andGenerateFirst) {
        setGenerating(true);
        const monthYear = new Date().toISOString().slice(0, 7);
        await financeService.challans.generate({
          student_id: selected.student_id,
          month_year: monthYear,
          due_date: dueDate,
        });
        setMsg(`Fee profile saved and first challan generated (due ${dueDate}). Student and parent can view it now.`);
      } else {
        setMsg(res.data.message || 'Fee profile saved');
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  const handleBulkNextMonth = async () => {
    if (!bulkDueDate) {
      setErr('Select a due date for all challans');
      return;
    }
    setBulkLoading(true);
    setErr('');
    setBulkResult(null);
    try {
      const res = await financeService.challans.generateNextMonth({
        due_date: bulkDueDate,
        month_year: nextMonth,
      });
      setBulkResult(res.data.data);
      setMsg(res.data.message || 'Challans generated');
      setBulkModal(false);
      loadPending();
    } catch (e) {
      setErr(e.response?.data?.message || 'Bulk generation failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const studentLabel = selected
    ? `${selected.first_name} ${selected.last_name || ''} · ${selected.class_name || 'No class'}${selected.section_name ? ` / ${selected.section_name}` : ''}`
    : '';

  return (
    <DashboardLayout>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">New Student Fee Setup</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Configure fees for each new student, set a due date, then generate their first challan here.
            Use bulk generation for all students with an active fee setup.
          </p>
        </div>
        <Button onClick={() => { setBulkDueDate(defaultDueDate()); setBulkResult(null); setBulkModal(true); }} disabled={!activeCount}>
          Generate {nextMonthLabel()} challans ({activeCount})
        </Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title={`Pending setups (${pending.length})`}>
          {loading ? <Spinner /> : pending.length ? (
            <Table
              columns={[
                {
                  key: 'student',
                  label: 'Student',
                  render: (r) => (
                    <div>
                      <p className="font-medium">{r.first_name} {r.last_name}</p>
                      <p className="text-xs text-gray-500">{r.admission_no} · {r.class_name || '—'}{r.section_name ? ` / ${r.section_name}` : ''}</p>
                    </div>
                  ),
                },
                { key: 'created_at', label: 'Added', render: (r) => new Date(r.created_at).toLocaleDateString() },
                {
                  key: 'actions',
                  label: '',
                  render: (r) => (
                    <Button size="sm" variant={selected?.student_id === r.student_id ? 'primary' : 'secondary'} onClick={() => openStudent(r)}>
                      Setup
                    </Button>
                  ),
                },
              ]}
              data={pending}
            />
          ) : (
            <p className="text-sm text-gray-500 py-6 text-center">No pending fee setups.</p>
          )}
        </Card>

        <Card title={selected ? `Fee profile — ${studentLabel}` : 'Select a student'}>
          {!selected ? (
            <p className="text-sm text-gray-500 py-8 text-center">Choose a student from the pending list.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {presets.map((p) => (
                  <Button key={p.fee_type} size="sm" variant="secondary" type="button" onClick={() => addPreset(p)}>
                    + {p.fee_type}
                  </Button>
                ))}
              </div>

              <div className="space-y-3 mb-4">
                {items.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border border-gray-100 rounded-lg p-3">
                    <div className="col-span-12 sm:col-span-4">
                      <Input label={idx === 0 ? 'Fee name' : ''} value={row.fee_type} onChange={(e) => updateItem(idx, 'fee_type', e.target.value)} placeholder="e.g. Tuition" />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <Input label={idx === 0 ? 'Amount (Rs)' : ''} type="number" value={row.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)} />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Select
                        label={idx === 0 ? 'Frequency' : ''}
                        value={row.frequency}
                        onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                        options={[
                          { value: 'monthly', label: 'Monthly' },
                          { value: 'one_time', label: 'One-time' },
                        ]}
                      />
                    </div>
                    <div className="col-span-10 sm:col-span-2 flex items-center pb-2">
                      <label className="text-sm flex items-center gap-2">
                        <input type="checkbox" checked={row.is_discount} onChange={(e) => updateItem(idx, 'is_discount', e.target.checked)} />
                        Discount
                      </label>
                    </div>
                    <div className="col-span-2 sm:col-span-1 pb-2">
                      <Button size="sm" variant="danger" type="button" onClick={() => removeItem(idx)}>×</Button>
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="secondary" type="button" onClick={() => setItems((p) => [...p, emptyLine()])}>Add line</Button>
              </div>

              <Input label="Due date (for challan)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

              <div className="flex flex-wrap gap-2 mt-6">
                <Button onClick={() => handleSave(false)} disabled={saving || generating}>
                  {saving ? 'Saving…' : 'Save & activate profile'}
                </Button>
                <Button variant="success" onClick={() => handleSave(true)} disabled={saving || generating}>
                  {generating ? 'Generating…' : 'Save & generate first challan'}
                </Button>
              </div>

              {profile?.status === 'active' && (
                <p className="text-sm text-emerald-700 mt-4">
                  Profile active · {activeCount} student(s) ready for monthly bulk · one-time fees on first challan only.
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title={`Generate challans — ${nextMonthLabel()}`}>
        <p className="text-sm text-gray-600 mb-4">
          This will create challans for <strong>{activeCount}</strong> student(s) with an active fee setup.
          Monthly fees only (one-time fees are skipped after the first challan).
        </p>
        <Input label="Due date for all challans" type="date" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} />
        {bulkResult && (
          <div className="mt-4 p-3 bg-emerald-50 rounded-lg text-sm text-emerald-900">
            <p>Generated: {bulkResult.generated?.length ?? 0}</p>
            <p>Skipped (already exists): {bulkResult.skipped?.length ?? 0}</p>
            <p>Failed: {bulkResult.failed?.length ?? 0}</p>
          </div>
        )}
        <Button onClick={handleBulkNextMonth} className="w-full mt-4" disabled={bulkLoading || !activeCount}>
          {bulkLoading ? 'Generating…' : `Generate all for ${nextMonthLabel()}`}
        </Button>
      </Modal>
    </DashboardLayout>
  );
}
