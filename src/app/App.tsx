import { useState } from 'react';
import { Bell, Filter, School, Search } from 'lucide-react';
import { roles, modules } from '../data/mockData';
import type { PageId, RoleId } from '../types';
import { SessionCard, SidebarMenu, RoleSwitcher } from '../components/layout';
import { GeneralDashboard } from '../features/dashboard/GeneralDashboard';
import { FeaturePage } from '../features/FeaturePage';

export default function App() {
  const [activeRole, setActiveRole] = useState<RoleId>('admin');
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const role = roles.find((item) => item.id === activeRole) ?? roles[0];
  const activeModule = modules[role.id].find((item) => item.code === activePage);
  const pageTitle = activePage === 'dashboard' ? `Dashboard ${role.label}` : activeModule?.title ?? 'Chức năng';
  const pageSubtitle = activePage === 'dashboard' ? role.subtitle : activeModule?.summary ?? role.subtitle;

  const switchRole = (nextRole: RoleId) => {
    setActiveRole(nextRole);
    setActivePage('dashboard');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <School size={24} />
          </div>
          <div>
            <strong>SSE</strong>
            <span>Smart School Ecosystem</span>
          </div>
        </div>

        <SessionCard role={role} />
        <SidebarMenu role={role} activePage={activePage} onSelect={setActivePage} />
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">ReactJS Web Console</span>
            <h1>{pageTitle}</h1>
            <p>{pageSubtitle}</p>
          </div>
          <div className="topbar-actions">
            <RoleSwitcher activeRole={activeRole} onChange={switchRole} />
            <label className="search-box">
              <Search size={18} />
              <input aria-label="Tìm kiếm" placeholder="Tìm học sinh, lớp, hóa đơn..." />
            </label>
            <button className="icon-button" aria-label="Lọc dữ liệu" title="Lọc dữ liệu">
              <Filter size={18} />
            </button>
            <button className="icon-button has-dot" aria-label="Thông báo" title="Thông báo">
              <Bell size={18} />
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
  );
}
