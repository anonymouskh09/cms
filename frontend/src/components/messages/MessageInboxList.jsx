import { ReadBadge } from './MessageBubble';

export default function MessageInboxList({ threads, loading, onOpen, emptyMessage }) {
  if (loading) return null;

  if (!threads.length) {
    return (
      <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-xl">
        {emptyMessage || 'No messages yet.'}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
      {threads.map((t) => {
        const key = `${t.other_user_id}-${t.student_id || 'none'}`;
        const unread = Number(t.unread_count) || 0;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(t)}
            className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors flex items-start gap-3"
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${unread ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
              {(t.other_user_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className={`font-medium truncate ${unread ? 'text-gray-900' : 'text-gray-700'}`}>
                  {t.other_user_name || 'Unknown'}
                </p>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </div>
              {t.student_name && (
                <p className="text-xs text-gray-500 mb-1">Re: {t.student_name.trim()}</p>
              )}
              {t.subject && <p className="text-xs font-medium text-gray-600 truncate">{t.subject}</p>}
              <p className="text-sm text-gray-500 truncate">{t.body}</p>
            </div>
            <div className="flex-shrink-0 pt-1">
              <ReadBadge unread={unread} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
