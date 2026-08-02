import type { ExamCategory, Grade } from '../../api/types';

export function requiredGradeCount(category: ExamCategory) {
  if (category.requiredCount && category.requiredCount > 0) return category.requiredCount;
  return 1;
}

export function gradeColumns(categories: ExamCategory[]) {
  return categories.flatMap((category) => Array.from(
    { length: requiredGradeCount(category) },
    (_, offset) => ({
      category,
      assessmentIndex: offset + 1,
      label: requiredGradeCount(category) > 1 ? `${category.name} ${offset + 1}` : category.name,
    }),
  ));
}

export function gradeKey(studentId: string, category: string, assessmentIndex = 1) {
  return `${studentId}:${category}:${assessmentIndex}`;
}

export function weightedAverage(
  values: Array<Pick<Grade, 'category' | 'score'> & Partial<Pick<Grade, 'assessmentIndex'>>>,
  categories: ExamCategory[],
) {
  if (!categories.length) return null;
  const weights = new Map(categories.map((category) => [category.code, category.weight || 1]));
  const categoryMap = new Map(categories.map((category) => [category.code, category]));
  const validValues = values.filter((grade) => {
    if (!Number.isFinite(grade.score)) return false;
    const category = categoryMap.get(grade.category);
    return category != null && (grade.assessmentIndex ?? 1) <= requiredGradeCount(category);
  });

  const complete = categories.every((category) => {
    const indexes = new Set(validValues
      .filter((grade) => grade.category === category.code)
      .map((grade) => grade.assessmentIndex ?? 1));
    return indexes.size >= requiredGradeCount(category);
  });
  if (!complete) return null;

  let total = 0;
  let totalWeight = 0;

  validValues.forEach((grade) => {
    const weight = weights.get(grade.category) ?? 1;
    total += grade.score * weight;
    totalWeight += weight;
  });

  return totalWeight ? Math.round((total / totalWeight) * 10) / 10 : null;
}

export function scoreTone(score: number | null) {
  if (score == null) return 'empty';
  if (score >= 8) return 'excellent';
  if (score >= 6.5) return 'good';
  if (score >= 5) return 'average';
  return 'needs-attention';
}

export function formatScore(score: number | null) {
  return score == null ? '—' : score.toFixed(1);
}

export type GradeImportStudent = {
  id: string;
  studentCode?: string | null;
  username: string;
  fullName: string;
};

export type GradeImportColumn = ReturnType<typeof gradeColumns>[number];

export type GradeImportPreview = {
  changes: Record<string, string>;
  rows: number;
  matchedStudents: number;
  validScores: number;
  errors: string[];
};

function importKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim()); current = '';
    } else current += character;
  }
  cells.push(current.trim());
  return cells;
}

export function parseDelimitedGradeImport(
  content: string,
  students: GradeImportStudent[],
  columns: GradeImportColumn[],
): GradeImportPreview {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { changes: {}, rows: 0, matchedStudents: 0, validScores: 0, errors: ['Tệp cần có hàng tiêu đề và ít nhất một học sinh.'] };
  const delimiter = [';', '\t', ','].sort((left, right) =>
    lines[0].split(right).length - lines[0].split(left).length)[0];
  const headers = parseDelimitedLine(lines[0], delimiter).map(importKey);
  const studentColumn = headers.findIndex((header) => ['mahocsinh', 'studentcode', 'username', 'tendangnhap'].includes(header));
  if (studentColumn < 0) return { changes: {}, rows: lines.length - 1, matchedStudents: 0, validScores: 0, errors: ['Không tìm thấy cột Mã học sinh hoặc Tên đăng nhập.'] };

  const studentByCode = new Map<string, GradeImportStudent>();
  students.forEach((student) => {
    if (student.studentCode) studentByCode.set(importKey(student.studentCode), student);
    studentByCode.set(importKey(student.username), student);
  });
  const indexedColumns = columns.map((column) => {
    const aliases = new Set([
      importKey(column.label),
      importKey(`${column.category.code}${column.assessmentIndex}`),
      ...(column.assessmentIndex === 1 ? [importKey(column.category.code)] : []),
    ]);
    return { column, index: headers.findIndex((header) => aliases.has(header)) };
  }).filter((entry) => entry.index >= 0);
  if (!indexedColumns.length) return { changes: {}, rows: lines.length - 1, matchedStudents: 0, validScores: 0, errors: ['Không có cột điểm nào khớp cấu hình sổ điểm hiện tại.'] };

  const changes: Record<string, string> = {};
  const errors: string[] = [];
  let matchedStudents = 0;
  let validScores = 0;
  lines.slice(1).forEach((line, offset) => {
    const cells = parseDelimitedLine(line, delimiter);
    const identity = cells[studentColumn] || '';
    const student = studentByCode.get(importKey(identity));
    if (!student) { errors.push(`Dòng ${offset + 2}: Không tìm thấy học sinh “${identity || 'trống'}”.`); return; }
    matchedStudents += 1;
    indexedColumns.forEach(({ column, index }) => {
      const raw = (cells[index] || '').replace(',', '.').trim();
      if (!raw) return;
      const score = Number(raw);
      if (!Number.isFinite(score) || score < 0 || score > 10) {
        errors.push(`Dòng ${offset + 2}, ${column.label}: Điểm “${cells[index]}” không hợp lệ.`);
        return;
      }
      changes[gradeKey(student.id, column.category.code, column.assessmentIndex)] = String(score);
      validScores += 1;
    });
  });
  return { changes, rows: lines.length - 1, matchedStudents, validScores, errors };
}
