import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Card, Input, Select, Table, Badge, Button, Spinner, Textarea, Modal, Alert } from '../../components/ui';
import { studentsService, academicService, principalPortalService } from '../../services/authService';
import { useMonitoring, mergeScope } from '../monitoring/MonitoringContext';

export default function PrincipalPortalStudentsPage() {
  const navigate = useNavigate();
  const { basePath, scopeParams, readOnly, showBanner } = useMonitoring();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ search: '', class_id: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [remarkModal, setRemarkModal] = useState(null);
  const [remark, setRemark] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      studentsService.list(mergeScope(scopeParams, filters)),
      academicService.classes.list(scopeParams),
    ])
      .then(([s, c]) => {
        setStudents(s.data.data);
        setClasses(c.data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters.search, filters.class_id, filters.status, scopeParams.institution_id]);

  const saveRemark = async () => {
    await principalPortalService.createRemark({
      entity_type: 'student',
      entity_id: remarkModal.id,
      remarks: remark,
    });
    setRemarkModal(null);
    setRemark('');
    setMsg('Remark saved');
    load();
  };

  const toggleAttention = async (e, id, current) => {
    e.stopPropagation();
    await principalPortalService.setNeedsAttention(id, !current);
    load();
  };

  const openRemark = (e, row) => {
    e.stopPropagation();
    setRemarkModal(row);
    setRemark('');
  };

  const stopRow = (e) => e.stopPropagation();

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Students</h1>
        <p className="text-slate-500 text-sm">Click any row to view student and parent details</p>
      </div>
      {msg && <Alert variant="success" className="mb-4">{msg}</Alert>}
      <Card className="mb-4">
        <div className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Search name / roll" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <Select value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })} options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} options={[{ value: '', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </div>
      </Card>
      {loading ? <Spinner /> : (
        <Table
          onRowClick={(row) => navigate(`${basePath}/students/${row.id}`, { state: { focusSection: 'overview' } })}
          columns={[
            { key: 'first_name', label: 'Name', render: (r) => `${r.first_name} ${r.last_name || ''}` },
            { key: 'admission_no', label: 'Admission' },
            { key: 'roll_no', label: 'Roll' },
            { key: 'class_name', label: 'Class' },
            {
              key: 'parent_name',
              label: 'Parent / Guardian',
              render: (r) => (
                <span className="text-slate-700">
                  {r.parent_name || '—'}
                  {r.parent_phone ? <span className="block text-xs text-slate-500">{r.parent_phone}</span> : null}
                </span>
              ),
            },
            { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
            { key: 'needs_attention', label: 'Flag', render: (r) => r.needs_attention ? <Badge status="pending">Needs attention</Badge> : '—' },
            ...(readOnly ? [] : [{
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <div className="flex gap-2" onClick={stopRow} onKeyDown={stopRow} role="presentation">
                  <Button size="sm" variant="ghost" onClick={(e) => openRemark(e, r)}>Remark</Button>
                  <Button size="sm" variant="ghost" onClick={(e) => toggleAttention(e, r.id, r.needs_attention)}>
                    {r.needs_attention ? 'Clear flag' : 'Flag'}
                  </Button>
                </div>
              ),
            }]),
          ]}
          data={students}
        />
      )}
      {!readOnly && (
      <Modal open={!!remarkModal} onClose={() => setRemarkModal(null)} title="Principal remark">
        <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={4} />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setRemarkModal(null)}>Cancel</Button>
          <Button onClick={saveRemark}>Save</Button>
        </div>
      </Modal>
      )}
    </DashboardLayout>
  );
}
