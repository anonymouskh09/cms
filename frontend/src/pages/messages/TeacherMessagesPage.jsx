import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner } from '../../components/ui';
import MessageInboxList from '../../components/messages/MessageInboxList';
import { messagesService } from '../../services/authService';

export default function TeacherMessagesPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    messagesService.list()
      .then((res) => setThreads(res.data.data || []))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  const openThread = (t) => {
    const qs = t.student_id ? `?student_id=${t.student_id}` : '';
    navigate(`/teacher/messages/thread/${t.other_user_id}${qs}`);
  };

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-2">Parent Messages</h2>
      <p className="text-gray-500 mb-6">View and reply to messages from parents of your students.</p>
      <Alert type="error" message={err} onClose={() => setErr('')} />

      {loading ? (
        <Spinner />
      ) : (
        <MessageInboxList
          threads={threads}
          loading={false}
          onOpen={openThread}
          emptyMessage="No parent messages yet. Messages from parents of your assigned students will appear here."
        />
      )}
    </DashboardLayout>
  );
}
