// Kiểu dữ liệu khớp response của backend SSE.

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface ApiUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  status: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  studentCode?: string | null;
  className?: string | null;
  classId?: string | null;
  teacherCode?: string | null;
  mainSubject?: string | null;
  childrenIds?: string[] | null;
}

export interface SchoolClass {
  id: string; code: string; name: string; gradeLevel: string;
  academicYearId?: string; homeroomTeacherId?: string; studentCount: number;
}
export interface Subject { id: string; code: string; name: string; }
export interface AcademicYear { id: string; code: string; name: string; status: string; startDate?: string; endDate?: string; }
export interface Semester { id: string; academicYearId: string; code: string; name: string; sequence: number; status: string; }
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
export interface ExamCategory { id: string; code: string; name: string; weight: number; requiredCount?: number; }
export interface TeacherGradebookContext { classId: string; semesterId: string; subjectId: string; subjectName: string; }

export interface Notification {
  id: string; recipientId: string; type: string; title: string; body: string;
  read: boolean; refType?: string; refId?: string; createdAt: string;
}
export interface Announcement { id: string; title: string; body: string; audience: string; createdAt: string; createdBy?: string; }
export interface NotificationTemplate { id: string; code: string; name: string; channel: string; titleTemplate?: string; bodyTemplate?: string; active: boolean; }

export interface Assignment {
  id: string; classId: string; subjectId: string; subjectName: string; teacherId: string; teacherName: string;
  title: string; description?: string; status: string; deadline?: string; allowLate: boolean; createdAt: string;
  attachmentFileId?: string | null; attachmentName?: string | null; submissionCount?: number; studentCount?: number;
}
export interface Submission {
  id: string; assignmentId: string; studentId: string; studentName: string; status: string;
  content?: string; submittedAt?: string; score?: number | null; feedback?: string | null;
  attachmentFileId?: string | null; attachmentName?: string | null; gradedAt?: string | null;
}
export interface StoredFile { id: string; originalName: string; contentType: string; sizeBytes: number; createdAt: string; }

export interface FeePeriod { id: string; code: string; name?: string; status: string; applyToGrades?: string | null; dueDate?: string; }
export interface FeePeriodItem { id: string; feePeriodId: string; name: string; amount: number; gradeLevel?: string | null; }
export interface Invoice {
  id: string; code: string; studentId: string; studentName: string; parentId?: string; feePeriodId?: string;
  totalAmount: number; paidAmount: number; status: string; issuedAt?: string; dueDate?: string;
}
export interface Payment { id: string; invoiceId: string; amount: number; method: string; status: string; txnRef?: string; paidAt?: string; }

export interface Club { id: string; name: string; description?: string; capacity: number; schedule?: string; fee: number; status: string; }
export interface ClubRegistration { id: string; clubId: string; clubName?: string; studentId: string; studentName?: string; status: string; registeredAt?: string; }
