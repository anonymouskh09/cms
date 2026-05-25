import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Select, Button, Alert, Spinner } from '../../components/ui';
import { PageHeader, DashboardCard } from '../../components/dashboard';
import SmsNav, { SmsPlaceholderBanner } from '../../components/sms/SmsNav';
import { smsService } from '../../services/authService';

const SAMPLE_RECIPIENTS = [
  { name: 'Ahmed Khan (Parent)', phone: '03001234567', student: 'Ali Khan', amount: '5,000', due: '2026-06-01' },
  { name: 'Sara Ali (Parent)', phone: '03007654321', student: 'Hina Ali', amount: '4,500', due: '2026-06-05' },
  { name: 'Imran Shah (Parent)', phone: '03009876543', student: 'Omar Shah', amount: '6,200', due: '2026-05-28' },
];

export default function SmsCampaignPage({ title, description, templateType, defaultTemplateType }) {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    smsService.templates({ type: templateType || defaultTemplateType })
      .then((res) => {
        const list = res.data.data || [];
        setTemplates(list);
        if (list.length) setTemplateId(String(list[0].id));
      })
      .finally(() => setLoading(false));
  }, [templateType, defaultTemplateType]);

  const selected = templates.find((t) => String(t.id) === templateId);

  const handleSend = async () => {
    setSending(true);
    setMsg('');
    try {
      const res = await smsService.testPlaceholder();
      setMsg(res.data.message);
    } catch {
      setMsg('SMS integration is not active yet. This is a Phase 2 UI placeholder.');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title={title} subtitle={description} pill="UI Only" />
      <SmsPlaceholderBanner />
      <SmsNav />
      <Alert type="warning" message={msg} onClose={() => setMsg('')} />

      {loading ? <Spinner /> : (
        <div className="grid lg:grid-cols-2 gap-6">
          <DashboardCard title="Campaign Setup" subtitle="Select template and preview message">
            <Select
              label="SMS Template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              options={templates.map((t) => ({ value: String(t.id), label: t.template_name }))}
            />
            {selected && (
              <div className="mb-5 p-4 bg-violet-50/50 rounded-xl border border-violet-100 text-sm text-gray-700 whitespace-pre-wrap">
                {selected.message_body}
              </div>
            )}
            <p className="text-xs text-gray-500 mb-5">
              {SAMPLE_RECIPIENTS.length} recipients would receive this message when SMS is enabled.
            </p>
            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={sending}>
                {sending ? 'Checking...' : 'Send Campaign (Placeholder)'}
              </Button>
            </div>
          </DashboardCard>

          <DashboardCard title="Recipient Preview" subtitle="Sample parent recipients">
            <ul className="divide-y divide-gray-100">
              {SAMPLE_RECIPIENTS.map((r) => (
                <li key={r.phone} className="py-4">
                  <p className="font-medium text-gray-900">{r.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{r.phone} · {r.student}</p>
                  {r.amount && <p className="text-xs text-violet-600 mt-1">Rs. {r.amount} due {r.due}</p>}
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>
      )}
    </DashboardLayout>
  );
}

export function SmsFeeReminderPage() {
  return (
    <SmsCampaignPage
      title="Fee Reminder SMS"
      description="Send fee reminder messages to parents of defaulter students"
      templateType="fee_reminder"
    />
  );
}

export function SmsAttendanceAlertPage() {
  return (
    <SmsCampaignPage
      title="Attendance Alert SMS"
      description="Notify parents when students are marked absent"
      templateType="attendance_absent"
    />
  );
}

export function SmsExamNoticePage() {
  return (
    <SmsCampaignPage
      title="Exam Notice SMS"
      description="Send exam schedule and notice messages to parents"
      defaultTemplateType="exam_notice"
    />
  );
}
