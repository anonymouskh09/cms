import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Select, Input, Alert, Spinner, EmptyState } from '../../components/ui';
import { ExamScheduleTable } from '../../components/exams/ExamScheduleTable';
import { examsService, academicService } from '../../services/authService';

export default function TeacherExamSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({ class_id: '', exam_date: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = {};
    if (filters.class_id) params.class_id = filters.class_id;
    if (filters.exam_date) params.exam_date = filters.exam_date;
    examsService.calendar(params)
      .then((r) => setSchedules(r.data.data))
      .catch(() => setErr('Failed to load exam schedules'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    academicService.classes.list().then((r) => setClasses(r.data.data));
    load();
  }, [filters.class_id, filters.exam_date]);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">My Exam Schedules</h2>
      <Alert type="error" message={err} onClose={() => setErr('')} />
      <Card className="mb-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Class" value={filters.class_id} onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
            options={[{ value: '', label: 'All assigned classes' }, ...classes.map((c) => ({ value: c.id, label: c.name }))]} />
          <Input label="Date" type="date" value={filters.exam_date} onChange={(e) => setFilters({ ...filters, exam_date: e.target.value })} />
        </div>
      </Card>
      {loading ? <Spinner /> : schedules.length ? (
        <Card>
          <ExamScheduleTable schedules={schedules} showExam />
        </Card>
      ) : (
        <EmptyState message="No exam schedules for your assigned classes or invigilation duties." />
      )}
    </DashboardLayout>
  );
}
