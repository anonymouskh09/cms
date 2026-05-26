import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Table, Spinner, Button, Alert } from '../../components/ui';
import { principalPortalService } from '../../services/authService';
import { useMonitoring } from '../monitoring/MonitoringContext';

export default function PrincipalPortalResultsPage() {
  const { readOnly, showBanner } = useMonitoring();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    principalPortalService.pendingResults().then((res) => setRows(res.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const approve = async (row) => {
    await principalPortalService.upsertApproval({
      approval_type: 'result',
      entity_id: row.exam_id,
      status: 'approved',
      remarks: `Approved results for ${row.exam_name}`,
    });
    setMsg('Result batch approved for publishing');
    load();
  };

  const reject = async (row) => {
    const remarks = window.prompt('Rejection reason?') || 'Rejected';
    await principalPortalService.upsertApproval({
      approval_type: 'result',
      entity_id: row.exam_id,
      status: 'rejected',
      remarks,
    });
    setMsg('Result approval rejected');
    load();
  };

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <h1 className="text-2xl font-bold mb-2">Results</h1>
      <p className="text-slate-500 text-sm mb-6">{readOnly ? 'View pending and published result batches' : 'Review and approve result publishing'}</p>
      {msg && <Alert className="mb-4">{msg}</Alert>}
      {loading ? <Spinner /> : (
        <Table
          columns={[
            { key: 'exam_name', label: 'Exam' },
            { key: 'class_name', label: 'Class' },
            { key: 'students_with_draft', label: 'Draft marks' },
            ...(readOnly ? [] : [{
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(r)}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => reject(r)}>Reject</Button>
                </div>
              ),
            }]),
          ]}
          data={rows}
        />
      )}
    </DashboardLayout>
  );
}
