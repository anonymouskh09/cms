import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Alert, Spinner } from '../../components/ui';
import { quizzesService } from '../../services/authService';

export default function QuizGradePage() {
  const { submissionId } = useParams();
  const [data, setData] = useState(null);
  const [grades, setGrades] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    quizzesService.submissionDetail(submissionId)
      .then((r) => {
        const d = r.data.data;
        setData(d);
        const g = {};
        d.questions.forEach((q) => {
          if (q.answer) {
            g[q.id] = {
              points_awarded: q.answer.points_awarded ?? '',
              teacher_feedback: q.answer.teacher_feedback || '',
            };
          }
        });
        setGrades(g);
      })
      .catch(() => setErr('Failed to load submission'))
      .finally(() => setLoading(false));
  }, [submissionId]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setErr('');
    try {
      await quizzesService.gradeSubmission(submissionId, {
        answers: data.questions.map((q) => ({
          question_id: q.id,
          points_awarded: parseFloat(grades[q.id]?.points_awarded) || 0,
          teacher_feedback: grades[q.id]?.teacher_feedback || null,
        })),
      });
      setMsg('Grades saved');
      const res = await quizzesService.submissionDetail(submissionId);
      setData(res.data.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  const sub = data?.submission;
  const isForm = data?.questions?.some((q) => ['short_answer', 'paragraph'].includes(q.question_type));

  return (
    <DashboardLayout>
      <Link to={sub ? `/teacher/quizzes/${sub.quiz_id}/submissions` : '/teacher/quizzes'} className="text-sm text-blue-600 hover:underline">
        ← Back to responses
      </Link>
      <h2 className="text-2xl font-bold mt-2 mb-2">Review submission</h2>
      {data?.student && (
        <p className="text-gray-600 mb-6">
          {data.student.first_name} {data.student.last_name} · Roll {data.student.roll_no || '—'}
          {sub?.score != null && ` · Score: ${sub.score}/${sub.max_score}`}
        </p>
      )}
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <div className="space-y-4 mb-6">
        {data?.questions?.map((q, idx) => {
          const ans = q.answer;
          const selected = ans?.selected_option_ids
            ? (typeof ans.selected_option_ids === 'string' ? JSON.parse(ans.selected_option_ids) : ans.selected_option_ids)
            : [];
          return (
            <Card key={q.id}>
              <p className="font-medium mb-2">{idx + 1}. {q.question_text}</p>
              <p className="text-xs text-gray-500 mb-3">{q.question_type.replace('_', ' ')} · {q.points} pts</p>

              {['multiple_choice', 'checkbox'].includes(q.question_type) && (
                <ul className="text-sm mb-3 space-y-1">
                  {(q.options || []).map((opt) => (
                    <li key={opt.id} className={selected.includes(opt.id) ? 'font-medium text-blue-700' : 'text-gray-600'}>
                      {selected.includes(opt.id) ? '✓ ' : '○ '}{opt.option_text}
                      {opt.is_correct ? ' (correct)' : ''}
                    </li>
                  ))}
                </ul>
              )}
              {ans?.answer_text && (
                <p className="text-sm bg-gray-50 p-3 rounded mb-3 whitespace-pre-wrap">{ans.answer_text}</p>
              )}
              {ans?.is_correct != null && q.question_type !== 'paragraph' && (
                <p className={`text-sm mb-2 ${ans.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                  Auto: {ans.is_correct ? 'Correct' : 'Incorrect'} ({ans.points_awarded} pts)
                </p>
              )}

              {isForm && ['short_answer', 'paragraph'].includes(q.question_type) && (
                <div className="border-t pt-3 mt-3">
                  <Input
                    label="Points awarded"
                    type="number"
                    value={grades[q.id]?.points_awarded ?? ''}
                    onChange={(e) => setGrades({ ...grades, [q.id]: { ...grades[q.id], points_awarded: e.target.value } })}
                  />
                  <Input
                    label="Feedback"
                    value={grades[q.id]?.teacher_feedback || ''}
                    onChange={(e) => setGrades({ ...grades, [q.id]: { ...grades[q.id], teacher_feedback: e.target.value } })}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {isForm && sub?.status !== 'graded' && (
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save grades'}</Button>
      )}
    </DashboardLayout>
  );
}
