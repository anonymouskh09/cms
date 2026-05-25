import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button, Input, Textarea, Alert, Spinner, Badge } from '../../components/ui';
import { PageHeader, DashboardCard } from '../../components/dashboard';
import AiNav from '../../components/phase3/AiNav';
import { examPapersService } from '../../services/authService';

function roleBase(role) {
  return { owner: '/owner', principal: '/principal', admin: '/admin', teacher: '/teacher' }[role] || '/teacher';
}

export default function MarkingSchemePage() {
  const { paperId } = useParams();
  const { user } = useAuth();
  const base = roleBase(user?.role);
  const [institutionId] = useState(user?.role === 'owner' ? '1' : null);
  const params = useMemo(
    () => (user?.role === 'owner' && institutionId ? { institution_id: institutionId } : {}),
    [user?.role, institutionId]
  );

  const [papers, setPapers] = useState([]);
  const [selectedId, setSelectedId] = useState(paperId || '');
  const [answerKey, setAnswerKey] = useState(null);
  const [markingScheme, setMarkingScheme] = useState(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [versions, setVersions] = useState([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadPapers = useCallback(() => examPapersService.list(params).then((res) => {
    setPapers(res.data.data || []);
  }), [params]);

  const loadAnswerKey = useCallback((id) => {
    if (!id) return Promise.resolve();
    setLoading(true);
    return examPapersService.getAnswerKey(id, params).then((res) => {
      setAnswerKey(res.data.data.answer_key);
      setMarkingScheme(res.data.data.marking_scheme);
      setAiGenerated(res.data.data.answer_key_ai_generated || res.data.data.marking_scheme_ai_generated);
      setVersions(res.data.data.versions || []);
    }).catch(() => {
      setMsg('Failed to load answer key');
      setMsgType('error');
    }).finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    loadPapers().then(() => {
      if (paperId) {
        setSelectedId(paperId);
        loadAnswerKey(paperId);
      } else {
        setLoading(false);
      }
    });
  }, [paperId, loadPapers, loadAnswerKey]);

  const handleSelectPaper = (id) => {
    setSelectedId(id);
    loadAnswerKey(id);
  };

  const updateItem = (idx, field, value) => {
    setAnswerKey((prev) => {
      const items = [...(prev?.items || [])];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setMsg('');
    try {
      await examPapersService.updateAnswerKey(selectedId, { answer_key: answerKey, marking_scheme: markingScheme });
      setAiGenerated(false);
      setMsg('Answer key and marking scheme saved.');
      setMsgType('success');
      await loadAnswerKey(selectedId);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Save failed');
      setMsgType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    setMsg('');
    try {
      const res = await examPapersService.aiGenerateAnswerKey(selectedId, params);
      setAnswerKey(res.data.data.answer_key);
      setMarkingScheme(res.data.data.marking_scheme);
      setAiGenerated(true);
      setMsg(res.data.message);
      setMsgType('success');
    } catch (err) {
      setMsg(err.response?.data?.message || 'AI generation failed');
      setMsgType('error');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = async (type) => {
    if (!selectedId) return;
    try {
      const fn = type === 'marking_scheme' ? examPapersService.downloadMarkingSchemePdf : examPapersService.downloadAnswerKeyPdf;
      const res = await fn(selectedId, params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'marking_scheme' ? 'marking_scheme.pdf' : 'answer_key.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setMsg('PDF download failed');
      setMsgType('error');
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Answer Key & Marking Scheme"
        subtitle="Generate, edit and download answer keys for exam papers"
        action={selectedId ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleAiGenerate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate with AI'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            <Button variant="secondary" onClick={() => downloadPdf('answer_key')}>Answer Key PDF</Button>
            <Button variant="secondary" onClick={() => downloadPdf('marking_scheme')}>Marking Scheme PDF</Button>
          </div>
        ) : null}
      />
      <AiNav />
      <Alert type={msgType} message={msg} onClose={() => setMsg('')} />

      <DashboardCard title="Select Exam Paper" subtitle="Choose a paper to edit its answer key" className="mb-6">
        <select
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
          value={selectedId}
          onChange={(e) => handleSelectPaper(e.target.value)}
        >
          <option value="">Select exam paper…</option>
          {papers.map((p) => (
            <option key={p.id} value={p.id}>{p.title} — {p.class_name} / {p.subject_name}</option>
          ))}
        </select>
        {selectedId && (
          <div className="mt-3 flex gap-2 items-center">
            <Link to={`${base}/ai/exam-generator/${selectedId}/build`}><Button size="sm" variant="secondary">Open Paper Builder</Button></Link>
            {aiGenerated && <Badge status="generated">AI Generated</Badge>}
          </div>
        )}
      </DashboardCard>

      {loading ? <Spinner /> : selectedId && answerKey ? (
        <div className="grid xl:grid-cols-2 gap-6">
          <DashboardCard title="Answer Key Editor" subtitle="Editable answers and guidelines">
            {(answerKey.items || []).map((item, idx) => (
              <div key={item.question_id || idx} className="mb-5 p-4 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-violet-700 mb-2">Q{item.order || idx + 1} · {item.marks} marks · {item.question_type}</p>
                <Input label="Correct Answer" value={item.correct_answer || ''} onChange={(e) => updateItem(idx, 'correct_answer', e.target.value)} />
                <Input label="MCQ Option" value={item.correct_option || ''} onChange={(e) => updateItem(idx, 'correct_option', e.target.value)} />
                <Textarea label="Marking Guidelines" value={item.marking_guidelines || ''} onChange={(e) => updateItem(idx, 'marking_guidelines', e.target.value)} rows={2} />
              </div>
            ))}
          </DashboardCard>

          <DashboardCard title="Marking Scheme Preview" subtitle="Rubrics for subjective questions">
            {(markingScheme?.sections || []).map((sec) => (
              <div key={sec.name} className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">{sec.name}</h4>
                {(sec.items || []).map((it) => (
                  <div key={it.question_id} className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-sm font-medium text-gray-800 mb-1">Question #{it.question_id} ({it.marks} marks)</p>
                    <p className="text-sm text-gray-600 mb-2">{it.scheme}</p>
                    {(it.rubric || []).map((r) => (
                      <p key={r.level} className="text-xs text-gray-500">• {r.level}: {r.marks_range} — {r.description}</p>
                    ))}
                  </div>
                ))}
              </div>
            ))}
            {versions.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Version History</p>
                {versions.map((v) => (
                  <p key={v.id} className="text-xs text-gray-600">v{v.version_no} — {new Date(v.created_at).toLocaleString()}</p>
                ))}
              </div>
            )}
          </DashboardCard>
        </div>
      ) : selectedId ? (
        <DashboardCard title="No Answer Key Yet">
          <p className="text-sm text-gray-500 mb-4">Generate an answer key from the paper questions.</p>
          <Button onClick={handleAiGenerate} disabled={generating}>Generate with AI</Button>
        </DashboardCard>
      ) : null}
    </DashboardLayout>
  );
}
