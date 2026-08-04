import { useEffect } from 'react';
import { GraduationCap } from 'lucide-react';
import { useActiveChild } from '../api/activeChild';
import type { ApiUser } from '../api/types';
import { useApi } from '../api/useApi';

export function ParentChildContext() {
  const children = useApi<ApiUser[]>('/me/children');
  const { childId, setChildId } = useActiveChild();

  useEffect(() => {
    if (!children.data?.length) return;
    if (!childId || !children.data.some((child) => child.id === childId)) {
      setChildId(children.data[0].id);
    }
  }, [childId, children.data, setChildId]);

  if (children.loading) {
    return <div className="parent-context-switcher is-loading" aria-label="Đang tải danh sách học sinh">
      <GraduationCap size={17} /><span>Đang tải hồ sơ con…</span>
    </div>;
  }

  if (!children.data?.length) return null;

  return <label className="parent-context-switcher" title="Đổi học sinh đang theo dõi">
    <GraduationCap size={17} />
    <span><small>Đang theo dõi</small>
      <select value={childId || ''} onChange={(event) => setChildId(event.target.value || null)} aria-label="Chọn học sinh đang theo dõi">
        {children.data.map((child) => <option key={child.id} value={child.id}>{child.fullName} · {child.className || 'Chưa xếp lớp'}</option>)}
      </select>
    </span>
  </label>;
}
