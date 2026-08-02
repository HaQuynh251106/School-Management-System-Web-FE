import { describe, expect, it } from 'vitest';
import type { AcademicYear } from '../../api/types';
import {
  classesInAcademicYear, closedAcademicYears, operationalAcademicYears,
  resolveOperationalAcademicYearId, sameAcademicYearSelection, semestersInAcademicYear,
} from './academicYearSelection';

const years: AcademicYear[] = [
  { id: 'closed', code: '2025-2026', name: 'Năm học 2025-2026', status: 'CLOSED', startDate: '2025-08-15' },
  { id: 'planned', code: '2027-2028', name: 'Năm học 2027-2028', status: 'PLANNED', startDate: '2027-08-15' },
  { id: 'active', code: '2026-2027', name: 'Năm học 2026-2027', status: 'ACTIVE', startDate: '2026-08-15' },
];

describe('academic year selection', () => {
  it('keeps closed years out of operational forms and prioritizes the active year', () => {
    expect(operationalAcademicYears(years).map((year) => year.id)).toEqual(['active', 'planned']);
    expect(closedAcademicYears(years).map((year) => year.id)).toEqual(['closed']);
  });

  it('redirects a missing or closed selection to the preferred operational year', () => {
    expect(resolveOperationalAcademicYearId(years, 'closed')).toBe('active');
    expect(resolveOperationalAcademicYearId(years, 'planned')).toBe('planned');
    expect(resolveOperationalAcademicYearId([years[0]], 'closed')).toBe('');
  });

  it('keeps class and semester choices inside one operational year', () => {
    const classes = [
      { id: 'old-class', code: '10A1', name: 'Lớp 10A1', academicYearId: 'closed', gradeLevel: 'K10', studentCount: 0, capacity: 40 },
      { id: 'new-class', code: '10A1', name: 'Lớp 10A1', academicYearId: 'active', gradeLevel: 'K10', studentCount: 0, capacity: 40 },
    ];
    const semesters = [
      { id: 'old-semester', code: 'HK1', name: 'Học kỳ 1', academicYearId: 'closed', status: 'CLOSED', sequence: 1 },
      { id: 'new-semester', code: 'HK1', name: 'Học kỳ 1', academicYearId: 'active', status: 'ACTIVE', sequence: 1 },
    ];

    expect(classesInAcademicYear(classes, 'active').map((item) => item.id)).toEqual(['new-class']);
    expect(semestersInAcademicYear(semesters, 'active').map((item) => item.id)).toEqual(['new-semester']);
    expect(sameAcademicYearSelection(classes[1], semesters[1])).toBe(true);
    expect(sameAcademicYearSelection(classes[0], semesters[1])).toBe(false);
  });
});
