import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import RecordActions from '../../components/shared/RecordActions';
import { Card, Button, Input, Select, Table, Badge, Modal, Alert, Spinner } from '../../components/ui';
import { academicService } from '../../services/authService';

export default function AcademicPage({ type, title }) {
  const service = academicService[type];
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const classMap = useMemo(
    () => Object.fromEntries(classes.map((c) => [String(c.id), c.name])),
    [classes]
  );

  const load = () => {
    setLoading(true);
    setErr('');
    const needsClasses = type === 'sections' || type === 'subjects';
    Promise.all([
      service.list(),
      needsClasses ? academicService.classes.list() : Promise.resolve({ data: { data: [] } }),
    ])
      .then(([res, clsRes]) => {
        setItems(res.data.data || []);
        setClasses(clsRes.data.data || []);
      })
      .catch((e) => {
        setItems([]);
        setClasses([]);
        setErr(e.response?.data?.message || 'Failed to load data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setItems([]);
    setClasses([]);
    setModal(false);
    setEditingId(null);
    setForm({});
    load();
  }, [type]);

  const openAdd = () => {
    setEditingId(null);
    setForm(type === 'classes' ? { name: '', level: '' } : type === 'sections' ? { name: '', class_id: '', capacity: '40' } : { name: '', code: '', class_id: '' });
    setErr('');
    if (type === 'sections' || type === 'subjects') {
      academicService.classes.list().then((res) => setClasses(res.data.data || [])).catch(() => setClasses([]));
    }
    setModal(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    const base = { name: row.name || '', status: row.status || 'active' };
    if (type === 'classes') {
      setForm({ ...base, level: row.level != null ? String(row.level) : '' });
    } else if (type === 'sections') {
      setForm({
        ...base,
        class_id: row.class_id ? String(row.class_id) : '',
        capacity: row.capacity != null ? String(row.capacity) : '',
      });
    } else {
      setForm({
        ...base,
        class_id: row.class_id ? String(row.class_id) : '',
        code: row.code || '',
      });
    }
    setErr('');
    if (type === 'sections' || type === 'subjects') {
      academicService.classes.list().then((res) => setClasses(res.data.data || [])).catch(() => setClasses([]));
    }
    setModal(true);
  };

  const buildPayload = () => {
    const payload = { name: form.name, status: form.status };
    if (type === 'classes') {
      if (form.level !== undefined && form.level !== '') payload.level = parseInt(form.level, 10);
    } else if (type === 'sections') {
      if (form.class_id) payload.class_id = parseInt(form.class_id, 10);
      if (form.capacity !== undefined && form.capacity !== '') payload.capacity = parseInt(form.capacity, 10);
    } else {
      if (form.code) payload.code = form.code;
      if (form.class_id) payload.class_id = parseInt(form.class_id, 10);
    }
    if (!editingId) {
      delete payload.status;
    }
    return payload;
  };

  const handleSave = async () => {
    setErr('');
    if (type === 'sections' && !editingId && !form.class_id) {
      setErr('Please select a class for this section');
      return;
    }
    if (type === 'sections' && !form.name?.trim()) {
      setErr('Section name is required (e.g. A, B, Morning)');
      return;
    }
    try {
      const payload = buildPayload();
      if (editingId) {
        await service.update(editingId, payload);
        setMsg(`${title.slice(0, -1)} updated`);
      } else {
        await service.create(payload);
        setMsg(`${title.slice(0, -1)} created`);
      }
      setModal(false);
      setForm({});
      setEditingId(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
      return;
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Permanently delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await service.remove(row.id);
      setMsg(`${row.name} deleted permanently`);
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Delete failed');
    }
  };

  const columns = type === 'classes'
    ? [
      { key: 'name', label: 'Name' },
      { key: 'level', label: 'Level' },
      { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
      { key: 'actions', label: 'Actions', render: (r) => <RecordActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} /> },
    ]
    : type === 'sections'
    ? [
      { key: 'name', label: 'Section' },
      {
        key: 'class_id',
        label: 'Class',
        render: (r) => r.class_name || classMap[String(r.class_id)] || '—',
      },
      { key: 'capacity', label: 'Capacity' },
      { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
      { key: 'actions', label: 'Actions', render: (r) => <RecordActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} /> },
    ]
    : [
      { key: 'name', label: 'Subject' },
      { key: 'code', label: 'Code' },
      { key: 'class_id', label: 'Linked Class', render: (r) => r.class_id ? (classMap[r.class_id] || r.class_id) : '—' },
      { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
      { key: 'actions', label: 'Actions', render: (r) => <RecordActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} /> },
    ];

  const addLabel = type === 'classes' ? 'Class' : type === 'sections' ? 'Section' : 'Subject';

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {type === 'subjects' && 'Create master subjects here, then assign them to classes via Class Subjects.'}
            {type === 'sections' && 'Sections belong to a class (e.g. 10-A, 10-B).'}
            {type === 'classes' && 'Manage school classes — edit or delete from the table.'}
          </p>
        </div>
        <Button onClick={openAdd}>Add {addLabel}</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        {loading ? <Spinner /> : items.length === 0 ? (
          <p className="text-center text-slate-500 py-10 text-sm">
            {type === 'sections'
              ? 'No sections yet. Add a class first, then click Add Section (e.g. Section A for Grade 1).'
              : `No ${title.toLowerCase()} yet. Click Add ${addLabel}.`}
          </p>
        ) : (
          <Table columns={columns} data={items} />
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? `Edit ${addLabel}` : `Add ${addLabel}`}>
        <Alert type="error" message={err} onClose={() => setErr('')} />
        <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {type === 'classes' && <Input label="Level" type="number" value={form.level || ''} onChange={(e) => setForm({ ...form, level: e.target.value })} />}
        {(type === 'sections' || type === 'subjects') && (
          <Select
            label={type === 'sections' ? 'Class *' : 'Class'}
            value={form.class_id || ''}
            onChange={(e) => setForm({ ...form, class_id: e.target.value })}
            options={[
              { value: '', label: classes.length ? (type === 'sections' ? 'Select class' : 'None (master subject)') : 'No classes — add classes first' },
              ...classes.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
        )}
        {type === 'sections' && <Input label="Capacity" type="number" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />}
        {type === 'subjects' && <Input label="Code" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MTH" />}
        {editingId && (
          <Select label="Status" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        )}
        <Button onClick={handleSave} className="w-full mt-4">{editingId ? 'Save Changes' : 'Create'}</Button>
      </Modal>
    </DashboardLayout>
  );
}
