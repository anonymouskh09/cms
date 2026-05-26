import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Card, Table, Spinner, Badge } from '../../components/ui';
import { financeService } from '../../services/authService';
import { useMonitoring, mergeScope } from '../monitoring/MonitoringContext';

function formatRs(n) {
  return `Rs. ${Number(n || 0).toLocaleString()}`;
}

function groupDefaultersByStudent(rows) {
  const map = new Map();
  for (const row of rows) {
    const id = row.student_id;
    if (!id) continue;
    const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.student_name || 'Student';
    if (!map.has(id)) {
      map.set(id, {
        student_id: id,
        student_name: name,
        class_name: row.class_name,
        roll_no: row.roll_no,
        pending_amount: 0,
        overdue_count: 0,
        challan_count: 0,
      });
    }
    const g = map.get(id);
    g.pending_amount += Number(row.total_amount) || 0;
    g.challan_count += 1;
    if (row.status === 'overdue') g.overdue_count += 1;
  }
  return [...map.values()].sort((a, b) => b.pending_amount - a.pending_amount);
}

export default function PrincipalPortalFeesPage() {
  const navigate = useNavigate();
  const { basePath, scopeParams, showBanner } = useMonitoring();
  const [collection, setCollection] = useState(null);
  const [rawDefaulters, setRawDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      financeService.reports.collection(scopeParams),
      financeService.defaulters(scopeParams),
    ]).then(([c, d]) => {
      setCollection(c.data.data);
      const rows = d.data.data?.students || d.data.data || [];
      setRawDefaulters(Array.isArray(rows) ? rows : []);
    }).finally(() => setLoading(false));
  }, [scopeParams.institution_id]);

  const defaulters = useMemo(() => groupDefaultersByStudent(rawDefaulters), [rawDefaulters]);

  const openStudentFeeHistory = (row) => {
    navigate(`${basePath}/students/${row.student_id}`, { state: { focusSection: 'fees' } });
  };

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <h1 className="text-2xl font-bold mb-2">Fees Overview</h1>
      <p className="text-slate-500 text-sm mb-6">Click a student row to view full fee and payment history</p>
      {loading ? <Spinner /> : (
        <>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card><p className="text-sm text-slate-500">Collected</p><p className="text-xl font-bold">{formatRs(collection?.summary?.collected ?? collection?.total_collected)}</p></Card>
            <Card><p className="text-sm text-slate-500">Pending</p><p className="text-xl font-bold">{formatRs(collection?.summary?.outstanding ?? collection?.total_pending)}</p></Card>
            <Card><p className="text-sm text-slate-500">Defaulters</p><p className="text-xl font-bold">{collection?.defaulter_count ?? defaulters.length}</p></Card>
          </div>
          <h2 className="font-semibold mb-2">Defaulter students</h2>
          <Table
            onRowClick={openStudentFeeHistory}
            columns={[
              {
                key: 'student_name',
                label: 'Student',
                render: (r) => (
                  <span>
                    {r.student_name}
                    {r.roll_no ? <span className="block text-xs text-slate-500">Roll {r.roll_no}</span> : null}
                  </span>
                ),
              },
              { key: 'class_name', label: 'Class' },
              { key: 'challan_count', label: 'Pending challans' },
              {
                key: 'pending_amount',
                label: 'Total pending',
                render: (r) => (
                  <span className={r.pending_amount > 0 ? 'font-semibold text-rose-700' : ''}>
                    {formatRs(r.pending_amount)}
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  r.overdue_count > 0
                    ? <Badge status="overdue">Overdue</Badge>
                    : <Badge status="pending">Pending</Badge>
                ),
              },
            ]}
            data={defaulters}
          />
          {!defaulters.length && (
            <p className="text-center text-slate-500 py-8 text-sm">No students with pending fees.</p>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
