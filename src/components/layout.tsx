import { useEffect, useState, type CSSProperties } from 'react';
import { BarChart3, BookOpenCheck, CalendarDays, ChevronDown, ChevronRight, ClipboardCheck, MessageSquareText, School, ShieldCheck, UsersRound, type LucideIcon } from 'lucide-react';
import { modules, roles } from '../data/mockData';
import type { TeacherWorkspaceContext } from '../api/types';
import type { ModuleItem, PageId, RoleDefinition, RoleId } from '../types';

export function SessionCard({ role, name, collapsed = false }: { role: RoleDefinition; name?: string; collapsed?: boolean }) {
  return (
    <div className="session-card" title={collapsed ? `${name ?? role.sessionName} · ${role.label}` : undefined} style={{ '--role-color': role.color } as CSSProperties}>
      <div className="session-avatar">
        <role.Icon size={20} />
      </div>
      <div>
        <strong>{name ?? role.sessionName}</strong>
        <small>{role.label}</small>
      </div>
    </div>
  );
}

function SidebarItemButton({ item, activePage, onSelect, badges, collapsed, nested = false, displayTitle = item.title }: {
  item: ModuleItem;
  activePage: PageId;
  onSelect: (page: PageId) => void;
  badges: Partial<Record<PageId, number>>;
  collapsed: boolean;
  nested?: boolean;
  displayTitle?: string;
}) {
  return (
    <button
      key={item.code}
      className={`menu-button ${nested ? 'menu-button--nested' : ''} ${activePage === item.code ? 'active' : ''}`}
      title={collapsed ? item.title : undefined}
      aria-label={collapsed ? item.title : undefined}
      aria-current={activePage === item.code ? 'page' : undefined}
      onClick={() => onSelect(item.code)}
    >
      <item.Icon size={nested ? 17 : 19} />
      <span><strong>{displayTitle}</strong></span>
      {(badges[item.code] ?? 0) > 0 && <b className="menu-unread-badge">{badges[item.code]! > 99 ? '99+' : badges[item.code]}</b>}
      {!nested && <ChevronRight size={16} />}
    </button>
  );
}

