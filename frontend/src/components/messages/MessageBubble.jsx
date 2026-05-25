import { Badge } from '../ui';

export function ReadBadge({ unread }) {
  if (unread > 0) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
        {unread} unread
      </span>
    );
  }
  return <Badge status="paid">Read</Badge>;
}

export function MessageBubble({ message, currentUserId }) {
  const isMine = message.sender_user_id === currentUserId;
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] sm:max-w-[70%] rounded-xl px-4 py-3 ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
        {!isMine && <p className="text-xs font-medium opacity-70 mb-1">{message.sender_name}</p>}
        {message.subject && <p className={`text-xs font-semibold mb-1 ${isMine ? 'text-blue-100' : 'text-gray-600'}`}>{message.subject}</p>}
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <p className={`text-xs mt-2 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
          {new Date(message.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
