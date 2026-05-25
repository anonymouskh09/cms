import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMenuForRole, isMenuItemActive } from '../../utils/menus';
import { getMenuIcon } from '../dashboard/menuIcons';

export default function DashboardLayout({ children, institutionFilter, onInstitutionFilterChange }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const menu = getMenuForRole(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = user?.role?.replace(/_/g, ' ') || 'User';

  return (
    <div className="min-h-screen bg-[#f4f3f8] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#2a1868] via-[#3d2594] to-[#1a0f42] text-white transform transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-64'}`}
      >
        <div className={`p-5 border-b border-white/10 ${collapsed ? 'px-3' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 ring-1 ring-white/20">
              <span className="text-lg font-bold">C</span>
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-lg font-bold tracking-tight">Campus CMS</h1>
                <p className="text-xs text-violet-200/80">Management System</p>
              </div>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="mx-4 mt-4 p-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
            <p className="text-xs text-violet-200/90 uppercase tracking-wide">Signed in as</p>
            <p className="font-semibold text-sm mt-0.5 truncate">{user?.name}</p>
            <p className="text-xs text-violet-200/80 capitalize mt-1">{roleLabel}</p>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
          {menu.map((item) => {
            const active = isMenuItemActive(location.pathname, item);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-white/15 text-white shadow-lg shadow-purple-900/30 ring-1 ring-white/20'
                    : 'text-violet-100/90 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                {getMenuIcon(item.label)}
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && active && item.badge != null && (
                  <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-violet-400/30 text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={`p-3 border-t border-white/10 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex items-center justify-center w-full py-2 rounded-xl text-violet-200 hover:bg-white/10 text-xs"
          >
            {collapsed ? '→' : '← Collapse'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {user?.role === 'owner' && onInstitutionFilterChange && (
              <select
                value={institutionFilter || ''}
                onChange={(e) => onInstitutionFilterChange(e.target.value || null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-violet-500/30 outline-none"
              >
                <option value="">All Institutions</option>
                <option value="1">Schools</option>
                <option value="2">Primal Academy</option>
              </select>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
