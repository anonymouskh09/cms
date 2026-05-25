import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Alert, Spinner } from '../../components/ui';
import { institutionsService } from '../../services/authService';

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => institutionsService.list().then((res) => setInstitutions(res.data.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    await institutionsService.update(editing.id, form);
    setMsg('Institution updated successfully');
    setEditing(null);
    load();
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Institution Management</h2>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <div className="grid gap-6">
        {institutions.map((inst) => (
          <Card key={inst.id} title={inst.name} action={
            editing?.id === inst.id ? (
              <div className="flex gap-2">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => { setEditing(inst); setForm(inst); }}>Edit</Button>
            )
          }>
            {editing?.id === inst.id ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Select label="Type" value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{ value: 'school', label: 'School' }, { value: 'academy', label: 'Academy' }]} />
                <Select label="Shift" value={form.shift || ''} onChange={(e) => setForm({ ...form, shift: e.target.value })} options={[{ value: 'morning', label: 'Morning' }, { value: 'evening', label: 'Evening' }, { value: 'both', label: 'Both' }]} />
                <Input label="Fee Due Day" type="number" value={form.fee_due_day || ''} onChange={(e) => setForm({ ...form, fee_due_day: e.target.value })} />
                <Input label="Fine Per Day" type="number" value={form.fine_per_day || ''} onChange={(e) => setForm({ ...form, fine_per_day: e.target.value })} />
                <Input label="Late Window (mins)" type="number" value={form.late_window_minutes || ''} onChange={(e) => setForm({ ...form, late_window_minutes: e.target.value })} />
              </div>
            ) : (
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Type:</span> <span className="capitalize">{inst.type}</span></div>
                <div><span className="text-gray-500">Shift:</span> <span className="capitalize">{inst.shift}</span></div>
                <div><span className="text-gray-500">Fee Due Day:</span> {inst.fee_due_day}</div>
                <div><span className="text-gray-500">Fine/Day:</span> Rs. {inst.fine_per_day}</div>
                <div><span className="text-gray-500">Status:</span> <span className="capitalize">{inst.status}</span></div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
