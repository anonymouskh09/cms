import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Table, Spinner } from '../../components/ui';
import { reportsService } from '../../services/authService';

const REPORTS = [
  { key: 'students', label: 'Student List', fn: () => reportsService.students() },
  { key: 'teachers', label: 'Teacher List', fn: () => reportsService.teachers() },
  { key: 'attendanceDaily', label: 'Daily Attendance', fn: () => reportsService.attendanceDaily({ date: new Date().toISOString().split('T')[0] }) },
  { key: 'attendanceMonthly', label: 'Monthly Attendance', fn: () => reportsService.attendanceMonthly({ month_year: new Date().toISOString().slice(0, 7) }) },
  { key: 'feeCollection', label: 'Fee Collection', fn: () => reportsService.feeCollection({ month_year: new Date().toISOString().slice(0, 7) }) },
  { key: 'defaulters', label: 'Defaulter Report', fn: () => reportsService.defaulters() },
  { key: 'institutionSummary', label: 'Institution Summary', fn: () => reportsService.institutionSummary() },
];

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [activeReport, setActiveReport] = useState('');
  const [loading, setLoading] = useState(false);

  const runReport = async (report) => {
    setLoading(true);
    setActiveReport(report.label);
    try {
      const res = await report.fn();
      setData(Array.isArray(res.data.data) ? res.data.data : res.data.data?.records || [res.data.data]);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport.replace(/\s/g, '_')}.csv`;
    a.click();
  };

  const columns = data?.length ? Object.keys(data[0]).slice(0, 8).map((k) => ({ key: k, label: k.replace(/_/g, ' ') })) : [];

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Reports</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {REPORTS.map((r) => (
          <Button key={r.key} variant="secondary" onClick={() => runReport(r)}>{r.label}</Button>
        ))}
      </div>
      {activeReport && (
        <Card title={activeReport} action={data?.length ? <Button onClick={exportCsv}>Export CSV</Button> : null}>
          {loading ? <Spinner /> : <Table columns={columns} data={data || []} />}
        </Card>
      )}
    </DashboardLayout>
  );
}
