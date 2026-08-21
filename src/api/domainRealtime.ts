export interface DomainRealtimeEvent {
  resource?: string;
  action?: string;
  changedAt?: string;
}

export function isAcademicPlanInvalidation(event: DomainRealtimeEvent) {
  const resource = event.resource?.toLowerCase() || '';
  const action = event.action?.toLowerCase() || '';
  return resource.includes('education_plan')
    || resource.includes('training_plan')
    || action.includes('education_plan')
    || action.includes('training_plan');
}
