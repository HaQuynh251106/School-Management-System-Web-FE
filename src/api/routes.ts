import type { PageId, RoleId } from '../types';

export const ROLE_PATHS: Record<RoleId, string> = {
  admin: 'quan-tri',
  teacher: 'giao-vien',
  student: 'hoc-sinh',
  parent: 'phu-huynh',
};

export const PAGE_PATHS: Record<RoleId, Record<string, string>> = {
  admin: {
    A1S: 'hoc-sinh',
    A1T: 'giao-vien',
    A1P: 'phu-huynh',
    A1A: 'cuu-hoc-sinh',
    A2: 'co-cau-phan-lop',
    A3: 'ke-hoach-thoi-khoa-bieu',
    A4: 'ky-thi',
    A5: 'tien-do-dao-tao',
    A6: 'lich-su-he-thong',
    A7: 'tai-chinh',
    A8: 'bao-cao-thong-ke',
    A9: 'trung-tam-thong-bao',
    A10: 'cau-lac-bo',
  },
  teacher: {
    B1: 'lop-duoc-phan-cong',
    B2: 'thoi-khoa-bieu',
    B3: 'diem-danh',
    B4: 'bang-diem',
    B5: 'bai-tap',
    B6: 'trao-doi',
    B7: 'thong-bao',
    B8: 'cong-no-lop-chu-nhiem',
    B9: 'duyet-don-xin-nghi',
    B10: 'bao-cao-giang-day',
    B11: 'ho-so-cai-dat',
    B12: 'khao-thi',
    B13: 'hanh-kiem-tong-ket',
    B14: 'tien-do-thuc-day',
  },
  student: {
    C1: 'ho-so-ca-nhan',
    C2: 'theo-doi-hoc-tap',
    C3: 'chuyen-can',
    C4: 'bai-tap',
    C5: 'thong-bao',
    C6: 'xin-nghi-hoc',
    C7: 'trao-doi',
    C8: 'bao-cao-ca-nhan',
    C9: 'ho-so-cai-dat',
    C10: 'thi-phuc-khao',
    C11: 'tong-ket-nam-hoc',
    C12: 'cau-lac-bo',
  },
  parent: {
    D1: 'chon-hoc-sinh',
    D2: 'hoc-tap-cua-con',
    D3: 'lien-lac-giao-vien-chu-nhiem',
    D4: 'hoc-phi-thanh-toan',
    D5: 'thong-bao',
    D6: 'xac-nhan-nghi-hoc',
    D7: 'bao-cao-cua-con',
    D8: 'ho-so-cai-dat',
    D9: 'lich-thi-cua-con',
    D10: 'tong-ket-nam-hoc',
    D11: 'cau-lac-bo-cua-con',
  },
};

const ROLE_BY_PATH = new Map(Object.entries(ROLE_PATHS).map(([role, path]) => [path, role as RoleId]));
const ROLE_BY_PAGE = new Map<string, RoleId>();
const PAGE_BY_ROUTE = new Map<string, PageId>();

Object.entries(PAGE_PATHS).forEach(([role, pages]) => {
  const roleId = role as RoleId;
  Object.entries(pages).forEach(([pageId, pagePath]) => {
    ROLE_BY_PAGE.set(pageId.toUpperCase(), roleId);
    PAGE_BY_ROUTE.set(`${ROLE_PATHS[roleId]}/${pagePath}`, pageId);
  });
});

export interface ResolvedPageRoute {
  roleId: RoleId | null;
  pageId: PageId;
  legacy: boolean;
}

function normalizePath(path: string) {
  return path.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
}

export function resolvePageRoute(path: string): ResolvedPageRoute | null {
  const normalized = normalizePath(path);
  if (!normalized || normalized === 'dashboard' || normalized === 'tong-quan') {
    return { roleId: null, pageId: 'dashboard', legacy: normalized !== '' };
  }
  if (normalized === 'dang-nhap') return null;

  const legacyPage = normalized.toUpperCase();
  const legacyRole = ROLE_BY_PAGE.get(legacyPage);
  if (legacyRole) return { roleId: legacyRole, pageId: legacyPage, legacy: true };

  const pageId = PAGE_BY_ROUTE.get(normalized);
  if (pageId) {
    const rolePath = normalized.split('/')[0];
    return { roleId: ROLE_BY_PATH.get(rolePath) ?? null, pageId, legacy: false };
  }

  const [rolePath, pagePath, ...rest] = normalized.split('/');
  const roleId = ROLE_BY_PATH.get(rolePath);
  if (roleId && pagePath === 'tong-quan' && rest.length === 0) {
    return { roleId, pageId: 'dashboard', legacy: false };
  }
  return null;
}

export function pagePath(roleId: RoleId, pageId: PageId) {
  if (pageId === 'dashboard') return `${ROLE_PATHS[roleId]}/tong-quan`;
  const path = PAGE_PATHS[roleId][pageId];
  return path ? `${ROLE_PATHS[roleId]}/${path}` : `${ROLE_PATHS[roleId]}/tong-quan`;
}

export function pageHash(roleId: RoleId, pageId: PageId, params?: URLSearchParams) {
  const query = params?.toString();
  return `#/${pagePath(roleId, pageId)}${query ? `?${query}` : ''}`;
}

export function loginHash() {
  return '#/dang-nhap';
}
