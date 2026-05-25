import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button, Input, Select, Alert, Spinner, Badge, Modal } from '../../components/ui';
import { PageHeader, DashboardCard, FilterTable } from '../../components/dashboard';
import AiNav from '../../components/phase3/AiNav';
import { examPapersService, questionsService } from '../../services/authService';

function roleBase(role) {
  return { owner: '/owner', principal: '/principal', admin: '/admin', teacher: '/teacher' }[role] || '/teacher';
}

const emptyAuto = {
  title: '',
  exam_type: 'Mid Term',
  class_id: '',
  section_id: '',
  subject_id: '',
  total_marks: 100,
  duration_minutes: 120,
  paper_date: '',
  use_ai_structure: true,
  difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
  question_type_distribution: { mcq: 40, short: 35, long: 25 },
};

export default function ExamGeneratorPage() {
  const { user } = useAuth();
  const base = roleBase(user?.role);
  const [institutionId] = useState(user?.role === 'owner' ? '1' : null);
  const params = useMemo(
    () => (user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {}),
    [user?.role, institutionId]
  );

  const [papers, setPapers] = useState([]);
  const [options, setOptions] = useState({ classes: [], subjects: [], sections: [] });
  const [autoForm, setAutoForm] = useState(emptyAuto);
  const [showAuto, setShowAuto] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      examPapersService.list(params),
      questionsService.filterOptions(params),
    ]).then(([pRes, oRes]) => {
      setPapers(pRes.data.data || []);
      setOptions(oRes.data.data || {});
    }).catch(() => {
      setMsg('Failed to load exam papers');
      setMsgType('error');
    }).finally(() => setLoading(false));
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const handleAutoGenerate = async (e) => {
    e.preventDefault();
    if (!autoForm.title || !autoForm.class_id || !autoForm.subject_id) {
      setMsg('Title, class, and subject required.');
      setMsgType('error');
      return;
    }
    setGenerating(true);
    setMsg('');
    try {
      const payload = {
        ...autoForm,
        class_id: parseInt(autoForm.class_id, 10),
        subject_id: parseInt(autoForm.subject_id, 10),
        section_id: autoForm.section_id ? parseInt(autoForm.section_id, 10) : null,
        ...(user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {}),
      };
      const res = await examPapersService.autoGenerate(payload);
      setMsg(res.data.message);
      setMsgType('success');
      setShowAuto(false);
      setAutoForm(emptyAuto);
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Auto-generate failed');
      setMsgType('error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePdf = async (row) => {
    try {
      const res = await examPapersService.downloadPdf(row.id, params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setMsg('PDF download failed');
      setMsgType('error');
    }
  };

  const filteredSections = options.sections?.filter((s) => !autoForm.class_id || String(s.class_id) === String(autoForm.class_id)) || [];

  return (
    <DashboardLayout>
      <PageHeader
        title="AI Exam Paper Generator"
        subtitle="Build exam papers from your approved question bank"
        action={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShowAuto(true)}>Auto-Generate</Button>
            <Link to={`${base}/ai/exam-generator/new/build`}><Button>Create Paper</Button></Link>
          </div>
        )}
      />
      <AiNav />
      <Alert type={msgType} message={msg} onClose={() => setMsg('')} />

      <DashboardCard title="Exam Papers" subtitle={`${papers.length} papers`}>
        {loading ? <Spinner /> : (
          <FilterTable
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'exam_type', label: 'Type' },
              { key: 'class_name', label: 'Class' },
              { key: 'subject_name', label: 'Subject' },
              { key: 'total_marks', label: 'Marks', filterable: false },
              { key: 'duration_minutes', label: 'Duration', filterable: false, render: (r) => `${r.duration_minutes} min` },
              { key: 'status', label: 'Status', filterable: false, render: (r) => <Badge status={r.status}>{r.status}</Badge> },
              {
                key: 'actions',
                label: 'Actions',
                filterable: false,
                render: (r) => (
                  <div className="flex flex-wrap gap-1.5">
                    <Link to={`${base}/ai/exam-generator/${r.id}/build`}><Button size="sm" variant="secondary">Build</Button></Link>
                    <Link to={`${base}/ai/marking-scheme/${r.id}`}><Button size="sm" variant="secondary">Answer Key</Button></Link>
                    <Button size="sm" onClick={() => handlePdf(r)}>PDF</Button>
                  </div>
                ),
              },
            ]}
            data={papers}
            emptyMessage="No exam papers yet. Create one or auto-generate from the question bank."
          />
        )}
      </DashboardCard>

      <Modal open={showAuto} onClose={() => setShowAuto(false)} title="Auto-Generate Exam Paper">
        <form onSubmit={handleAutoGenerate}>
          <Input label="Paper Title" value={autoForm.title} onChange={(e) => setAutoForm({ ...autoForm, title: e.target.value })} required />
          <Input label="Exam Type" value={autoForm.exam_type} onChange={(e) => setAutoForm({ ...autoForm, exam_type: e.target.value })} />
          <Select label="Class" value={autoForm.class_id} onChange={(e) => setAutoForm({ ...autoForm, class_id: e.target.value, section_id: '' })}
            options={[{ value: '', label: 'Select' }, ...(options.classes || []).map((c) => ({ value: String(c.id), label: c.name }))]} />
          <Select label="Section" value={autoForm.section_id} onChange={(e) => setAutoForm({ ...autoForm, section_id: e.target.value })}
            options={[{ value: '', label: 'All' }, ...filteredSections.map((s) => ({ value: String(s.id), label: s.name }))]} />
          <Select label="Subject" value={autoForm.subject_id} onChange={(e) => setAutoForm({ ...autoForm, subject_id: e.target.value })}
            options={[{ value: '', label: 'Select' }, ...(options.subjects || []).map((s) => ({ value: String(s.id), label: s.name }))]} />
          <Input label="Total Marks" type="number" value={autoForm.total_marks} onChange={(e) => setAutoForm({ ...autoForm, total_marks: e.target.value })} />
          <Input label="Duration (min)" type="number" value={autoForm.duration_minutes} onChange={(e) => setAutoForm({ ...autoForm, duration_minutes: e.target.value })} />
          <Input label="Paper Date" type="date" value={autoForm.paper_date} onChange={(e) => setAutoForm({ ...autoForm, paper_date: e.target.value })} />
          <label className="flex items-center gap-2 mb-5 text-sm text-gray-700">
            <input type="checkbox" checked={autoForm.use_ai_structure} onChange={(e) => setAutoForm({ ...autoForm, use_ai_structure: e.target.checked })} />
            Use AI for paper structure & instructions
          </label>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowAuto(false)}>Cancel</Button>
            <Button type="submit" disabled={generating}>{generating ? 'Generating…' : 'Generate'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
