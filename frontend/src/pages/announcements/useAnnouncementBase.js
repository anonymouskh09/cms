import { useLocation } from 'react-router-dom';

export function useAnnouncementBase() {
  const { pathname } = useLocation();
  const match = pathname.match(/^(\/(?:owner|principal-portal|principal|admin|teacher|student|parent))\/announcements/);
  return match ? `${match[1]}/announcements` : '/principal/announcements';
}
