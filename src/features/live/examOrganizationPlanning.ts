import type { ExamOrganizationPlan } from '../../api/types';

export function canApplyExamOrganizationPlan(plan?: ExamOrganizationPlan) {
  return !!plan
    && plan.status === 'PREVIEW'
    && plan.roomCount > 0
    && plan.missingAssignmentCount === 0
    && plan.assignedCount === plan.candidateCount
    && plan.rooms.every((room) => room.ready && room.candidateCount <= room.effectiveCapacity)
    && plan.candidates.every((candidate) => /^\d{6}$/.test(candidate.candidateNo)
      && candidate.deskNo > 0 && candidate.seatPosition > 0
      && candidate.seatPosition <= plan.studentsPerDesk);
}

export function desksNeeded(candidateCount: number, studentsPerDesk: number) {
  if (candidateCount <= 0 || studentsPerDesk <= 0) return 0;
  return Math.ceil(candidateCount / studentsPerDesk);
}
