import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Badge } from '../../components/ui';
import { PageHeader, DashboardCard } from '../../components/dashboard';
import { Phase3IntegrationBanner } from '../../components/phase3/Phase3Banner';
import IntegrationsNav from '../../components/phase3/IntegrationsNav';
import { integrationsService } from '../../services/authService';

export default function QrAttendancePage() {
  const [info, setInfo] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    integrationsService.getQrAttendance().then((res) => {
      setInfo(res.data.data);
      setMsg(res.data.message || '');
    }).catch((e) => setMsg(e.response?.data?.message || ''));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader title="QR / Biometric Attendance" subtitle="Integration settings for QR codes and biometric devices" pill="UI Only" />
      <Phase3IntegrationBanner />
      <IntegrationsNav />
      <Alert type="warning" message={msg} onClose={() => setMsg('')} />

      <div className="grid md:grid-cols-2 gap-6">
        <DashboardCard title="Integration Status" subtitle="Current device and scan configuration">
          <div className="space-y-4">
            {[
              ['QR Attendance', info?.qr_enabled ? 'Enabled' : 'Disabled', info?.qr_enabled],
              ['Biometric Devices', info?.biometric_enabled ? 'Enabled' : 'Disabled', info?.biometric_enabled],
              ['Devices Connected', info?.devices_connected ?? 0, null],
              ['Last Scan', info?.last_scan || 'Never', null],
            ].map(([label, value, enabled]) => (
              <div key={label} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                {enabled != null ? <Badge status={enabled ? 'active' : 'inactive'}>{value}</Badge> : <span className="text-sm font-semibold text-gray-900">{value}</span>}
              </div>
            ))}
          </div>
        </DashboardCard>
        <DashboardCard title="Supported Devices" subtitle="Placeholder hardware list">
          <ul className="space-y-2">
            {(info?.supported_devices || []).map((f) => (
              <li key={f} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                {f}
              </li>
            ))}
          </ul>
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}
