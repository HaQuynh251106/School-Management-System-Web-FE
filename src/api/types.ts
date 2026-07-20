// Kiểu dữ liệu khớp response của backend SSE.

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface ApiUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  status: string;
  passwordChangeRequired: boolean;
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

export interface SchoolClass {
  id: string; code: string; name: string; gradeLevel: string;
  academicYearId?: string; homeroomTeacherId?: string; homeroomTeacherName?: string;
  homeroomAssignedAt?: string; homeroomAssignedBy?: string; studentCount: number; capacity: number;
}
export interface Subject { id: string; code: string; name: string; coefficient: number; }
export interface AcademicYear { id: string; code: string; name: string; status: string; startDate?: string; endDate?: string; }
export interface Semester {
  id: string; academicYearId: string; code: string; name: string; sequence: number; status: string;
  startDate?: string; endDate?: string;
}
export interface Room { id: string; code: string; name?: string; capacity?: number; }

export interface TimetableSlot {
  id: string; classId: string; subjectId: string; subjectName: string;
  teacherId: string; teacherName: string; roomCode?: string;
  dayOfWeek: string; periodNo: number; startTime?: string; endTime?: string; semesterId?: string;
}

export interface AttendanceRecord {
  id: string; studentId: string; classId?: string; slotId: string; date: string;
  status: string; note?: string | null; subjectName?: string; periodNo?: number;
}

export interface Grade {
  id: string; studentId: string; subjectId: string; subjectName: string; semesterId: string;
  category: string; categoryName: string; assessmentIndex?: number; score: number; note?: string | null; recordedAt?: string; version?: number;
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
  weeklyPeriods: number;
  scheduledPeriods: number;
  remainingPeriods: number;
  teacherClassCount: number;
  teacherWeeklyPeriods: number;
  teacherScheduledPeriods: number;
  fullyScheduled: boolean;
  teacherBusy: boolean;
  canSchedule: boolean;
  availabilityMessage?: string | null;
  assignedAt: string;
  assignedBy?: string | null;
  updatedAt: string;
}
export interface TeacherClassAssignment {
  id: string; classId: string; classCode: string; subjectId: string; subjectName: string;
  semesterId: string; weeklyPeriods: number; scheduledPeriods: number;
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
  holidayStartDate?: string | null; holidayEndDate?: string | null;
}
export interface AttendanceDayStatus {
  attendanceRequired: boolean; announcementId?: string | null; title?: string | null; reason?: string | null;
  holidayStartDate?: string | null; holidayEndDate?: string | null;
}
export interface AttendanceSessionStatus {
  state: 'HOLIDAY' | 'INVALID' | 'UPCOMING' | 'OPEN' | 'LOCKED_REASON_REQUIRED' | 'LATE_UNLOCKED' | 'COMPLETED' | 'COMPLETED_LATE';
  canMark: boolean; requiresUnlockReason: boolean; message: string; date: string;
  startTime?: string | null; endTime?: string | null; unlockReason?: string | null; unlockedAt?: string | null;
}
export interface TeacherAnnouncementScope {
  classId: string; classCode: string; studentCount: number; parentCount: number;
  subjects: string[]; homeroom: boolean;
}
export interface NotificationTemplate { id: string; code: string; name: string; channel: string; titleTemplate?: string; bodyTemplate?: string; active: boolean; }

export interface Assignment {
  id: string; classId: string; subjectId: string; subjectName: string; teacherId: string; teacherName: string;
  title: string; description?: string; status: string; deadline?: string; allowLate: boolean; createdAt: string;
  attachmentFileId?: string | null; attachmentName?: string | null; submissionCount?: number; studentCount?: number; updatedAt?: string | null;
}
export interface NotificationPreference { id: string; userId: string; channel: 'IN_APP' | 'PUSH' | 'EMAIL'; enabled: boolean; updatedAt: string; }
export interface Submission {
  id: string; assignmentId: string; studentId: string; studentName: string; status: string;
  content?: string; submittedAt?: string; score?: number | null; feedback?: string | null;
  attachmentFileId?: string | null; attachmentName?: string | null; gradedAt?: string | null;
  resubmissionAllowed?: boolean; attemptNumber?: number;
}
export interface LeaveRequest {
  id: string; studentId: string; studentName: string; classId: string; classCode?: string;
  startDate: string; endDate: string; reason: string;
  status: 'PENDING_PARENT' | 'PENDING_HOMEROOM' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  parentId?: string | null; parentName?: string | null; parentConfirmedAt?: string | null;
  homeroomTeacherId?: string | null; homeroomTeacherName?: string | null;
  decidedAt?: string | null; decisionNote?: string | null; createdAt: string; updatedAt?: string | null;
}
export interface StoredFile { id: string; originalName: string; contentType: string; sizeBytes: number; createdAt: string; }

export interface FeePeriod { id: string; code: string; name?: string; status: string; applyToGrades?: string | null; dueDate?: string; }
export interface FeePeriodItem { id: string; feePeriodId: string; name: string; amount: number; gradeLevel?: string | null; }
export interface Invoice {
  id: string; code: string; studentId: string; studentName: string; parentId?: string; feePeriodId?: string;
  classId?: string | null; classCode?: string | null; gradeLevel?: string | null;
  totalAmount: number; paidAmount: number; status: string; issuedAt?: string; dueDate?: string;
}
export interface Payment { id: string; invoiceId: string; amount: number; method: string; status: string; txnRef?: string; paidAt?: string; }
export interface InvoiceDetail { invoice: Invoice; items: Array<{ id: string; invoiceId: string; name: string; amount: number }>; payments: Payment[]; }
export interface FinancePeriodSummary {
  periodId: string; code: string; name?: string; status: string; invoiceCount: number;
  totalAmount: number; paidAmount: number; outstanding: number; collectionRate: number;
}
export interface FinanceOverview {
  invoiceCount: number; paidInvoiceCount: number; partialInvoiceCount: number;
  overdueInvoiceCount: number; dueSoonInvoiceCount: number; totalAmount: number;
  paidAmount: number; outstanding: number; collectedThisMonth: number;
  collectionRate: number; periods: FinancePeriodSummary[];
}
export interface FinanceClassSummary {
  classId: string; classCode: string; gradeLevel?: string | null;
  homeroomTeacherId?: string | null; homeroomTeacherName?: string | null;
  invoiceCount: number; paidCount: number; partialCount: number; overdueCount: number;
  totalAmount: number; paidAmount: number; outstanding: number; collectionRate: number;
  completed: boolean; completionNotified: boolean;
}
export interface ClassReminderResult { invoiceCount: number; recipientCount: number; sentAt: string; }
export interface PaymentCallback { txnRef: string; status: 'SUCCESS' | 'FAILED'; amount: number; signature: string; }
export interface PaymentInitResponse {
  payment: Payment; invoice: Invoice; gatewayStatus: string;
  callbackUrl?: string; sandboxCallback?: PaymentCallback; paymentUrl?: string; gateway?: string;
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
