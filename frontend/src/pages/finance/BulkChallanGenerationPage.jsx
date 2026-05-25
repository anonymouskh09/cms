import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Alert, Spinner, EmptyState } from '../../components/ui';
import { financeService, academicService, institutionsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function BulkChallanGenerationPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ month_year: new Date().toISOString().slice(0, 7) });
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    academicService.classes.list().then((r) => setClasses(r.data.data || []));
    academicService.sections.list().then((r) => setSections(r.data.data || []));
    if (user?.role === 'owner') {
      institutionsService.list().then((r) => setInstitutions(r.data.data || []));
    }
  }, [user?.role]);

  const filteredSections = form.class_id
    ? sections.filter((s) => String(s.class_id) === String(form.class_id))
    : sections;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setErr('');
    setResult(null);
    try {
      const res = await financeService.challans.bulkGenerate(form);
      setResult(res.data.data);
      setMsg(res.data.message);
    } catch (error) {
      setErr(error.response?.data?.message || 'Bulk generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Bulk Challan Generation</h2>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <form onSubmit={handleSubmit} className="max-w-lg">
          {user?.role === 'owner' && (
            <Select label="Institution" value={form.institution_id || ''} onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
              options={[{ value: '', label: 'Select institution' }, ...institutions.map((i) => ({ value: i.id, label: i.name }))]} />
          )}
          <Input label="Month" type="month" value={form.month_year} onChange={(e) => setForm({ ...form, month_year: e.target.value })} required />
          <Select label="Class (optional — leave empty for whole institution)" value={form.class_id || ''} onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })}
            options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Section (optional)" value={form.section_id || ''} onChange={(e) => setForm({ ...form, section_id: e.target.value })}
            options={[{ value: '', label: 'All sections' }, ...filteredSections.map((s) => ({ value: s.id, label: s.name }))]} />
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? 'Generating…' : 'Generate Challans'}
          </Button>
        </form>
      </Card>
      {loading && <Spinner />}
      {result && (
        <Card title="Generation Result" className="mt-6">
          <p className="text-sm text-gray-600 mb-2">Generated: {result.generated?.length || 0} · Skipped: {result.skipped?.length || 0} · Failed: {result.failed?.length || 0}</p>
          {!result.generated?.length && <EmptyState message="No new challans were generated (may already exist for this month)." />}
        </Card>
      )}
    </DashboardLayout>
  );
}
