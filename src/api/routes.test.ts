import { describe, expect, it } from 'vitest';
import { PAGE_PATHS, pageHash, pagePath, resolvePageRoute, ROLE_PATHS } from './routes';
import type { RoleId } from '../types';
import { modules } from '../data/mockData';

describe('semantic website routes', () => {
  it('covers every function displayed in the role menus', () => {
    Object.entries(modules).forEach(([role, items]) => {
      expect(Object.keys(PAGE_PATHS[role as RoleId]).sort()).toEqual(
        items.map((item) => item.code).sort(),
      );
    });
  });

  it('provides a unique contextual URL for every role page', () => {
    const paths = Object.entries(PAGE_PATHS).flatMap(([role, pages]) =>
      Object.keys(pages).map((pageId) => pagePath(role as RoleId, pageId)));

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).not.toContain(expect.stringMatching(/\/[abcd]\d/i));
  });

  it('round-trips every canonical route to its internal page id', () => {
    Object.entries(PAGE_PATHS).forEach(([role, pages]) => {
      Object.keys(pages).forEach((pageId) => {
        expect(resolvePageRoute(pagePath(role as RoleId, pageId))).toEqual({
          roleId: role,
          pageId,
          legacy: false,
        });
      });
    });
  });

  it('creates contextual dashboard routes for all roles', () => {
    Object.entries(ROLE_PATHS).forEach(([role, rolePath]) => {
      expect(pagePath(role as RoleId, 'dashboard')).toBe(`${rolePath}/tong-quan`);
      expect(resolvePageRoute(`${rolePath}/tong-quan`)).toEqual({
        roleId: role,
        pageId: 'dashboard',
        legacy: false,
      });
    });
  });

  it('keeps old page-code links working for existing bookmarks', () => {
    expect(resolvePageRoute('F1')).toEqual({
      roleId: 'accountant',
      pageId: 'F1',
      legacy: true,
    });
    expect(resolvePageRoute('B3')).toEqual({
      roleId: 'teacher',
      pageId: 'B3',
      legacy: true,
    });
  });

  it('publishes the teacher lesson diary and schedule-change workspace on a semantic URL', () => {
    expect(pagePath('teacher', 'B15')).toBe('giao-vien/so-dau-bai-dieu-chinh-lich');
    expect(resolvePageRoute('giao-vien/so-dau-bai-dieu-chinh-lich')).toEqual({
      roleId: 'teacher',
      pageId: 'B15',
      legacy: false,
    });
  });

  it('publishes student-support history on a filterable teacher URL', () => {
    expect(pageHash('teacher', 'B16', new URLSearchParams({ class: '10a1', student: 'hs-1' })))
      .toBe('#/giao-vien/ho-tro-hoc-sinh?class=10a1&student=hs-1');
    expect(resolvePageRoute('giao-vien/ho-tro-hoc-sinh')).toEqual({
      roleId: 'teacher', pageId: 'B16', legacy: false,
    });
  });

  it('does not expose the alumni workspace to the admin role', () => {
    expect(PAGE_PATHS.admin).not.toHaveProperty('A1A');
    expect(resolvePageRoute('quan-tri/cuu-hoc-sinh')).toBeNull();
  });

  it('preserves filters and pagination in a semantic URL', () => {
    expect(pageHash('accountant', 'F1', new URLSearchParams({
      page: '2',
      status: 'OVERDUE',
    }))).toBe('#/ke-toan/tai-chinh-noi-bo?page=2&status=OVERDUE');
  });
});
