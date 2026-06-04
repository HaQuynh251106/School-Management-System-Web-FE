import type React from 'react';
import type { ModuleItem, RoleDefinition } from '../types';
import { GeneralDashboard } from './dashboard/GeneralDashboard';
import { AdminReportsLive } from './live/AdminReportsLive';
import { AdminAuditLive } from './live/AdminAuditLive';
import { AdminTimetableLive } from './live/AdminTimetableLive';
import { ChatLive } from './live/ChatLive';
// Live (nối backend thật)
import {
  AdminUsersLive, AdminAcademicLive, AdminExamCategoriesLive,
  AdminFinanceLive, AdminTemplatesLive, AdminClubsLive,
} from './live/AdminLive';
import { TeacherClassesLive, TeacherAttendanceLive, TeacherGradesLive } from './live/TeacherLive';
import { StudentProfileLive, StudentAcademicLive, StudentAttendanceLive } from './live/StudentLive';
import { ParentSwitchLive, ParentMonitorLive, ParentInvoiceLive, ParentExtracurricularLive } from './live/ParentLive';
import { MyTimetableLive, AssignmentsLive, ExtracurricularLive, NotificationsLive } from './live/SharedLive';

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
    // ---- Admin ----
    case 'A1': return <AdminUsersLive />;
    case 'A2': return <AdminAcademicLive />;
    case 'A3': return <AdminTimetableLive />;
    case 'A4': return <AdminExamCategoriesLive />;
    case 'A5': return <AdminClubsLive />;
    case 'A6': return <AdminAuditLive />;
    case 'A7': return <AdminFinanceLive />;
    case 'A8': return <AdminReportsLive />;
    case 'A9': return <AdminTemplatesLive />;
    // ---- Teacher ----
    case 'B1': return <TeacherClassesLive />;
    case 'B2': return <MyTimetableLive />;
    case 'B3': return <TeacherAttendanceLive />;
    case 'B4': return <TeacherGradesLive />;
    case 'B5': return <AssignmentsLive actor="teacher" />;
    case 'B6': return <ChatLive />;
    // ---- Student ----
    case 'C1': return <StudentProfileLive />;
    case 'C2': return <StudentAcademicLive />;
    case 'C3': return <StudentAttendanceLive />;
    case 'C4': return <AssignmentsLive actor="student" />;
    case 'C5': return <NotificationsLive />;
    case 'C6': return <ExtracurricularLive actor="student" />;
    // ---- Parent ----
    case 'D1': return <ParentSwitchLive />;
    case 'D2': return <ParentMonitorLive />;
    case 'D3': return <ChatLive />;
    case 'D4': return <ParentInvoiceLive />;
    case 'D5': return <ParentExtracurricularLive />;
    default: return <GeneralDashboard roleId="admin" />;
  }
}
