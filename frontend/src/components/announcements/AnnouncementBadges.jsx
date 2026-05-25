import { Badge } from '../ui';

const AUDIENCE_COLORS = {
  all: 'bg-gray-100 text-gray-800',
  students: 'bg-blue-100 text-blue-800',
  parents: 'bg-purple-100 text-purple-800',
  teachers: 'bg-green-100 text-green-800',
  finance_manager: 'bg-yellow-100 text-yellow-800',
  class: 'bg-indigo-100 text-indigo-800',
};

const PRIORITY_COLORS = {
  normal: 'bg-gray-100 text-gray-700',
  important: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export function AudienceBadge({ audience, className, sectionName }) {
  const label = className
    ? `Class: ${className}${sectionName ? ` · ${sectionName}` : ''}`
    : (audience || 'all').replace('_', ' ');
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${AUDIENCE_COLORS[audience] || AUDIENCE_COLORS.all}`}>
      {label}
    </span>
  );
}

export function PriorityBadge({ priority, isPinned }) {
  return (
    <span className="inline-flex gap-1">
      {isPinned && (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Pinned</span>
      )}
      {priority && priority !== 'normal' && (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal}`}>
          {priority}
        </span>
      )}
    </span>
  );
}

export function ReadBadge({ isRead }) {
  if (isRead) return <Badge status="paid">Read</Badge>;
  return <Badge status="pending">Unread</Badge>;
}
