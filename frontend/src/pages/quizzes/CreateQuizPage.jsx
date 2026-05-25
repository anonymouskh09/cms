import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Select, Alert, Spinner } from '../../components/ui';
import { quizzesService, teachersService } from '../../services/authService';
import { buildTeacherAssignmentOptions } from '../../utils/teacherAssignmentOptions';

const emptyMcqQuestion = () => ({
  question_text: '',
  options: [
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ],
  points: 1,
});

const emptyFormQuestion = () => ({
  question_text: '',
  question_type: 'multiple_choice',
  options: [{ option_text: '' }, { option_text: '' }],
  points: 1,
});

export default function CreateQuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [assignOpts, setAssignOpts] = useState(null);
  const [meta, setMeta] = useState({ quiz_type: 'mcq', shuffle_questions: false });
  const [publishForStudents, setPublishForStudents] = useState(true);
  const [questions, setQuestions] = useState([emptyMcqQuestion()]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(isEdit);

  useEffect(() => {
    const loadAssignments = teachersService.me()
      .then((res) => {
        const assignments = res.data.data?.assignments || [];
        const opts = buildTeacherAssignmentOptions(assignments);
        setAssignOpts(opts);
        if (!assignments.length) {
          setErr('No class/subject assigned to you. Principal must assign subjects in Teachers → Assign Subjects, or run demo seed.');
        } else if (!isEdit && opts.classes.length === 1) {
          const c = opts.classes[0];
          const secs = opts.sectionsForClass(c.id);
          const subj = opts.subjectsForClassSection(c.id, secs[0]?.id ?? '');
          setMeta((m) => ({
            ...m,
            class_id: String(c.id),
            section_id: secs.length === 1 ? String(secs[0].id ?? '') : '',
            subject_id: subj.length === 1 ? String(subj[0].id) : '',
          }));
        }
      })
      .catch(() => setErr('Could not load your assigned classes'));

    if (isEdit) {
      Promise.all([loadAssignments, quizzesService.get(id)])
        .then(([, qRes]) => {
          const q = qRes.data.data;
          setMeta({
            title: q.title,
            description: q.description || '',
            class_id: String(q.class_id),
            section_id: q.section_id ? String(q.section_id) : '',
            subject_id: String(q.subject_id),
            due_date: String(q.due_date).slice(0, 16),
            time_limit_minutes: q.time_limit_minutes || '',
            quiz_type: q.quiz_type,
            shuffle_questions: !!q.shuffle_questions,
          });
          setQuestions(q.questions.map((qu) => ({
            question_text: qu.question_text,
            question_type: qu.question_type,
            points: qu.points,
            options: (qu.options || []).map((o) => ({
              option_text: o.option_text,
              is_correct: !!o.is_correct,
            })),
          })));
        })
        .catch(() => setErr('Failed to load quiz'))
        .finally(() => setInitLoading(false));
    } else {
      loadAssignments.finally(() => setInitLoading(false));
    }
  }, [id, isEdit]);

  const classes = assignOpts?.classes || [];
  const filteredSections = useMemo(
    () => assignOpts?.sectionsForClass(meta.class_id) || [],
    [assignOpts, meta.class_id]
  );
  const filteredSubjects = useMemo(
    () => assignOpts?.subjectsForClassSection(meta.class_id, meta.section_id) || [],
    [assignOpts, meta.class_id, meta.section_id]
  );
  const isMcq = meta.quiz_type === 'mcq';

  const setQuizType = (type) => {
    setMeta({ ...meta, quiz_type: type });
    setQuestions(type === 'mcq' ? [emptyMcqQuestion()] : [emptyFormQuestion()]);
  };

  const addQuestion = () => {
    setQuestions([...questions, isMcq ? emptyMcqQuestion() : emptyFormQuestion()]);
  };

  const updateQuestion = (idx, patch) => {
    const next = [...questions];
    next[idx] = { ...next[idx], ...patch };
    setQuestions(next);
  };

  const setMcqCorrect = (qIdx, oIdx) => {
    const next = [...questions];
    next[qIdx].options = next[qIdx].options.map((o, i) => ({ ...o, is_correct: i === oIdx }));
    setQuestions(next);
  };

  const handleSave = async () => {
    if (!meta.title || !meta.class_id || !meta.subject_id || !meta.due_date) {
      setErr('Title, class, subject and due date are required');
      return;
    }
    if (!questions.length || questions.some((q) => !q.question_text?.trim())) {
      setErr('Each question needs text');
      return;
    }
    if (!assignOpts?.isValidCombo(meta.class_id, meta.section_id, meta.subject_id)) {
      setErr('Select a class and subject from your assigned list (see My Subjects in menu).');
      return;
    }
    setLoading(true);
    setErr('');
    try {
      const payload = {
        ...meta,
        section_id: meta.section_id || null,
        questions: questions.map((q, i) => ({
          question_text: q.question_text,
          question_type: isMcq ? 'multiple_choice' : q.question_type,
          points: q.points || 1,
          sort_order: i,
          options: ['multiple_choice', 'checkbox'].includes(isMcq ? 'multiple_choice' : q.question_type)
            ? q.options.filter((o) => o.option_text?.trim())
            : [],
        })),
      };
      if (isEdit) {
        await quizzesService.update(id, payload);
        setMsg('Quiz updated');
      } else {
        const res = await quizzesService.create(payload);
        const newId = res.data.data?.id;
        if (publishForStudents && newId) {
          await quizzesService.publish(newId);
          setMsg('Quiz created and published — students in this class can see it now');
        } else {
          setMsg('Quiz saved as draft — click Publish on quizzes list so students can see it');
        }
      }
      setTimeout(() => navigate('/teacher/quizzes'), 800);
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <Link to="/teacher/quizzes" className="text-sm text-blue-600 hover:underline">← Back to Quizzes</Link>
      <h2 className="text-2xl font-bold mt-2 mb-6">{isEdit ? 'Edit Quiz' : 'Create Quiz'}</h2>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <Card className="mb-6">
        <h3 className="font-semibold mb-4">Quiz type</h3>
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            type="button"
            onClick={() => setQuizType('mcq')}
            className={`px-4 py-3 rounded-lg border text-left max-w-xs ${isMcq ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
          >
            <span className="font-medium block">MCQ Quiz</span>
            <span className="text-xs text-gray-500">Multiple choice only — auto marked on submit</span>
          </button>
          <button
            type="button"
            onClick={() => setQuizType('form')}
            className={`px-4 py-3 rounded-lg border text-left max-w-xs ${!isMcq ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
          >
            <span className="font-medium block">Form Quiz</span>
            <span className="text-xs text-gray-500">Like Google Classroom — MCQ, checkbox, short & long answer</span>
          </button>
        </div>

        <Input label="Title" value={meta.title || ''} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
        <Input label="Description" value={meta.description || ''} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
        {!classes.length && (
          <p className="text-sm text-amber-700 mb-4">
            No assignments found. Open <Link to="/teacher/classes" className="underline font-medium">My Subjects</Link> or ask the principal to assign you.
          </p>
        )}
        <Select label="Class (your assigned classes only)" value={meta.class_id || ''} onChange={(e) => setMeta({ ...meta, class_id: e.target.value, section_id: '', subject_id: '' })}
          options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
        <Select label="Section" value={meta.section_id ?? ''} onChange={(e) => setMeta({ ...meta, section_id: e.target.value, subject_id: '' })}
          options={filteredSections.length
            ? filteredSections.map((s) => ({ value: s.id === '' ? '' : String(s.id), label: s.name }))
            : [{ value: '', label: meta.class_id ? 'All sections' : 'Select class first' }]} />
        <Select label="Subject (must match your assignment)" value={meta.subject_id || ''} onChange={(e) => setMeta({ ...meta, subject_id: e.target.value })}
          options={[{ value: '', label: meta.class_id ? 'Select subject' : 'Select class first' }, ...filteredSubjects.map((s) => ({ value: s.id, label: s.name }))]} />
        <Input label="Due Date & Time" type="datetime-local" value={meta.due_date || ''} onChange={(e) => setMeta({ ...meta, due_date: e.target.value })} />
        <Input label="Time limit (minutes, optional)" type="number" value={meta.time_limit_minutes || ''} onChange={(e) => setMeta({ ...meta, time_limit_minutes: e.target.value })} />
        <label className="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" checked={!!meta.shuffle_questions} onChange={(e) => setMeta({ ...meta, shuffle_questions: e.target.checked })} />
          Shuffle question order for students
        </label>
      </Card>

      <div className="space-y-4 mb-6">
        {questions.map((q, qIdx) => (
          <Card key={qIdx}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Question {qIdx + 1}</h3>
              {questions.length > 1 && (
                <Button variant="danger" onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))}>Remove</Button>
              )}
            </div>
            <Input label="Question" value={q.question_text} onChange={(e) => updateQuestion(qIdx, { question_text: e.target.value })} />
            <Input label="Points" type="number" value={q.points ?? 1} onChange={(e) => updateQuestion(qIdx, { points: e.target.value })} />

            {!isMcq && (
              <Select label="Question type" value={q.question_type} onChange={(e) => {
                const type = e.target.value;
                const patch = { question_type: type };
                if (['multiple_choice', 'checkbox'].includes(type) && !q.options?.length) {
                  patch.options = [{ option_text: '' }, { option_text: '' }];
                }
                updateQuestion(qIdx, patch);
              }}
                options={[
                  { value: 'multiple_choice', label: 'Multiple choice (one answer)' },
                  { value: 'checkbox', label: 'Checkboxes (multiple answers)' },
                  { value: 'short_answer', label: 'Short answer' },
                  { value: 'paragraph', label: 'Paragraph (long answer)' },
                ]} />
            )}

            {(isMcq || ['multiple_choice', 'checkbox'].includes(q.question_type)) && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {isMcq || q.question_type === 'multiple_choice' ? 'Options (select correct answer)' : 'Options (check all correct answers)'}
                </p>
                {(q.options || []).map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    {isMcq || q.question_type === 'multiple_choice' ? (
                      <input type="radio" name={`correct-${qIdx}`} checked={!!opt.is_correct} onChange={() => setMcqCorrect(qIdx, oIdx)} />
                    ) : (
                      <input type="checkbox" checked={!!opt.is_correct} onChange={(e) => {
                        const opts = [...q.options];
                        opts[oIdx] = { ...opts[oIdx], is_correct: e.target.checked };
                        updateQuestion(qIdx, { options: opts });
                      }} />
                    )}
                    <input
                      className="flex-1 border rounded px-3 py-2 text-sm"
                      placeholder={`Option ${oIdx + 1}`}
                      value={opt.option_text}
                      onChange={(e) => {
                        const opts = [...q.options];
                        opts[oIdx] = { ...opts[oIdx], option_text: e.target.value };
                        updateQuestion(qIdx, { options: opts });
                      }}
                    />
                  </div>
                ))}
                <Button variant="secondary" onClick={() => updateQuestion(qIdx, { options: [...(q.options || []), { option_text: '', is_correct: false }] })}>
                  + Add option
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {!isEdit && (
        <label className="flex items-center gap-2 text-sm mb-4 p-3 bg-green-50 border border-green-100 rounded-lg">
          <input type="checkbox" checked={publishForStudents} onChange={(e) => setPublishForStudents(e.target.checked)} />
          <span>Publish immediately so students in this class/section can see and submit the quiz</span>
        </label>
      )}
      <div className="flex gap-2 mb-8">
        <Button variant="secondary" onClick={addQuestion}>+ Add question</Button>
        <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving…' : 'Save Quiz'}</Button>
      </div>
    </DashboardLayout>
  );
}
