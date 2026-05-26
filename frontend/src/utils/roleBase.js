import { useAuth } from '../context/AuthContext';

export function useRoleBase() {
  const { user } = useAuth();
  const role = user?.role;
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'school_administrator') return '/principal';
  if (role === 'principal') return '/principal-portal';
  if (role === 'teacher') return '/teacher';
  return '/owner';
}

export function roleBase(role) {
  if (role === 'owner') return '/owner';
  if (role === 'admin') return '/admin';
  if (role === 'school_administrator') return '/principal';
  if (role === 'principal') return '/principal-portal';
  if (role === 'teacher') return '/teacher';
  return '/owner';
}

/** Base path for staff portals (school administrator uses /principal URLs). */
export function staffBasePath(user) {
  if (!user?.role) return '/principal';
  if (user.role === 'owner') return '/owner';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'principal') return '/principal-portal';
  return '/principal';
}
