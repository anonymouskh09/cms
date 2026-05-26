import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Select, Input, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamStatusBadge } from '../../components/exams/ExamStatusBadge';
import { examsService, academicService, reportCardsService, downloadBlob } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/principal';
}

export default function ClassReportCardsPage() {
  const { user } = useAuth();
  const canGenerate = ['owner', 'school_administrator', 'admin'].includes(user.role);
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [filters, setFilters] = useState({ exam_id: '', class_id: '', section_id: '' });
  const [form, setForm] = useState({ teacher_remarks: '', principal_remarks: '', publish: true });
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    Promise.all([examsService.list({}), academicService.classes.list(), academicService.sections.list()])
      .then(([e, c, s]) => {
        setExams(e.data.data);
        setClasses(c.data.data);
        setSections(s.data.data);
      });
  }, []);

  const loadList = () => {
    if (!filters.exam_id || !filters.class_id) return;
    setLoading(true);
    const params = { exam_id: filters.exam_id, class_id: filters.class_id };
    if (filters.section_id) params.section_id = filters.section_id;
    reportCardsService.listClass(params)
      .then((r) => setRows(r.data.data))
      .catch(() => setErr('Failed to load class report cards'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadList(); }, [filters.exam_id, filters.class_id, filters.section_id]);

  const filteredSections = sections.filter((s) => !filters.class_id || s.class_id === parseInt(filters.class_id, 10));

  const handleBulkGenerate = async () => {
    if (!filters.exam_id || !filters.class_id) {
      setErr('Select exam and class');
      return;
    }
    setBulkLoading(true);
    setErr('');
    try {
      const res = await reportCardsService.generateClass({
        exam_id: parseInt(filters.exam_id, 10),
        class_id: parseInt(filters.class_id, 10),
        section_id: filters.section_id ? parseInt(filters.section_id, 10) : undefined,
        teacher_remarks: form.teacher_remarks,
        principal_remarks: form.principal_remarks,
        publish: form.publish,
      });
      setMsg(res.data.message);
      loadList();
    } catch (e) {
      setErr(e.response?.data?.message || 'Bulk generation failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await reportCardsService.download(id);
      downloadBlob(res.data, `report_card_${id}.pdf`);
    } catch {
      setErr('Download failed — report card may not be published');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        {canGenerate && (
          <Link to={`${roleBase(user.role)}/report-cards/generate`} className="text-sm text-blue-600 hover:underline">← Single Generate</Link>
        )}
        <h2 className="text-2xl font-bold mt-1">Class Report Cards</h2>
      </div>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Select label="Exam" value={filters.exam_id} onChange={(e) => setFilters({ ...filters, exam_id: e.target.value })}
            options={[{ value: '', label: 'Select exam' }, ...exams.map((ex) => ({ value: ex.id, label: ex.name }))]} />
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })}
            options={[{ value: '', label: 'Select class' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Section" value={filters.section_id} onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
            options={[{ value: '', label: 'All sections' }, ...filteredSections.map((s) => ({ value: s.id, label: s.name }))]} />
        </div>
      </Card>
      {canGenerate && (
        <Card className="mb-4" title="Bulk Generate">
          <Input label="Teacher Remarks (all)" value={form.teacher_remarks} onChange={(e) => setForm({ ...form, teacher_remarks: e.target.value })} />
          <Input label="Principal Remarks (all)" value={form.principal_remarks} onChange={(e) => setForm({ ...form, principal_remarks: e.target.value })} />
          <label className="flex items-center gap-2 mb-4 text-sm">
            <input type="checkbox" checked={form.publish} onChange={(e) => setForm({ ...form, publish: e.target.checked })} />
            Publish all immediately
          </label>
          <Button onClick={handleBulkGenerate} disabled={bulkLoading}>
            {bulkLoading ? 'Generating PDFs…' : 'Bulk Generate Class PDFs'}
          </Button>
        </Card>
      )}
      <Card>
        {loading ? <Spinner /> : rows.length ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500">
              <th className="py-2">Student</th><th>Roll</th><th>Grade</th><th>%</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map(({ student, report_card: rc }) => (
                <tr key={student.id} className="border-b">
                  <td className="py-2">{student.first_name} {student.last_name || ''}</td>
                  <td>{student.roll_no || '—'}</td>
                  <td>{rc?.grade || '—'}</td>
                  <td>{rc?.percentage != null ? `${rc.percentage}%` : '—'}</td>
                  <td>{rc ? <ExamStatusBadge status={rc.status} /> : <span className="text-gray-400">Not generated</span>}</td>
                  <td>
                    {rc?.id && (canGenerate || rc.status === 'published') && (
                      <Button variant="secondary" onClick={() => handleDownload(rc.id)}>Download PDF</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : filters.exam_id && filters.class_id ? (
          <EmptyState message="No students or report cards found for this class." />
        ) : (
          <EmptyState message="Select an exam and class to view report cards." />
        )}
      </Card>
    </DashboardLayout>
  );
}
