import { describe, expect, it } from 'vitest';
import {
  academicStaffAction, canHomeroomEdit, canOpenReportCardRevision, isPublishedReportCard,
} from './reportCardWorkflow';

describe('report card workflow', () => {
  it('forces academic staff to approve, lock and publish in order', () => {
    expect(academicStaffAction('DRAFT')).toBeNull();
    expect(academicStaffAction('HOMEROOM_SUBMITTED')).toBe('approve');
    expect(academicStaffAction('APPROVED')).toBe('lock');
    expect(academicStaffAction('LOCKED')).toBe('publish');
    expect(academicStaffAction('PUBLISHED')).toBeNull();
  });

  it('only exposes published report cards to student and parent views', () => {
    expect(isPublishedReportCard('PUBLISHED')).toBe(true);
    expect(isPublishedReportCard('LOCKED')).toBe(false);
  });

  it('keeps official revisions auditable and prevents direct draft reopening', () => {
    expect(canOpenReportCardRevision('PUBLISHED')).toBe(true);
    expect(canOpenReportCardRevision('DRAFT')).toBe(false);
    expect(canHomeroomEdit('LOCKED')).toBe(false);
  });
});
