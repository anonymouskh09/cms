import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Modal, Alert, Spinner, Table, Badge } from '../../components/ui';
import { financeStaffService } from '../../services/authService';

export default function FinanceStaffPage() {
  const [staff, setStaff] = useState([]);
  const [modal, setModal] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [form, setForm] = useState({ password: 'password123' });
  const [newPassword, setNewPassword] = useState('password123');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    financeStaffService.list()
      .then((res) => setStaff(res.data.data || []))
      .catch(() => setErr('Failed to load finance accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email) {
      setErr('Name and email required');
      return;
    }
    setErr('');
    try {
      const res = await financeStaffService.create(form);
      setMsg(res.data.message || 'Finance login created');
      setModal(false);
      setForm({ password: 'password123' });
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Create failed');
    }
  };

  const handleReset = async () => {
    if (!resetModal) return;
    try {
      await financeStaffService.resetPassword(resetModal.id, { password: newPassword });
      setMsg('Password updated');
      setResetModal(null);
    } catch (e) {
      setErr(e.response?.data?.message || 'Reset failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-start mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Finance Login Accounts</h2>
          <p className="text-sm text-gray-500 mt-1">
            Separate login for finance staff — fees, challans, payments, and defaulters.
            Demo: <strong>finance@peers.local</strong> / password123
          </p>
        </div>
        <Button onClick={() => setModal(true)}>Create Finance Login</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <Card className="mb-6 bg-emerald-50 border-emerald-100">
        <p className="text-sm text-emerald-900">
          After login, finance users are taken to <strong>/finance/dashboard</strong> —
          fee structures, challan generation, payments, and defaulter reports.
        </p>
      </Card>

      <Card>
        {loading ? <Spinner /> : staff.length ? (
          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Login Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
              {
                key: 'actions',
                label: 'Actions',
                render: (r) => (
                  <Button size="sm" variant="secondary" onClick={() => { setResetModal(r); setNewPassword('password123'); }}>
                    Reset Password
                  </Button>
                ),
              },
            ]}
            data={staff}
          />
        ) : (
          <p className="text-sm text-gray-500 py-6 text-center">
            No finance account yet. Create one or run <code className="bg-gray-100 px-1 rounded">npm run seed</code> in backend.
          </p>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Create Finance Login">
        <Input label="Full Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Login Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="finance@peers.local" />
        <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Password" type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button onClick={handleCreate} className="w-full mt-4">Create Account</Button>
      </Modal>

      <Modal open={!!resetModal} onClose={() => setResetModal(null)} title={`Reset Password — ${resetModal?.name}`}>
        <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Button onClick={handleReset} className="w-full mt-4">Update Password</Button>
      </Modal>
    </DashboardLayout>
  );
}