function SidebarGroup({ id, label, description, Icon, items, activePage, onSelect, badges, collapsed }: {
  id: string;
  label: string;
  description: string;
  Icon: LucideIcon;
  items: ModuleItem[];
  activePage: PageId;
  onSelect: (page: PageId) => void;
  badges: Partial<Record<PageId, number>>;
  collapsed: boolean;
}) {
  const active = items.some((item) => item.code === activePage);
  const storageKey = `school.sidebar.group.${id}.open`;
  const [open, setOpen] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored == null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(storageKey, String(next));
      } catch {
        // Trình duyệt có thể chặn localStorage; menu vẫn hoạt động trong phiên hiện tại.
      }
      return next;
    });
  };

  return (
    <div className={`menu-group ${active ? 'active' : ''} ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="menu-group-toggle"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        title={collapsed ? label.replace(/^\d+\.\s*/, '') : undefined}
        onClick={toggle}
      >
        <Icon size={19} />
        <span><strong>{label}</strong><small>{description}</small></span>
        <ChevronDown className="menu-group-chevron" size={16} />
      </button>
      <div id={`${id}-menu`} className="menu-group-children" hidden={!open && !collapsed}>
        {items.map((item) => (
          <SidebarItemButton
            key={item.code}
            item={item}
            activePage={activePage}
            onSelect={onSelect}
            badges={badges}
            collapsed={collapsed}
            nested
            displayTitle={item.title.replace(/^\d+\.\s*/, '')}
          />
        ))}
      </div>
    </div>
  );
}

export function SidebarMenu({
  role,
  activePage,
  onSelect,
  badges = {},
  collapsed = false,
  teacherContext,
}: {
  role: RoleDefinition;
  activePage: PageId;
  onSelect: (page: PageId) => void;
  badges?: Partial<Record<PageId, number>>;
  collapsed?: boolean;
  teacherContext?: TeacherWorkspaceContext | null;
}) {
  const adminUserItems = modules.admin.filter((item) => ['A1S', 'A1T', 'A1P', 'A1O'].includes(item.code));
  const adminOtherItems = modules.admin.filter((item) => !adminUserItems.some((userItem) => userItem.code === item.code));
  const academicOperations = modules.academic_staff.filter((item) => ['E1', 'E2', 'E3'].includes(item.code));
  const academicRecords = modules.academic_staff.filter((item) => ['E4', 'E5'].includes(item.code));
  const standardItems = modules[role.id].filter((item) => item.title !== 'Thông báo');
  const teacherItems = modules.teacher;
  const teacherTeaching = teacherItems.filter((item) => ['B2', 'B1', 'B3', 'B4', 'B5'].includes(item.code)
    || (item.code === 'B14' && teacherContext?.loadRegistrationVisible));
  const teacherWork = teacherItems.filter((item) => ['B10', 'B15', 'B16'].includes(item.code)
    || (item.code === 'B12' && teacherContext?.examResponsibilities));
  const teacherHomeroom = teacherContext?.homeroomTeacher
    ? teacherItems.filter((item) => ['B8', 'B9', 'B13'].includes(item.code))
    : [];
  const teacherCommunication = teacherItems.filter((item) => item.code === 'B6');

  const adminLabels: Record<string, string> = {
    A6: '3. Lịch sử hệ thống',
    A8: '4. Báo cáo & thống kê',
    A9: '5. Trung tâm thông báo',
  };

  return (
    <nav className="menu-nav" aria-label="Menu chức năng">
      <button title={collapsed ? 'Tổng quan' : undefined} aria-label={collapsed ? 'Tổng quan' : undefined} aria-current={activePage === 'dashboard' ? 'page' : undefined} className={`menu-button ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => onSelect('dashboard')}>
        <BarChart3 size={19} />
        <span>
          <strong>{['admin', 'academic_staff'].includes(role.id) ? '1. Tổng quan' : 'Tổng quan'}</strong>
        </span>
        <ChevronRight size={16} />
      </button>

      <div className="sidebar-section-title">Chức năng</div>

      {role.id === 'teacher' && teacherContext && <div
        className={`teacher-workspace-context ${teacherContext.homeroomTeacher ? 'is-homeroom' : ''}`}
        title={teacherContext.homeroomTeacher
          ? `Giáo viên chủ nhiệm: ${teacherContext.homeroomClasses.map((item) => item.code).join(', ')}`
          : 'Giáo viên bộ môn'}
      >
        <span><ShieldCheck size={17} /></span>
        <div><small>Phạm vi hiện tại</small><strong>{teacherContext.homeroomTeacher
          ? `GVCN ${teacherContext.homeroomClasses.map((item) => item.code).join(', ')}`
          : 'Giáo viên bộ môn'}</strong><em>{teacherContext.teachingClassCount} lớp giảng dạy</em></div>
      </div>}

      {role.id === 'admin' && <>
        <SidebarGroup id="admin-users" label="2. Người dùng" description="4 nhóm tài khoản" Icon={UsersRound} items={adminUserItems} activePage={activePage} onSelect={onSelect} badges={badges} collapsed={collapsed} />
        {adminOtherItems.map((item) => <SidebarItemButton key={item.code} item={item} activePage={activePage} onSelect={onSelect} badges={badges} collapsed={collapsed} displayTitle={adminLabels[item.code] ?? item.title} />)}
      </>}

      {role.id === 'academic_staff' && <>
        <SidebarGroup id="academic-operations" label="2. Vận hành học vụ" description="Chuẩn bị, phân công và kỳ thi" Icon={CalendarDays} items={academicOperations} activePage={activePage} onSelect={onSelect} badges={badges} collapsed={collapsed} />
        <SidebarGroup id="academic-records" label="3. Tổng kết & học bạ" description="Niên khóa và hồ sơ học tập" Icon={BookOpenCheck} items={academicRecords} activePage={activePage} onSelect={onSelect} badges={badges} collapsed={collapsed} />
      </>}

      {role.id === 'teacher' && <>
        <SidebarGroup id="teacher-teaching" label="Giảng dạy" description="Lịch, lớp, điểm và bài tập" Icon={School} items={teacherTeaching} activePage={activePage} onSelect={onSelect} badges={badges} collapsed={collapsed} />
        <SidebarGroup id="teacher-work" label="Công việc" description="Nhật ký, điều chỉnh lịch và khảo thí" Icon={ClipboardCheck} items={teacherWork} activePage={activePage} onSelect={onSelect} badges={badges} collapsed={collapsed} />
        {teacherHomeroom.length > 0 && <SidebarGroup id="teacher-homeroom" label="Lớp chủ nhiệm" description={teacherContext?.homeroomClasses.map((item) => item.code).join(', ') || 'Nghiệp vụ chủ nhiệm'} Icon={BookOpenCheck} items={teacherHomeroom} activePage={activePage} onSelect={onSelect} badges={badges} collapsed={collapsed} />}
        <SidebarGroup id="teacher-communication" label="Trao đổi" description="Tin nhắn theo phân công" Icon={MessageSquareText} items={teacherCommunication} activePage={activePage} onSelect={onSelect} badges={badges} collapsed={collapsed} />
      </>}

      {!['admin', 'academic_staff', 'teacher'].includes(role.id) && standardItems.map((item) => <SidebarItemButton key={item.code} item={item} activePage={activePage} onSelect={onSelect} badges={badges} collapsed={collapsed} />)}
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
          style={{ '--role-color': role.color } as CSSProperties}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
}
