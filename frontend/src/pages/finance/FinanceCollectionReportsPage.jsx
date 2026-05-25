import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Input, Select, Table, StatCard, Alert, Spinner } from '../../components/ui';
import { financeService, academicService } from '../../services/authService';

export default function FinanceCollectionReportsPage() {
  const [filters, setFilters] = useState({ month_year: new Date().toISOString().slice(0, 7) });
  const [classes, setClasses] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    academicService.classes.list().then((r) => setClasses(r.data.data || []));
  }, []);

  const load = () => {
    setLoading(true);
    setErr('');
    financeService.reports.collection(filters)
      .then((res) => setData(res.data.data))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load report'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const summary = data?.summary || {};

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Finance Collection Reports</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <Input type="month" value={filters.month_year} onChange={(e) => setFilters({ ...filters, month_year: e.target.value })} className="!mb-0" />
          <Select value={filters.class_id || ''} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })} className="!mb-0"
            options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
        </div>
      </Card>
      {loading ? <Spinner /> : data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <StatCard title="Collected" value={`Rs. ${Number(summary.collected || 0).toLocaleString()}`} color="green" />
            <StatCard title="Outstanding" value={`Rs. ${Number(summary.outstanding || 0).toLocaleString()}`} color="yellow" />
            <StatCard title="Total Challans" value={summary.total_challans || 0} color="blue" />
          </div>
          <Card title="Breakdown by Class & Status" className="mt-6">
            <Table columns={[
              { key: 'class_name', label: 'Class', render: (r) => r.class_name || 'Unassigned' },
              { key: 'month_year', label: 'Month' },
              { key: 'status', label: 'Status' },
              { key: 'count', label: 'Count' },
              { key: 'base_amount', label: 'Base', render: (r) => `Rs. ${Number(r.base_amount || 0).toLocaleString()}` },
              { key: 'fine_amount', label: 'Fine', render: (r) => `Rs. ${Number(r.fine_amount || 0).toLocaleString()}` },
              { key: 'total_amount', label: 'Total', render: (r) => `Rs. ${Number(r.total_amount || 0).toLocaleString()}` },
            ]} data={data.breakdown || []} />
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
