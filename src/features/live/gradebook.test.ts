import { describe, expect, it } from 'vitest';
import type { ExamCategory } from '../../api/types';
import { gradeColumns, parseDelimitedGradeImport, scoreTone, weightedAverage } from './gradebook';

const categories: ExamCategory[] = [
  { id: 'oral', code: 'ORAL', name: 'Miệng', weight: 1, requiredCount: 1 },
  { id: '15m', code: '15M', name: '15 phút', weight: 1, requiredCount: 1 },
  { id: 'mid', code: 'MID', name: 'Giữa kỳ', weight: 2, requiredCount: 1 },
  { id: 'final', code: 'FINAL', name: 'Cuối kỳ', weight: 3, requiredCount: 1 },
];

describe('gradebook calculations', () => {
  it('calculates the semester score only when all required grades exist', () => {
    expect(weightedAverage([
      { category: 'ORAL', assessmentIndex: 1, score: 9 },
      { category: '15M', assessmentIndex: 1, score: 8.5 },
      { category: 'MID', assessmentIndex: 1, score: 7.5 },
      { category: 'FINAL', assessmentIndex: 1, score: 8 },
    ], categories)).toBe(8.1);
  });

  it('leaves the semester score blank while any required grade is missing', () => {
    expect(weightedAverage([
      { category: '15M', assessmentIndex: 1, score: 8.5 },
      { category: 'MID', score: 7.5 },
      { category: 'FINAL', score: 8 },
    ], categories)).toBeNull();
    expect(scoreTone(9)).toBe('excellent');
    expect(scoreTone(null)).toBe('empty');
  });

  it('shows one column for each configured score category', () => {
    expect(gradeColumns(categories).map((column) => column.label)).toEqual([
      'Miệng', '15 phút', 'Giữa kỳ', 'Cuối kỳ',
    ]);
  });

  it('previews a CSV grade import before changing the gradebook', () => {
    const preview = parseDelimitedGradeImport(
      'Mã học sinh;Miệng;15 phút;Giữa kỳ;Cuối kỳ\nHS001;8;9;7.5;8.5\nHS404;6;7;8;9',
      [{ id: 'student-1', studentCode: 'HS001', username: 'hs.001', fullName: 'Nguyễn An' }],
      gradeColumns(categories),
    );
    expect(preview.matchedStudents).toBe(1);
    expect(preview.validScores).toBe(4);
    expect(preview.changes['student-1:ORAL:1']).toBe('8');
    expect(preview.errors).toEqual([expect.stringContaining('HS404')]);
  });
});
