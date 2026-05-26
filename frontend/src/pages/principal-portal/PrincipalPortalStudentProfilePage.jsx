import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ViewOnlyBanner from '../../components/layout/ViewOnlyBanner';
import { useMonitoring } from '../monitoring/MonitoringContext';
import { Card, Spinner, Badge, Button, Textarea, Table, StatCard } from '../../components/ui';
import { studentsService, principalPortalService, financeService } from '../../services/authService';

function relationshipLabel(rel) {
  if (!rel) return 'Guardian';
  return rel.charAt(0).toUpperCase() + rel.slice(1);
}

export default function PrincipalPortalStudentProfilePage() {
  const { id } = useParams();
  const location = useLocation();
  const { basePath, readOnly, showBanner } = useMonitoring();
  const feesRef = useRef(null);
  const [student, setStudent] = useState(null);
  const [remarks, setRemarks] = useState([]);
  const [remark, setRemark] = useState('');
  const [feeChallans, setFeeChallans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      studentsService.get(id),
      principalPortalService.listRemarks({ entity_type: 'student', entity_id: id }),
      financeService.challans.list({ student_id: id, limit: 100 }),
      financeService.payments.listStudent(id, { limit: 50 }),
    ]).then(([s, r, ch, pay]) => {
      const payData = pay.data.data || {};
      setStudent(s.data.data);
      setRemarks(r.data.data);
      setFeeChallans((ch.data.data?.length ? ch.data.data : payData.challans) || []);
      setPayments(payData.payments || []);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (location.state?.focusSection === 'fees' && feesRef.current && !loading) {
      feesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.state, loading]);

  const addRemark = async () => {
    await principalPortalService.createRemark({ entity_type: 'student', entity_id: id, remarks: remark });
    setRemark('');
    const r = await principalPortalService.listRemarks({ entity_type: 'student', entity_id: id });
    setRemarks(r.data.data);
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;
  if (!student) return <DashboardLayout><p>Student not found</p></DashboardLayout>;

  const parents = student.parents?.length
    ? student.parents
    : student.parent_name
      ? [{
          id: student.parent_id,
          name: student.parent_name,
          phone: student.parent_phone,
          email: student.parent_email,
          relationship: 'parent',
          is_primary: true,
        }]
      : [];

  const present = student.attendance_summary?.find((a) => a.status === 'present')?.count || 0;
  const total = student.attendance_summary?.reduce((s, a) => s + a.count, 0) || 0;
  const attendancePct = total ? Math.round((present / total) * 100) : null;

  return (
    <DashboardLayout>
      {showBanner && <ViewOnlyBanner />}
      <Link
        to={location.state?.focusSection === 'fees' ? `${basePath}/fees` : `${basePath}/students`}
        className="text-sm text-indigo-600 mb-4 inline-block hover:underline"
      >
        ← Back to {location.state?.focusSection === 'fees' ? 'fees overview' : 'students'}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {student.class_name}{student.section_name ? ` · ${student.section_name}` : ''} · Roll {student.roll_no || '—'}
          </p>
        </div>
        <div className="flex gap-2">
          {student.needs_attention ? <Badge status="pending">Needs attention</Badge> : null}
          <Badge status={student.status}>{student.status}</Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="Attendance" value={attendancePct != null ? `${attendancePct}%` : '—'} color="green" />
        <StatCard title="Class" value={student.class_name || '—'} color="blue" />
        <StatCard title="Admission No" value={student.admission_no || '—'} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card title="Student details">
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Admission:</span> {student.admission_no || '—'}</p>
            <p><span className="text-slate-500">Roll no:</span> {student.roll_no || '—'}</p>
            <p><span className="text-slate-500">Student code:</span> {student.student_code || '—'}</p>
            <p><span className="text-slate-500">Gender:</span> {student.gender || '—'}</p>
            <p><span className="text-slate-500">Date of birth:</span> {student.date_of_birth ? String(student.date_of_birth).slice(0, 10) : '—'}</p>
            <p><span className="text-slate-500">Phone:</span> {student.phone || '—'}</p>
            <p><span className="text-slate-500">Father name:</span> {student.father_name || '—'}</p>
            <p><span className="text-slate-500">Address:</span> {student.address || '—'}</p>
            <p><span className="text-slate-500">Institution:</span> {student.institution_name || '—'}</p>
          </div>
        </Card>

        <Card title="Parents / guardians">
          {parents.length === 0 ? (
            <p className="text-sm text-slate-500">No parent linked to this student yet.</p>
          ) : (
            <div className="space-y-4">
              {parents.map((p) => (
                <div
                  key={p.id || `${p.name}-${p.phone}`}
                  className="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <div className="flex gap-1">
                      <Badge>{relationshipLabel(p.relationship)}</Badge>
                      {p.is_primary ? <Badge status="active">Primary</Badge> : null}
                    </div>
                  </div>
                  <div className="text-sm space-y-1 text-slate-700">
                    <p><span className="text-slate-500">Phone:</span> {p.phone || '—'}</p>
                    <p><span className="text-slate-500">Email:</span> {p.email || p.login_email || '—'}</p>
                    {p.address ? <p><span className="text-slate-500">Address:</span> {p.address}</p> : null}
                    {p.status ? <p><span className="text-slate-500">Status:</span> {p.status}</p> : null}
                  </div>
                  <Link
                    to={`${basePath}/parents`}
                    className="inline-block mt-2 text-xs text-indigo-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View in Parent module →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div ref={feesRef} className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Fee history</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card title="All challans">
            {feeChallans.length === 0 ? (
              <p className="text-sm text-slate-500">No challans found for this student.</p>
            ) : (
              <Table
                columns={[
                  { key: 'challan_no', label: 'Challan' },
                  { key: 'month_year', label: 'Month' },
                  { key: 'total_amount', label: 'Amount', render: (r) => `Rs. ${Number(r.total_amount || 0).toLocaleString()}` },
                  { key: 'due_date', label: 'Due', render: (r) => r.due_date ? String(r.due_date).slice(0, 10) : '—' },
                  { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
                ]}
                data={feeChallans}
              />
            )}
          </Card>
          <Card title="Payment history">
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payments recorded yet.</p>
            ) : (
              <Table
                columns={[
                  { key: 'created_at', label: 'Date', render: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—') },
                  { key: 'amount', label: 'Amount', render: (r) => `Rs. ${Number(r.amount || 0).toLocaleString()}` },
                  { key: 'payment_method', label: 'Method' },
                  { key: 'challan_no', label: 'Challan' },
                ]}
                data={payments}
              />
            )}
          </Card>
        </div>
      </div>

      {!readOnly && (
        <div className="grid lg:grid-cols-2 gap-6">
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
        </div>
      )}
    </DashboardLayout>
  );
}
