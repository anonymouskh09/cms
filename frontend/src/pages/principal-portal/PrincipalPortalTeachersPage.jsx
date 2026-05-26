import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { Table, Spinner, Badge } from '../../components/ui';
import { teachersService } from '../../services/authService';
import { useMonitoring, mergeScope } from '../monitoring/MonitoringContext';

function assignmentSummary(teacher) {
  const assignments = teacher.assignments || [];
  const classes = new Set(assignments.map((a) => a.class_name).filter(Boolean));
  const subjects = new Set(assignments.map((a) => a.subject_name).filter(Boolean));
  return {
    classes: classes.size,
    subjects: subjects.size,
    classPreview: [...classes].slice(0, 2).join(', ') || '—',
  };
}

export default function PrincipalPortalTeachersPage() {
  const navigate = useNavigate();
  const { basePath, scopeParams, showBanner } = useMonitoring();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teachersService.overview(mergeScope(scopeParams)).then((res) => setTeachers(res.data.data || [])).finally(() => setLoading(false));
  }, [scopeParams.institution_id]);

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <h1 className="text-2xl font-bold mb-2">Teachers</h1>
      <p className="text-slate-500 text-sm mb-6">Click any row to view teacher details, assignments, and timetable</p>
      {loading ? <Spinner /> : (
        <Table
          onRowClick={(row) => navigate(`${basePath}/teachers/${row.id}`)}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email', render: (r) => r.email || r.user_email || '—' },
            { key: 'phone', label: 'Phone' },
            {
              key: 'assigned_classes',
              label: 'Classes',
              render: (r) => {
                const s = assignmentSummary(r);
                return (
                  <span>
                    {s.classes || '—'}
                    {s.classPreview !== '—' ? <span className="block text-xs text-slate-500">{s.classPreview}</span> : null}
                  </span>
                );
              },
            },
            {
              key: 'assigned_subjects',
              label: 'Subjects',
              render: (r) => assignmentSummary(r).subjects || '—',
            },
            {
              key: 'timetable',
              label: 'Periods/week',
              render: (r) => (r.timetable?.length ?? 0) || '—',
            },
            { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
          ]}
          data={teachers}
        />
      )}
    </DashboardLayout>
  );
}
