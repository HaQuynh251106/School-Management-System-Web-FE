import { useEffect, useState } from 'react';
import { CalendarDays, LogOut, Menu, Moon, School, Sun, X } from 'lucide-react';
import { roles, modules } from '../data/mockData';
import type { PageId, RoleId } from '../types';
import { SessionCard, SidebarMenu } from '../components/layout';
import { GeneralDashboard } from '../features/dashboard/GeneralDashboard';
import { FeaturePage } from '../features/FeaturePage';
import { useAuth } from '../api/auth';
import { LoginPage } from '../features/auth/LoginPage';
import { PasswordChangePage } from '../features/auth/PasswordChangePage';
import { ActiveChildProvider } from '../api/activeChild';
import { useTheme } from '../api/theme';

export default function App() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Reset về Dashboard mỗi khi đổi người đăng nhập (tránh giữ trang của vai trò cũ).
  useEffect(() => {
    setActivePage('dashboard');
    setSidebarOpen(false);
  }, [user?.id]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  if (loading) {
    return <div className="login-screen"><div className="login-loading">Đang tải phiên đăng nhập…</div></div>;
  }
  if (!user) {
    return <LoginPage />;
  }
  if (user.passwordChangeRequired) {
    return <PasswordChangePage />;
  }

  const roleId = user.role.toLowerCase() as RoleId;
  const role = roles.find((item) => item.id === roleId) ?? roles[0];
  const activeModule = modules[role.id].find((item) => item.code === activePage);
  const pageTitle = activePage === 'dashboard' ? 'Tổng quan' : activeModule?.title ?? 'Chức năng';
  const pageSubtitle = activePage === 'dashboard' ? role.subtitle : activeModule?.summary ?? role.subtitle;
  const today = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date());
  const selectPage = (page: PageId) => {
    setActivePage(page);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ActiveChildProvider>
      <div className={`app-shell app-shell--${roleId}`}>
        <button className={`sidebar-backdrop ${sidebarOpen ? 'show' : ''}`} aria-label="Đóng menu" onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-brand-row">
            <div className="brand">
              <div className="brand-mark">
                <School size={24} />
              </div>
              <div>
                <strong>Trường học số</strong>
                <span>Quản lý tập trung</span>
              </div>
            </div>
            <button className="sidebar-close" type="button" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)}><X size={19} /></button>
          </div>

          <SessionCard role={role} name={user.fullName} />
          <SidebarMenu role={role} activePage={activePage} onSelect={selectPage} />
          <div className="sidebar-footer">
            <span>Hệ thống quản lý học đường</span>
            <small>Phiên bản 2026.1</small>
          </div>
        </aside>

        <main className="workspace">
          <header className="topbar">
            <div className="topbar-heading">
              <button className="mobile-menu-button" type="button" aria-label="Mở menu" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
              <div>
                <h1>{pageTitle}</h1>
                <p>{pageSubtitle}</p>
              </div>
            </div>
            <div className="topbar-actions">
              <span className="topbar-date"><CalendarDays size={16} /> {today}</span>
              <button className="theme-toggle" type="button" onClick={toggleTheme} title={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'} aria-label={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'}>
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <div className="topbar-profile">
                <span>{user.fullName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span>
                <div><strong>{user.fullName}</strong><small>{role.label}</small></div>
              </div>
              <button className="logout-btn" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất">
                <LogOut size={17} /><span>Đăng xuất</span>
              </button>
            </div>
          </header>

          {activePage === 'dashboard' ? (
            <GeneralDashboard roleId={role.id} />
          ) : (
            <FeaturePage module={activeModule} role={role} />
          )}
        </main>
      </div>
    </ActiveChildProvider>
  );
}
