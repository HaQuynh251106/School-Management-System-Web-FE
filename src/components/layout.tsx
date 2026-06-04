import type React from 'react';
import { BarChart3, ChevronRight } from 'lucide-react';
import { modules, roles } from '../data/mockData';
import type { PageId, RoleDefinition, RoleId } from '../types';

export function SessionCard({ role, name }: { role: RoleDefinition; name?: string }) {
  return (
    <div className="session-card" style={{ '--role-color': role.color } as React.CSSProperties}>
      <div className="session-avatar">
        <role.Icon size={20} />
      </div>
      <div>
        <span>Phiên đăng nhập</span>
        <strong>{name ?? role.sessionName}</strong>
        <small>{role.label}</small>
      </div>
    </div>
  );
}

export function SidebarMenu({
  role,
  activePage,
  onSelect,
}: {
  role: RoleDefinition;
  activePage: PageId;
  onSelect: (page: PageId) => void;
}) {
  return (
    <nav className="menu-nav" aria-label="Menu chức năng">
      <button className={`menu-button ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => onSelect('dashboard')}>
        <BarChart3 size={19} />
        <span>
          <strong>Dashboard</strong>
          <small>Tổng quan</small>
        </span>
        <ChevronRight size={16} />
      </button>

      <div className="sidebar-section-title">Menu {role.label}</div>
      {modules[role.id].map((item) => (
        <button
          key={item.code}
          className={`menu-button ${activePage === item.code ? 'active' : ''}`}
          onClick={() => onSelect(item.code)}
        >
          <item.Icon size={19} />
          <span>
            <strong>{item.title}</strong>
            <small>{item.code} · {item.phase}</small>
          </span>
          <ChevronRight size={16} />
        </button>
      ))}
    </nav>
  );
}

export function RoleSwitcher({ activeRole, onChange }: { activeRole: RoleId; onChange: (role: RoleId) => void }) {
  return (
    <div className="role-switcher" aria-label="Đổi phiên demo">
      {roles.map((role) => (
        <button
          key={role.id}
          className={activeRole === role.id ? 'active' : ''}
          onClick={() => onChange(role.id)}
          style={{ '--role-color': role.color } as React.CSSProperties}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
}
