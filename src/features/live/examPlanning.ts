import type { ExamOrganizationReadiness, ExamSeatingPlan } from '../../api/types';

export function examPlanStatusLabel(status: ExamSeatingPlan['status']) {
  if (status === 'PREVIEW') return 'Bản xem trước';
  if (status === 'APPLIED') return 'Đã áp dụng';
  if (status === 'UNDONE') return 'Đã hoàn tác';
  return 'Đã thay thế';
}

export function canApplyExamPlan(
  readiness: ExamOrganizationReadiness | null | undefined,
  plan: ExamSeatingPlan | null | undefined,
) {
  return !!readiness?.roomsReady && plan?.status === 'PREVIEW'
    && plan.unassignedCount === 0 && plan.assignedCount === plan.candidateCount;
}
