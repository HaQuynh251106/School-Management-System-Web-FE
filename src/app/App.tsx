import { lazy, Suspense, useEffect, useState } from 'react';
import { Bell, CalendarDays, LogOut, Menu, MessageCircleMore, Moon, School, Sun, X } from 'lucide-react';
import { roles, modules } from '../data/mockData';
import type { PageId, RoleId } from '../types';
import { SessionCard, SidebarMenu } from '../components/layout';
import { useAuth } from '../api/auth';
import { ActiveChildProvider } from '../api/activeChild';
import { useTheme } from '../api/theme';
import { useApi } from '../api/useApi';
import type { UnreadCount } from '../api/types';
import { CHAT_UNREAD_CHANGED, NOTIFICATION_INBOX_CHANGED } from '../api/liveEvents';

const GeneralDashboard = lazy(() => import('../features/dashboard/GeneralDashboard').then((module) => ({ default: module.GeneralDashboard })));
const FeaturePage = lazy(() => import('../features/FeaturePage').then((module) => ({ default: module.FeaturePage })));
const LoginPage = lazy(() => import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const PasswordChangePage = lazy(() => import('../features/auth/PasswordChangePage').then((module) => ({ default: module.PasswordChangePage })));

function PageLoading() {
  return <div className="login-screen"><div className="login-loading">Đang tải nội dung…</div></div>;
}

function pageFromLocation(): PageId {
  const value = window.location.hash.replace(/^#\/?/, '').trim();
  return (value || 'dashboard') as PageId;
}

function pageAllowed(page: PageId, roleId: RoleId) {
  return page === 'dashboard' || modules[roleId].some((item) => item.code === page);
}

export default function App() {
  const { user, loading, logout } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const { theme, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState<PageId>(pageFromLocation);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notificationBadgeEnabled = Boolean(user && user.role !== 'ADMIN');
  const { data: notificationUnread, reload: reloadNotifications } = useApi<UnreadCount>(notificationBadgeEnabled ? '/notifications/unread-count' : null);
  const chatEnabled = Boolean(user && user.role !== 'ADMIN');
  const { data: chatUnread, reload: reloadChatUnread } = useApi<UnreadCount>(chatEnabled ? '/chat/unread-count' : null);

  // Khôi phục deep-link nếu trang thuộc vai trò hiện tại; nếu không thì về Tổng quan.
  useEffect(() => {
    if (!userRole) return;
    const roleId = userRole.toLowerCase() as RoleId;
    const requested = pageFromLocation();
    const next = pageAllowed(requested, roleId) ? requested : 'dashboard';
    setActivePage(next);
    if (requested !== next || !window.location.hash) {
      window.history.replaceState(null, '', `#/${next}`);
    }
    setSidebarOpen(false);
  }, [userId, userRole]);

  useEffect(() => {
    if (!userRole) return;
    const roleId = userRole.toLowerCase() as RoleId;
    const syncFromLocation = () => {
      const requested = pageFromLocation();
      const next = pageAllowed(requested, roleId) ? requested : 'dashboard';
      setActivePage(next);
      setSidebarOpen(false);
      if (requested !== next) window.history.replaceState(null, '', `#/${next}`);
    };
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('hashchange', syncFromLocation);
    };
  }, [userId, userRole]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    if (!notificationBadgeEnabled) return;
    const timer = window.setInterval(reloadNotifications, 60_000);
    window.addEventListener('focus', reloadNotifications);
    window.addEventListener(NOTIFICATION_INBOX_CHANGED, reloadNotifications);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', reloadNotifications);
      window.removeEventListener(NOTIFICATION_INBOX_CHANGED, reloadNotifications);
    };
  }, [notificationBadgeEnabled, reloadNotifications]);

  useEffect(() => {
    if (!chatEnabled) return;
    const timer = window.setInterval(reloadChatUnread, 15_000);
    window.addEventListener('focus', reloadChatUnread);
    window.addEventListener(CHAT_UNREAD_CHANGED, reloadChatUnread);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', reloadChatUnread);
      window.removeEventListener(CHAT_UNREAD_CHANGED, reloadChatUnread);
    };
  }, [chatEnabled, reloadChatUnread]);

  if (loading) {
    return <div className="login-screen"><div className="login-loading">Đang tải phiên đăng nhập…</div></div>;
  }
  if (!user) {
    return <Suspense fallback={<PageLoading />}><LoginPage /></Suspense>;
  }
  if (user.passwordChangeRequired) {
    return <Suspense fallback={<PageLoading />}><PasswordChangePage /></Suspense>;
  }

  const roleId = user.role.toLowerCase() as RoleId;
  const role = roles.find((item) => item.id === roleId) ?? roles[0];
  const notificationPage: Record<RoleId, PageId> = { admin: 'A9', teacher: 'B7', student: 'C5', parent: 'D5' };
  const chatPage: Partial<Record<RoleId, PageId>> = { teacher: 'B6', student: 'C7', parent: 'D3' };
  const unreadNotifications = notificationUnread?.count ?? 0;
  const unreadMessages = chatUnread?.count ?? 0;
  const activeModule = modules[role.id].find((item) => item.code === activePage);
  const pageTitle = activePage === 'dashboard' ? 'Tổng quan' : activeModule?.title ?? 'Chức năng';
  const pageSubtitle = activePage === 'dashboard' ? role.subtitle : activeModule?.summary ?? role.subtitle;
  const today = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date());
  const selectPage = (page: PageId) => {
    if (page !== activePage) window.history.pushState(null, '', `#/${page}`);
    setActivePage(page);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ActiveChildProvider scopeKey={user.id}>
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
          <SidebarMenu
            role={role}
            activePage={activePage}
            onSelect={selectPage}
            badges={{ [notificationPage[roleId]]: unreadNotifications, ...(chatPage[roleId] ? { [chatPage[roleId]!]: unreadMessages } : {}) }}
          />
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
              <button
                className={`topbar-notification ${unreadNotifications > 0 ? 'has-unread' : ''} ${activePage === notificationPage[roleId] ? 'active' : ''}`}
                type="button"
                onClick={() => selectPage(notificationPage[roleId])}
                title={unreadNotifications > 0 ? `${unreadNotifications} thông báo chưa đọc` : 'Không có thông báo mới'}
                aria-label={unreadNotifications > 0 ? `Mở thông báo, có ${unreadNotifications} thông báo chưa đọc` : 'Mở thông báo'}
              >
                <Bell size={19} />
                {unreadNotifications > 0 && <>
                  <span className="notification-pulse" aria-hidden="true" />
                  <strong>{unreadNotifications > 99 ? '99+' : unreadNotifications}</strong>
                </>}
              </button>
              {chatPage[roleId] && <button
                className={`topbar-chat ${unreadMessages > 0 ? 'has-unread' : ''} ${activePage === chatPage[roleId] ? 'active' : ''}`}
                type="button"
                onClick={() => selectPage(chatPage[roleId]!)}
                title={unreadMessages > 0 ? `${unreadMessages} tin nhắn chưa đọc` : 'Mở trao đổi tin nhắn'}
                aria-label={unreadMessages > 0 ? `Mở trao đổi, có ${unreadMessages} tin nhắn chưa đọc` : 'Mở trao đổi tin nhắn'}
              >
                <MessageCircleMore size={19} />
                {unreadMessages > 0 && <>
                  <span className="notification-pulse" aria-hidden="true" />
                  <strong>{unreadMessages > 99 ? '99+' : unreadMessages}</strong>
                </>}
              </button>}
              <div className="topbar-profile">
                <span>{user.fullName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span>
                <div><strong>{user.fullName}</strong><small>{role.label}</small></div>
              </div>
              <button className="logout-btn" onClick={logout} title="Đăng xuất" aria-label="Đăng xuất">
                <LogOut size={17} /><span>Đăng xuất</span>
              </button>
            </div>
          </header>

          <Suspense fallback={<PageLoading />}>
            {activePage === 'dashboard' ? (
              <GeneralDashboard roleId={role.id} onNavigate={selectPage} />
            ) : (
              <FeaturePage module={activeModule} role={role} />
            )}
          </Suspense>
        </main>
      </div>
    </ActiveChildProvider>
  );
}
