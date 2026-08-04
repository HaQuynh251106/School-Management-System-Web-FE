import type { AcademicYear, Semester } from '../api/types';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  PLANNED: 'Sắp diễn ra',
  CLOSED: 'Đã đóng',
  COMPLETED: 'Đã kết thúc',
  ARCHIVED: 'Đã lưu trữ',
};

function yearFor(semester: Semester, academicYears: AcademicYear[]) {
  return academicYears.find((year) => year.id === semester.academicYearId);
}

export function isSemesterReadOnly(semesterId: string, semesters: Semester[], academicYears: AcademicYear[]) {
  const semester = semesters.find((item) => item.id === semesterId);
  if (!semester) return false;
  const year = yearFor(semester, academicYears);
  return ['CLOSED', 'COMPLETED', 'ARCHIVED'].includes(String(semester.status).toUpperCase())
    || ['CLOSED', 'COMPLETED', 'ARCHIVED'].includes(String(year?.status).toUpperCase());
}

export function academicStatusLabel(status?: string | null) {
  return STATUS_LABELS[String(status || '').toUpperCase()] || status || 'Chưa xác định';
}

export function semesterScopeLabel(semester: Semester, academicYears: AcademicYear[]) {
  const year = yearFor(semester, academicYears);
  const yearLabel = year?.code || year?.name || 'Năm học chưa xác định';
  return `${yearLabel} · ${semester.name || semester.code} · ${academicStatusLabel(semester.status)}`;
}

export function preferredSemesterId(semesters: Semester[], academicYears: AcademicYear[]) {
  const activeYearIds = new Set(academicYears.filter((year) => year.status === 'ACTIVE').map((year) => year.id));
  const workingYearIds = new Set(academicYears.filter((year) => ['ACTIVE', 'PLANNED'].includes(year.status)).map((year) => year.id));
  return semesters.find((semester) => semester.status === 'ACTIVE' && activeYearIds.has(semester.academicYearId))?.id
    || semesters.find((semester) => semester.status === 'ACTIVE' && workingYearIds.has(semester.academicYearId))?.id
    || semesters.find((semester) => semester.status === 'PLANNED' && workingYearIds.has(semester.academicYearId))?.id
    || semesters.find((semester) => semester.status !== 'CLOSED')?.id
    || semesters[0]?.id
    || '';
}

export function AcademicScopeOptions({
  semesters,
  academicYears,
  placeholder,
}: {
  semesters: Semester[];
  academicYears: AcademicYear[];
  placeholder?: string;
}) {
  const working = semesters.filter((semester) => {
    const year = yearFor(semester, academicYears);
    return semester.status !== 'CLOSED' && year?.status !== 'CLOSED';
  });
  const history = semesters.filter((semester) => !working.includes(semester));

  const renderOptions = (items: Semester[]) => items.map((semester) => (
    <option key={semester.id} value={semester.id}>{semesterScopeLabel(semester, academicYears)}</option>
  ));

  return <>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {working.length > 0 && <optgroup label="Năm học đang làm việc">{renderOptions(working)}</optgroup>}
    {history.length > 0 && <optgroup label="Lịch sử — chỉ xem">{renderOptions(history)}</optgroup>}
  </>;
}
