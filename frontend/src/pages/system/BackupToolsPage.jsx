import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button, Alert, Spinner } from '../../components/ui';
import { PageHeader, DashboardCard } from '../../components/dashboard';
import SystemNav from '../../components/phase3/SystemNav';
import { systemService } from '../../services/authService';

export default function BackupToolsPage() {
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => systemService.listBackups().then((res) => {
    setInfo(res.data.data);
    setMsg(res.data.message || '');
  });

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await systemService.createBackup();
      setMsg(res.data.message);
    } catch (e) {
      setMsg(e.response?.data?.message || 'Backup failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Backup Tools" subtitle="Create and manage database backups" pill="UI Only" action={<Button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Backup'}</Button>} />
      <SystemNav />
      <Alert type="warning" message={msg} onClose={() => setMsg('')} />

      {loading ? <Spinner /> : info && (
        <DashboardCard title="Backup Status" subtitle="Phase 3 placeholder — backups are not active yet">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Last Backup</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{info.last_backup || 'None'}</p>
            </div>
            <div className="p-5 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Auto Backup</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{info.auto_backup_enabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="p-5 rounded-xl bg-gray-50 border border-gray-100 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Schedule</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{info.backup_schedule}</p>
            </div>
          </div>
          {(info.available_backups || []).length === 0 && (
            <p className="text-sm text-gray-500 mt-6 text-center py-8 rounded-xl border border-dashed border-gray-200">No backups available yet.</p>
          )}
        </DashboardCard>
      )}
    </DashboardLayout>
  );
}
