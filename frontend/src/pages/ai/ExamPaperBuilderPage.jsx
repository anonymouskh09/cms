import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button, Input, Select, Textarea, Alert, Spinner, Badge } from '../../components/ui';
import { PageHeader, DashboardCard } from '../../components/dashboard';
import AiNav from '../../components/phase3/AiNav';
import { examPapersService, questionsService } from '../../services/authService';

const TYPE_LABELS = { mcq: 'MCQ', short: 'Short', long: 'Long', true_false: 'T/F', fill_blank: 'Fill Blank' };

function roleBase(role) {
  return { owner: '/owner', principal: '/principal', admin: '/admin', teacher: '/teacher' }[role] || '/teacher';
}

const defaultMeta = {
  title: '',
  exam_type: 'Mid Term',
  class_id: '',
  section_id: '',
  subject_id: '',
  total_marks: 100,
  duration_minutes: 120,
  paper_date: '',
  instructions: 'Read all questions carefully. Write clearly.',
  difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
  question_type_distribution: { mcq: 40, short: 35, long: 25 },
};

export default function ExamPaperBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = roleBase(user?.role);
  const isNew = !id || id === 'new';
  const [institutionId] = useState(user?.role === 'owner' ? '1' : null);
  const params = useMemo(
    () => (user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {}),
    [user?.role, institutionId]
  );

  const [meta, setMeta] = useState(defaultMeta);
  const [selected, setSelected] = useState([]);
  const [bank, setBank] = useState([]);
  const [options, setOptions] = useState({ classes: [], subjects: [], sections: [] });
  const [filters, setFilters] = useState({ question_type: '', difficulty: '', search: '' });
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const selectedMarks = useMemo(() => selected.reduce((s, q) => s + Number(q.marks || 0), 0), [selected]);
  const marksMismatch = Math.abs(selectedMarks - Number(meta.total_marks)) > 1;

  const filteredBank = useMemo(() => {
    const used = new Set(selected.map((q) => q.question_id));
    return bank.filter((q) => {
      if (used.has(q.id)) return false;
      if (filters.question_type && q.question_type !== filters.question_type) return false;
      if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        if (!`${q.question_text} ${q.topic} ${q.chapter}`.toLowerCase().includes(term)) return false;
      }
      if (meta.class_id && q.class_id && String(q.class_id) !== String(meta.class_id)) return false;
      if (meta.subject_id && q.subject_id && String(q.subject_id) !== String(meta.subject_id)) return false;
      return q.status === 'approved' || q.status === 'pending_review';
    });
  }, [bank, selected, filters, meta.class_id, meta.subject_id]);

  const loadBank = useCallback(() => {
    const qParams = { ...params, status: 'approved', class_id: meta.class_id || undefined, subject_id: meta.subject_id || undefined };
    return Promise.all([
      questionsService.list(qParams),
      questionsService.filterOptions(params),
    ]).then(([qRes, optRes]) => {
      setBank(qRes.data.data || []);
      setOptions(optRes.data.data || {});
    });
  }, [params, meta.class_id, meta.subject_id]);

  useEffect(() => {
    if (isNew) {
      loadBank();
      return;
    }
    setLoading(true);
    examPapersService.get(id, params).then((res) => {
      const p = res.data.data;
      setMeta({
        title: p.title,
        exam_type: p.exam_type || '',
        class_id: String(p.class_id || ''),
        section_id: p.section_id ? String(p.section_id) : '',
        subject_id: String(p.subject_id || ''),
        total_marks: p.total_marks,
        duration_minutes: p.duration_minutes,
        paper_date: p.paper_date ? p.paper_date.slice(0, 10) : '',
        instructions: p.instructions || '',
        difficulty_distribution: p.difficulty_distribution || defaultMeta.difficulty_distribution,
        question_type_distribution: p.question_type_distribution || defaultMeta.question_type_distribution,
      });
      setSelected((p.questions || []).map((q) => ({
        question_id: q.question_id,
        section_name: q.section_name,
        question_order: q.question_order,
        marks: q.marks,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty: q.difficulty,
        status: q.question_status,
      })));
    }).catch(() => {
      setMsg('Failed to load paper');
      setMsgType('error');
    }).finally(() => setLoading(false));
  }, [id, isNew, params]);

  useEffect(() => { if (!isNew) loadBank(); }, [loadBank, isNew]);

  const addQuestion = (q) => {
    setSelected((prev) => [...prev, {
      question_id: q.id,
      section_name: q.question_type === 'mcq' ? 'Section A — MCQ' : 'Section B — Questions',
      question_order: prev.length + 1,
      marks: q.marks,
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty: q.difficulty,
      status: q.status,
    }]);
  };

  const removeQuestion = (idx) => {
    setSelected((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, question_order: i + 1 })));
  };

  const moveQuestion = (idx, dir) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((q, i) => ({ ...q, question_order: i + 1 }));
    });
  };

  const replaceQuestion = (idx, q) => {
    setSelected((prev) => prev.map((item, i) => (i === idx ? {
      question_id: q.id,
      section_name: item.section_name,
      question_order: item.question_order,
      marks: q.marks,
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty: q.difficulty,
      status: q.status,
    } : item)));
  };

  const buildPayload = (status = 'draft') => ({
    ...meta,
    class_id: parseInt(meta.class_id, 10),
    subject_id: parseInt(meta.subject_id, 10),
    section_id: meta.section_id ? parseInt(meta.section_id, 10) : null,
    total_marks: Number(meta.total_marks),
    duration_minutes: parseInt(meta.duration_minutes, 10),
    status,
    questions: selected.map((q, i) => ({
      question_id: q.question_id,
      section_name: q.section_name,
      question_order: i + 1,
      marks: q.marks,
    })),
    ...(user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {}),
  });

  const handleSave = async (status = 'draft') => {
    if (!meta.title || !meta.class_id || !meta.subject_id) {
      setMsg('Title, class, and subject are required.');
      setMsgType('error');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const body = buildPayload(status);
      if (isNew) {
        const res = await examPapersService.create(body);
        setMsg('Paper saved as draft.');
        navigate(`${base}/ai/exam-generator/${res.data.data.id}/build`, { replace: true });
      } else {
        await examPapersService.update(id, body);
        setMsg('Paper saved.');
      }
      setMsgType('success');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Save failed');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isNew) {
      setMsg('Save the paper first.');
      setMsgType('warning');
      return;
    }
    try {
      await examPapersService.update(id, buildPayload('generated'));
      await examPapersService.publish(id, { allow_student_view: false });
      setMsg('Paper published (staff only — enable student view when ready).');
      setMsgType('success');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Publish failed');
      setMsgType('error');
    }
  };

  const handlePdf = async () => {
    if (isNew) { setMsg('Save the paper first.'); setMsgType('warning'); return; }
    try {
      const res = await examPapersService.downloadPdf(id, params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meta.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setMsg('PDF generation failed');
      setMsgType('error');
    }
  };

  if (loading) {
    return <DashboardLayout><Spinner /></DashboardLayout>;
  }

  const filteredSections = options.sections?.filter((s) => !meta.class_id || String(s.class_id) === String(meta.class_id)) || [];

  return (
    <DashboardLayout>
      <PageHeader
        title={isNew ? 'Create Exam Paper' : 'Paper Builder'}
        subtitle="Build your paper from approved questions in the bank"
        action={(
          <div className="flex flex-wrap gap-2">
            <Link to={`${base}/ai/exam-generator`}><Button variant="secondary">Back</Button></Link>
            {!isNew && (
              <Link to={`${base}/ai/marking-scheme/${id}`}><Button variant="secondary">Answer Key</Button></Link>
            )}
            <Button variant="secondary" onClick={() => handleSave('draft')} disabled={saving}>Save Draft</Button>
            <Button onClick={handlePublish} disabled={saving}>Publish</Button>
            <Button onClick={handlePdf}>Download PDF</Button>
          </div>
        )}
      />
      <AiNav />
      <Alert type={msgType} message={msg} onClose={() => setMsg('')} />

      <DashboardCard title="Paper Details" subtitle="Exam metadata and instructions" className="mb-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-4">
          <Input label="Paper Title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          <Input label="Exam Type" value={meta.exam_type} onChange={(e) => setMeta({ ...meta, exam_type: e.target.value })} />
          <Input label="Paper Date" type="date" value={meta.paper_date} onChange={(e) => setMeta({ ...meta, paper_date: e.target.value })} />
          <Select label="Class" value={meta.class_id} onChange={(e) => setMeta({ ...meta, class_id: e.target.value, section_id: '' })}
            options={[{ value: '', label: 'Select' }, ...(options.classes || []).map((c) => ({ value: String(c.id), label: c.name }))]} />
          <Select label="Section (optional)" value={meta.section_id} onChange={(e) => setMeta({ ...meta, section_id: e.target.value })}
            options={[{ value: '', label: 'All' }, ...filteredSections.map((s) => ({ value: String(s.id), label: s.name }))]} />
          <Select label="Subject" value={meta.subject_id} onChange={(e) => setMeta({ ...meta, subject_id: e.target.value })}
            options={[{ value: '', label: 'Select' }, ...(options.subjects || []).map((s) => ({ value: String(s.id), label: s.name }))]} />
          <Input label="Total Marks" type="number" value={meta.total_marks} onChange={(e) => setMeta({ ...meta, total_marks: e.target.value })} />
          <Input label="Duration (min)" type="number" value={meta.duration_minutes} onChange={(e) => setMeta({ ...meta, duration_minutes: e.target.value })} />
        </div>
        <Textarea label="Instructions" value={meta.instructions} onChange={(e) => setMeta({ ...meta, instructions: e.target.value })} rows={2} />
      </DashboardCard>

      {marksMismatch && (
        <Alert type="warning" message={`Marks total: ${selectedMarks} / ${meta.total_marks} — adjust questions or target marks.`} />
      )}

      <div className="grid xl:grid-cols-2 gap-6">
        <DashboardCard
          title="Paper Structure"
          subtitle={`${selected.length} questions · ${selectedMarks} marks`}
          action={<Badge status={marksMismatch ? 'pending' : 'approved'}>{marksMismatch ? 'Mismatch' : 'Balanced'}</Badge>}
        >
          {!selected.length ? (
            <p className="text-sm text-gray-500 py-8 text-center">Add questions from the bank on the right.</p>
          ) : (
            <div className="space-y-3">
              {selected.map((q, idx) => (
                <div key={`${q.question_id}-${idx}`} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                  <div className="flex justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-violet-700">Q{idx + 1} · {q.marks}m · {TYPE_LABELS[q.question_type]}</span>
                    <div className="flex gap-1">
                      <button type="button" className="text-xs px-2 py-0.5 rounded bg-white border" onClick={() => moveQuestion(idx, -1)}>↑</button>
                      <button type="button" className="text-xs px-2 py-0.5 rounded bg-white border" onClick={() => moveQuestion(idx, 1)}>↓</button>
                      <button type="button" className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200" onClick={() => removeQuestion(idx)}>Remove</button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">{q.question_text}</p>
                  {filteredBank.length > 0 && (
                    <select
                      className="mt-2 w-full px-2 py-1.5 text-xs border rounded-lg"
                      defaultValue=""
                      onChange={(e) => {
                        const replacement = bank.find((b) => String(b.id) === e.target.value);
                        if (replacement) replaceQuestion(idx, replacement);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Replace with…</option>
                      {filteredBank.slice(0, 20).map((b) => (
                        <option key={b.id} value={b.id}>{TYPE_LABELS[b.question_type]} — {b.question_text.slice(0, 40)}…</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Question Bank Picker" subtitle="Approved questions only">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <input placeholder="Search…" className="col-span-3 px-3 py-2 text-sm border rounded-lg" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <select className="px-2 py-2 text-sm border rounded-lg" value={filters.question_type} onChange={(e) => setFilters({ ...filters, question_type: e.target.value })}>
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="px-2 py-2 text-sm border rounded-lg" value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}>
              <option value="">All difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="max-h-[480px] overflow-y-auto space-y-2">
            {filteredBank.map((q) => (
              <div key={q.id} className="p-3 rounded-lg border border-gray-200 hover:border-violet-300 flex justify-between gap-3 items-start">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 mb-1">{TYPE_LABELS[q.question_type]} · {q.difficulty} · {q.marks}m</p>
                  <p className="text-sm text-gray-800 line-clamp-2">{q.question_text}</p>
                </div>
                <Button size="sm" onClick={() => addQuestion(q)}>Add</Button>
              </div>
            ))}
            {!filteredBank.length && <p className="text-sm text-gray-500 text-center py-6">No matching approved questions.</p>}
          </div>
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
}
