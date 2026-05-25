import { Link, useLocation } from 'react-router-dom';

export default function SubNav({ items }) {
  const { pathname } = useLocation();
  const isActive = (item) => {
    if (item.path === '/finance/sms/dashboard' && (pathname === '/finance/sms' || pathname === '/finance/sms/dashboard')) return true;
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };
  return (
    <nav className="flex flex-wrap gap-2 mb-8 p-1.5 bg-white rounded-2xl border border-gray-200 shadow-sm w-fit max-w-full">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              active
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
