import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Alert, Spinner } from '../../components/ui';
import { announcementsService, academicService, institutionsService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useAnnouncementBase } from './useAnnouncementBase';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone (Institution)' },
  { value: 'students', label: 'Students' },
  { value: 'parents', label: 'Parents' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'finance_manager', label: 'Finance Managers' },
];

export default function CreateAnnouncementPage() {
  const { user } = useAuth();
  const base = useAnnouncementBase();
  const navigate = useNavigate();
  const [form, setForm] = useState({ audience: 'all', target_role: 'all', priority: 'normal', is_pinned: false });
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    academicService.classes.list().then((r) => setClasses(r.data.data || []));
    academicService.sections.list().then((r) => setSections(r.data.data || []));
    if (user?.role === 'owner') {
      institutionsService.list().then((r) => setInstitutions(r.data.data || []));
    }
  }, [user?.role]);

  const filteredSections = form.target_class_id
    ? sections.filter((s) => String(s.class_id) === String(form.target_class_id))
    : sections;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim() || !form.message?.trim()) {
      setErr('Title and message are required');
      return;
    }
    setLoading(true);
    setErr('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v != null && v !== '') fd.append(k, v);
    });
    fd.set('target_role', form.target_role || form.audience);
    fd.set('audience', form.target_role || form.audience);
    fd.set('is_pinned', form.is_pinned ? 'true' : 'false');
    if (file) fd.append('attachment', file);
    try {
      const res = await announcementsService.create(fd);
      setMsg('Announcement published');
      navigate(`${base}/${res.data.data.id}`);
    } catch (error) {
      setErr(error.response?.data?.message || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Link to={base} className="text-sm text-blue-600 hover:underline">← Back to Announcements</Link>
      <h2 className="text-2xl font-bold mt-2 mb-6">Create Announcement</h2>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card>
        <form onSubmit={handleSubmit} className="max-w-2xl">
          {user?.role === 'owner' && (
            <Select label="Institution" value={form.institution_id || ''} onChange={(e) => setForm({ ...form, institution_id: e.target.value })}
              options={[{ value: '', label: 'All institutions (global)' }, ...institutions.map((i) => ({ value: i.id, label: i.name }))]} />
          )}
          <Input label="Title" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Input label="Message" value={form.message || ''} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
          <Select label="Audience (Role)" value={form.target_role || 'all'} onChange={(e) => setForm({ ...form, target_role: e.target.value, audience: e.target.value })}
            options={AUDIENCE_OPTIONS} />
          <Select label="Target Class (optional)" value={form.target_class_id || ''} onChange={(e) => setForm({ ...form, target_class_id: e.target.value, target_section_id: '' })}
            options={[{ value: '', label: 'All classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Target Section (optional)" value={form.target_section_id || ''} onChange={(e) => setForm({ ...form, target_section_id: e.target.value })}
            options={[{ value: '', label: 'All sections' }, ...filteredSections.map((s) => ({ value: s.id, label: s.name }))]} />
          <Select label="Priority" value={form.priority || 'normal'} onChange={(e) => setForm({ ...form, priority: e.target.value })}
            options={[{ value: 'normal', label: 'Normal' }, { value: 'important', label: 'Important' }, { value: 'urgent', label: 'Urgent' }]} />
          <Input label="Expiry Date (optional)" type="datetime-local" value={form.expires_at || ''} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <label className="flex items-center gap-2 mb-4 text-sm">
            <input type="checkbox" checked={!!form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} />
            Pin this notice
          </label>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (optional, max 5MB)</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? 'Publishing…' : 'Publish Announcement'}</Button>
        </form>
      </Card>
    </DashboardLayout>
  );
}
