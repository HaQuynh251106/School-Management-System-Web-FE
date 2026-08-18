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
import { api } from '../api/client';
import type { Notification } from '../api/types';
import { ShortcutFilterProvider } from '../api/shortcutFilter';
import { NotificationDetailDialog } from '../components/NotificationDetailDialog';

export default function App() {
  const { user, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [locallyReadNotificationIds, setLocallyReadNotificationIds] = useState<Set<string>>(() => new Set());
  const [securityOpen, setSecurityOpen] = useState(false);
  const [shortcutFilter, setShortcutFilter] = useState({ pageId: '', filter: '' });
  const paymentReturn = new URLSearchParams(window.location.search).get('paymentReturn');
  const { data: notificationData, loading: notificationsLoading, reload: reloadNotificationInbox } = useApi<Notification[]>(user ? '/notifications' : null);
  const { data: financeUnreadData, reload: reloadFinanceUnread } = useApi<{ count: number }>(user?.role === 'PARENT' ? '/notifications/finance/unread-count' : null);

  // Reset về Dashboard mỗi khi đổi người đăng nhập (tránh giữ trang của vai trò cũ).
  useEffect(() => {
    setActivePage('dashboard');
    setSidebarOpen(false);
    setNotificationOpen(false);
    setSelectedNotification(null);
    setLocallyReadNotificationIds(new Set());
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
    const refreshNotifications = () => {
      reloadNotificationInbox();
      reloadFinanceUnread();
    };
    const timer = window.setInterval(refreshNotifications, 10_000);
    window.addEventListener('focus', refreshNotifications);
    window.addEventListener('sse:notifications-changed', refreshNotifications);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshNotifications);
      window.removeEventListener('sse:notifications-changed', refreshNotifications);
    };
  }, [user, reloadNotificationInbox, reloadFinanceUnread]);

  useEffect(() => {
    const navigate = (event: Event) => {
      const detail = (event as CustomEvent<{ pageId?: string; filter?: string }>).detail;
      if (!detail?.pageId) return;
      setShortcutFilter({ pageId: detail.pageId, filter: detail.filter || '' });
      setActivePage(detail.pageId);
      setSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('sse:navigate', navigate);
    return () => window.removeEventListener('sse:navigate', navigate);
  }, []);

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
    setShortcutFilter({ pageId: '', filter: '' });
    setActivePage(page);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const notificationTarget = (notification: Notification): { pageId: PageId; label: string } | null => {
    const keys = [notification.type, notification.refType].filter(Boolean).map((value) => String(value).toUpperCase());
    const financeRelated = ['INVOICE', 'PAYMENT'].includes(notification.type)
      || ['INVOICE', 'PAYMENT_PROOF'].includes(notification.refType || '');
    const yearResult = notification.type === 'YEAR_RESULT' || notification.refType === 'YEAR_RESULT';
    if (yearResult) {
      return { pageId: role.id === 'admin' ? 'A8' : role.id === 'student' ? 'C2' : role.id === 'parent' ? 'D2' : 'dashboard', label: 'Xem kết quả năm học' };
    }
    if (financeRelated) return { pageId: role.id === 'admin' ? 'A7' : role.id === 'parent' ? 'D4' : 'dashboard', label: 'Mở mục học phí' };
    if (keys.some((key) => key.includes('ASSIGNMENT'))) return { pageId: role.id === 'teacher' ? 'B5' : role.id === 'student' ? 'C4' : role.id === 'parent' ? 'D2' : 'dashboard', label: 'Xem bài tập' };
    if (keys.some((key) => key.includes('ATTENDANCE'))) return { pageId: role.id === 'teacher' ? 'B3' : role.id === 'student' ? 'C3' : role.id === 'parent' ? 'D2' : 'dashboard', label: 'Xem chuyên cần' };
    if (keys.some((key) => key.includes('GRADE'))) return { pageId: role.id === 'teacher' ? 'B4' : role.id === 'student' ? 'C2' : role.id === 'parent' ? 'D2' : 'dashboard', label: 'Xem điểm số' };
    if (keys.some((key) => key.includes('TIMETABLE'))) return { pageId: role.id === 'teacher' ? 'B2' : role.id === 'student' ? 'C2' : role.id === 'parent' ? 'D2' : 'dashboard', label: 'Xem thời khóa biểu' };
    if (keys.some((key) => key.includes('CHAT'))) return { pageId: role.id === 'teacher' ? 'B6' : role.id === 'student' ? 'C7' : role.id === 'parent' ? 'D3' : 'dashboard', label: 'Mở trao đổi' };
    if (role.id === 'admin') return { pageId: 'A9', label: 'Mở trung tâm thông báo' };
    if (role.id === 'teacher') return { pageId: 'B10', label: 'Mở hộp thông báo' };
    if (role.id === 'student') return { pageId: 'C5', label: 'Mở hộp thông báo' };
    if (role.id === 'parent') return { pageId: 'D6', label: 'Mở hộp thông báo' };
    return null;
  };
  const unreadNotifications = (notificationData || []).filter((item) => !item.read && !locallyReadNotificationIds.has(item.id));
  const unreadCount = unreadNotifications.length;
  const markAllNotificationsRead = async () => {
    if (!unreadCount) return;
    const ids = unreadNotifications.map((item) => item.id);
    setLocallyReadNotificationIds((current) => new Set([...current, ...ids]));
    try {
      await api.post('/notifications/read-all');
      reloadNotificationInbox();
      reloadFinanceUnread();
      window.dispatchEvent(new Event('sse:notifications-changed'));
    } catch {
      setLocallyReadNotificationIds((current) => {
        const next = new Set(current);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };
  const toggleNotificationPopover = () => {
    if (notificationOpen) return setNotificationOpen(false);
    setNotificationOpen(true);
    void markAllNotificationsRead();
  };
  const openNotification = async (notification: Notification) => {
    setNotificationOpen(false);
    setSelectedNotification(notification);
    if (!notification.read && !locallyReadNotificationIds.has(notification.id)) {
      setLocallyReadNotificationIds((current) => new Set(current).add(notification.id));
      try {
        await api.post(`/notifications/${encodeURIComponent(notification.id)}/read`);
        reloadNotificationInbox();
        reloadFinanceUnread();
        window.dispatchEvent(new Event('sse:notifications-changed'));
      } catch {
        setLocallyReadNotificationIds((current) => {
          const next = new Set(current);
          next.delete(notification.id);
          return next;
        });
      }
    }
  };
  const selectedNotificationTarget = selectedNotification ? notificationTarget(selectedNotification) : null;
  const openSelectedNotificationTarget = () => {
    if (!selectedNotificationTarget) return;
    selectPage(selectedNotificationTarget.pageId);
    setSelectedNotification(null);
  };
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
          <SidebarMenu role={role} activePage={activePage} onSelect={(page) => {
            if (['B10', 'C5', 'D6'].includes(page)) void markAllNotificationsRead();
            selectPage(page);
          }}
            badges={role.id === 'teacher' ? { B10: unreadCount }
              : role.id === 'student' ? { C5: unreadCount }
                : role.id === 'parent' ? { D4: financeUnreadCount, D6: unreadCount }
                  : {}} />
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
                <button className="notification-bell" type="button" aria-label={`Thông báo, ${unreadCount} chưa đọc`} aria-expanded={notificationOpen} onClick={toggleNotificationPopover}>
                  <Bell size={18} />
                  {unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}
                </button>
                {notificationOpen && (
                  <div className="notification-popover" role="dialog" aria-label="Thông báo mới">
                    <header><strong>Thông báo gần đây</strong><span>{unreadCount ? `${unreadCount} chưa đọc` : 'Đã đọc hết'}</span></header>
                    <div className="notification-popover-list">
                      {(notificationData || []).slice(0, 6).map((notification) => (
                        <button type="button" className={!notification.read && !locallyReadNotificationIds.has(notification.id) ? 'is-unread' : ''} key={notification.id} onClick={() => void openNotification(notification)}>
                          <span>{notification.title}</span>
                          <small>{notification.body}</small>
                        </button>
                      ))}
                      {!notificationsLoading && (notificationData || []).length === 0 && <p>Chưa có thông báo</p>}
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
            <ShortcutFilterProvider value={shortcutFilter}>
              <FeaturePage module={activeModule} role={role} />
            </ShortcutFilterProvider>
          )}
        </main>
      </div>
      {securityOpen && <AccountSecurityModal onClose={() => setSecurityOpen(false)} />}
      {selectedNotification && <NotificationDetailDialog
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onOpenRelated={selectedNotificationTarget ? openSelectedNotificationTarget : undefined}
        relatedLabel={selectedNotificationTarget?.label}
      />}
    </ActiveChildProvider>
  );
}
