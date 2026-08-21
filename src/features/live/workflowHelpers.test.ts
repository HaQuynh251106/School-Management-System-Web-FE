import { describe, expect, it } from 'vitest';
import type { ApiUser, EducationProgram } from '../../api/types';
import {
  matchesStudentLinkSearch,
  mergeLinkedStudentIds,
  normalizeResponsibleTeacherIds,
  resolveNewPlanProgramId,
} from './workflowHelpers';

const programs = [
  { id: 'program-2018', code: 'GDPT2018', name: 'Chương trình 2018', status: 'ARCHIVED' },
  { id: 'program-active', code: 'GDPT2027', name: 'Chương trình đang áp dụng', status: 'ACTIVE' },
  { id: 'program-2026', code: 'GDPT2026', name: 'Chương trình 2026 vừa tạo', status: 'DRAFT' },
] as EducationProgram[];

describe('education and parent workflow helpers', () => {
  it('preserves a newly created draft program selected by the operator', () => {
    expect(resolveNewPlanProgramId(programs, 'program-2026')).toBe('program-2026');
  });

  it('uses the active program only when there is no valid explicit selection', () => {
    expect(resolveNewPlanProgramId(programs, '')).toBe('program-active');
    expect(resolveNewPlanProgramId(programs, 'missing-program')).toBe('program-active');
  });

  it('merges several selected children without creating duplicate links', () => {
    expect(mergeLinkedStudentIds(['student-1'], ['student-2', 'student-1', 'student-3']))
      .toEqual(['student-1', 'student-2', 'student-3']);
  });

  it('finds students by name, student code, username, or class', () => {
    const student = {
      id: 'student-1', fullName: 'Nguyễn Minh An', username: 'demo.hs.001',
      studentCode: 'HS270001', className: '10A1', role: 'STUDENT', status: 'ACTIVE',
    } as ApiUser;
    expect(matchesStudentLinkSearch(student, 'minh an')).toBe(true);
    expect(matchesStudentLinkSearch(student, 'hs270001')).toBe(true);
    expect(matchesStudentLinkSearch(student, '10a1')).toBe(true);
    expect(matchesStudentLinkSearch(student, '11a2')).toBe(false);
  });

  it('keeps multiple responsible teachers, removes duplicates, and supports legacy data', () => {
    expect(normalizeResponsibleTeacherIds(['teacher-1', 'teacher-2', 'teacher-1'], null))
      .toEqual(['teacher-1', 'teacher-2']);
    expect(normalizeResponsibleTeacherIds([], 'teacher-legacy')).toEqual(['teacher-legacy']);
  });
});
