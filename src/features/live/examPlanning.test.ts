import { describe, expect, it } from 'vitest';
import type { ExamOrganizationReadiness, ExamSeatingPlan } from '../../api/types';
import { canApplyExamPlan, examPlanStatusLabel } from './examPlanning';

const readiness: ExamOrganizationReadiness = {
  candidateCount: 60, allocatedCount: 0, totalCapacity: 60, proctoredCapacity: 60,
  roomCount: 2, proctoredRoomCount: 2, missingSeats: 0, missingCandidates: 60,
  roomsReady: true, candidatesReady: false, warnings: [],
};

const plan: ExamSeatingPlan = {
  id: 'plan-1', scheduleId: 'schedule-1', status: 'PREVIEW', candidateCount: 60,
  totalCapacity: 60, assignedCount: 60, unassignedCount: 0, createdAt: '2026-08-01T00:00:00Z',
  rooms: [], classes: [], candidates: [],
};

describe('exam planning safeguards', () => {
  it('only allows applying a complete preview when rooms and proctors are ready', () => {
    expect(canApplyExamPlan(readiness, plan)).toBe(true);
    expect(canApplyExamPlan({ ...readiness, roomsReady: false }, plan)).toBe(false);
    expect(canApplyExamPlan(readiness, { ...plan, unassignedCount: 1, assignedCount: 59 })).toBe(false);
    expect(canApplyExamPlan(readiness, { ...plan, status: 'APPLIED' })).toBe(false);
  });

  it('uses clear Vietnamese labels for every persisted plan state', () => {
    expect(examPlanStatusLabel('PREVIEW')).toBe('Bản xem trước');
    expect(examPlanStatusLabel('APPLIED')).toBe('Đã áp dụng');
    expect(examPlanStatusLabel('UNDONE')).toBe('Đã hoàn tác');
    expect(examPlanStatusLabel('SUPERSEDED')).toBe('Đã thay thế');
  });
});
