import { Table } from '../ui';
import { ExamStatusBadge } from './ExamStatusBadge';

function fmtTime(t) {
  if (!t) return '—';
  return String(t).slice(0, 5);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export function ExamScheduleTable({ schedules, showExam = false, renderActions }) {
  const columns = [
    ...(showExam ? [{ key: 'exam_name', label: 'Exam' }] : []),
    { key: 'exam_type_name', label: 'Type' },
    { key: 'class_name', label: 'Class', render: (r) => r.class_name || '—' },
    { key: 'section_name', label: 'Section', render: (r) => r.section_name || 'All' },
    { key: 'subject_name', label: 'Subject' },
    { key: 'exam_date', label: 'Date', render: (r) => fmtDate(r.exam_date) },
    { key: 'start_time', label: 'Start', render: (r) => fmtTime(r.start_time) },
    { key: 'end_time', label: 'End', render: (r) => fmtTime(r.end_time) },
    { key: 'room', label: 'Room', render: (r) => r.room || '—' },
    { key: 'invigilator_name', label: 'Invigilator', render: (r) => r.invigilator_name || '—' },
    { key: 'max_marks', label: 'Total' },
    { key: 'pass_marks', label: 'Pass' },
    { key: 'status', label: 'Status', render: (r) => <ExamStatusBadge status={r.status} /> },
    ...(renderActions ? [{ key: 'actions', label: 'Actions', render: renderActions }] : []),
  ];
  return <Table columns={columns} data={schedules} />;
}
