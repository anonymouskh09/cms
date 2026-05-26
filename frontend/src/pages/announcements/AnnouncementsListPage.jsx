import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Button, Alert, Spinner, EmptyState } from '../../components/ui';
import AnnouncementCard from '../../components/announcements/AnnouncementCard';
import { announcementsService } from '../../services/authService';
import { useAnnouncementBase } from './useAnnouncementBase';

export default function AnnouncementsListPage({ readOnly = false, showBanner = false }) {
  const base = useAnnouncementBase();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    announcementsService.list({ manage: 'true' })
      .then((res) => setItems(res.data.data || []))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load announcements'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const pinned = items.filter((a) => a.is_pinned);
  const rest = items.filter((a) => !a.is_pinned);

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Announcements</h2>
        {!readOnly && <Link to={`${base}/create`}><Button>Create Announcement</Button></Link>}
      </div>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : !items.length ? (
        <EmptyState message="No announcements yet." />
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Pinned</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {pinned.map((a) => <AnnouncementCard key={a.id} item={a} to={`${base}/${a.id}`} />)}
              </div>
            </section>
          )}
          <section>
            {pinned.length > 0 && <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">All Notices</h3>}
            <div className="grid md:grid-cols-2 gap-4">
              {rest.map((a) => <AnnouncementCard key={a.id} item={a} to={`${base}/${a.id}`} />)}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
