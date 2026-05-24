import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Boxes, FileUp, History, LogOut, Menu, Receipt, ShoppingCart, Users, X } from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { getNavForRole } from '../navigation.js';

export default function AppLayout() {
  const { user, logout, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const nav = getNavForRole(role);
  const current = nav.find((item) => location.pathname === item.url);
  const icons = {
    dashboard: BarChart3,
    products: Boxes,
    import: FileUp,
    pos: ShoppingCart,
    'my-sales': Receipt,
    'sales-history': History,
    users: Users,
  };

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="relative flex min-h-screen bg-[#f4f7fb]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-r from-[#071a33] via-[#0b2545] to-[#0f3a68]" />
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed bottom-4 left-4 top-4 z-40 w-64 transform overflow-hidden rounded-2xl border border-white/70 bg-white/95 text-[#344767] shadow-2xl shadow-slate-900/10 backdrop-blur transition-transform lg:sticky lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mx-4 flex h-20 items-center border-b border-slate-100 px-1">
          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b2545] to-[#1d4ed8] text-lg font-bold text-white shadow-lg shadow-blue-900/25">
            S
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Panel</div>
            <div className="text-lg font-bold text-[#172b4d]">Sales App</div>
          </div>
        </div>
        <nav className="space-y-2 p-4">
          {nav.map((item) => {
            const active = location.pathname === item.url;
            const Icon = icons[item.id] ?? ShoppingCart;
            return (
              <Link
                key={item.id}
                to={item.url}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active
                    ? 'bg-gradient-to-r from-[#0b2545] to-[#0f3a68] text-white shadow-lg shadow-blue-900/25'
                    : 'text-slate-600 hover:bg-[#eef4fb] hover:text-[#0f3a68]'
                }`}
              >
                <Icon size={18} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col lg:pl-4">
        <header className="sticky top-4 z-20 mx-4 mt-4 flex h-16 items-center justify-between rounded-2xl border border-white/30 bg-white/20 px-4 text-white shadow-sm backdrop-blur md:mx-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl p-2 text-white hover:bg-white/15 lg:hidden"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Menú"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-white/70">Dashboard</div>
              <div className="font-semibold text-white">{current?.title ?? 'Sales App'}</div>
            </div>
          </div>
          <div className="hidden text-right text-sm text-white/80 sm:block">
            <div className="font-semibold text-white">{user?.username}</div>
            <div className="text-xs capitalize text-white/65">{role}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-white/25"
          >
            <LogOut size={16} />
            Salir
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
