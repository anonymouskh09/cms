import SubNav from '../dashboard/SubNav';

const SYSTEM_ITEMS = [
  { label: 'System Health', path: '/owner/system/health' },
  { label: 'Backup Tools', path: '/owner/system/backup' },
];

export default function SystemNav() {
  return <SubNav items={SYSTEM_ITEMS} />;
}
