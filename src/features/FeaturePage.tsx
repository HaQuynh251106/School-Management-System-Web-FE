import type { ModuleItem, RoleDefinition } from '../types';
import { lazy } from 'react';
import { ArrowRight, ChevronDown, ListChecks, ShieldCheck } from 'lucide-react';

const GeneralDashboard = lazy(() => import('./dashboard/GeneralDashboard').then((module) => ({ default: module.GeneralDashboard })));
const AdminReportsLive = lazy(() => import('./live/AdminReportsLive').then((module) => ({ default: module.AdminReportsLive })));
const AdminAuditLive = lazy(() => import('./live/AdminAuditLive').then((module) => ({ default: module.AdminAuditLive })));
const AdminTimetableLive = lazy(() => import('./live/AdminTimetableLive').then((module) => ({ default: module.AdminTimetableLive })));
const ChatLive = lazy(() => import('./live/ChatLive').then((module) => ({ default: module.ChatLive })));
const AdminUsersLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminUsersLive })));
const AdminOperationsUsersLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminOperationsUsersLive })));
const AdminAccountLifecycleLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminAccountLifecycleLive })));
const AdminFinanceLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminFinanceLive })));
const AdminNotificationsLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminNotificationsLive })));
const AdminAcademicLive = lazy(() => import('./live/AdminAcademicManager').then((module) => ({ default: module.AdminAcademicLive })));
const TeacherClassesLive = lazy(() => import('./live/TeacherLive').then((module) => ({ default: module.TeacherClassesLive })));
const TeacherAttendanceLive = lazy(() => import('./live/TeacherLive').then((module) => ({ default: module.TeacherAttendanceLive })));
const TeacherGradesLive = lazy(() => import('./live/TeacherLive').then((module) => ({ default: module.TeacherGradesLive })));
const TeacherNotificationsLive = lazy(() => import('./live/TeacherLive').then((module) => ({ default: module.TeacherNotificationsLive })));
const TeacherFinanceLive = lazy(() => import('./live/TeacherLive').then((module) => ({ default: module.TeacherFinanceLive })));
const StudentProfileLive = lazy(() => import('./live/StudentLive').then((module) => ({ default: module.StudentProfileLive })));
const StudentAcademicLive = lazy(() => import('./live/StudentLive').then((module) => ({ default: module.StudentAcademicLive })));
const StudentAttendanceLive = lazy(() => import('./live/StudentLive').then((module) => ({ default: module.StudentAttendanceLive })));
const ParentSwitchLive = lazy(() => import('./live/ParentLive').then((module) => ({ default: module.ParentSwitchLive })));
const ParentMonitorLive = lazy(() => import('./live/ParentLive').then((module) => ({ default: module.ParentMonitorLive })));
const ParentInvoiceLive = lazy(() => import('./live/ParentLive').then((module) => ({ default: module.ParentInvoiceLive })));
const MyTimetableLive = lazy(() => import('./live/SharedLive').then((module) => ({ default: module.MyTimetableLive })));
const AssignmentsLive = lazy(() => import('./live/SharedLive').then((module) => ({ default: module.AssignmentsLive })));
const NotificationsLive = lazy(() => import('./live/SharedLive').then((module) => ({ default: module.NotificationsLive })));
const LeaveRequestsLive = lazy(() => import('./live/LeaveRequestsLive').then((module) => ({ default: module.LeaveRequestsLive })));
const PersonalReportsLive = lazy(() => import('./live/PersonalReportsLive').then((module) => ({ default: module.PersonalReportsLive })));
const ProfileSettingsLive = lazy(() => import('./live/ProfileSettingsLive').then((module) => ({ default: module.ProfileSettingsLive })));
const AdminExamsLive = lazy(() => import('./live/AdminExamsLive').then((module) => ({ default: module.AdminExamsLive })));
const MyExamsLive = lazy(() => import('./live/MyExamsLive').then((module) => ({ default: module.MyExamsLive })));
const AcademicStaffReportCardsLive = lazy(() => import('./live/ReportCardsLive').then((module) => ({ default: module.AcademicStaffReportCardsLive })));
const ParentReportCardLive = lazy(() => import('./live/ReportCardsLive').then((module) => ({ default: module.ParentReportCardLive })));
const StudentReportCardLive = lazy(() => import('./live/ReportCardsLive').then((module) => ({ default: module.StudentReportCardLive })));
const TeacherReportCardsLive = lazy(() => import('./live/ReportCardsLive').then((module) => ({ default: module.TeacherReportCardsLive })));
const AlumniLive = lazy(() => import('./live/AlumniLive').then((module) => ({ default: module.AlumniLive })));
const TeacherLoadRegistrationLive = lazy(() => import('./live/WorkloadPlanningLive').then((module) => ({ default: module.TeacherLoadRegistrationLive })));
const TeachingOperationsLive = lazy(() => import('./live/TeachingOperationsLive').then((module) => ({ default: module.TeachingOperationsLive })));
const StudentSupportLive = lazy(() => import('./live/StudentSupportLive').then((module) => ({ default: module.StudentSupportLive })));

export function FeaturePage({ module, role }: { module?: ModuleItem; role: RoleDefinition }) {
  if (!module) {
    return <GeneralDashboard roleId={role.id} />;
  }

  const showWorkspaceGuide = role.id === 'academic_staff' || role.id === 'accountant';
  return <div className={`feature-page feature-page--${role.id}`}>
    {showWorkspaceGuide && <RoleWorkspaceIntro module={module} role={role} />}
    <FeatureBody code={module.code} />
  </div>;
}

