import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Table, Spinner, Badge, Button, Alert } from '../../components/ui';
import { examsService, principalPortalService } from '../../services/authService';
import { useMonitoring, mergeScope } from '../monitoring/MonitoringContext';

export default function PrincipalPortalExamsPage() {
  const { scopeParams, readOnly, showBanner } = useMonitoring();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    examsService.list(mergeScope(scopeParams)).then((res) => setExams(res.data.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [scopeParams.institution_id]);

  const approve = async (exam) => {
    await principalPortalService.upsertApproval({
      approval_type: 'exam',
      entity_id: exam.id,
      status: 'approved',
      remarks: 'Exam schedule approved by principal',
    });
    setMsg(`Approved: ${exam.name}`);
    load();
  };

  const reject = async (exam) => {
    const remarks = window.prompt('Rejection reason?') || 'Rejected';
    await principalPortalService.upsertApproval({
      approval_type: 'exam',
      entity_id: exam.id,
      status: 'rejected',
      remarks,
    });
    setMsg(`Rejected: ${exam.name}`);
    load();
  };

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <h1 className="text-2xl font-bold mb-6">Exams</h1>
      {readOnly && <p className="text-slate-500 text-sm mb-4">View exam schedules and status</p>}
      {msg && <Alert className="mb-4">{msg}</Alert>}
      {loading ? <Spinner /> : (
        <Table
          columns={[
            { key: 'name', label: 'Exam' },
            { key: 'start_date', label: 'Start' },
            { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            ...(readOnly ? [] : [{
              key: 'actions',
              label: 'Approval',
              render: (r) => r.status === 'draft' ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(r)}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => reject(r)}>Reject</Button>
                </div>
              ) : '—',
            }]),
          ]}
          data={exams}
        />
      )}
    </DashboardLayout>
  );
}
