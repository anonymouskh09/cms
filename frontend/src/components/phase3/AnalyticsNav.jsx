import { useRoleBase } from '../../utils/roleBase';
import SubNav from '../dashboard/SubNav';

const ANALYTICS_ITEMS = (base) => [
  { label: 'Academic Analytics', path: `${base}/analytics` },
  { label: 'Weak Area Reports', path: `${base}/analytics/weak-areas` },
  { label: 'Teacher Performance', path: `${base}/analytics/teachers` },
];

export default function AnalyticsNav() {
  const base = useRoleBase();
  return <SubNav items={ANALYTICS_ITEMS(base)} />;
}
