import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Alert, Spinner, Card, Select, Input, Button } from '../../components/ui';
import MessageInboxList from '../../components/messages/MessageInboxList';
import { messagesService, parentsService } from '../../services/authService';

export default function ParentMessagesPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [children, setChildren] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ student_id: '', recipient_user_id: '', subject: '', body: '' });

  const loadInbox = () => messagesService.list()
    .then((res) => setThreads(res.data.data || []))
    .catch((e) => setErr(e.response?.data?.message || 'Failed to load messages'));

  useEffect(() => {
    Promise.all([
      parentsService.getChildren(),
      messagesService.list(),
    ])
      .then(([childRes, inboxRes]) => {
        setChildren(childRes.data.data || []);
        setThreads(inboxRes.data.data || []);
      })
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load messages'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.student_id) {
      setTeachers([]);
      return;
    }
    messagesService.listTeachers(form.student_id)
      .then((res) => setTeachers(res.data.data || []))
      .catch((e) => setErr(e.response?.data?.message || 'Failed to load teachers'));
  }, [form.student_id]);

  const openThread = (t) => {
    const qs = t.student_id ? `?student_id=${t.student_id}` : '';
    navigate(`/parent/messages/thread/${t.other_user_id}${qs}`);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.recipient_user_id || !form.body.trim()) {
      setErr('Please select a child, teacher, and enter a message.');
      return;
    }
    setSending(true);
    setErr('');
    setSuccess('');
    try {
      await messagesService.send({
        student_id: parseInt(form.student_id, 10),
        recipient_user_id: parseInt(form.recipient_user_id, 10),
        subject: form.subject || undefined,
        body: form.body.trim(),
      });
      setSuccess('Message sent successfully.');
      setForm((f) => ({ ...f, subject: '', body: '' }));
      await loadInbox();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const childOptions = [{ value: '', label: 'Select child' }, ...children.map((c) => ({
    value: String(c.id),
    label: `${c.first_name} ${c.last_name || ''}`.trim(),
  }))];

  const teacherOptions = [{ value: '', label: teachers.length ? 'Select teacher' : 'No teachers available' }, ...teachers.map((t) => ({
    value: String(t.user_id),
    label: `${t.teacher_name} (${t.role_type === 'class_teacher' ? 'Class Teacher' : t.subject_name || 'Subject Teacher'})`,
  }))];

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Messages</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? <Spinner /> : (
        <div className="space-y-6">
          <Card title="New Message">
            <form onSubmit={handleSend}>
              <Select
                label="Child"
                options={childOptions}
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value, recipient_user_id: '' })}
              />
              <Select
                label="Teacher"
                options={teacherOptions}
                value={form.recipient_user_id}
                onChange={(e) => setForm({ ...form, recipient_user_id: e.target.value })}
                disabled={!form.student_id}
              />
              <Input
                label="Subject (optional)"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Homework question"
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[100px]"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Type your message..."
                  required
                />
              </div>
              <Button type="submit" disabled={sending}>{sending ? 'Sending...' : 'Send Message'}</Button>
            </form>
          </Card>

          <section>
            <h3 className="text-lg font-semibold mb-3">Inbox</h3>
            {!threads.length && !loading ? (
              <MessageInboxList threads={[]} loading={false} emptyMessage="No conversations yet. Send a message to your child's teacher." />
            ) : (
              <MessageInboxList threads={threads} loading={false} onOpen={openThread} />
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
