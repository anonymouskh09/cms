import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner, EmptyState } from '../../components/ui';
import AnnouncementCard from '../../components/announcements/AnnouncementCard';
import { announcementsService } from '../../services/authService';

export default function ParentAnnouncementsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    announcementsService.list()
      .then((res) => setItems(res.data.data || []))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load announcements'))
      .finally(() => setLoading(false));
  }, []);

  const pinned = items.filter((a) => a.is_pinned);
  const rest = items.filter((a) => !a.is_pinned);
  const open = (id) => navigate(`/parent/announcements/${id}`);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Announcements</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {loading ? <Spinner /> : !items.length ? (
        <EmptyState message="No announcements for your children right now." />
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Important / Pinned</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {pinned.map((a) => (
                  <AnnouncementCard key={a.id} item={a} showRead onClick={() => open(a.id)} />
                ))}
              </div>
            </section>
          )}
          <section>
            <div className="grid md:grid-cols-2 gap-4">
              {rest.map((a) => (
                <AnnouncementCard key={a.id} item={a} showRead onClick={() => open(a.id)} />
              ))}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
