import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Select, Input, Alert, Spinner, EmptyState } from '../../components/ui';
import { examsService, studentsService, reportCardsService, downloadBlob } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  return '/principal';
}

export default function GenerateReportCardPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ student_id: '', exam_id: '', teacher_remarks: '', principal_remarks: '', publish: true });
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    Promise.all([examsService.list({}), studentsService.list()])
      .then(([e, s]) => {
        setExams(e.data.data);
        setStudents(s.data.data);
      })
      .catch(() => setErr('Failed to load data'))
      .finally(() => setInitLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!form.student_id || !form.exam_id) {
      setErr('Select student and exam');
      return;
    }
    setLoading(true);
    setErr('');
    setMsg('');
    try {
      const res = await reportCardsService.generateStudent({
        student_id: parseInt(form.student_id, 10),
        exam_id: parseInt(form.exam_id, 10),
        teacher_remarks: form.teacher_remarks,
        principal_remarks: form.principal_remarks,
        publish: form.publish,
      });
      setResult(res.data.data);
      setMsg(res.data.message || 'Report card generated');
    } catch (e) {
      setErr(e.response?.data?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await reportCardsService.download(id);
      downloadBlob(res.data, `report_card_${id}.pdf`);
    } catch {
      setErr('Download failed');
    }
  };

  if (initLoading) return <DashboardLayout><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">Generate Report Card</h2>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-6">
        <Select label="Exam" value={form.exam_id} onChange={(e) => setForm({ ...form, exam_id: e.target.value })}
          options={[{ value: '', label: 'Select exam' }, ...exams.map((ex) => ({ value: ex.id, label: `${ex.name} (${ex.exam_type_name})` }))]} />
        <Select label="Student" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          options={[{ value: '', label: 'Select student' }, ...students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name || ''} — ${s.roll_no || 'No roll'}` }))]} />
        <Input label="Teacher Remarks" value={form.teacher_remarks} onChange={(e) => setForm({ ...form, teacher_remarks: e.target.value })} />
        <Input label="Principal Remarks" value={form.principal_remarks} onChange={(e) => setForm({ ...form, principal_remarks: e.target.value })} />
        <label className="flex items-center gap-2 mb-4 text-sm">
          <input type="checkbox" checked={form.publish} onChange={(e) => setForm({ ...form, publish: e.target.checked })} />
          Publish immediately (students/parents can download)
        </label>
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating PDF…' : 'Generate Report Card'}
        </Button>
      </Card>
      {result && (
        <Card title="Generated Report Card">
          <p className="text-sm text-gray-600 mb-2">Grade: <strong>{result.grade}</strong> · {result.percentage}% · Status: {result.status}</p>
          <Button onClick={() => handleDownload(result.id)}>Download PDF</Button>
        </Card>
      )}
      {!result && !loading && (
        <EmptyState message="Select a student and exam, then generate a report card. Results must exist for the student." />
      )}
    </DashboardLayout>
  );
}
