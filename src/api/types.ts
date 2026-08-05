// Kiểu dữ liệu khớp response của backend SSE.

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface ApiUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  status: string;
  passwordChangeRequired: boolean;
  passwordChangedAt?: string | null;
  deletedAt?: string | null;
  deleteReason?: string | null;
  restoredAt?: string | null;
  permissions?: string[];
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  studentCode?: string | null;
  className?: string | null;
  classId?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  placeOfBirth?: string | null;
  ethnicity?: string | null;
  nationality?: string | null;
  address?: string | null;
  enrollmentDate?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  teacherCode?: string | null;
  mainSubject?: string | null;
  childrenIds?: string[] | null;
}

export interface UserSession {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceId?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  createdAt: string;
  lastSeenAt?: string | null;
  expiresAt: string;
  active: boolean;
  current: boolean;
}

export interface UserDevice {
  id: string;
  deviceToken: string;
  platform: string;
  deviceName?: string | null;
  active: boolean;
  lastSeenAt: string;
  lastIpAddress?: string | null;
  deactivatedAt?: string | null;
  deactivationReason?: string | null;
}

export interface RbacPermission {
  id: string;
  code: string;
  module: string;
  name: string;
  description?: string | null;
}

export interface RbacRole {
  id: string;
  code: Role;
  name: string;
  description?: string | null;
  systemRole: boolean;
  active: boolean;
  permissionCodes: string[];
}

export interface StudentImportRowResult {
  rowNumber: number;
  status: 'CREATED' | 'UPDATED' | 'ERROR';
  studentUsername?: string | null;
  parentUsername?: string | null;
  error?: string | null;
}

export interface StudentImportResult {
  totalRows: number;
  createdStudents: number;
  updatedStudents: number;
  createdParents: number;
  reusedParents: number;
  linkedRelations: number;
  failedRows: number;
  rows: StudentImportRowResult[];
}

export interface SchoolClass {
  id: string; code: string; name: string; gradeLevel: string;
  academicYearId?: string; homeroomTeacherId?: string; homeroomTeacherName?: string;
  homeRoomId?: string;
  homeroomAssignedAt?: string; homeroomAssignedBy?: string; studentCount: number;
  capacity?: number; maxStudents?: number; expectedStudentCount?: number; status?: string;
}
export interface Subject {
  id: string; code: string; name: string; coefficient: number; requiredRoomType?: string;
  subjectType?: 'MANDATORY' | 'OPTIONAL' | 'SPECIALIZED' | 'EDUCATIONAL_ACTIVITY';
  departmentName?: string | null; assessmentMethod?: string; facilityNote?: string | null;
  active: boolean;
}
export interface AcademicYear { id: string; code: string; name: string; status: string; startDate?: string; endDate?: string; }
export interface Semester {
  id: string; academicYearId: string; code: string; name: string; sequence: number; status: string;
  startDate?: string; endDate?: string;
}
export interface Room { id: string; code: string; name?: string; capacity?: number; roomType?: string; active: boolean; }
export interface GradeLevel {
  code: 'K10' | 'K11' | 'K12'; name: string; numericLevel: number;
  displayOrder: number; active: boolean;
}
export interface SchoolHoliday {
  id: string; academicYearId: string; date: string; endDate: string;
  name: string; description?: string | null;
}
export interface AcademicTrainingPlan {
  id: string; academicYearId: string; gradeLevel: string; name: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVISION_REQUIRED' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED' | 'LOCKED'; versionNumber: number;
  programId?: string | null; description?: string | null;
  basedOnPlanId?: string | null; maxProgressGapDays: number;
  createdBy?: string | null; submittedAt?: string | null; submittedBy?: string | null;
  reviewedAt?: string | null; reviewedBy?: string | null;
  approvedAt?: string | null; approvedBy?: string | null; workflowComment?: string | null;
  publishedAt?: string | null; publishedBy?: string | null;
  lockedAt?: string | null; lockedBy?: string | null;
  createdAt: string; updatedAt: string;
}

