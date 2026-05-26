import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Card, Spinner } from '../../components/ui';
import { institutionsService } from '../../services/authService';

export default function OwnerInstitutionsViewPage() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    institutionsService.list().then((res) => setInstitutions(res.data.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <ViewOnlyBanner />
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Institutions</h1>
      <p className="text-slate-500 text-sm mb-6">Schools and academies in your network — view only</p>
      <div className="grid gap-4">
        {institutions.map((inst) => (
          <Card key={inst.id} title={inst.name}>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-slate-500">Type:</span> <span className="capitalize ml-1">{inst.type}</span></div>
              <div><span className="text-slate-500">Shift:</span> <span className="capitalize ml-1">{inst.shift}</span></div>
              <div><span className="text-slate-500">Fee due day:</span> {inst.fee_due_day ?? '—'}</div>
              <div><span className="text-slate-500">Status:</span> <span className="capitalize ml-1">{inst.status}</span></div>
              <div><span className="text-slate-500">Fine/day:</span> Rs. {inst.fine_per_day ?? 0}</div>
              <div><span className="text-slate-500">Late window:</span> {inst.late_window_minutes ?? '—'} min</div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
