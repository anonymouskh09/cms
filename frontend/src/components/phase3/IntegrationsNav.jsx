import { useRoleBase } from '../../utils/roleBase';
import SubNav from '../dashboard/SubNav';

const INTEGRATION_ITEMS = (base) => [
  { label: 'SMS Integration', path: '/finance/sms/dashboard' },
  { label: 'QR / Biometric Attendance', path: `${base}/integrations/qr-attendance` },
  { label: 'Advanced Notifications', path: `${base}/integrations/notifications` },
];

export default function IntegrationsNav() {
  const base = useRoleBase();
  return <SubNav items={INTEGRATION_ITEMS(base)} />;
}
