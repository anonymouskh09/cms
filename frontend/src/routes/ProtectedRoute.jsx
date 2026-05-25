import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canRoleAccessPath } from '../utils/menus';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function RoleRoute({ children, allowedRoles }) {
  const { user, ROLE_ROUTES } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_ROUTES[user.role] || '/login'} replace />;
  }
  return children;
}

/** Blocks direct URL access when path is outside the role's allowed route prefixes. */
export function RolePathRoute({ children, allowedRoles }) {
  const { user, ROLE_ROUTES } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_ROUTES[user.role] || '/login'} replace />;
  }
  if (!canRoleAccessPath(user.role, location.pathname)) {
    return <Navigate to={ROLE_ROUTES[user.role] || '/login'} replace />;
  }
  return children;
}
