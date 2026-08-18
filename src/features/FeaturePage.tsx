import { lazy, Suspense } from 'react';
import type { ModuleItem, RoleDefinition } from '../types';
import { GeneralDashboard } from './dashboard/GeneralDashboard';

const AdminReportsLive = lazy(() => import('./live/AdminReportsLive').then((module) => ({ default: module.AdminReportsLive })));
const AdminAuditLive = lazy(() => import('./live/AdminAuditLive').then((module) => ({ default: module.AdminAuditLive })));
const AdminTimetableLive = lazy(() => import('./live/AdminTimetableLive').then((module) => ({ default: module.AdminTimetableLive })));
const ChatLive = lazy(() => import('./live/ChatLive').then((module) => ({ default: module.ChatLive })));
const AdminUsersLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminUsersLive })));
const AdminAcademicLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminAcademicLive })));
const AdminExamCategoriesLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminExamCategoriesLive })));
const AdminFinanceLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminFinanceLive })));
const AdminNotificationsLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminNotificationsLive })));
const AdminClubsLive = lazy(() => import('./live/AdminLive').then((module) => ({ default: module.AdminClubsLive })));
const TeacherClassesLive = lazy(() => import('./live/TeacherLive').then((module) => ({ default: module.TeacherClassesLive })));
const TeacherAttendanceLive = lazy(() => import('./live/TeacherLive').then((module) => ({ default: module.TeacherAttendanceLive })));
const TeacherGradesLive = lazy(() => import('./live/TeacherLive').then((module) => ({ default: module.TeacherGradesLive })));
const TeacherNotificationsLive = lazy(() => import('./live/TeacherLive').then((module) => ({ default: module.TeacherNotificationsLive })));
const StudentProfileLive = lazy(() => import('./live/StudentLive').then((module) => ({ default: module.StudentProfileLive })));
const StudentAcademicLive = lazy(() => import('./live/StudentLive').then((module) => ({ default: module.StudentAcademicLive })));
const StudentAttendanceLive = lazy(() => import('./live/StudentLive').then((module) => ({ default: module.StudentAttendanceLive })));
const ParentSwitchLive = lazy(() => import('./live/ParentLive').then((module) => ({ default: module.ParentSwitchLive })));
const ParentMonitorLive = lazy(() => import('./live/ParentLive').then((module) => ({ default: module.ParentMonitorLive })));
const ParentInvoiceLive = lazy(() => import('./live/ParentLive').then((module) => ({ default: module.ParentInvoiceLive })));
const ParentExtracurricularLive = lazy(() => import('./live/ParentLive').then((module) => ({ default: module.ParentExtracurricularLive })));
const MyTimetableLive = lazy(() => import('./live/SharedLive').then((module) => ({ default: module.MyTimetableLive })));
const ExtracurricularLive = lazy(() => import('./live/SharedLive').then((module) => ({ default: module.ExtracurricularLive })));
const NotificationsLive = lazy(() => import('./live/SharedLive').then((module) => ({ default: module.NotificationsLive })));
const AssignmentsLive = lazy(() => import('./live/AssignmentWorkspace').then((module) => ({ default: module.AssignmentsLive })));
const PublishedExamSchedule = lazy(() => import('./live/ExamScheduleWorkspace').then((module) => ({ default: module.PublishedExamSchedule })));

export function FeaturePage({ module, role }: { module?: ModuleItem; role: RoleDefinition }) {
  if (!module) {
    return <GeneralDashboard roleId={role.id} />;
  }

  return <div className="feature-page"><FeatureBody code={module.code} /></div>;
}

export function FeatureBody({ code }: { code: string }) {
  return <Suspense fallback={<div className="feature-page-loading" role="status"><span /><span /><span /><strong>Đang mở chức năng…</strong></div>}><FeatureBodyContent code={code} /></Suspense>;
}

function FeatureBodyContent({ code }: { code: string }) {
  switch (code) {
    // ---- Admin ----
    case 'A1': return <AdminUsersLive />;
    case 'A2': return <AdminAcademicLive />;
    case 'A3': return <AdminTimetableLive />;
    case 'A4': return <AdminExamCategoriesLive />;
    case 'A5': return <AdminClubsLive />;
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
    case 'B8': return <AdminAcademicLive />;
    case 'B9': return <PublishedExamSchedule path="/exam-periods/me/schedule" teacher />;
    case 'B10': return <NotificationsLive />;
    // ---- Student ----
    case 'C1': return <StudentProfileLive />;
    case 'C2': return <StudentAcademicLive />;
    case 'C3': return <StudentAttendanceLive />;
    case 'C4': return <AssignmentsLive actor="student" />;
    case 'C5': return <NotificationsLive />;
    case 'C6': return <ExtracurricularLive actor="student" />;
    case 'C7': return <ChatLive />;
    // ---- Parent ----
    case 'D1': return <ParentSwitchLive />;
    case 'D2': return <ParentMonitorLive />;
    case 'D3': return <ChatLive />;
    case 'D4': return <ParentInvoiceLive />;
    case 'D5': return <ParentExtracurricularLive />;
    case 'D6': return <NotificationsLive />;
    default: return <GeneralDashboard roleId="admin" />;
  }
}
