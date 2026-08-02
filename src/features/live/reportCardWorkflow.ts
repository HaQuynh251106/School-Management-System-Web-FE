import type { ReportCardStatus } from '../../api/types';

export const REPORT_CARD_STATUSES: ReportCardStatus[] = [
  'DRAFT', 'HOMEROOM_SUBMITTED', 'APPROVED', 'LOCKED', 'PUBLISHED',
];

export function academicStaffAction(status: ReportCardStatus): 'approve' | 'lock' | 'publish' | null {
  if (status === 'HOMEROOM_SUBMITTED') return 'approve';
  if (status === 'APPROVED') return 'lock';
  if (status === 'LOCKED') return 'publish';
  return null;
}

export function isPublishedReportCard(status: ReportCardStatus) {
  return status === 'PUBLISHED';
}

export function canHomeroomEdit(status: ReportCardStatus) {
  return status === 'DRAFT' || status === 'HOMEROOM_SUBMITTED' || status === 'APPROVED';
}

export function canOpenReportCardRevision(status: ReportCardStatus) {
  return status !== 'DRAFT';
}
