import AnnouncementsListPage from '../announcements/AnnouncementsListPage';
import { useMonitoring } from '../monitoring/MonitoringContext';

/** Reuses announcements list; routing base detected via pathname. */
export default function PrincipalPortalAnnouncementsPage() {
  const { readOnly, showBanner } = useMonitoring();
  return <AnnouncementsListPage readOnly={readOnly} showBanner={showBanner} />;
}
