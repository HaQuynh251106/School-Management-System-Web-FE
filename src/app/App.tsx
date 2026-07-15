import { useEffect, useState } from 'react';
import { LogOut, School } from 'lucide-react';
import { roles, modules } from '../data/mockData';
import type { PageId, RoleId } from '../types';
import { SessionCard, SidebarMenu } from '../components/layout';
import { GeneralDashboard } from '../features/dashboard/GeneralDashboard';
import { FeaturePage } from '../features/FeaturePage';
import { useAuth } from '../api/auth';
import { LoginPage } from '../features/auth/LoginPage';
import { ActiveChildProvider } from '../api/activeChild';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activePage, setActivePage] = useState<PageId>('dashboard');

  // Reset về Dashboard mỗi khi đổi người đăng nhập (tránh giữ trang của vai trò cũ).
  useEffect(() => {
    setActivePage('dashboard');
  }, [user?.id]);

  if (loading) {
    return <div className="login-screen"><div className="login-loading">Đang tải phiên đăng nhập…</div></div>;
  }
  if (!user) {
    return <LoginPage />;
  }

  const roleId = user.role.toLowerCase() as RoleId;
  const role = roles.find((item) => item.id === roleId) ?? roles[0];
  const activeModule = modules[role.id].find((item) => item.code === activePage);
  const pageTitle = activePage === 'dashboard' ? 'Tổng quan' : activeModule?.title ?? 'Chức năng';
  const pageSubtitle = activePage === 'dashboard' ? role.subtitle : activeModule?.summary ?? role.subtitle;

  return (
    <ActiveChildProvider>
      <div className={`app-shell app-shell--${roleId}`}>
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <School size={24} />
            </div>
            <div>
              <strong>Trường học số</strong>
              <span>Quản lý tập trung</span>
            </div>
          </div>

          <SessionCard role={role} name={user.fullName} />
          <SidebarMenu role={role} activePage={activePage} onSelect={setActivePage} />
        </aside>

        <main className="workspace">
          <header className="topbar">
            <div>
              <h1>{pageTitle}</h1>
              <p>{pageSubtitle}</p>
            </div>
            <div className="topbar-actions">
              <button className="logout-btn" onClick={logout} title="Đăng xuất">
                <LogOut size={16} /> Đăng xuất
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
