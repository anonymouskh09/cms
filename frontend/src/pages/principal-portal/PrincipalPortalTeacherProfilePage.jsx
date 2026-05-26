import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { useMonitoring } from '../monitoring/MonitoringContext';
import { Card, Spinner, Badge, Button, Textarea, Table, StatCard } from '../../components/ui';
import { teachersService, principalPortalService } from '../../services/authService';

function formatTime(t) {
  if (!t) return '—';
  return String(t).slice(0, 5);
}

function formatDay(d) {
  if (!d) return '—';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export default function PrincipalPortalTeacherProfilePage() {
  const { id } = useParams();
  const { basePath, readOnly, showBanner } = useMonitoring();
  const [teacher, setTeacher] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      teachersService.get(id),
      principalPortalService.listRemarks({ entity_type: 'teacher', entity_id: id }),
    ]).then(([t, r]) => {
      setTeacher(t.data.data);
      setRemarks(r.data.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const addRemark = async () => {
    await principalPortalService.createRemark({ entity_type: 'teacher', entity_id: id, remarks: remark });
    setRemark('');
    const r = await principalPortalService.listRemarks({ entity_type: 'teacher', entity_id: id });
    setRemarks(r.data.data);
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;
  if (!teacher) return <DashboardLayout><p>Teacher not found</p></DashboardLayout>;

  const assignments = teacher.assignments || [];
  const timetable = teacher.timetable || [];

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <Link to={`${basePath}/teachers`} className="text-sm text-indigo-600 mb-4 inline-block hover:underline">
        ← Back to teachers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{teacher.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {teacher.employee_no ? `Employee #${teacher.employee_no}` : 'Teacher'} · {teacher.institution_name || '—'}
          </p>
        </div>
        <Badge status={teacher.status}>{teacher.status}</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="Classes assigned" value={teacher.assigned_classes_count ?? '—'} color="blue" />
        <StatCard title="Subjects assigned" value={teacher.assigned_subjects_count ?? '—'} color="purple" />
        <StatCard title="Weekly periods" value={timetable.length || '—'} color="green" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card title="Teacher details">
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Employee no:</span> {teacher.employee_no || '—'}</p>
            <p><span className="text-slate-500">Email:</span> {teacher.email || teacher.user_email || '—'}</p>
            <p><span className="text-slate-500">Phone:</span> {teacher.phone || '—'}</p>
            <p><span className="text-slate-500">Qualification:</span> {teacher.qualification || '—'}</p>
            <p><span className="text-slate-500">Joining date:</span> {teacher.joining_date ? String(teacher.joining_date).slice(0, 10) : '—'}</p>
            <p><span className="text-slate-500">Login email:</span> {teacher.user_email || '—'}</p>
            <p><span className="text-slate-500">Institution:</span> {teacher.institution_name || '—'}</p>
          </div>
        </Card>

        {!readOnly && (
          <Card title="Principal remarks">
            <ul className="text-sm space-y-2 mb-3 max-h-48 overflow-auto">
              {remarks.length === 0 ? (
                <li className="text-slate-500">No remarks yet.</li>
              ) : (
                remarks.map((m) => (
                  <li key={m.id} className="border-b border-slate-100 pb-2">
                    {m.remarks}
                    <span className="block text-slate-400 text-xs mt-0.5">{new Date(m.created_at).toLocaleString()}</span>
                  </li>
                ))
              )}
            </ul>
            <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add principal remark..." rows={3} />
            <Button className="mt-2" size="sm" onClick={addRemark}>Add remark</Button>
          </Card>
        )}
      </div>

      <Card title="Class & subject assignments" className="mb-6">
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No classes or subjects assigned yet.</p>
        ) : (
          <Table
            columns={[
              { key: 'class_name', label: 'Class' },
              { key: 'section_name', label: 'Section' },
              { key: 'subject_name', label: 'Subject' },
              { key: 'role_type', label: 'Role', render: (r) => (r.role_type || 'subject_teacher').replace(/_/g, ' ') },
            ]}
            data={assignments}
          />
        )}
      </Card>

      <Card title="Weekly timetable">
        {timetable.length === 0 ? (
          <p className="text-sm text-slate-500">No timetable entries for this teacher.</p>
        ) : (
          <Table
            columns={[
              { key: 'day_of_week', label: 'Day', render: (r) => formatDay(r.day_of_week) },
              { key: 'period_name', label: 'Period', render: (r) => r.period_name || `P${r.period_no}` },
              { key: 'start_time', label: 'Time', render: (r) => `${formatTime(r.start_time)} – ${formatTime(r.end_time)}` },
              { key: 'class_name', label: 'Class' },
              { key: 'section_name', label: 'Section' },
              { key: 'subject_name', label: 'Subject' },
              { key: 'room', label: 'Room' },
            ]}
            data={timetable}
          />
        )}
        <Link
          to={`${basePath}/timetable/teacher`}
          className="inline-block mt-4 text-sm text-indigo-600 hover:underline"
        >
          Open full timetable view →
        </Link>
      </Card>
    </DashboardLayout>
  );
}
