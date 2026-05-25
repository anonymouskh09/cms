import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Table, Modal, Alert, Spinner } from '../../components/ui';
import { announcementsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ audience: 'all' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const canCreate = ['owner', 'principal', 'admin', 'teacher'].includes(user?.role);

  const load = () => announcementsService.list().then((res) => setItems(res.data.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await announcementsService.create(form);
    setMsg('Announcement created');
    setModal(false);
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Announcements</h2>
        {canCreate && <Button onClick={() => setModal(true)}>New Announcement</Button>}
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Card>{loading ? <Spinner /> : (
        <Table columns={[
          { key: 'title', label: 'Title' },
          { key: 'message', label: 'Message' },
          { key: 'audience', label: 'Audience' },
          { key: 'created_by_name', label: 'By' },
          { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
        ]} data={items} />
      )}</Card>
      <Modal open={modal} onClose={() => setModal(false)} title="New Announcement">
        <Input label="Title" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input label="Message" value={form.message || ''} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <Select label="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}
          options={[{ value: 'all', label: 'All' }, { value: 'students', label: 'Students' }, { value: 'parents', label: 'Parents' }, { value: 'teachers', label: 'Teachers' }]} />
        <Button onClick={handleCreate} className="w-full mt-4">Publish</Button>
      </Modal>
    </DashboardLayout>
  );
}
