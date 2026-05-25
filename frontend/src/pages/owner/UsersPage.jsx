import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Table, Badge, Modal, Alert, Spinner } from '../../components/ui';
import { usersService } from '../../services/authService';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ role: '', institution_id: '' });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ role: 'admin', institution_id: 1 });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    usersService.list(filters).then((res) => setUsers(res.data.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filters]);

  const handleCreate = async () => {
    await usersService.create(form);
    setMsg('User created');
    setModal(false);
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button onClick={() => setModal(true)}>Add User</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Card>
        <div className="flex gap-4 mb-4">
          <Select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            options={[{ value: '', label: 'All Roles' }, { value: 'owner', label: 'Owner' }, { value: 'principal', label: 'Principal' }, { value: 'admin', label: 'Admin' }, { value: 'teacher', label: 'Teacher' }, { value: 'student', label: 'Student' }, { value: 'parent', label: 'Parent' }, { value: 'finance_manager', label: 'Finance Manager' }]} />
          <Select value={filters.institution_id} onChange={(e) => setFilters({ ...filters, institution_id: e.target.value })}
            options={[{ value: '', label: 'All Institutions' }, { value: '1', label: 'Schools' }, { value: '2', label: 'Primal Academy' }]} />
        </div>
        {loading ? <Spinner /> : (
          <Table columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role', render: (r) => <span className="capitalize">{r.role?.replace('_', ' ')}</span> },
            { key: 'institution_name', label: 'Institution', render: (r) => r.institution_name || 'All' },
            { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
          ]} data={users} />
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Add User">
        <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input label="Password" type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
          options={['principal', 'admin', 'teacher', 'student', 'parent', 'finance_manager'].map((r) => ({ value: r, label: r.replace('_', ' ') }))} />
        <Select label="Institution" value={form.institution_id || ''} onChange={(e) => setForm({ ...form, institution_id: parseInt(e.target.value) })}
          options={[{ value: 1, label: 'Schools' }, { value: 2, label: 'Primal Academy' }]} />
        <Button onClick={handleCreate} className="w-full mt-4">Create User</Button>
      </Modal>
    </DashboardLayout>
  );
}
