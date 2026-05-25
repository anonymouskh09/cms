import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button, Input, Select, Textarea, Alert, Spinner, Badge, Modal } from '../../components/ui';
import { PageHeader, DashboardCard, FilterTable } from '../../components/dashboard';
import AiNav from '../../components/phase3/AiNav';
import { academicService, syllabusService } from '../../services/authService';

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

function formatStatus(status) {
  if (status === 'pending_review') return 'Pending Review';
  return status?.replace(/_/g, ' ') || status;
}

const emptyForm = {
  title: '',
  description: '',
  academic_year: '2026',
  class_id: '',
  section_id: '',
  subject_id: '',
  tags: '',
};

export default function SyllabusUploadPage() {
  const { user } = useAuth();
  const [institutionId] = useState(user?.role === 'owner' ? '1' : null);
  const params = useMemo(
    () => (user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {}),
    [user?.role, institutionId]
  );

  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const filteredSections = useMemo(
    () => sections.filter((s) => !form.class_id || String(s.class_id) === String(form.class_id)),
    [sections, form.class_id]
  );

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      syllabusService.list(params),
      academicService.classes.list(),
      academicService.sections.list(),
      academicService.subjects.list(),
    ])
      .then(([syllabusRes, classRes, sectionRes, subjectRes]) => {
        setItems(syllabusRes.data.data || []);
        setClasses(classRes.data.data || []);
        setSections(sectionRes.data.data || []);
        setSubjects(subjectRes.data.data || []);
      })
      .catch(() => {
        setMsg('Failed to load syllabus library');
        setMsgType('error');
      })
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.title || !form.class_id || !form.subject_id) {
      setMsg('Title, class, and subject are required.');
      setMsgType('error');
      return;
    }
    if (!file) {
      setMsg('Please select a file.');
      setMsgType('error');
      return;
    }
    setUploading(true);
    setMsg('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== '' && value != null) fd.append(key, value);
      });
      if (user?.role === 'owner' && institutionId) fd.append('institution_id', institutionId);
      fd.append('file', file);
      const res = await syllabusService.upload(fd);
      setMsg(res.data.message || 'Syllabus uploaded.');
      setMsgType('success');
      setForm(emptyForm);
      setFile(null);
      setShowUpload(false);
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Upload failed');
      setMsgType('error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (row) => {
    try {
      const res = await syllabusService.download(row.id, params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', row.file_name || 'syllabus');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setMsg('Download failed');
      setMsgType('error');
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Archive syllabus "${row.title}"?`)) return;
    try {
      await syllabusService.remove(row.id, params);
      setMsg('Syllabus archived.');
      setMsgType('success');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Delete failed');
      setMsgType('error');
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Syllabus Upload"
        subtitle="Upload syllabus documents for AI-powered question generation"
        action={(
          <Button onClick={() => setShowUpload(true)}>
            <span className="inline-flex items-center gap-2">
              <UploadIcon />
              Upload Syllabus
            </span>
          </Button>
        )}
      />
      <AiNav />
      <Alert type={msgType} message={msg} onClose={() => setMsg('')} />

      <DashboardCard
        title="Syllabus Library"
        subtitle={`${items.length} document${items.length === 1 ? '' : 's'} on file`}
        icon={<UploadIcon />}
      >
        {loading ? <Spinner /> : (
          <FilterTable
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'class_name', label: 'Class' },
              { key: 'section_name', label: 'Section', render: (r) => r.section_name || '—' },
              { key: 'subject_name', label: 'Subject' },
              { key: 'academic_year', label: 'Year' },
              { key: 'tags', label: 'Tags', render: (r) => r.tags || '—' },
              {
                key: 'extraction_status',
                label: 'Extraction',
                filterable: false,
                render: (r) => (
                  <Badge status={r.extraction_status || 'pending'}>
                    {formatStatus(r.extraction_status || 'pending')}
                  </Badge>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                filterable: false,
                render: (r) => <Badge status={r.status}>{r.status}</Badge>,
              },
              {
                key: 'actions',
                label: 'Actions',
                filterable: false,
                render: (r) => (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleDownload(r)}>Download</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(r)}>Archive</Button>
                  </div>
                ),
              },
            ]}
            data={items}
            emptyMessage="No syllabi uploaded yet. Click Upload Syllabus to add one."
          />
        )}
      </DashboardCard>

      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Syllabus">
        <form onSubmit={handleUpload}>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <Select
            label="Class"
            value={form.class_id}
            onChange={(e) => setForm({ ...form, class_id: e.target.value, section_id: '' })}
            options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
          <Select
            label="Section (optional)"
            value={form.section_id}
            onChange={(e) => setForm({ ...form, section_id: e.target.value })}
            options={[{ value: '', label: 'All sections' }, ...filteredSections.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
          <Select
            label="Subject"
            value={form.subject_id}
            onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
            options={[{ value: '', label: 'Select subject' }, ...subjects.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
          <Input label="Academic Year" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
          <Input label="Chapter / Topic Tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} help="Comma-separated tags e.g. Algebra, Unit 3" />
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">File (PDF, DOC, DOCX, TXT — max 10 MB)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-violet-50 file:text-violet-700 file:font-medium hover:file:bg-violet-100"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
