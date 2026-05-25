import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Modal, Alert, Spinner, EmptyState } from '../../components/ui';
import { examsService, institutionsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  return '/principal';
}

export default function ExamTypesPage() {
  const { user } = useAuth();
  const [types, setTypes] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState(user.institution_id || 1);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { include_inactive: includeInactive ? 'true' : 'false' };
    if (user.role === 'owner') params.institution_id = institutionId;
    examsService.types.list(params)
      .then((r) => setTypes(r.data.data))
      .catch(() => setErr('Failed to load exam types'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user.role === 'owner') {
      institutionsService.list().then((r) => setInstitutions(r.data.data));
    }
    load();
  }, [institutionId, includeInactive]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', code: '', description: '' });
    setModal(true);
  };

  const openEdit = (t) => {
    setEditId(t.id);
    setForm({ name: t.name, code: t.code || '', description: t.description || '', status: t.status });
    setModal(true);
  };

  const handleSave = async () => {
    setErr('');
    try {
      const payload = { ...form };
      if (user.role === 'owner') payload.institution_id = institutionId;
      if (editId) await examsService.types.update(editId, payload);
      else await examsService.types.create(payload);
      setMsg(editId ? 'Exam type updated' : 'Exam type created');
      setModal(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    }
  };

  const handleDisable = async (id) => {
    if (!window.confirm('Disable this exam type?')) return;
    try {
      await examsService.types.remove(id);
      setMsg('Exam type disabled');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Cannot disable');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <Link to={`${roleBase(user.role)}/exams/setup`} className="text-sm text-blue-600 hover:underline">← Exam Management</Link>
          <h2 className="text-2xl font-bold mt-1">Exam Types</h2>
        </div>
        <Button onClick={openCreate}>Add Exam Type</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="flex flex-wrap gap-4 items-end">
          {user.role === 'owner' && institutions.length > 0 && (
            <select className="px-3 py-2 border rounded-lg" value={institutionId} onChange={(e) => setInstitutionId(parseInt(e.target.value, 10))}>
              {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            Show inactive
          </label>
        </div>
      </Card>
      <Card>
        {loading ? <Spinner /> : types.length ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500">
              <th className="py-2">Name</th><th>Code</th><th>Description</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2 font-medium">{t.name}</td>
                  <td>{t.code || '—'}</td>
                  <td>{t.description || '—'}</td>
                  <td><span className={`px-2 py-1 text-xs rounded-full ${t.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{t.status}</span></td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => openEdit(t)}>Edit</Button>
                      {t.status === 'active' && <Button variant="danger" onClick={() => handleDisable(t.id)}>Disable</Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState message="No exam types yet. Create one to get started." />}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Exam Type' : 'New Exam Type'}>
        <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Code" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <Input label="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {editId && (
          <select className="w-full px-3 py-2 border rounded-lg mb-4" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
