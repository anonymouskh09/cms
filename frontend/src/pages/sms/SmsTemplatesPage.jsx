import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button, Input, Select, Alert, Spinner, Badge, Textarea } from '../../components/ui';
import { PageHeader, DashboardCard, FilterTable } from '../../components/dashboard';
import SmsNav, { SmsPlaceholderBanner } from '../../components/sms/SmsNav';
import { smsService } from '../../services/authService';

const TEMPLATE_TYPES = [
  { value: 'attendance_absent', label: 'Attendance Absent Alert' },
  { value: 'fee_reminder', label: 'Fee Reminder' },
  { value: 'fee_overdue', label: 'Fee Overdue Reminder' },
  { value: 'general', label: 'General Announcement' },
  { value: 'exam_notice', label: 'Exam Notice' },
  { value: 'result_published', label: 'Result Published Notice' },
  { value: 'exam_schedule', label: 'Exam Schedule Notice' },
];

const VARIABLE_NAMES = ['student_name', 'parent_name', 'fee_amount', 'due_date', 'institution_name', 'exam_name', 'exam_date', 'date', 'message'];
const EMPTY_FORM = { template_name: '', template_type: 'fee_reminder', message_body: '', status: 'active' };

function extractVariables(body) {
  return VARIABLE_NAMES.filter((v) => body.includes(`{${v}}`));
}

export default function SmsTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    smsService.templates().then((res) => setTemplates(res.data.data || [])).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!form.template_name || !form.message_body) {
      setMsg('Template name and message body are required.');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const payload = { ...form, variables: extractVariables(form.message_body) };
      const res = editId ? await smsService.updateTemplate(editId, payload) : await smsService.createTemplate(payload);
      setMsg(res.data.message || 'Template saved (placeholder)');
      if (editId) setTemplates((prev) => prev.map((t) => (t.id === editId ? res.data.data : t)));
      else setTemplates((prev) => [...prev, res.data.data]);
      setForm(EMPTY_FORM);
      setEditId(null);
    } catch (e) {
      setMsg(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (t) => {
    setEditId(t.id);
    setForm({ template_name: t.template_name, template_type: t.template_type, message_body: t.message_body, status: t.status || 'active' });
  };

  return (
    <DashboardLayout>
      <PageHeader title="SMS Templates" subtitle="Manage message templates with variable placeholders" pill="UI Only" />
      <SmsPlaceholderBanner />
      <SmsNav />
      <Alert type="warning" message={msg} onClose={() => setMsg('')} />

      {loading ? <Spinner /> : (
        <div className="grid xl:grid-cols-5 gap-6">
          <DashboardCard className="xl:col-span-3" title="All Templates" subtitle={`${templates.length} templates`}>
            <FilterTable
              columns={[
                { key: 'template_name', label: 'Name' },
                { key: 'template_type', label: 'Type', render: (r) => r.template_type.replace(/_/g, ' ') },
                { key: 'message_body', label: 'Preview', render: (r) => <span className="text-xs text-gray-600 line-clamp-2">{r.message_body}</span> },
                { key: 'status', label: 'Status', filterable: false, render: (r) => <Badge status={r.status === 'active' ? 'active' : 'inactive'}>{r.status}</Badge> },
                { key: 'actions', label: 'Actions', filterable: false, render: (r) => <Button variant="secondary" size="sm" onClick={() => startEdit(r)}>Edit</Button> },
              ]}
              data={templates}
            />
          </DashboardCard>

          <DashboardCard className="xl:col-span-2" title={editId ? 'Edit Template' : 'Create Template'} subtitle="Define message content and variables">
            <Input label="Template Name" value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })} />
            <Select label="Template Type" value={form.template_type} onChange={(e) => setForm({ ...form, template_type: e.target.value })} options={TEMPLATE_TYPES} />
            <Textarea label="Message Body" value={form.message_body} onChange={(e) => setForm({ ...form, message_body: e.target.value })} placeholder="Dear {parent_name}, ..." help={`Variables: ${VARIABLE_NAMES.map((v) => `{${v}}`).join(', ')}`} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            <div className="flex gap-2 justify-end pt-2">
              {editId && <Button variant="secondary" onClick={() => { setEditId(null); setForm(EMPTY_FORM); }}>Cancel</Button>}
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Save Template'}</Button>
            </div>
          </DashboardCard>
        </div>
      )}
    </DashboardLayout>
  );
}
