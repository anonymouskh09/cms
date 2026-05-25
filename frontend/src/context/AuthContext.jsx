import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const ROLE_ROUTES = {
  owner: '/owner/dashboard',
  principal: '/principal/dashboard',
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
  parent: '/parent/dashboard',
  finance_manager: '/finance/dashboard',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      authService.me().then((res) => {
        setUser(res.data.data);
        localStorage.setItem('user', JSON.stringify(res.data.data));
      }).catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      const { token, user: userData } = res.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, redirect: ROLE_ROUTES[userData.role] };
    } catch (err) {
      const message = err.response?.data?.message
        || (err.code === 'ERR_NETWORK' ? 'Cannot reach server. Is backend running on port 5001?' : null)
        || err.message
        || 'Login failed';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, ROLE_ROUTES }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
