import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button, Input, Select, Textarea, Alert, Spinner, Badge, Modal } from '../../components/ui';
import { PageHeader, DashboardCard, FilterTable } from '../../components/dashboard';
import AiNav from '../../components/phase3/AiNav';
import { questionsService } from '../../services/authService';

const SparkIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const TYPE_LABELS = {
  mcq: 'MCQ',
  short: 'Short Answer',
  long: 'Long Answer',
  true_false: 'True/False',
  fill_blank: 'Fill in the Blank',
};

function formatStatus(status) {
  if (status === 'pending_review') return 'Pending Review';
  return status?.replace(/_/g, ' ') || status;
}

const defaultMcqOptions = () => [
  { label: 'A', option_text: '', is_correct: true },
  { label: 'B', option_text: '', is_correct: false },
  { label: 'C', option_text: '', is_correct: false },
  { label: 'D', option_text: '', is_correct: false },
];

const emptyQuestion = {
  question_text: '',
  question_type: 'mcq',
  difficulty: 'medium',
  marks: 1,
  correct_answer: '',
  explanation: '',
  class_id: '',
  section_id: '',
  subject_id: '',
  syllabus_id: '',
  chapter: '',
  topic: '',
  options: defaultMcqOptions(),
};

const emptyAiForm = {
  syllabus_id: '',
  class_id: '',
  section_id: '',
  subject_id: '',
  topic: '',
  chapter: '',
  question_type: 'mcq',
  difficulty: 'medium',
  count: 5,
};

