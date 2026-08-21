import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GeneralDashboard } from './GeneralDashboard';

const dataByPath = vi.hoisted(() => ({
  '/dashboard': { metrics: [], charts: [], shortcuts: [] },
  '/users': [
    { id: 'teacher-1', username: 'teacher.one', fullName: 'Giáo viên Demo', role: 'TEACHER', status: 'ACTIVE' },
  ],
  '/academic-years': [
    { id: 'year-old', code: '2026-2027', name: 'Năm cũ', status: 'CLOSED' },
    { id: 'year-active', code: '2027-2028', name: 'Năm hiện tại', status: 'ACTIVE' },
  ],
  '/classes': [
    { id: 'class-old', code: '9A1', name: 'Lớp cũ', gradeLevel: 'K9', academicYearId: 'year-old', studentCount: 1 },
    { id: 'class-current', code: '10A1', name: 'Lớp 10A1', gradeLevel: 'K10', academicYearId: 'year-active', homeroomTeacherId: 'teacher-1', studentCount: 10 },
  ],
  '/notifications': [],
} as Record<string, unknown>));

vi.mock('../../api/auth', () => ({
  useAuth: () => ({ user: { id: 'admin-1', fullName: 'Quản trị Demo', role: 'ADMIN' } }),
}));

vi.mock('../../api/useApi', () => ({
  useApi: (path: string | null) => ({
    data: path ? dataByPath[path] : null,
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));

describe('GeneralDashboard class table', () => {
  it('shows only the active academic year and resolves the homeroom teacher name', () => {
    render(<GeneralDashboard roleId="admin" />);

    const classRow = screen.getByText('10A1').closest('tr');
    expect(classRow).not.toBeNull();
    expect(within(classRow!).getByText('Giáo viên Demo')).toBeInTheDocument();
    expect(screen.queryByText('9A1')).not.toBeInTheDocument();
  });
});
