import { describe, expect, it } from 'vitest';
import { isAcademicPlanInvalidation } from './domainRealtime';

describe('isAcademicPlanInvalidation', () => {
  it('matches the backend publication event used to refresh student plans', () => {
    expect(isAcademicPlanInvalidation({
      resource: 'education_plan',
      action: 'academic.education_plan.published',
    })).toBe(true);
  });

  it('ignores updates from unrelated domains', () => {
    expect(isAcademicPlanInvalidation({
      resource: 'grade',
      action: 'academic.grade.changed',
    })).toBe(false);
  });
});
