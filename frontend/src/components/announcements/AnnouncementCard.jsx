import { Link } from 'react-router-dom';
import { Card } from '../ui';
import { AudienceBadge, PriorityBadge, ReadBadge } from './AnnouncementBadges';

export default function AnnouncementCard({ item, to, onClick, showRead = false }) {
  const audience = item.target_role || item.audience;
  const inner = (
    <Card className={`transition-shadow hover:shadow-md ${!item.is_read && showRead ? 'border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900">{item.title}</h3>
        <PriorityBadge priority={item.priority} isPinned={item.is_pinned} />
      </div>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.message}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <AudienceBadge audience={audience} className={item.target_class_name} sectionName={item.target_section_name} />
        {item.institution_name && <span>{item.institution_name}</span>}
        {item.expires_at && (
          <span>Expires: {new Date(item.expires_at).toLocaleDateString()}</span>
        )}
        <span>{new Date(item.created_at).toLocaleDateString()}</span>
        {showRead && <ReadBadge isRead={!!item.is_read} />}
      </div>
    </Card>
  );

  if (to) return <Link to={to} className="block">{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="block w-full text-left">{inner}</button>;
  return inner;
}
