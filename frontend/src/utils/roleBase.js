import { useAuth } from '../context/AuthContext';

export function useRoleBase() {
  const { user } = useAuth();
  const role = user?.role;
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'principal') return '/principal';
  if (role === 'teacher') return '/teacher';
  return '/owner';
}

export function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'principal') return '/principal';
  if (role === 'teacher') return '/teacher';
  return '/owner';
}
