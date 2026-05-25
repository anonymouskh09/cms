import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Alert, Spinner } from '../../components/ui';
import { AudienceBadge, PriorityBadge, ReadBadge } from '../../components/announcements/AnnouncementBadges';
import { announcementsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useAnnouncementBase } from './useAnnouncementBase';

export default function AnnouncementDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = useAnnouncementBase();
  const navigate = useNavigate();
  const canManage = ['owner', 'principal', 'admin', 'teacher'].includes(user?.role);
  const [item, setItem] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    announcementsService.get(id)
      .then((res) => {
        setItem(res.data.data);
        if (!canManage) announcementsService.markRead(id).catch(() => {});
      })
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load announcement'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handlePin = async (pin) => {
    try {
      await (pin ? announcementsService.pin(id) : announcementsService.unpin(id));
      setMsg(pin ? 'Pinned' : 'Unpinned');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await announcementsService.remove(id);
      navigate(base);
    } catch (e) {
      setErr(e.response?.data?.message || 'Delete failed');
    }
  };

  const handleMarkRead = async () => {
    try {
      await announcementsService.markRead(id);
      setMsg('Marked as read');
      load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed');
    }
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <Link to={base} className="text-sm text-blue-600 hover:underline">← Back</Link>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      {item && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <h2 className="text-2xl font-bold">{item.title}</h2>
            <div className="flex flex-wrap gap-2">
              <PriorityBadge priority={item.priority} isPinned={item.is_pinned} />
              <AudienceBadge audience={item.target_role || item.audience} className={item.target_class_name} sectionName={item.target_section_name} />
              {!canManage && <ReadBadge isRead={!!item.is_read} />}
            </div>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap mb-6">{item.message}</p>
          <div className="text-sm text-gray-500 space-y-1 mb-6">
            {item.institution_name && <p>Institution: {item.institution_name}</p>}
            <p>Posted by {item.created_by_name || 'Staff'} · {new Date(item.created_at).toLocaleString()}</p>
            {item.expires_at && <p>Expires: {new Date(item.expires_at).toLocaleString()}</p>}
          </div>
          {item.attachment_url && (
            <a href={item.attachment_url} target="_blank" rel="noreferrer" className="text-blue-600 text-sm font-medium">
              Download attachment →
            </a>
          )}
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
            {canManage && (
              <>
                <Button variant="secondary" onClick={() => handlePin(!item.is_pinned)}>
                  {item.is_pinned ? 'Unpin' : 'Pin'}
                </Button>
                {['owner', 'principal', 'admin'].includes(user?.role) && (
                  <Button variant="danger" onClick={handleDelete}>Delete</Button>
                )}
              </>
            )}
            {!canManage && !item.is_read && (
              <Button variant="secondary" onClick={handleMarkRead}>Mark as Read</Button>
            )}
          </div>
        </Card>
      )}
    </DashboardLayout>
  );
}
