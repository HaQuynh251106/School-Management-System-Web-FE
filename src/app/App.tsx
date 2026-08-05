import { useEffect, useState } from 'react';
import { Bell, CalendarDays, LogOut, Menu, Moon, School, Sun, X } from 'lucide-react';
import { roles, modules } from '../data/mockData';
import type { PageId, RoleId } from '../types';
import { SessionCard, SidebarMenu } from '../components/layout';
import { GeneralDashboard } from '../features/dashboard/GeneralDashboard';
import { FeaturePage } from '../features/FeaturePage';
import { useAuth } from '../api/auth';
import { LoginPage } from '../features/auth/LoginPage';
import { PasswordChangePage } from '../features/auth/PasswordChangePage';
import { AccountSecurityModal } from '../features/auth/AccountSecurityModal';
import { ActiveChildProvider } from '../api/activeChild';
import { useTheme } from '../api/theme';
import { PaymentReturnPage } from '../features/payment/PaymentReturnPage';
import { useApi } from '../api/useApi';
import type { Notification } from '../api/types';

export default function App() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const paymentReturn = new URLSearchParams(window.location.search).get('paymentReturn');
  const { data: unreadNotificationData, loading: unreadNotificationsLoading, reload: reloadUnreadNotifications } = useApi<Notification[]>(user ? '/notifications?unread=true' : null);
  const { data: financeUnreadData, reload: reloadFinanceUnread } = useApi<{ count: number }>(user?.role === 'PARENT' ? '/notifications/finance/unread-count' : null);

  // Reset về Dashboard mỗi khi đổi người đăng nhập (tránh giữ trang của vai trò cũ).
  useEffect(() => {
    setActivePage('dashboard');
    setSidebarOpen(false);
    setNotificationOpen(false);
  }, [user?.id]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        setNotificationOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    if (!user) return;
    const reloadNotifications = () => {
      reloadUnreadNotifications();
      reloadFinanceUnread();
    };
    const timer = window.setInterval(reloadNotifications, 10_000);
    window.addEventListener('focus', reloadNotifications);
    window.addEventListener('sse:notifications-changed', reloadNotifications);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', reloadNotifications);
      window.removeEventListener('sse:notifications-changed', reloadNotifications);
    };
  }, [user, reloadUnreadNotifications, reloadFinanceUnread]);

  if (paymentReturn) {
    return <PaymentReturnPage provider={paymentReturn} />;
  }
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
  const openNotification = (notification: Notification) => {
    const financeRelated = ['INVOICE', 'PAYMENT'].includes(notification.type)
      || ['INVOICE', 'PAYMENT_PROOF'].includes(notification.refType || '');
    const yearResult = notification.type === 'YEAR_RESULT' || notification.refType === 'YEAR_RESULT';
    if (yearResult) {
      selectPage(role.id === 'admin' ? 'A8' : role.id === 'student' ? 'C2' : role.id === 'parent' ? 'D2' : 'dashboard');
    } else if (financeRelated) {
      selectPage(role.id === 'admin' ? 'A7' : role.id === 'parent' ? 'D4' : 'dashboard');
    } else if (role.id === 'admin') {
      selectPage('A9');
    } else if (role.id === 'teacher') {
      selectPage('B7');
    } else if (role.id === 'student') {
      selectPage('C5');
    }
    setNotificationOpen(false);
  };
  const unreadCount = unreadNotificationData?.length || 0;
  const financeUnreadCount = financeUnreadData?.count || 0;

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
          <SidebarMenu role={role} activePage={activePage} onSelect={selectPage}
            badges={role.id === 'parent' ? { D4: financeUnreadCount } : {}} />
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
              <div className="topbar-notification">
                <button className="notification-bell" type="button" aria-label={`Thông báo, ${unreadCount} chưa đọc`} aria-expanded={notificationOpen} onClick={() => setNotificationOpen((open) => !open)}>
                  <Bell size={18} />
                  {unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}
                </button>
                {notificationOpen && (
                  <div className="notification-popover" role="dialog" aria-label="Thông báo mới">
                    <header><strong>Thông báo mới</strong><span>{unreadCount} chưa đọc</span></header>
                    <div className="notification-popover-list">
                      {(unreadNotificationData || []).slice(0, 6).map((notification) => (
                        <button type="button" key={notification.id} onClick={() => openNotification(notification)}>
                          <span>{notification.title}</span>
                          <small>{notification.body}</small>
                        </button>
                      ))}
                      {!unreadNotificationsLoading && unreadCount === 0 && <p>Không có thông báo mới</p>}
                    </div>
                  </div>
                )}
              </div>
              <button className="theme-toggle" type="button" onClick={toggleTheme} title={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'} aria-label={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'}>
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button className="topbar-profile" type="button" onClick={() => setSecurityOpen(true)} title="Bảo mật tài khoản">
                <span>{user.fullName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span>
                <div><strong>{user.fullName}</strong><small>{role.label}</small></div>
              </button>
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
      {securityOpen && <AccountSecurityModal onClose={() => setSecurityOpen(false)} />}
    </ActiveChildProvider>
  );
}
