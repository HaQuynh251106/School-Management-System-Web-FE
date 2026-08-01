import { describe, expect, it } from 'vitest';
import type { ExamOrganizationPlan } from '../../api/types';
import { canApplyExamOrganizationPlan, desksNeeded } from './examOrganizationPlanning';

const plan = {
  id: 'plan-1', scheduleId: 'schedule-1', status: 'PREVIEW', maxCandidatesPerRoom: 20,
  studentsPerDesk: 1, includeSecondProctor: false, candidateCount: 20, roomCount: 1,
  effectiveCapacity: 20, assignedCount: 20, missingAssignmentCount: 0, createdAt: '2026-08-01T00:00:00Z',
  rooms: [{ roomId: 'room-1', roomCode: 'A101', physicalCapacity: 45, effectiveCapacity: 20,
    deskCount: 20, proctorOneId: 'teacher-1', proctorOneName: 'Giáo viên 1', candidateCount: 20, ready: true }],
  candidates: Array.from({ length: 20 }, (_, index) => ({ studentId: `student-${index}`, studentName: `HS ${index}`,
    classId: 'class-1', classCode: '10A1', candidateNo: String(index + 1).padStart(6, '0'),
    roomId: 'room-1', roomCode: 'A101', seatNo: index + 1, deskNo: index + 1, seatPosition: 1 })),
} satisfies ExamOrganizationPlan;

describe('exam organization planning', () => {
  it('calculates desks from the selected seating policy', () => {
    expect(desksNeeded(20, 1)).toBe(20);
    expect(desksNeeded(20, 2)).toBe(10);
    expect(desksNeeded(21, 2)).toBe(11);
  });

  it('only enables the atomic apply action for a complete valid preview', () => {
    expect(canApplyExamOrganizationPlan(plan)).toBe(true);
    expect(canApplyExamOrganizationPlan({ ...plan, missingAssignmentCount: 1 })).toBe(false);
    expect(canApplyExamOrganizationPlan({ ...plan, status: 'APPLIED' })).toBe(false);
    expect(canApplyExamOrganizationPlan({ ...plan, candidates: [{ ...plan.candidates[0], candidateNo: '12' }] })).toBe(false);
  });
});
