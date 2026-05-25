import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Table, Modal, Alert, Spinner } from '../../components/ui';
import { timetableService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function PeriodManagementPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ is_break: false });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const institutionId = user.role === 'owner' ? form.institution_id || 1 : user.institution_id;

  const load = () => {
    setLoading(true);
    const params = user.role === 'owner' ? { institution_id: institutionId } : {};
    timetableService.periods.list(params).then((r) => setPeriods(r.data.data)).catch(() => setErr('Failed to load periods')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [institutionId]);

  const openCreate = () => { setEditId(null); setForm({ is_break: false, institution_id: institutionId }); setModal(true); };
  const openEdit = (p) => { setEditId(p.id); setForm({ ...p, is_break: !!p.is_break }); setModal(true); };

  const handleSave = async () => {
    setErr('');
    try {
      const payload = { ...form, institution_id: institutionId };
      if (editId) await timetableService.periods.update(editId, payload);
      else await timetableService.periods.create(payload);
      setMsg(editId ? 'Period updated' : 'Period created');
      setModal(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    }
  };

  const handleDisable = async (id) => {
    if (!window.confirm('Disable this period?')) return;
    try {
      await timetableService.periods.remove(id);
      setMsg('Period disabled');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Cannot disable period');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Period Management</h2>
        <Button onClick={openCreate}>Add Period</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        {loading ? <Spinner /> : (
          <Table columns={[
            { key: 'period_no', label: '#' },
            { key: 'name', label: 'Name' },
            { key: 'start_time', label: 'Start', render: (r) => String(r.start_time).slice(0, 5) },
            { key: 'end_time', label: 'End', render: (r) => String(r.end_time).slice(0, 5) },
            { key: 'is_break', label: 'Break', render: (r) => r.is_break ? 'Yes' : 'No' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions', render: (r) => (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                <Button variant="danger" onClick={() => handleDisable(r.id)}>Disable</Button>
              </div>
            )},
          ]} data={periods} />
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Period' : 'Add Period'}>
        {user.role === 'owner' && (
          <Input label="Institution ID" type="number" value={form.institution_id || ''} onChange={(e) => setForm({ ...form, institution_id: parseInt(e.target.value) })} />
        )}
        <Input label="Period No" type="number" value={form.period_no || ''} onChange={(e) => setForm({ ...form, period_no: e.target.value })} />
        <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Start Time" type="time" value={form.start_time || ''} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        <Input label="End Time" type="time" value={form.end_time || ''} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        <label className="flex items-center gap-2 mb-4 text-sm">
          <input type="checkbox" checked={!!form.is_break} onChange={(e) => setForm({ ...form, is_break: e.target.checked })} />
          Break period
        </label>
        <Button onClick={handleSave} className="w-full">Save</Button>
      </Modal>
    </DashboardLayout>
  );
}
