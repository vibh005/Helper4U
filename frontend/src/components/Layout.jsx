import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../auth/AuthContext';
import { api } from '../api';
import { cx, Seal, Button } from './ui';

const NAV = {
  household: [['/browse', 'Find helpers'], ['/bookings', 'My bookings'], ['/complaints', 'Complaints'], ['/household/profile', 'My household']],
  helper: [['/helper/dashboard', 'Dashboard'], ['/bookings', 'Jobs'], ['/helper/profile', 'My profile'], ['/complaints', 'Complaints']],
  admin: [['/admin', 'Overview'], ['/admin/helpers', 'Helpers'], ['/admin/users', 'Users'], ['/admin/categories', 'Categories'], ['/admin/bookings', 'Bookings'], ['/admin/complaints', 'Complaints']],
};

function Bell() {
  const [n, setN] = useState(0);
  const loc = useLocation();
  useEffect(() => {
    let live = true;
    const load = () => api.get('/notifications?limit=1').then((r) => live && setN(r.data.unread_count)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { live = false; clearInterval(t); };
  }, [loc.pathname]);
  return (
    <NavLink to="/notifications" className="relative rounded-lg p-2 hover:bg-wash" aria-label={`Notifications${n ? `, ${n} unread` : ''}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {n > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-marigold px-1 text-xs font-bold text-ink">{n > 99 ? '99+' : n}</span>}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [loc.pathname]);

  const links = user ? NAV[user.role] : [];
  const linkCls = ({ isActive }) =>
    cx('rounded-lg px-3 py-2 text-sm font-semibold transition-colors', isActive ? 'bg-ink text-white' : 'text-ink hover:bg-wash');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to={user ? homeFor(user.role) : '/'} className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Seal size={24} title="Helper4U" /> Helper4U
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/admin'} className={linkCls}>{label}</NavLink>)}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Bell />
                <span className="hidden text-sm font-medium xl:inline">{user.name}</span>
                <Button variant="secondary" size="sm" onClick={() => { logout(); navigate('/'); }}>Log out</Button>
                <button className="rounded-lg p-2 hover:bg-wash lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-wash">Log in</Link>
                <Link to="/register" className="rounded-lg bg-marigold px-4 py-2 text-sm font-semibold text-ink hover:bg-[#e2a400]">Sign up</Link>
              </>
            )}
          </div>
        </div>
        {user && open && (
          <nav className="border-t border-line bg-white px-4 py-2 lg:hidden" aria-label="Mobile">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/admin'} className={linkCls}>{label}</NavLink>)}
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8"><Outlet /></main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-ink-soft">
          <span className="flex items-center gap-2"><Seal size={16} title="" /> Helper4U connects households with verified domestic helpers.</span>
          <span>Every helper is checked by our team before they can be booked.</span>
        </div>
      </footer>
    </div>
  );
}
