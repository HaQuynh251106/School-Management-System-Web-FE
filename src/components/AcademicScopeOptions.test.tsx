import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AcademicYear, Semester } from '../api/types';
import { AcademicScopeOptions, isSemesterReadOnly, preferredSemesterId, semesterScopeLabel } from './AcademicScopeOptions';

const years: AcademicYear[] = [
  { id: 'year-current', code: '2026-2027', name: 'Năm học 2026-2027', status: 'ACTIVE' },
  { id: 'year-old', code: '2025-2026', name: 'Năm học 2025-2026', status: 'CLOSED' },
];
const semesters: Semester[] = [
  { id: 'old-semester', academicYearId: 'year-old', code: 'HK1', name: 'Học kỳ 1', sequence: 1, status: 'CLOSED' },
  { id: 'current-semester', academicYearId: 'year-current', code: 'HK1', name: 'Học kỳ 1', sequence: 1, status: 'ACTIVE' },
  { id: 'next-semester', academicYearId: 'year-current', code: 'HK2', name: 'Học kỳ 2', sequence: 2, status: 'PLANNED' },
];

describe('AcademicScopeOptions', () => {
  it('uses an unambiguous year, semester and status label', () => {
    expect(semesterScopeLabel(semesters[1], years)).toBe('2026-2027 · Học kỳ 1 · Đang hoạt động');
  });

  it('prefers the active semester in the active academic year', () => {
    expect(preferredSemesterId(semesters, years)).toBe('current-semester');
  });

  it('separates working data from read-only history', () => {
    render(<select aria-label="Học kỳ"><AcademicScopeOptions semesters={semesters} academicYears={years} /></select>);
    expect(screen.getByRole('group', { name: 'Năm học đang làm việc' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Lịch sử — chỉ xem' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2025-2026 · Học kỳ 1 · Đã đóng' })).toBeInTheDocument();
  });

  it('marks a closed semester or closed academic year as read-only', () => {
    expect(isSemesterReadOnly('old-semester', semesters, years)).toBe(true);
    expect(isSemesterReadOnly('current-semester', semesters, years)).toBe(false);
  });
});