export interface EducationProgram {
  id: string; code: string; name: string; startYear: number;
  description?: string | null; status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export interface EducationProgramSubject {
  id: string; programId: string; gradeLevel: string; subjectId: string;
  subjectType: string; annualPeriods: number; semester1Periods: number;
  semester2Periods: number; weeklyPeriods: number; required: boolean;
  notes?: string | null;
}

export interface SubjectCombination {
  id: string; code: string; name: string; academicYearId: string;
  gradeLevel: string; expectedClassCount: number; maxStudents: number; status: string;
}

export interface SubjectCombinationDetail {
  combination: SubjectCombination; subjectIds: string[]; classIds: string[];
}

export interface TeacherSubjectCapability {
  id: string; teacherId: string; subjectId: string; primarySubject: boolean; active: boolean;
}

export interface AcademicCurriculumDistribution {
  id: string; planSubjectId: string; curriculumItemId?: string | null;
  weekNumber: number; contentType: string; title: string; periods: number;
  notes?: string | null;
}

export interface AcademicAssessmentPlan {
  id: string; planId: string; semesterId: string; classId?: string | null;
  subjectId: string; assessmentType: string; weekNumber: number;
  name: string; assessmentForm: string; curriculumItemIds?: string | null;
  resultMethod: string;
  durationMinutes: number; teacherId?: string | null; notes?: string | null;
}

export interface AcademicPlanApprovalHistory {
  id: string; planId: string; action: string; fromStatus?: string | null;
  toStatus: string; actorId: string; actorName?: string | null;
  actorRole?: string | null; comment?: string | null; createdAt: string;
}

export interface AnnualSubjectSummary {
  subjectId: string; subjectName: string; subjectType: string;
  semester1Periods: number; semester2Periods: number; annualPeriods: number;
  configuredAnnualPeriods: number; periodsMatch: boolean;
}

export interface PublishedEducationPlanView {
  plan: AcademicTrainingPlan; classId: string; classCode: string;
  subjects: AnnualSubjectSummary[]; assessments: AcademicAssessmentPlan[];
}

export interface AcademicPlanValidationIssue {
  level: 'ERROR' | 'WARNING'; code: string; message: string; referenceId?: string | null;
}

export interface AcademicPlanValidationReport {
  valid: boolean; errorCount: number; warningCount: number;
  issues: AcademicPlanValidationIssue[];
}
export interface AcademicTrainingPlanSubject {
  id: string; planId: string; semesterId: string; subjectId: string;
  weeklyPeriods: number; totalPeriods: number; startDate: string; endDate: string;
  examRequired: boolean; displayOrder: number;
}
export interface AcademicExamSchedule {
  id: string; planId: string; semesterId: string; subjectId: string;
  gradeLevel: string; name: string; examDate: string; startTime: string;
  durationMinutes: number; roomId?: string | null; proctorTeacherId?: string | null;
  status: 'PLANNED' | 'CONFIRMED' | 'CANCELLED'; notes?: string | null;
}

export interface ExamPeriod {
  id: string; code: string; name: string; academicYearId: string; academicYearName: string;
  semesterId: string; semesterName: string; examType: string; status: string;
  gradeLevels: string[]; allowSubjectTeacherProctor: boolean;
  startDate: string; endDate: string; publishedVersionId?: string | null;
  latestVersion: number; createdBy: string; createdByName: string;
  canDelete: boolean; deleteBlockedReason?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ExamAssessmentSource {
  assessmentPlanId: string; trainingPlanId: string; planVersion: number;
  academicYearId: string; semesterId: string; gradeLevel: string;
  subjectId: string; subjectCode: string; subjectName: string;
  assessmentType: string; assessmentName: string; weekNumber: number;
  planName: string; planStatus: string; sourceUpdatedAt?: string | null;
  durationMinutes: number; assessmentForm: string; notes?: string | null;
  plannedStartDate: string; plannedEndDate: string;
}

export interface ExamAssessmentSourceReadiness {
  ready: boolean; sourceCount: number; subjectCount: number; requiredDays: number;
  suggestedStartDate?: string | null; suggestedEndDate?: string | null;
  suggestedExamDates: string[];
  sources: ExamAssessmentSource[]; issues: string[];
}

export interface ExamScheduleVersion {
  id: string; examPeriodId: string; versionNo: number; status: string;
  basedOnVersionId?: string | null; changeReason?: string | null;
  createdBy: string; createdByName: string; createdAt: string;
  publishedBy?: string | null; publishedByName?: string | null; publishedAt?: string | null;
  contentUpdatedAt?: string | null; lastValidatedAt?: string | null;
  validationCurrent: boolean; lastValidationErrorCount?: number | null;
  lastValidationWarningCount?: number | null;
}

export interface ExamRoomStudent {
  studentId: string; studentCode?: string | null; studentName: string;
  classId: string; classCode: string; seatNo: number;
}

export interface ExamRoomAssignment {
  id: string; roomId: string; roomCode: string; roomName: string; capacity: number;
  primaryProctorId: string; primaryProctorName: string;
  backupProctorId: string; backupProctorName: string; students: ExamRoomStudent[];
}

export interface ExamSession {
  id: string; sourceAssessmentPlanId?: string | null;
  sourceTrainingPlanId?: string | null; sourcePlanVersion?: number | null;
  sourcePlanName?: string | null; sourcePlanStatus?: string | null;
  assessmentName: string; assessmentType: string; assessmentWeek: number;
  assessmentForm?: string | null; plannedStartDate?: string | null;
  plannedEndDate?: string | null; sourceSyncStatus: 'CURRENT' | 'SOURCE_CHANGED' | 'LEGACY';
  sourceSyncedAt?: string | null; scheduleDeviationReason?: string | null;
  subjectId: string; subjectCode: string; subjectName: string;
  gradeLevel: string; examDate: string; startTime: string; endTime: string;
  durationMinutes: number; notes?: string | null; studentCount: number;
  rooms: ExamRoomAssignment[];
}

export interface ExamValidationIssue {
  severity: 'ERROR' | 'WARNING'; code: string; message: string;
  sessionId?: string | null; roomAssignmentId?: string | null;
}

export interface ExamValidation {
  valid: boolean; sessionCount: number; roomCount: number; studentCount: number;
  errorCount: number; warningCount: number; issues: ExamValidationIssue[];
}

export interface ExamTeacherUnavailability {
  id: string; teacherId: string; teacherName: string; unavailableDate: string;
  endDate: string;
  startTime?: string | null; endTime?: string | null;
  unavailabilityType: string; status: string; reason: string;
  createdByName: string; createdAt: string; affectedSessionCount: number;
}

export interface ExamVersionChange {
  type: string; label: string; beforeValue: string; afterValue: string;
}

export interface ExamVersionDiff {
  comparisonAvailable: boolean; baseVersionId?: string | null; baseVersionNo?: number | null;
  hasChanges: boolean; totalChanges: number; addedSessions: number; removedSessions: number;
  changedSessions: number; changedRooms: number; changedProctors: number;
  changedStudents: number; changes: ExamVersionChange[];
}

export interface ExamVersionDetail {
  period: ExamPeriod; version: ExamScheduleVersion; sessions: ExamSession[];
  validation: ExamValidation; teacherUnavailability: ExamTeacherUnavailability[];
  versionDiff: ExamVersionDiff;
}

export interface PublishedExamView {
  periodId: string; periodName: string; examType: string; semesterName: string;
  subjectId: string; subjectName: string; gradeLevel: string; examDate: string;
  startTime: string; endTime: string; durationMinutes: number; roomCode: string;
  seatNo: number; primaryProctorName: string; backupProctorName: string;
  dutyRole: 'STUDENT' | 'PRIMARY' | 'BACKUP'; studentName?: string | null;
  studentCode?: string | null;
}
export interface AcademicPlanReadiness {
  ready: boolean; semesterCount: number; configuredSubjectRows: number;
  examCount: number; stageCount: number; curriculumItemCount: number;
  specialWeekCount: number; versionNumber: number; status: string;
  issues: string[];
}
export interface AcademicTrainingPlanStage {
  id: string; planSubjectId: string; code: string; name: string;
  sequence: number; startDate: string; endDate: string;
  targetPeriods: number; description?: string | null;
}
export interface AcademicCurriculumItem {
  id: string; planSubjectId: string; parentId?: string | null;
  itemType: 'CHAPTER' | 'TOPIC' | 'LESSON'; code: string; title: string;
  sequence: number; plannedPeriods: number; description?: string | null;
}
export interface AcademicTrainingPlanSpecialWeek {
  id: string; planSubjectId: string; weekType: 'EXAM' | 'BUFFER';
  weekNumber: number; name: string; description?: string | null;
}
export interface AcademicPlanSubjectDetail {
  subject: AcademicTrainingPlanSubject;
  stages: AcademicTrainingPlanStage[];
  curriculum: AcademicCurriculumItem[];
  specialWeeks: AcademicTrainingPlanSpecialWeek[];
}
export interface AcademicPlanDetail {
  plan: AcademicTrainingPlan;
  subjects: AcademicPlanSubjectDetail[];
  exams: AcademicExamSchedule[];
  readiness: AcademicPlanReadiness;
}
export interface AcademicEnrollment {
  id: string; academicYearId: string; classId: string; classCode: string;
  studentId: string; studentCode?: string | null; studentName: string;
  status: string; enrollmentType: string; enrolledAt: string;
}
export interface AcademicStudentCandidate {
  id: string; studentCode?: string | null; fullName: string;
  currentClassId?: string | null; currentClassName?: string | null;
}

export interface TimetableSlot {
  id: string; classId: string; subjectId: string; subjectName: string;
  teacherId: string; teacherName: string; roomCode?: string;
  dayOfWeek: string; periodNo: number; startTime?: string; endTime?: string; semesterId?: string;
  sourceScheduleId?: string | null;
}

export interface TimetableSchedule {
  id: string; academicYearId: string; semesterId: string; scopeGradeLevel?: string | null;
  name: string; status: 'DRAFT' | 'PUBLISHED' | 'LOCKED'; teachingDays: string;
  firstPeriod: number; lastPeriod: number; maxPeriodsPerDay: number;
  maxProgressGapDays: number; maxProgressGapPeriods: number; maxCurriculumGapLessons: number;
  solveSeconds: number; solverScore?: string | null; hardViolationCount: number; warningCount: number;
  generationSummary?: string | null; sourcePlanSummary?: string | null;
  sourcePlanSnapshot?: string | null; generatedAt?: string | null; publishedAt?: string | null;
}
export interface TimetableDraftSlot {
  id: string; scheduleId: string; assignmentId: string; classId: string;
  subjectId: string; subjectName: string; teacherId: string; teacherName: string;
  roomId?: string | null; roomCode?: string | null; dayOfWeek: string; periodNo: number;
  requiredRoomType?: string | null;
  startTime?: string; endTime?: string; semesterId: string; lessonIndex: number;
    source: 'AUTO' | 'AUTO_BLOCK' | 'FIXED_ACTIVITY' | 'MANUAL' | 'MOVED'; pinned: boolean;
}
export interface ScheduleIssue {
  level: 'ERROR' | 'WARNING'; code: string; message: string; classId?: string | null;
  teacherId?: string | null; subjectId?: string | null; dayOfWeek?: string | null; periodNo?: number | null;
}
export interface ScheduleValidation {
  valid: boolean; requiredPeriods: number; scheduledPeriods: number;
  errorCount: number; warningCount: number; issues: ScheduleIssue[];
}
export interface ScheduleGenerationResult { schedule: TimetableSchedule; validation: ScheduleValidation; }
export interface ScheduleGenerationReadiness {
  ready: boolean; academicYearId: string; semesterId: string; scopeGradeLevel?: string | null;
  sourcePlanSummary?: string | null; classCount: number; assignmentCount: number;
  requiredPeriods: number; issues: ScheduleIssue[];
}
export interface ClassLessonProgress {
  id: string; academicYearId: string; semesterId: string; classId: string; subjectId: string;
  curriculumItemId: string; lessonDate: string; plannedPeriods: number; completedPeriods: number;
  status: string; teacherId: string; notes?: string | null;
  sourcePlanId?: string | null; sourcePlanVersion?: number | null;
}
export interface ClassProgressRow {
  classId: string; classCode: string; completedPeriods: number; completedLessons: number;
  latestLessonDate?: string | null; latestLessonTitle?: string | null;
  dayLag: number; periodLag: number; lessonLag: number; delayed: boolean;
}
export interface ProgressComparison {
  academicYearId: string; semesterId: string; gradeLevel: string; subjectId: string;
  sourcePlanId?: string | null; sourcePlanVersion?: number | null;
  maxDayGap: number; maxTeachingDayGap: number; maxPeriodGap: number; maxLessonGap: number;
  allowedDayGap: number; allowedPeriodGap: number; allowedLessonGap: number;
  balanced: boolean; classes: ClassProgressRow[]; warnings: string[];
}
export interface TimetableMakeupProposal {
  id: string; scheduleId: string; classId: string; subjectId: string; teacherId: string;
  roomCode?: string | null; missedDate: string; missedPeriodNo: number;
  proposedDate?: string | null; proposedPeriodNo?: number | null; reason: string; status: string;
  reviewNote?: string | null; reviewedBy?: string | null; reviewedAt?: string | null;
}

export interface AttendanceRecord {
  id: string; studentId: string; classId?: string; slotId: string; date: string;
  status: string; note?: string | null; subjectName?: string; periodNo?: number;
}

export interface Grade {
  id: string; studentId: string; subjectId: string; subjectName: string; semesterId: string;
  category: string; categoryName: string; assessmentIndex?: number; score: number; note?: string | null; recordedAt?: string; version?: number;
}

export interface YearSummaryExpectedSubject {
  subjectId: string; subjectName: string; requiredGradeCount: number;
  expectedGradeCount: number; enteredGradeCount: number; completionRate: number;
}
export interface YearSummarySubject {
  subjectId: string; subjectName: string; average?: number | null;
  enteredGradeCount: number; requiredGradeCount: number; missingCategories: string[];
}
export interface YearSummaryAttendance {
  present: number; late: number; absentExcused: number; absentUnexcused: number;
  total: number; attendanceRate?: number | null;
}
export interface YearSummaryStudent {
  studentId: string; studentCode?: string | null; studentName: string;
  overallAverage?: number | null; attendance: YearSummaryAttendance;
  subjects: YearSummarySubject[]; missingGradeCount: number; ready: boolean; warnings: string[];
}
export interface YearSummaryPreview {
  academicYearId: string; academicYearName: string;
  semesterId: string; semesterName: string;
  classId: string; classCode: string; className: string;
  periodState: 'UPCOMING' | 'IN_PROGRESS' | 'CLOSED'; periodMessage: string;
  generatedAt: string;
  metrics: {
    totalStudents: number; readyStudents: number; missingGradeStudents: number;
    noAttendanceStudents: number; classAverage?: number | null; attendanceRate?: number | null;
  };
  subjects: YearSummaryExpectedSubject[];
  students: YearSummaryStudent[];
  warnings: string[];
}

export type YearReviewResult =
  | 'PROMOTED'
  | 'RETAINED'
  | 'ELIGIBLE_FOR_GRADUATION'
  | 'INCOMPLETE'
  | 'PENDING_REVIEW';
export type ConductGrade = 'GOOD' | 'FAIR' | 'PASS' | 'FAIL';
export interface PromotionPolicy {
  academicYearId: string;
  minimumYearlyAverage: number;
  minimumConductGrade: ConductGrade;
  subjectMinimumScore: number;
  maximumSubjectsBelowMinimum: number;
  minimumAttendanceRate?: number | null;
}
export interface YearReviewSemester {
  semesterId: string; semesterName: string; periodState: 'UPCOMING' | 'IN_PROGRESS' | 'CLOSED';
  average?: number | null; attendanceRate?: number | null; ready: boolean; warnings: string[];
}
export interface YearReviewAnnualSubject {
  subjectId: string; subjectName: string;
  semesterOneAverage?: number | null; semesterTwoAverage?: number | null;
  yearlyAverage?: number | null; belowMinimum: boolean;
}
export interface YearReviewStudent {
  studentId: string; studentCode?: string | null; studentName: string;
  semesters: YearReviewSemester[]; annualSubjects: YearReviewAnnualSubject[];
  yearlyAverage?: number | null; attendanceRate?: number | null;
  academicReady: boolean; conductGrade?: ConductGrade | null; subjectsBelowMinimum: number;
  suggestedResult: YearReviewResult; result: YearReviewResult;
  decisionStatus: 'NOT_SAVED' | 'DRAFT' | 'FINALIZED'; reason?: string | null;
  reviewedByName?: string | null; reviewedAt?: string | null; finalizedAt?: string | null;
}
export interface YearReview {
  academicYearId: string; academicYearName: string;
  classId: string; classCode: string; className: string;
  gradeLevel: string; yearStatus: string;
  yearClosed: boolean; finalized: boolean; canFinalize: boolean; finalizeBlockers: string[];
  yearlyAverageFormula: string; policy: PromotionPolicy;
  metrics: {
    totalStudents: number; academicallyReady: number; promoted: number; retained: number;
    eligibleForGraduation: number; incomplete: number; conductCompleted: number; decisionsSaved: number;
  };
  students: YearReviewStudent[];
  generatedAt: string;
}

export interface PromotionTargetClass {
  id: string; code: string; name: string; gradeLevel: string; studentCount: number;
}
export interface PromotionStudent {
  summaryId: string; studentId: string; studentCode?: string | null; studentName: string;
  result: YearReviewResult; action: 'PROMOTE' | 'RETAIN' | 'COMPLETE_SCHOOL' | 'BLOCKED';
  requiredTargetGradeLevel?: string | null;
  targetClassId?: string | null; targetClassCode?: string | null;
  status: 'READY' | 'NEEDS_PLACEMENT' | 'ALREADY_PROCESSED' | 'BLOCKED';
  message: string;
}
export interface PromotionPreview {
  sourceAcademicYearId: string; sourceAcademicYearName: string;
  targetAcademicYearId: string; targetAcademicYearName: string;
  sourceClassId: string; sourceClassCode: string;
  canExecute: boolean; blockers: string[];
  metrics: {
    totalStudents: number; ready: number; needsPlacement: number;
    alreadyProcessed: number; completingSchool: number; blocked: number;
  };
  targetClasses: PromotionTargetClass[];
  students: PromotionStudent[];
  generatedAt: string;
}
export interface PromotionExecution {
  enrolled: number; completedSchool: number; skipped: number;
  preview: PromotionPreview;
}
export interface PromotionUndo {
  revertedEnrollments: number; restoredCompletedStudents: number; skipped: number;
  preview: PromotionPreview;
}

export interface YearResultPublicationStatus {
  academicYearId: string; academicYearName: string;
  classId: string; classCode: string;
  totalStudents: number; finalizedStudents: number;
  readyToPublish: boolean; published: boolean;
  publicationState: 'NOT_PUBLISHED' | 'PUBLISHED' | 'WITHDRAWN' | 'OUTDATED';
  publicationVersion: number;
  publishedByName?: string | null; publishedAt?: string | null;
  withdrawnByName?: string | null; withdrawnAt?: string | null;
  withdrawalReason?: string | null;
}
export interface StudentYearResult {
  summaryId: string;
  academicYearId: string; academicYearName: string;
  classId: string; classCode: string; className: string;
  studentId: string; studentCode?: string | null; studentName: string;
  yearlyAverage?: number | null; attendanceRate?: number | null;
  conductGrade?: ConductGrade | null; result: YearReviewResult;
  reason?: string | null; progressionStatus?: string | null;
  nextClassId?: string | null; nextClassCode?: string | null;
  semesters: YearReviewSemester[];
  subjects: YearReviewAnnualSubject[];
  finalizedAt?: string | null; publishedAt: string;
}

export interface TeachingAssignment {
  id: string;
  classId: string;
  classCode: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  semesterId: string;
  status?: string;
  weeklyPeriods: number;
  specializedRoomPeriods: number;
  scheduledPeriods: number;
  remainingPeriods: number;
  teacherClassCount: number;
  teacherWeeklyPeriods: number;
  teacherScheduledPeriods: number;
  fullyScheduled: boolean;
  teacherBusy: boolean;
  canSchedule: boolean;
  availabilityMessage?: string | null;
  assignedAt?: string;
  assignedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface TeacherClassAssignment {
  id: string; classId: string; classCode: string; subjectId: string; subjectName: string;
  semesterId: string; weeklyPeriods: number; specializedRoomPeriods: number; scheduledPeriods: number;
}
export interface TeacherWorkload {
  teacherId: string; teacherCode?: string | null; teacherName: string; mainSubject?: string | null;
  status: string; classCount: number; subjectCount: number; weeklyPeriods: number;
  scheduledPeriods: number; classCodes: string[]; subjectNames: string[];
  assignments: TeacherClassAssignment[];
}
export interface ExamCategory { id: string; code: string; name: string; weight: number; requiredCount?: number; }
export interface GradebookSubject {
  subjectId: string; subjectName: string; teacherName?: string | null; editable: boolean;
}
export interface TeacherGradebookContext {
  classId: string; semesterId: string; subjectId: string; subjectName: string;
  homeroomTeacher: boolean; canEdit: boolean; subjects: GradebookSubject[];
}

export interface Notification {
  id: string; recipientId: string; type: string; title: string; body: string;
  priority?: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  read: boolean; refType?: string; refId?: string; createdAt: string;
}
export interface Announcement {
  id: string; title: string; body: string; audience: string; createdAt: string; createdBy?: string;
  category?: string; priority?: string; status?: string; recipientCount?: number;
}
export interface TeacherAnnouncementScope {
  classId: string; classCode: string; studentCount: number; parentCount: number;
  subjects: string[]; homeroom: boolean;
}
export interface NotificationTemplate { id: string; code: string; name: string; channel: string; titleTemplate?: string; bodyTemplate?: string; active: boolean; }

export interface Assignment {
  id: string; classId: string; subjectId: string; subjectName: string; teacherId: string; teacherName: string;
  title: string; description?: string; status: string; deadline?: string; allowLate: boolean; createdAt: string;
  attachmentFileId?: string | null; attachmentName?: string | null;
  attachmentContentType?: string | null; attachmentSizeBytes?: number | null;
  submissionCount?: number; studentCount?: number;
}
export interface NotificationPreference { id: string; userId: string; channel: 'IN_APP' | 'PUSH' | 'EMAIL'; enabled: boolean; updatedAt: string; }
export interface Submission {
  id: string; assignmentId: string; studentId: string; studentName: string; status: string;
  content?: string; submittedAt?: string; score?: number | null; feedback?: string | null;
  attachmentFileId?: string | null; attachmentName?: string | null;
  attachmentContentType?: string | null; attachmentSizeBytes?: number | null; gradedAt?: string | null;
}
export interface StoredFile { id: string; originalName: string; contentType: string; sizeBytes: number; createdAt: string; }

export type FinanceTargetType = 'ALL' | 'GRADE' | 'CLASS' | 'STUDENT';
export interface FeePeriod {
  id: string; code: string; name?: string; status: string; academicYearId?: string | null;
  feeType?: 'TUITION' | 'MEAL' | 'TRANSPORT' | 'ACTIVITY' | 'OTHER' | null;
  semesterId?: string | null;
  applyToGrades?: string | null; targetType: FinanceTargetType; targetIds: string[]; dueDate?: string;
  publishedAt?: string | null; closedAt?: string | null; cancelledAt?: string | null; cancellationReason?: string | null;
}
export interface FeePeriodItem {
  id: string; feePeriodId: string; name: string; amount: number; gradeLevel?: string | null;
  targetType: FinanceTargetType; targetIds: string[];
}
export interface InvoicePreviewStudent {
  studentId: string; studentName: string; classId?: string | null; className?: string | null;
  itemCount: number; totalAmount: number; alreadyIssued: boolean;
}
export interface InvoicePreview {
  feePeriodId: string; status: string; targetedStudentCount: number; billableStudentCount: number;
  existingInvoiceCount: number; newInvoiceCount: number; existingTotalAmount: number;
  newTotalAmount: number; projectedTotalAmount: number; students: InvoicePreviewStudent[];
}
export interface Invoice {
  id: string; code: string; studentId: string; studentName: string; parentId?: string; feePeriodId?: string;
  totalAmount: number; paidAmount: number; status: string; issuedAt?: string; dueDate?: string;
  feePeriodCode?: string | null; feePeriodName?: string | null; feeType?: string | null;
  academicYearId?: string | null; academicYearName?: string | null;
  semesterId?: string | null; semesterName?: string | null;
}
export interface Payment {
  id: string; invoiceId: string; amount: number; method: string; status: string;
  txnRef?: string; note?: string; createdAt?: string; updatedAt?: string; paidAt?: string;
  autoProvisioned?: boolean; bankTransferContent?: string | null; bankQrUrl?: string | null;
}
export interface PaymentInitResponse {
  payment: Payment; invoice: Invoice; gatewayStatus: string;
  paymentUrl?: string; callbackUrl?: string;
  bankTransfer?: BankTransferInstructions | null;
}
export interface BankTransferInstructions {
  bankId: string; bankName: string; accountNumber: string; accountName: string;
  amount: number; transferContent: string; qrImageUrl: string;
  studentCode: string; studentName: string; invoiceCode: string;
}
export interface PaymentProof {
  id: string; paymentId: string; invoiceId: string; invoiceCode: string;
  parentId?: string | null; studentId: string; studentCode?: string | null; studentName: string;
  amount: number; fileId: string; fileName: string; contentType: string; sizeBytes: number;
  status: 'SUBMITTED' | 'APPROVED' | 'RETRY_REQUIRED'; submittedBy: string; submittedAt: string;
  reviewedBy?: string | null; reviewedAt?: string | null; reviewReason?: string | null;
}
export interface PaymentProofDecision {
  proof: PaymentProof; payment: Payment; invoice: Invoice;
}
export interface PaymentReturnResponse {
  paymentId?: string | null; provider: string; status: string; finalStatus: boolean; message: string;
  signatureValid?: boolean | null; gatewaySuccessful?: boolean | null; txnRef?: string | null;
  amount?: number | null; providerTransactionId?: string | null;
}
export interface PaymentHistory {
  paymentId: string; invoiceId: string; invoiceCode: string; feePeriodId?: string | null;
  feePeriodCode?: string | null; studentId: string; studentCode?: string | null; studentName: string;
  amount: number; method: string; status: string; txnRef?: string | null; note?: string | null;
  createdAt?: string | null; updatedAt?: string | null; paidAt?: string | null;
  providerTransactionId?: string | null; gatewayErrorCode?: string | null;
  gatewayErrorMessage?: string | null; callbackCount: number;
  receiptId?: string | null; receiptNumber?: string | null; receiptStatus?: string | null;
  receiptIssuedAt?: string | null;
  refundedAmount: number; pendingRefundAmount: number; netAmount: number;
}
export interface PaymentRefund {
  id: string; refundNumber: string; paymentId: string; invoiceId: string; invoiceCode: string;
  studentId: string; studentCode?: string | null; studentName: string; parentId?: string | null;
  amount: number; refundType?: 'PARTIAL' | 'FULL' | null; paymentAmount?: number | null;
  refundedAmountBefore?: number | null; refundedAmountAfter?: number | null;
  invoicePaidAmountBefore?: number | null; invoicePaidAmountAfter?: number | null;
  invoiceStatusBefore?: string | null; invoiceStatusAfter?: string | null;
  reason: string; status: 'REQUESTED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  requestedBy: string; requestedByName?: string | null; requestedAt: string;
  approvedBy?: string | null; approvedByName?: string | null; approvedAt?: string | null;
  rejectedBy?: string | null; rejectedAt?: string | null; rejectionReason?: string | null;
  cancelledBy?: string | null; cancelledAt?: string | null; cancellationReason?: string | null;
  refundMethod?: string | null; refundReference?: string | null;
  completedAt?: string | null; updatedAt?: string | null;
}
export interface ReconciliationIssue {
  id: string; issueType: string; severity: 'ERROR' | 'WARNING'; entityType: string; entityId: string;
  expectedAmount?: number | null; actualAmount?: number | null; message: string; createdAt: string;
}
export interface ReconciliationMethodSummary {
  method: string; paymentCount: number; grossAmount: number;
  refundCount: number; refundAmount: number; netAmount: number;
}
export interface PaymentReconciliation {
  id: string; reconciliationDate: string; status: 'BALANCED' | 'DISCREPANCY';
  fromDate: string; toDate: string; minAmount?: number | null; maxAmount?: number | null;
  method?: string | null;
  paymentCount: number; grossAmount: number; refundCount: number; refundAmount: number;
  netAmount: number; discrepancyCount: number; runBy: string; runByName?: string | null;
  runAt: string; runCount: number; methodSummaries: ReconciliationMethodSummary[];
  issues: ReconciliationIssue[];
}
export interface PaymentReceipt {
  id: string; receiptNumber: string; paymentId: string; invoiceId: string; invoiceCode: string;
  studentId: string; studentCode?: string | null; studentName: string; amount: number; method: string;
  status: string; fileId?: string | null; issuedBy?: string | null; issuedAt?: string | null;
  generatedAt?: string | null; generationAttempts: number; generationError?: string | null;
}
export interface PaymentReceiptDownload {
  receipt: PaymentReceipt; downloadUrl: string; expiresAt: string;
}

export interface FinanceReportFilter {
  fromDate: string; toDate: string; feePeriodId?: string | null; gradeLevel?: string | null;
  classId?: string | null; studentId?: string | null; method?: string | null;
  feeType?: string | null; semesterId?: string | null; settlementStatus?: string | null;
}
export interface FinanceReportSummary {
  invoiceCount: number; paidInvoiceCount: number; outstandingInvoiceCount: number; overdueInvoiceCount: number;
  totalReceivable: number; currentPaidAmount: number; outstandingAmount: number; overdueAmount: number;
  paymentCount: number; grossCollected: number; refundCount: number; refundAmount: number; netRevenue: number;
}
export interface FinanceCashFlowRow {
  date: string; paymentCount: number; grossCollected: number; refundCount: number;
  refundAmount: number; netRevenue: number;
}
export interface FinanceMethodRow {
  method: string; paymentCount: number; grossCollected: number; refundCount: number;
  refundAmount: number; netRevenue: number;
}
export interface FinanceDebtGroupRow {
  dimension: string; key: string; code: string; name: string; invoiceCount: number;
  debtorCount: number; overdueInvoiceCount: number; totalReceivable: number;
  currentPaidAmount: number; outstandingAmount: number; overdueAmount: number;
}
export interface FinanceDebtDetailRow {
  invoiceId: string; invoiceCode: string; feePeriodId?: string | null; feePeriodCode?: string | null;
  feePeriodName?: string | null; studentId: string; studentCode?: string | null; studentName: string;
  gradeLevel: string; classId: string; classCode: string; totalAmount: number; paidAmount: number;
  outstandingAmount: number; dueDate?: string | null; overdue: boolean; status: string;
}
export interface FinanceReport {
  filters: FinanceReportFilter; generatedAt: string; summary: FinanceReportSummary;
  dailyCashFlow: FinanceCashFlowRow[]; byMethod: FinanceMethodRow[];
  debtByFeePeriod: FinanceDebtGroupRow[]; debtByGrade: FinanceDebtGroupRow[];
  debtByClass: FinanceDebtGroupRow[]; debts: FinanceDebtDetailRow[];
}

export interface LoginHistory {
  id: string; userId?: string | null; username: string; success: boolean;
  failureReason?: string | null; ipAddress?: string | null; userAgent?: string | null; createdAt: string;
}

export interface ImportResult {
  totalRows: number; importedRows: number; failedRows: number;
  errors: Array<{ row: number; username?: string; error: string }>;
}

export interface StudentYearlySummary {
  id: string; academicYearId: string; studentId: string; studentName: string; classId: string;
  averageScore?: number | null; conductGrade?: string | null; promotionStatus: string;
  missingRequirements?: string | null; nextClassId?: string | null; finalizedAt?: string | null;
}

export interface Club { id: string; name: string; description?: string; capacity: number; schedule?: string; fee: number; status: string; }
export interface ClubRegistration { id: string; clubId: string; clubName?: string; studentId: string; studentName?: string; status: string; registeredAt?: string; }

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  format: 'NUMBER' | 'PERCENT' | 'DECIMAL_1' | 'CURRENCY' | string;
  hint: string;
  tone: 'blue' | 'green' | 'orange' | 'red' | 'violet' | string;
}

export interface DashboardDatum { label: string; value: number; }

export interface DashboardChart {
  title: string;
  subtitle: string;
  type: 'BAR' | 'COLUMN' | string;
  suffix: string;
  max: number;
  data: DashboardDatum[];
}

export interface DashboardResponse {
  metrics: DashboardMetric[];
  charts: DashboardChart[];
}
