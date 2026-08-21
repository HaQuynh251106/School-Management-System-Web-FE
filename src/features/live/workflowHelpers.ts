import type { ApiUser, EducationProgram } from '../../api/types';

export function resolveNewPlanProgramId(
  programs: EducationProgram[],
  currentProgramId: string,
) {
  const current = programs.find((item) => item.id === currentProgramId);
  // Preserve the operator's explicit choice, including a newly created DRAFT
  // program. A plan may be prepared against that program while it is being
  // configured; publication validation is responsible for requiring ACTIVE.
  if (current) return current.id;
  return programs.find((item) => item.status === 'ACTIVE')?.id
    || programs[0]?.id
    || '';
}

export function mergeLinkedStudentIds(existing: string[], selected: string[]) {
  return [...new Set([...existing, ...selected].map((id) => id.trim()).filter(Boolean))];
}

export function matchesStudentLinkSearch(student: ApiUser, search: string) {
  const keyword = search.trim().toLocaleLowerCase('vi');
  if (!keyword) return true;
  return `${student.fullName} ${student.studentCode || ''} ${student.username} ${student.className || ''}`
    .toLocaleLowerCase('vi')
    .includes(keyword);
}

export function normalizeResponsibleTeacherIds(
  teacherIds: string[] | null | undefined,
  legacyTeacherId?: string | null,
) {
  const normalized = (teacherIds || [])
    .map((id) => id.trim())
    .filter(Boolean);
  if (!normalized.length && legacyTeacherId?.trim()) normalized.push(legacyTeacherId.trim());
  return [...new Set(normalized)];
}