const WORKSPACE_STEPS: Record<string, string[]> = {
  E1: ['Tạo năm học và học kỳ', 'Chuẩn hóa lớp, môn, phòng', 'Phân lớp và kiểm tra dữ liệu'],
  E2: ['Tiếp nhận đăng ký tiết dạy', 'Phân công đúng chuyên môn', 'Tạo và duyệt thời khóa biểu'],
  E3: ['Tạo kỳ thi', 'Xếp lịch, phòng và nhân sự', 'Công bố lịch chính thức'],
  E4: ['Chọn niên khóa', 'Tra cứu học sinh đã tốt nghiệp', 'Mở hồ sơ lịch sử khi cần'],
  E5: ['Nhận học bạ GVCN đã gửi', 'Kiểm tra đủ 12 môn và hạnh kiểm', 'Duyệt, khóa rồi phát hành'],
  F1: ['Tạo đợt và khoản thu', 'Mở đợt, phát hành hóa đơn', 'Theo dõi công nợ', 'Đối soát thanh toán'],
};

function RoleWorkspaceIntro({ module, role }: { module: ModuleItem; role: RoleDefinition }) {
  const steps = WORKSPACE_STEPS[module.code] ?? [];
  return <details className="role-workspace-intro" aria-label={`Hướng dẫn ${module.title}`}>
    <summary className="role-workspace-summary">
      <span className="role-workspace-icon"><ListChecks size={20} /></span>
      <span className="role-workspace-summary-copy">
        <small><ShieldCheck size={14} /> {role.label}</small>
        <strong>Quy trình đề xuất cho {module.title}</strong>
      </span>
      <span className="role-workspace-help">Xem {steps.length} bước <ChevronDown size={17} /></span>
    </summary>
    <ol className="role-workspace-steps">
      {steps.map((step, index) => <li key={step}><b>{index + 1}</b><span>{step}</span>{index < steps.length - 1 && <ArrowRight size={15} />}</li>)}
    </ol>
  </details>;
}

export function FeatureBody({ code }: { code: string }) {
  switch (code) {
    // ---- Admin ----
    case 'A1S': return <AdminUsersLive fixedRole="STUDENT" />;
    case 'A1T': return <AdminUsersLive fixedRole="TEACHER" />;
    case 'A1P': return <AdminUsersLive fixedRole="PARENT" />;
    case 'A1O': return <AdminOperationsUsersLive />;
    case 'A1L': return <AdminAccountLifecycleLive />;
    case 'A2': return <AdminAcademicLive />;
    case 'A3': return <AdminTimetableLive />;
    case 'A4': return <AdminExamsLive />;
    case 'A6': return <AdminAuditLive />;
    case 'A7': return <AdminFinanceLive />;
    case 'A8': return <AdminReportsLive />;
    case 'A9': return <AdminNotificationsLive />;
    // ---- Giáo vụ ----
    case 'E1': return <AdminAcademicLive />;
    case 'E2': return <AdminTimetableLive />;
    case 'E3': return <AdminExamsLive />;
    case 'E4': return <AlumniLive />;
    case 'E5': return <AcademicStaffReportCardsLive />;
    // ---- Kế toán ----
    case 'F1': return <AdminFinanceLive />;
    // ---- Teacher ----
    case 'B1': return <TeacherClassesLive />;
    case 'B14': return <TeacherLoadRegistrationLive />;
    case 'B15': return <TeachingOperationsLive />;
    case 'B16': return <StudentSupportLive />;
    case 'B2': return <MyTimetableLive />;
    case 'B3': return <TeacherAttendanceLive />;
    case 'B4': return <TeacherGradesLive />;
    case 'B5': return <AssignmentsLive actor="teacher" />;
    case 'B6': return <ChatLive />;
    case 'B7': return <TeacherNotificationsLive />;
    case 'B8': return <TeacherFinanceLive />;
    case 'B9': return <LeaveRequestsLive actor="teacher" />;
    case 'B10': return <PersonalReportsLive actor="teacher" />;
    case 'B11': return <ProfileSettingsLive actor="teacher" />;
    case 'B12': return <MyExamsLive actor="teacher" />;
    case 'B13': return <TeacherReportCardsLive />;
    // ---- Student ----
    case 'C1': return <StudentProfileLive />;
    case 'C2': return <StudentAcademicLive />;
    case 'C3': return <StudentAttendanceLive />;
    case 'C4': return <AssignmentsLive actor="student" />;
    case 'C5': return <NotificationsLive audience="student" />;
    case 'C7': return <ChatLive />;
    case 'C6': return <LeaveRequestsLive actor="student" />;
    case 'C8': return <PersonalReportsLive actor="student" />;
    case 'C9': return <ProfileSettingsLive actor="student" />;
    case 'C10': return <MyExamsLive actor="student" />;
    case 'C11': return <StudentReportCardLive />;
    // ---- Parent ----
    case 'D1': return <ParentSwitchLive />;
    case 'D2': return <ParentMonitorLive />;
    case 'D3': return <ChatLive />;
    case 'D4': return <ParentInvoiceLive />;
    case 'D5': return <NotificationsLive audience="parent" />;
    case 'D6': return <LeaveRequestsLive actor="parent" />;
    case 'D7': return <PersonalReportsLive actor="parent" />;
    case 'D8': return <ProfileSettingsLive actor="parent" />;
    case 'D9': return <MyExamsLive actor="parent" />;
    case 'D10': return <ParentReportCardLive />;
    default: return <GeneralDashboard roleId="admin" />;
  }
}
