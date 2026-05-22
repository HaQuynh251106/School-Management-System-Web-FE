import type React from 'react';
import type { ModuleItem, RoleDefinition } from '../types';
import {
  AdminAcademicFeature,
  AdminAuditFeature,
  AdminExtracurricularFeature,
  AdminTimetableFeature,
  AdminUsersFeature,
  FinanceFeature,
  NotificationTemplateFeature,
  ReportsFeature,
  ScoreConfigFeature,
} from './admin/AdminFeatures';
import { TeacherAttendanceFeature, TeacherClassesFeature, TeacherGradesFeature } from './teacher/TeacherFeatures';
import { StudentAcademicFeature, StudentAttendanceFeature, StudentProfileFeature } from './student/StudentFeatures';
import { ParentInvoiceFeature, ParentMonitorFeature, ParentSwitchFeature } from './parent/ParentFeatures';
import { AssignmentFeature, CommunicationFeature, ExtracurricularFeature, NotificationFeature } from './shared/FeatureWidgets';
import { GeneralDashboard } from './dashboard/GeneralDashboard';

export function FeaturePage({ module, role }: { module?: ModuleItem; role: RoleDefinition }) {
  if (!module) {
    return <GeneralDashboard roleId={role.id} />;
  }

  return (
    <div className="feature-page">
      <section className="feature-hero" style={{ '--role-color': role.color } as React.CSSProperties}>
        <div className="feature-icon">
          <module.Icon size={24} />
        </div>
        <div>
          <span>{module.code} · {module.phase} · ưu tiên {module.priority}</span>
          <h2>{module.title}</h2>
          <p>{module.summary}</p>
        </div>
      </section>
      <FeatureBody code={module.code} />
    </div>
  );
}

export function FeatureBody({ code }: { code: string }) {
  switch (code) {
    case 'A1':
      return <AdminUsersFeature />;
    case 'A2':
      return <AdminAcademicFeature />;
    case 'A3':
      return <AdminTimetableFeature />;
    case 'A4':
      return <ScoreConfigFeature />;
    case 'A5':
      return <AdminExtracurricularFeature />;
    case 'A6':
      return <AdminAuditFeature />;
    case 'A7':
      return <FinanceFeature />;
    case 'A8':
      return <ReportsFeature />;
    case 'A9':
      return <NotificationTemplateFeature />;
    case 'B1':
      return <TeacherClassesFeature />;
    case 'B2':
      return <AdminTimetableFeature title="TKB cá nhân" subtitle="Lịch dạy theo tuần của giáo viên" />;
    case 'B3':
      return <TeacherAttendanceFeature />;
    case 'B4':
      return <TeacherGradesFeature />;
    case 'B5':
      return <AssignmentFeature actor="teacher" />;
    case 'B6':
      return <CommunicationFeature actor="teacher" />;
    case 'C1':
      return <StudentProfileFeature />;
    case 'C2':
      return <StudentAcademicFeature />;
    case 'C3':
      return <StudentAttendanceFeature />;
    case 'C4':
      return <AssignmentFeature actor="student" />;
    case 'C5':
      return <NotificationFeature />;
    case 'C6':
      return <ExtracurricularFeature actor="student" />;
    case 'D1':
      return <ParentSwitchFeature />;
    case 'D2':
      return <ParentMonitorFeature />;
    case 'D3':
      return <CommunicationFeature actor="parent" />;
    case 'D4':
      return <ParentInvoiceFeature />;
    case 'D5':
      return <ExtracurricularFeature actor="parent" />;
    default:
      return <GeneralDashboard roleId="admin" />;
  }
}
