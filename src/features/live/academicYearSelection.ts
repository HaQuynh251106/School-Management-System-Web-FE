import type { AcademicYear, SchoolClass, Semester } from '../../api/types';

export function isOperationalAcademicYear(year: AcademicYear) {
  return year.status === 'ACTIVE' || year.status === 'PLANNED';
}

export function operationalAcademicYears(years: AcademicYear[]) {
  return years.filter(isOperationalAcademicYear).slice().sort((left, right) => {
    const statusOrder = (status: string) => status === 'ACTIVE' ? 0 : 1;
    return statusOrder(left.status) - statusOrder(right.status)
      || String(right.startDate || right.code).localeCompare(String(left.startDate || left.code));
  });
}

export function closedAcademicYears(years: AcademicYear[]) {
  return years.filter((year) => year.status === 'CLOSED').slice()
    .sort((left, right) => String(right.startDate || right.code).localeCompare(String(left.startDate || left.code)));
}

export function resolveOperationalAcademicYearId(years: AcademicYear[], currentId?: string) {
  const operational = operationalAcademicYears(years);
  return operational.some((year) => year.id === currentId) ? currentId || '' : operational[0]?.id || '';
}

export function operationalYearLabel(year: AcademicYear) {
  return `${year.code} · ${year.status === 'ACTIVE' ? 'Đang hoạt động' : 'Sắp diễn ra'}`;
}

export function classesInAcademicYear(classes: SchoolClass[], academicYearId: string) {
  if (!academicYearId) return [];
  return classes.filter((schoolClass) => schoolClass.academicYearId === academicYearId);
}

export function semestersInAcademicYear(
  semesters: Semester[], academicYearId: string, includeClosed = false,
) {
  if (!academicYearId) return [];
  return semesters.filter((semester) => semester.academicYearId === academicYearId
    && (includeClosed || semester.status !== 'CLOSED'));
}

export function sameAcademicYearSelection(
  schoolClass: Pick<SchoolClass, 'academicYearId'> | undefined,
  semester: Pick<Semester, 'academicYearId'> | undefined,
) {
  return Boolean(schoolClass?.academicYearId && semester?.academicYearId
    && schoolClass.academicYearId === semester.academicYearId);
}
