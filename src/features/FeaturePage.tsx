import type { ModuleItem, RoleDefinition } from '../types';
import { GeneralDashboard } from './dashboard/GeneralDashboard';
import { AdminReportsLive } from './live/AdminReportsLive';
import { AdminAuditLive } from './live/AdminAuditLive';
import { AdminTimetableLive } from './live/AdminTimetableLive';
import { ChatLive } from './live/ChatLive';
// Live (nối backend thật)
import {
  AdminUsersLive,
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

export function FeaturePage({ module, role }: { module?: ModuleItem; role: RoleDefinition }) {
  if (!module) {
    return <GeneralDashboard roleId={role.id} />;
  }

  return <div className="feature-page"><FeatureBody code={module.code} /></div>;
}

export function FeatureBody({ code }: { code: string }) {
  switch (code) {
    // ---- Admin ----
    case 'A1S': return <AdminUsersLive fixedRole="STUDENT" />;
    case 'A1T': return <AdminUsersLive fixedRole="TEACHER" />;
    case 'A1P': return <AdminUsersLive fixedRole="PARENT" />;
    case 'A2': return <AdminAcademicLive />;
    case 'A3': return <AdminTimetableLive />;
    case 'A4': return <AdminExamsLive />;
    case 'A6': return <AdminAuditLive />;
    case 'A7': return <AdminFinanceLive />;
    case 'A8': return <AdminReportsLive />;
    case 'A9': return <AdminNotificationsLive />;
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
    default: return <GeneralDashboard roleId="admin" />;
  }
}