export default function QuestionBankPage() {
  const { user } = useAuth();
  const [institutionId] = useState(user?.role === 'owner' ? '1' : null);
  const params = useMemo(
    () => (user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {}),
    [user?.role, institutionId]
  );

  const [questions, setQuestions] = useState([]);
  const [options, setOptions] = useState({ classes: [], subjects: [], sections: [], syllabi: [] });
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [aiForm, setAiForm] = useState(emptyAiForm);

  const filteredSections = useMemo(
    () => options.sections.filter((s) => !editForm?.class_id || String(s.class_id) === String(editForm.class_id)),
    [options.sections, editForm?.class_id]
  );
  const aiSections = useMemo(
    () => options.sections.filter((s) => !aiForm.class_id || String(s.class_id) === String(aiForm.class_id)),
    [options.sections, aiForm.class_id]
  );

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      questionsService.list(params),
      questionsService.filterOptions(params),
    ])
      .then(([qRes, optRes]) => {
        setQuestions(qRes.data.data || []);
        setOptions(optRes.data.data || {});
      })
      .catch(() => {
        setMsg('Failed to load question bank');
        setMsgType('error');
      })
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditForm({ ...emptyQuestion, options: defaultMcqOptions() });
    setShowAdd(true);
  };

  const openEdit = (row) => {
    setEditForm({
      id: row.id,
      question_text: row.question_text,
      question_type: row.question_type,
      difficulty: row.difficulty,
      marks: row.marks,
      correct_answer: row.correct_answer || '',
      explanation: row.explanation || '',
      class_id: String(row.class_id || ''),
      section_id: row.section_id ? String(row.section_id) : '',
      subject_id: String(row.subject_id || ''),
      syllabus_id: row.syllabus_id ? String(row.syllabus_id) : '',
      chapter: row.chapter || '',
      topic: row.topic || '',
      options: row.options?.length ? row.options.map((o) => ({
        label: o.label,
        option_text: o.option_text,
        is_correct: Boolean(o.is_correct),
      })) : defaultMcqOptions(),
    });
    setShowAdd(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!editForm.question_text?.trim() || !editForm.class_id || !editForm.subject_id) {
      setMsg('Question text, class, and subject are required.');
      setMsgType('error');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        ...editForm,
        class_id: parseInt(editForm.class_id, 10),
        subject_id: parseInt(editForm.subject_id, 10),
        section_id: editForm.section_id ? parseInt(editForm.section_id, 10) : null,
        syllabus_id: editForm.syllabus_id ? parseInt(editForm.syllabus_id, 10) : null,
        marks: Number(editForm.marks) || 1,
        options: editForm.question_type === 'mcq' ? editForm.options : [],
        ...(user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {}),
      };
      if (editForm.id) {
        await questionsService.update(editForm.id, payload);
        setMsg('Question updated.');
      } else {
        await questionsService.create(payload);
        setMsg('Question added for review.');
      }
      setMsgType('success');
      setShowAdd(false);
      setEditForm(null);
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Save failed');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!aiForm.class_id || !aiForm.subject_id) {
      setMsg('Class and subject are required for AI generation.');
      setMsgType('error');
      return;
    }
    setGenerating(true);
    setMsg('');
    try {
      const payload = {
        ...aiForm,
        class_id: parseInt(aiForm.class_id, 10),
        subject_id: parseInt(aiForm.subject_id, 10),
        section_id: aiForm.section_id ? parseInt(aiForm.section_id, 10) : null,
        syllabus_id: aiForm.syllabus_id ? parseInt(aiForm.syllabus_id, 10) : null,
        count: parseInt(aiForm.count, 10) || 5,
        ...(user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {}),
      };
      const res = await questionsService.generateAi(payload);
      setMsg(res.data.message || 'Questions generated.');
      setMsgType('success');
      setShowAi(false);
      setAiForm(emptyAiForm);
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'AI generation failed');
      setMsgType('error');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (row) => {
    try {
      await questionsService.approve(row.id);
      setMsg('Question approved.');
      setMsgType('success');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Approve failed');
      setMsgType('error');
    }
  };

  const handleReject = async (row) => {
    try {
      await questionsService.reject(row.id);
      setMsg('Question rejected.');
      setMsgType('success');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Reject failed');
      setMsgType('error');
    }
  };

  const handleArchive = async (row) => {
    if (!window.confirm('Archive this question?')) return;
    try {
      await questionsService.remove(row.id);
      setMsg('Question archived.');
      setMsgType('success');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Archive failed');
      setMsgType('error');
    }
  };

  const updateOption = (idx, field, value) => {
    setEditForm((prev) => {
      const opts = [...prev.options];
      if (field === 'is_correct') {
        opts.forEach((o, i) => { opts[i] = { ...o, is_correct: i === idx }; });
      } else {
        opts[idx] = { ...opts[idx], [field]: value };
      }
      return { ...prev, options: opts };
    });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="AI Question Bank"
        subtitle="Generate, review and manage questions for your institution"
        action={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={openAdd}>Add Question</Button>
            <Button onClick={() => setShowAi(true)}>
              <span className="inline-flex items-center gap-2">
                <SparkIcon />
                Generate with AI
              </span>
            </Button>
          </div>
        )}
      />
      <AiNav />
      <Alert type={msgType} message={msg} onClose={() => setMsg('')} />

      <DashboardCard
        title="Question Bank"
        subtitle={`${questions.length} questions in library`}
        icon={<SparkIcon />}
      >
        {loading ? <Spinner /> : (
          <FilterTable
            columns={[
              { key: 'topic', label: 'Topic', render: (r) => r.topic || r.chapter || '—' },
              {
                key: 'question_type',
                label: 'Type',
                render: (r) => TYPE_LABELS[r.question_type] || r.question_type,
              },
              {
                key: 'difficulty',
                label: 'Difficulty',
                filterable: true,
                render: (r) => <Badge status={r.difficulty}>{r.difficulty}</Badge>,
              },
              {
                key: 'question_text',
                label: 'Question',
                render: (r) => (r.question_text?.length > 60 ? `${r.question_text.slice(0, 60)}…` : r.question_text),
              },
              { key: 'marks', label: 'Marks', filterable: false },
              {
                key: 'status',
                label: 'Status',
                filterable: true,
                filterKey: 'status',
                render: (r) => (
                  <Badge status={r.status}>{formatStatus(r.status)}</Badge>
                ),
              },
              {
                key: 'source',
                label: 'Source',
                filterable: false,
                render: (r) => (r.source === 'ai' ? 'AI' : 'Manual'),
              },
              {
                key: 'actions',
                label: 'Actions',
                filterable: false,
                render: (r) => (
                  <div className="flex flex-wrap gap-1.5">
                    {r.status === 'pending_review' && (
                      <>
                        <Button size="sm" variant="success" onClick={() => handleApprove(r)}>Approve</Button>
                        <Button size="sm" variant="danger" onClick={() => handleReject(r)}>Reject</Button>
                      </>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleArchive(r)}>Archive</Button>
                  </div>
                ),
              },
            ]}
            data={questions}
            emptyMessage="No questions yet. Add manually or generate with AI."
          />
        )}
      </DashboardCard>

      <Modal open={showAdd && !!editForm} onClose={() => { setShowAdd(false); setEditForm(null); }} title={editForm?.id ? 'Edit Question' : 'Add Question'}>
        {editForm && (
          <form onSubmit={handleSaveQuestion}>
            <Textarea label="Question" value={editForm.question_text} onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })} required />
            <Select label="Class" value={editForm.class_id} onChange={(e) => setEditForm({ ...editForm, class_id: e.target.value, section_id: '' })}
              options={[{ value: '', label: 'Select class' }, ...options.classes.map((c) => ({ value: String(c.id), label: c.name }))]} />
            <Select label="Section (optional)" value={editForm.section_id} onChange={(e) => setEditForm({ ...editForm, section_id: e.target.value })}
              options={[{ value: '', label: 'All sections' }, ...filteredSections.map((s) => ({ value: String(s.id), label: s.name }))]} />
            <Select label="Subject" value={editForm.subject_id} onChange={(e) => setEditForm({ ...editForm, subject_id: e.target.value })}
              options={[{ value: '', label: 'Select subject' }, ...options.subjects.map((s) => ({ value: String(s.id), label: s.name }))]} />
            <Select label="Question Type" value={editForm.question_type} onChange={(e) => setEditForm({ ...editForm, question_type: e.target.value })}
              options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
            <Select label="Difficulty" value={editForm.difficulty} onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
              options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} />
            <Input label="Marks" type="number" min={0.5} step={0.5} value={editForm.marks} onChange={(e) => setEditForm({ ...editForm, marks: e.target.value })} />
            <Input label="Chapter" value={editForm.chapter} onChange={(e) => setEditForm({ ...editForm, chapter: e.target.value })} />
            <Input label="Topic" value={editForm.topic} onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })} />
            <Input label="Correct Answer" value={editForm.correct_answer} onChange={(e) => setEditForm({ ...editForm, correct_answer: e.target.value })} />
            <Textarea label="Explanation" value={editForm.explanation} onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })} rows={2} />
            {editForm.question_type === 'mcq' && (
              <div className="mb-5 space-y-3">
                <p className="text-sm font-medium text-gray-700">MCQ Options</p>
                {editForm.options.map((opt, idx) => (
                  <div key={opt.label} className="flex items-center gap-2">
                    <span className="w-6 text-sm font-semibold text-violet-700">{opt.label}</span>
                    <input
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      value={opt.option_text}
                      onChange={(e) => updateOption(idx, 'option_text', e.target.value)}
                      placeholder={`Option ${opt.label}`}
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-600 shrink-0">
                      <input type="radio" name="correct" checked={opt.is_correct} onChange={() => updateOption(idx, 'is_correct', true)} />
                      Correct
                    </label>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditForm(null); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Question'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={showAi} onClose={() => setShowAi(false)} title="Generate Questions with AI">
        <form onSubmit={handleGenerate}>
          <Select label="Syllabus (optional)" value={aiForm.syllabus_id} onChange={(e) => setAiForm({ ...aiForm, syllabus_id: e.target.value })}
            options={[{ value: '', label: 'No syllabus' }, ...(options.syllabi || []).map((s) => ({
              value: String(s.id),
              label: `${s.title}${s.extraction_status === 'completed' ? ' ✓' : s.extraction_status === 'pending' ? ' (pending)' : ''}`,
            }))]} />
          <Select label="Class" value={aiForm.class_id} onChange={(e) => setAiForm({ ...aiForm, class_id: e.target.value, section_id: '' })}
            options={[{ value: '', label: 'Select class' }, ...options.classes.map((c) => ({ value: String(c.id), label: c.name }))]} />
          <Select label="Section (optional)" value={aiForm.section_id} onChange={(e) => setAiForm({ ...aiForm, section_id: e.target.value })}
            options={[{ value: '', label: 'All sections' }, ...aiSections.map((s) => ({ value: String(s.id), label: s.name }))]} />
          <Select label="Subject" value={aiForm.subject_id} onChange={(e) => setAiForm({ ...aiForm, subject_id: e.target.value })}
            options={[{ value: '', label: 'Select subject' }, ...options.subjects.map((s) => ({ value: String(s.id), label: s.name }))]} />
          <Input label="Chapter" value={aiForm.chapter} onChange={(e) => setAiForm({ ...aiForm, chapter: e.target.value })} />
          <Input label="Topic" value={aiForm.topic} onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })} />
          <Select label="Question Type" value={aiForm.question_type} onChange={(e) => setAiForm({ ...aiForm, question_type: e.target.value })}
            options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
          <Select label="Difficulty" value={aiForm.difficulty} onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })}
            options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} />
          <Input label="Number of Questions" type="number" min={1} max={20} value={aiForm.count} onChange={(e) => setAiForm({ ...aiForm, count: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAi(false)}>Cancel</Button>
            <Button type="submit" disabled={generating}>{generating ? 'Generating...' : 'Generate'}</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
