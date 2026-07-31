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
