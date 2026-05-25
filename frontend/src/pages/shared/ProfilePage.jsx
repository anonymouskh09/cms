import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, Button, Input, Alert, Spinner, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { authService, studentsService, teachersService } from '../../services/authService';

export default function ProfilePage({ role }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = role === 'teacher' ? teachersService.me() : studentsService.me();
    load
      .then((res) => setProfile(res.data.data))
      .catch(() => setErr('Could not load profile'))
      .finally(() => setLoading(false));
  }, [role]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (pwd.new_password !== pwd.confirm) {
      setErr('New passwords do not match');
      return;
    }
    if (pwd.new_password.length < 6) {
      setErr('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword({
        current_password: pwd.current_password,
        new_password: pwd.new_password,
      });
      setMsg('Password changed successfully');
      setPwd({ current_password: '', new_password: '', confirm: '' });
    } catch (e) {
      setErr(e.response?.data?.message || 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><Spinner /></DashboardLayout>;

  const isTeacher = role === 'teacher';
  const displayName = user?.name || profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-6">My Profile</h2>
      <Alert type="success" message={msg} onClose={() => setMsg('')} />
      <Alert type="error" message={err} onClose={() => setErr('')} />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Account Details">
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Name:</span> {displayName}</p>
            <p><span className="text-gray-500">Email:</span> {profile?.login_email || user?.email}</p>
            <p><span className="text-gray-500">Role:</span> <Badge status={user?.role} /></p>
            {!isTeacher && (
              <>
                <p><span className="text-gray-500">Class:</span> {profile?.class_name || '—'}</p>
                <p><span className="text-gray-500">Section:</span> {profile?.section_name || '—'}</p>
                <p><span className="text-gray-500">Admission No:</span> {profile?.admission_no || '—'}</p>
                <p><span className="text-gray-500">Roll No:</span> {profile?.roll_no || '—'}</p>
              </>
            )}
            {isTeacher && (
              <>
                <p><span className="text-gray-500">Employee No:</span> {profile?.employee_no || '—'}</p>
                <p><span className="text-gray-500">Qualification:</span> {profile?.qualification || '—'}</p>
                <p><span className="text-gray-500">Institution:</span> {profile?.institution_name || '—'}</p>
              </>
            )}
          </div>
        </Card>

        <Card title="Change Password">
          <form onSubmit={handlePasswordChange} className="space-y-1">
            <Input label="Current Password" type="password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} required />
            <Input label="New Password" type="password" value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} required />
            <Input label="Confirm New Password" type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} required />
            <Button type="submit" className="w-full mt-4" disabled={saving}>{saving ? 'Updating...' : 'Update Password'}</Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
