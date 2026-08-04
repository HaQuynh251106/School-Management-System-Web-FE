import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ConductEvaluation, ReportCardView } from '../../api/types';
import { ConductEvaluationPanel } from './ReportCardsLive';

function cardWith(conductEvaluation: ConductEvaluation): ReportCardView {
  return { conductEvaluation } as ReportCardView;
}

const rules = {
  id: 'rules-1', academicYearId: 'year-1', semesterId: null, versionNo: 2, status: 'ACTIVE',
  attendanceWeight: 35, disciplineWeight: 30, responsibilityWeight: 20, participationWeight: 15,
  goodMin: 85, fairMin: 70, averageMin: 50, minAttendanceRecords: 10,
  minParticipationEvidence: 0, createdBy: 'academic-1', createdAt: '2026-08-01', activatedAt: '2026-08-01',
};

const readyEvaluation: ConductEvaluation = {
  id: 'evaluation-1', academicYearId: 'year-1', semesterId: null, studentId: 'student-1',
  studentName: 'Nguyễn An', classId: 'class-1', classCode: '10A1', ruleSet: rules,
  readiness: 'READY', missingData: [], suggestedScore: 95.5, suggestedGrade: 'GOOD',
  finalGrade: 'FAIR', overrideReason: 'GVCN ghi nhận sự tiến bộ chưa ổn định trong cả năm.',
  workflowStatus: 'DRAFT', decidedBy: 'teacher-1', decidedByName: 'Nguyễn Minh',
  decidedAt: '2026-08-01', calculatedAt: '2026-08-01', editableByHomeroom: true, audits: [],
  criteria: [{
    code: 'ATTENDANCE', label: 'Chuyên cần', weight: 35, rawScore: 100, weightedScore: 35,
    sufficient: true, summary: '8 có mặt · 2 có phép · 0 không phép · 0 đi muộn',
    evidence: [{
      id: 'attendance-excused', category: 'ATTENDANCE', impactPoints: 0,
      title: '2 lượt nghỉ có phép', description: 'Nghỉ có phép không bị trừ điểm rèn luyện',
      occurredOn: '2026-07-30', sourceType: 'SYSTEM', sourceRef: 'ATTENDANCE:EXCUSED',
      teacherId: 'SYSTEM', teacherName: 'Hệ thống', createdAt: '2026-08-01',
    }],
  }],
};

describe('ConductEvaluationPanel', () => {
  afterEach(cleanup);

  it('shows the explainable recommendation, excused-leave rule and homeroom override', () => {
    render(<ConductEvaluationPanel card={cardWith(readyEvaluation)} />);

    expect(screen.getByText('Tốt · 95.5/100')).toBeInTheDocument();
    expect(screen.getByText('GVCN quyết định: Khá')).toBeInTheDocument();
    expect(screen.getByText('2 lượt nghỉ có phép')).toBeInTheDocument();
    expect(screen.getByText('Nghỉ có phép không bị trừ điểm rèn luyện')).toBeInTheDocument();
    expect(screen.getByText(/sự tiến bộ chưa ổn định/)).toBeInTheDocument();
  });

  it('makes missing evidence explicit instead of producing a misleading grade', () => {
    render(<ConductEvaluationPanel card={cardWith({
      ...readyEvaluation,
      id: 'evaluation-2', readiness: 'INSUFFICIENT_DATA', suggestedScore: null,
      suggestedGrade: null, finalGrade: null, overrideReason: null,
      missingData: ['Chuyên cần mới có 3/10 lượt ghi nhận'],
      criteria: [{ ...readyEvaluation.criteria[0], rawScore: null, weightedScore: null, sufficient: false }],
    })} />);

    expect(screen.getByText('Chưa đủ căn cứ')).toBeInTheDocument();
    expect(screen.getByText('Cần bổ sung dữ liệu trước khi dùng đề xuất')).toBeInTheDocument();
    expect(screen.getByText('Chuyên cần mới có 3/10 lượt ghi nhận')).toBeInTheDocument();
  });
});
