import type { ModuleItem, RoleDefinition } from '../types';
import { ArrowRight, CircleHelp, ShieldCheck } from 'lucide-react';
import { GeneralDashboard } from './dashboard/GeneralDashboard';
import { AdminReportsLive } from './live/AdminReportsLive';
import { AdminAuditLive } from './live/AdminAuditLive';
import { AdminTimetableLive } from './live/AdminTimetableLive';
import { ChatLive } from './live/ChatLive';
// Live (nối backend thật)
import {
  AdminUsersLive, AdminOperationsUsersLive,
  AdminFinanceLive, AdminNotificationsLive,
} from './live/AdminLive';
import { AdminAcademicLive } from './live/AdminAcademicManager';
import { TeacherClassesLive, TeacherAttendanceLive, TeacherGradesLive, TeacherNotificationsLive, TeacherFinanceLive } from './live/TeacherLive';
import { StudentProfileLive, StudentAcademicLive, StudentAttendanceLive } from './live/StudentLive';
import { ParentSwitchLive, ParentMonitorLive, ParentInvoiceLive } from './live/ParentLive';
import { MyTimetableLive, AssignmentsLive, NotificationsLive } from './live/SharedLive';
import { LeaveRequestsLive } from './live/LeaveRequestsLive';
import { PersonalReportsLive } from './live/PersonalReportsLive';
import { ProfileSettingsLive } from './live/ProfileSettingsLive';
import { AdminExamsLive } from './live/AdminExamsLive';
import { MyExamsLive } from './live/MyExamsLive';
import { ParentYearEndLive, StudentYearEndLive, TeacherConductLive } from './live/YearEndLive';
import { AlumniLive } from './live/AlumniLive';

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
  F1: ['Tạo đợt và khoản thu', 'Mở đợt, phát hành hóa đơn', 'Theo dõi công nợ', 'Đối soát thanh toán'],
};

function RoleWorkspaceIntro({ module, role }: { module: ModuleItem; role: RoleDefinition }) {
  const steps = WORKSPACE_STEPS[module.code] ?? [];
  return <section className="role-workspace-intro" aria-label={`Hướng dẫn ${module.title}`}>
    <div className="role-workspace-main">
      <span className="role-workspace-icon"><module.Icon size={24} /></span>
      <div>
        <small><ShieldCheck size={14} /> Không gian chuyên trách · {role.label}</small>
        <h2>{module.title}</h2>
        <p>{module.summary}</p>
      </div>
      <span className="role-workspace-help" title="Thực hiện lần lượt các bước bên dưới"><CircleHelp size={18} /> Quy trình đề xuất</span>
    </div>
    <ol className="role-workspace-steps">
      {steps.map((step, index) => <li key={step}><b>{index + 1}</b><span>{step}</span>{index < steps.length - 1 && <ArrowRight size={15} />}</li>)}
    </ol>
  </section>;
}

export function FeatureBody({ code }: { code: string }) {
  switch (code) {
    // ---- Admin ----
    case 'A1S': return <AdminUsersLive fixedRole="STUDENT" />;
    case 'A1T': return <AdminUsersLive fixedRole="TEACHER" />;
    case 'A1P': return <AdminUsersLive fixedRole="PARENT" />;
    case 'A1A': return <AlumniLive />;
    case 'A1O': return <AdminOperationsUsersLive />;
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
    // ---- Kế toán ----
    case 'F1': return <AdminFinanceLive />;
    // ---- Teacher ----
    case 'B1': return <TeacherClassesLive />;
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
    case 'B13': return <TeacherConductLive />;
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
    case 'C11': return <StudentYearEndLive />;
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
    case 'D10': return <ParentYearEndLive />;
    default: return <GeneralDashboard roleId="admin" />;
  }
}
