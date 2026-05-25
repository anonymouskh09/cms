import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Table, Badge, Modal, Alert, Spinner } from '../../components/ui';
import { academicService } from '../../services/authService';

export default function AcademicPage({ type, title }) {
  const service = academicService[type];
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const classMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.name])), [classes]);

  const load = () => {
    setLoading(true);
    Promise.all([
      service.list(),
      type !== 'classes' ? academicService.classes.list() : Promise.resolve({ data: { data: [] } }),
    ]).then(([res, clsRes]) => {
      setItems(res.data.data || []);
      setClasses(clsRes.data.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const payload = { ...form };
    if (payload.class_id) payload.class_id = parseInt(payload.class_id, 10);
    if (payload.level) payload.level = parseInt(payload.level, 10);
    if (payload.capacity) payload.capacity = parseInt(payload.capacity, 10);
    await service.create(payload);
    setMsg(`${title.slice(0, -1)} created`);
    setModal(false);
    setForm({});
    load();
  };

  const columns = type === 'classes'
    ? [{ key: 'name', label: 'Name' }, { key: 'level', label: 'Level' }, { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> }]
    : type === 'sections'
    ? [
      { key: 'name', label: 'Section' },
      { key: 'class_id', label: 'Class', render: (r) => classMap[r.class_id] || r.class_id },
      { key: 'capacity', label: 'Capacity' },
      { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
    ]
    : [
      { key: 'name', label: 'Subject' },
      { key: 'code', label: 'Code' },
      { key: 'class_id', label: 'Linked Class', render: (r) => r.class_id ? (classMap[r.class_id] || r.class_id) : '—' },
      { key: 'status', label: 'Status', render: (r) => <Badge status={r.status} /> },
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
          </p>
        </div>
        <Button onClick={() => setModal(true)}>Add {addLabel}</Button>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Card>{loading ? <Spinner /> : <Table columns={columns} data={items} />}</Card>
      <Modal open={modal} onClose={() => setModal(false)} title={`Add ${addLabel}`}>
        <Input label="Name" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {type === 'classes' && <Input label="Level" type="number" value={form.level || ''} onChange={(e) => setForm({ ...form, level: e.target.value })} />}
        {(type === 'sections' || type === 'subjects') && (
          <Select label="Class" value={form.class_id || ''} onChange={(e) => setForm({ ...form, class_id: e.target.value })}
            options={[{ value: '', label: type === 'subjects' ? 'None (master subject)' : 'Select class' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]} />
        )}
        {type === 'sections' && <Input label="Capacity" type="number" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />}
        {type === 'subjects' && <Input label="Code" value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MTH" />}
        <Button onClick={handleCreate} className="w-full mt-4">Create</Button>
      </Modal>
    </DashboardLayout>
  );
}
