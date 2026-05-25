import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Alert, Spinner } from '../../components/ui';
import { DueDateBadge } from '../../components/assignments/AssignmentBadges';
import { quizzesService } from '../../services/authService';

export default function TakeQuizPage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([quizzesService.get(id), quizzesService.studentMe()])
      .then(([qRes, meRes]) => {
        const q = qRes.data.data;
        setQuiz(q);
        const found = (meRes.data.data.quizzes || []).find((x) => String(x.id) === String(id));
        if (found?.submission?.status === 'submitted' || found?.submission?.status === 'graded') {
          setSubmitted(true);
          setResult(found.submission);
        }
      })
      .catch(() => setErr('Failed to load quiz'))
      .finally(() => setLoading(false));
  }, [id]);

  const setOption = (questionId, optionId, multi) => {
    setAnswers((prev) => {
      const cur = prev[questionId]?.selected_option_ids || [];
      if (multi) {
        const ids = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
        return { ...prev, [questionId]: { ...prev[questionId], selected_option_ids: ids } };
      }
      return { ...prev, [questionId]: { selected_option_ids: [optionId] } };
    });
  };

  const setText = (questionId, text) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], answer_text: text } }));
  };

  const handleSubmit = async () => {
    if (!quiz?.questions?.length) return;
    const missing = quiz.questions.filter((q) => {
      const a = answers[q.id];
      if (['multiple_choice', 'checkbox'].includes(q.question_type)) {
        return !a?.selected_option_ids?.length;
      }
      return !a?.answer_text?.trim();
    });
    if (missing.length) {
      setErr(`Please answer all questions (${missing.length} remaining)`);
      return;
    }
    setSubmitting(true);
    setErr('');
    try {
      const payload = {
        answers: quiz.questions.map((q) => ({
          question_id: q.id,
          answer_text: answers[q.id]?.answer_text || null,
          selected_option_ids: answers[q.id]?.selected_option_ids || [],
        })),
      };
      const res = await quizzesService.submit(id, payload);
      setSubmitted(true);
      setResult(res.data.data);
      setMsg(res.data.message || 'Quiz submitted');
    } catch (e) {
      setErr(e.response?.data?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <Link to="/student/quizzes" className="text-sm text-blue-600 hover:underline">← Back to Quizzes</Link>
      <h2 className="text-2xl font-bold mt-2 mb-2">{quiz?.title}</h2>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      {quiz && (
        <Card className="mb-6">
          <DueDateBadge dueDate={quiz.due_date} />
          <p className="text-sm text-gray-500 mt-2">{quiz.subject_name} · {quiz.teacher_name}</p>
          {quiz.description && <p className="text-gray-700 mt-3">{quiz.description}</p>}
          {quiz.time_limit_minutes && (
            <p className="text-sm text-amber-700 mt-2">Time limit: {quiz.time_limit_minutes} minutes</p>
          )}
        </Card>
      )}

      {submitted ? (
        <Card title="Submission complete">
          {result?.score != null ? (
            <p className="text-xl font-semibold text-purple-700 mb-2">
              Your score: {result.score} / {result.max_score}
            </p>
          ) : (
            <p className="text-gray-700 mb-2">Your answers were submitted. Your teacher will review and grade them.</p>
          )}
          <p className="text-sm text-gray-500">Submitted: {result?.submitted_at ? new Date(result.submitted_at).toLocaleString() : '—'}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {quiz?.questions?.map((q, idx) => (
            <Card key={q.id}>
              <p className="font-medium mb-3">{idx + 1}. {q.question_text}</p>
              {q.question_type === 'multiple_choice' && (
                <div className="space-y-2">
                  {(q.options || []).map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={(answers[q.id]?.selected_option_ids || [])[0] === opt.id}
                        onChange={() => setOption(q.id, opt.id, false)}
                      />
                      <span>{opt.option_text}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.question_type === 'checkbox' && (
                <div className="space-y-2">
                  {(q.options || []).map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(answers[q.id]?.selected_option_ids || []).includes(opt.id)}
                        onChange={() => setOption(q.id, opt.id, true)}
                      />
                      <span>{opt.option_text}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.question_type === 'short_answer' && (
                <Input value={answers[q.id]?.answer_text || ''} onChange={(e) => setText(q.id, e.target.value)} placeholder="Your answer" />
              )}
              {q.question_type === 'paragraph' && (
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[120px]"
                  value={answers[q.id]?.answer_text || ''}
                  onChange={(e) => setText(q.id, e.target.value)}
                  placeholder="Write your answer here…"
                />
              )}
            </Card>
          ))}
          <Button onClick={handleSubmit} disabled={submitting} className="w-full md:w-auto">
            {submitting ? 'Submitting…' : 'Submit quiz'}
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
