import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner, Button } from '../../components/ui';
import { MessageBubble } from '../../components/messages/MessageBubble';
import { messagesService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export default function MessageThreadPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const currentUserId = user?.user_id;
  const studentId = searchParams.get('student_id');
  const isParent = user?.role === 'parent';
  const basePath = isParent ? '/parent/messages' : '/teacher/messages';

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [reply, setReply] = useState('');
  const bottomRef = useRef(null);

  const loadThread = () => {
    const params = studentId ? { student_id: studentId } : undefined;
    return messagesService.getThread(userId, params)
      .then((res) => setMessages(res.data.data || []))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load thread'));
  };

  useEffect(() => {
    loadThread().finally(() => setLoading(false));
  }, [userId, studentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const otherName = messages.find((m) => m.sender_user_id !== currentUserId)?.sender_name
    || messages.find((m) => m.recipient_user_id !== currentUserId)?.recipient_name
    || 'Conversation';
  const studentName = messages[0]?.student_name;

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    if (!studentId) {
      setErr('Student context is required to reply.');
      return;
    }
    setSending(true);
    setErr('');
    try {
      const otherUserId = parseInt(userId, 10);
      await messagesService.send({
        recipient_user_id: otherUserId,
        student_id: parseInt(studentId, 10),
        body: reply.trim(),
        parent_message_id: messages[messages.length - 1]?.id,
      });
      setReply('');
      await loadThread();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <Link to={basePath} className="text-sm text-blue-600 hover:underline">&larr; Back to inbox</Link>
      </div>

      <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[720px] bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">{otherName}</h2>
          {studentName && <p className="text-sm text-gray-500">Student: {studentName.trim()}</p>}
        </div>

        <Alert type="error" message={err} onClose={() => setErr('')} />

        <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
          {loading ? (
            <Spinner />
          ) : !messages.length ? (
            <p className="text-center text-gray-500 py-8">No messages in this thread yet.</p>
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} message={m} currentUserId={currentUserId} />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleReply} className="border-t border-gray-200 p-4 bg-gray-50">
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] mb-3"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply..."
            disabled={!studentId}
          />
          {!studentId && (
            <p className="text-xs text-amber-600 mb-2">Open this thread from the inbox to include student context.</p>
          )}
          <Button type="submit" disabled={sending || !reply.trim()}>
            {sending ? 'Sending...' : 'Send Reply'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
