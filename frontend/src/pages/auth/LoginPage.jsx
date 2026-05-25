import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Alert, Card } from '../../components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) navigate(result.redirect);
    else setError(result.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <Card className="w-full max-w-md !p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Campus Management System</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>
        <Alert type="error" message={error} onClose={() => setError('')} />
        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="owner@cms.local" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
        </form>
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p className="font-medium mb-2">Demo Accounts:</p>
          <p>Owner: owner@cms.local / owner123</p>
          <p>Principal: principal@peers.local / password123</p>
          <p>Finance: finance@peers.local / password123</p>
          <p>Teacher: teacher@peers.local / password123</p>
          <p>Student: student@peers.local / password123</p>
          <p>Parent: parent@peers.local / password123</p>
        </div>
      </Card>
    </div>
  );
}
