import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Database,
  Eye,
  FileSpreadsheet,
  History,
  LockKeyhole,
  Plus,
  School,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRoundCog,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  academicYears,
  adminCourses,
  attendanceTrend,
  auditActionStats,
  auditEvents,
  auditModuleStats,
  conflicts,
  currency,
  feePeriods,
  gradeBands,
  holidays,
  importRows,
  notificationTemplates,
  payments,
  rooms,
  scoreCategories,
  subjects,
} from '../../data/mockData';
import { BarList, ChartCard, ColumnChart, SplitDashboard } from '../../components/charts';
import { Badge, CommandButton, FunctionTabs, InfoGrid, PermissionMatrix, ProcessList, Section, StatusPill } from '../../components/ui';
import { ClassTable, InvoiceSection, TimetableGrid, UserList } from '../shared/FeatureWidgets';

export function AdminAcademicFeature() {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'years',
          label: 'Năm học',
          Icon: CalendarDays,
          content: (
            <Section title="Năm học & học kỳ" subtitle="Thiết lập mốc đào tạo trước khi tạo lớp" wide>
              <InfoGrid
                items={academicYears.map((item) => ({
                  title: item.name,
                  value: item.status,
                  meta: `${item.semesters} · ${item.classes} lớp`,
                }))}
              />
            </Section>
          ),
        },
        {
          id: 'classes',
          label: 'Lớp học',
          Icon: School,
          content: (
            <Section
              title="Danh sách lớp"
              subtitle="GVCN, sĩ số và trạng thái lớp theo năm học"
              action={<CommandButton Icon={Upload} label="Import Excel" />}
              wide
            >
              <ClassTable />
            </Section>
          ),
        },
        {
          id: 'subjects',
          label: 'Môn & phòng',
          Icon: BookOpenCheck,
          content: (
            <div className="feature-grid">
              <Section title="Môn học" subtitle="Mã môn, hệ số và số GV phụ trách">
                <InfoGrid
                  items={subjects.map((item) => ({
                    title: item.name,
                    value: item.code,
                    meta: `Hệ số ${item.coefficient} · ${item.teachers} GV`,
                  }))}
                />
              </Section>
              <Section title="Phòng học" subtitle="Loại phòng, sức chứa và trạng thái">
                <InfoGrid
                  items={rooms.map((item) => ({
                    title: item.name,
                    value: item.type,
                    meta: `${item.capacity} chỗ · ${item.status}`,
                  }))}
                />
              </Section>
            </div>
          ),
        },
        {
          id: 'homeroom',
          label: 'Gán GVCN',
          Icon: UserRoundCog,
          content: (
            <Section title="Phân công GVCN" subtitle="Liên kết lớp với giáo viên chủ nhiệm và danh sách học sinh" wide>
              <ProcessList
                items={[
                  'Chọn năm học và khối lớp cần phân công.',
                  'Gán GVCN cho từng lớp, kiểm tra giáo viên đã có lớp chủ nhiệm hay chưa.',
                  'Import hoặc điều chuyển học sinh vào class_enrollments.',
                  'Khóa cấu trúc lớp trước khi xếp thời khóa biểu.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function AdminUsersFeature() {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'accounts',
          label: 'Tài khoản',
          Icon: Users,
          content: (
            <Section
              title="Người dùng & RBAC"
              subtitle="Identity Service - ACTIVE, PENDING, LOCKED và soft delete"
              action={<CommandButton Icon={Plus} label="Tạo user" />}
              wide
            >
              <UserList />
            </Section>
          ),
        },
        {
          id: 'import',
          label: 'Import Excel',
          Icon: Upload,
          content: (
            <Section title="Import người dùng" subtitle="Validate dữ liệu trước khi bulk insert users và profiles" wide>
              <div className="compact-table">
                {importRows.map((item) => (
                  <div key={item.file}>
                    <strong>{item.file}</strong>
                    <span>{item.rows} dòng</span>
                    <span>{item.valid} hợp lệ</span>
                    <StatusPill value={item.warning > 0 ? `${item.warning} cảnh báo` : 'OK'} />
                    <small>{item.owner}</small>
                  </div>
                ))}
              </div>
            </Section>
          ),
        },
        {
          id: 'permissions',
          label: 'Vai trò & quyền',
          Icon: ShieldCheck,
          content: (
            <Section title="Ma trận quyền" subtitle="Role-permission theo module identity, academic, finance" wide>
              <PermissionMatrix />
            </Section>
          ),
        },
        {
          id: 'security',
          label: 'Bảo mật',
          Icon: LockKeyhole,
          content: (
            <Section title="Session control" subtitle="JWT RS256, refresh token rotation và reset password" wide>
              <ProcessList
                items={[
                  'Access token 15 phút, refresh token 7 ngày và rotate sau mỗi lần refresh.',
                  'Reset mật khẩu gửi email, token chỉ dùng một lần và hết hạn sau 30 phút.',
                  'Khóa tài khoản dùng status=LOCKED, không xóa cứng để giữ audit.',
                  'Login history ghi IP, user agent và kết quả đăng nhập.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function AdminTimetableFeature({
  title = 'Xếp thời khóa biểu',
  subtitle = 'Kiểm tra UNIQUE class + teacher + room theo ngày và tiết',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'grid',
          label: 'Lưới TKB',
          Icon: CalendarDays,
          content: (
            <Section title={title} subtitle={subtitle} action={<CommandButton Icon={Plus} label="Thêm tiết" />} wide>
              <TimetableGrid />
            </Section>
          ),
        },
        {
          id: 'conflict',
          label: 'Xung đột',
          Icon: AlertTriangle,
          content: (
            <Section title="Conflict Resolution" subtitle="Cảnh báo trước khi lưu timetable_slots" wide>
              <InfoGrid
                items={conflicts.map((item) => ({
                  title: item.slot,
                  value: item.severity,
                  meta: item.reason,
                }))}
              />
            </Section>
          ),
        },
        {
          id: 'holidays',
          label: 'Ngày nghỉ',
          Icon: Clock3,
          content: (
            <Section title="School holidays" subtitle="Ngày nghỉ dùng để chặn hoặc cảnh báo khi xếp lịch" wide>
              <InfoGrid
                items={holidays.map((item) => ({
                  title: item.date,
                  value: item.title,
                  meta: item.scope,
                }))}
              />
            </Section>
          ),
        },
        {
          id: 'publish',
          label: 'Phát hành',
          Icon: Send,
          content: (
            <Section title="Luồng phát hành TKB" subtitle="Sau khi duyệt, hệ thống gửi sự kiện academic.timetable.changed" wide>
              <ProcessList
                items={[
                  'Admin rà soát conflict theo lớp, giáo viên và phòng.',
                  'Khóa phiên bản nháp của thời khóa biểu trong học kỳ.',
                  'Publish TKB cho Teacher, Student và Parent.',
                  'Notification Service gửi thông báo thay đổi lịch.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function ScoreConfigFeature() {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'categories',
          label: 'Loại điểm',
          Icon: ClipboardList,
          content: (
            <Section title="Cấu hình loại điểm" subtitle="Số cột và hệ số tính trung bình" wide>
              <div className="config-list">
                {scoreCategories.map((item) => (
                  <div key={item.name} className="config-row">
                    <span>{item.name}</span>
                    <strong>Hệ số {item.weight}</strong>
                    <small>{item.count} cột điểm</small>
                  </div>
                ))}
              </div>
            </Section>
          ),
        },
        {
          id: 'subjects',
          label: 'Hệ số môn',
          Icon: BookOpenCheck,
          content: (
            <Section title="Subject score coefficient" subtitle="Hệ số môn học dùng khi tổng kết học kỳ" wide>
              <InfoGrid
                items={subjects.map((item) => ({
                  title: item.name,
                  value: `Hệ số ${item.coefficient}`,
                  meta: item.code,
                }))}
              />
            </Section>
          ),
        },
        {
          id: 'rules',
          label: 'Quy tắc',
          Icon: Settings,
          content: (
            <Section title="Quy tắc nhập điểm" subtitle="Validation và audit log khi sửa điểm" wide>
              <ProcessList
                items={[
                  'Điểm hợp lệ trong khoảng 0 đến 10 và hỗ trợ bước 0.1.',
                  'Sửa điểm bắt buộc nhập lý do, lưu old_score, new_score và changed_by.',
                  'Khi publish điểm, hệ thống gửi thông báo tới HS và PH primary.',
                  'Điểm tổng kết tính theo trọng số loại điểm và hệ số môn học.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function FinanceFeature() {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'invoices',
          label: 'Hóa đơn',
          Icon: WalletCards,
          content: <InvoiceSection />,
        },
        {
          id: 'periods',
          label: 'Đợt thu',
          Icon: CalendarDays,
          content: (
            <Section title="Đợt thu" subtitle="Tạo fee_periods và sinh invoice theo khối hoặc học sinh" wide>
              <InfoGrid
                items={feePeriods.map((item) => ({
                  title: item.name,
                  value: currency.format(item.amount),
                  meta: `${item.status} · ${item.invoices} hóa đơn`,
                }))}
              />
            </Section>
          ),
        },
        {
          id: 'payments',
          label: 'Giao dịch',
          Icon: CircleDollarSign,
          content: (
            <Section title="Payment gateway transaction log" subtitle="Theo dõi callback VNPAY/MoMo và đối soát" wide>
              <div className="compact-table">
                {payments.map((item) => (
                  <div key={item.ref}>
                    <strong>{item.ref}</strong>
                    <span>{item.method}</span>
                    <span>{item.payer}</span>
                    <b>{currency.format(item.amount)}</b>
                    <StatusPill value={item.status} />
                  </div>
                ))}
              </div>
            </Section>
          ),
        },
        {
          id: 'debt',
          label: 'Công nợ',
          Icon: AlertTriangle,
          content: (
            <ChartCard title="Công nợ theo trạng thái" subtitle="Tỷ lệ hóa đơn đã thanh toán, còn nợ và quá hạn">
              <SplitDashboard />
            </ChartCard>
          ),
        },
      ]}
    />
  );
}

export function ReportsFeature() {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'overview',
          label: 'Tổng hợp',
          Icon: BarChart3,
          content: (
            <div className="feature-grid">
              <ChartCard title="Báo cáo chuyên cần" subtitle="Tỷ lệ có mặt theo ngày">
                <ColumnChart data={attendanceTrend} max={100} suffix="%" />
              </ChartCard>
              <ChartCard title="Báo cáo phổ điểm" subtitle="Số học sinh theo dải điểm">
                <BarList data={gradeBands} max={80} suffix=" HS" />
              </ChartCard>
            </div>
          ),
        },
        {
          id: 'export',
          label: 'Export',
          Icon: FileSpreadsheet,
          content: (
            <Section title="Xuất báo cáo" subtitle="Excel/PDF theo phân hệ và khoảng thời gian" wide>
              <ProcessList
                items={[
                  'Chọn mẫu báo cáo: phổ điểm, chuyên cần, tỷ lệ lên lớp hoặc doanh thu.',
                  'Chọn năm học, học kỳ, khối hoặc lớp.',
                  'Xem preview số liệu trước khi export.',
                  'Ghi audit log cho mọi lần tải báo cáo.',
                ]}
              />
            </Section>
          ),
        },
        {
          id: 'audit',
          label: 'Audit',
          Icon: ShieldCheck,
          content: (
            <Section title="Audit viewer" subtitle="Truy vấn MongoDB audit_logs theo actor và entity" wide>
              <InfoGrid
                items={[
                  { title: 'PASSWORD_RESET', value: '128 events', meta: 'Identity Service' },
                  { title: 'GRADE_CHANGED', value: '42 events', meta: 'Academic Service' },
                  { title: 'PAYMENT_SUCCESS', value: '318 events', meta: 'Finance Service' },
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

// =========== A5: Quản lý khóa ngoại khóa ===========

export function AdminExtracurricularFeature() {
  const open = adminCourses.filter((c) => c.status === 'OPEN');
  const closed = adminCourses.filter((c) => c.status === 'CLOSED');
  const totalRevenue = open.reduce((sum, c) => sum + c.fee * c.enrolled, 0);

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'open',
          label: `Đang mở (${open.length})`,
          Icon: Sparkles,
          content: (
            <Section
              title="Khóa ngoại khóa đang mở"
              subtitle="Sĩ số, học phí và tỉ lệ lấp đầy theo từng khóa"
              action={<CommandButton Icon={Plus} label="Tạo khóa" />}
              wide
            >
              <AdminCourseList courses={open} />
            </Section>
          ),
        },
        {
          id: 'closed',
          label: `Đã đóng (${closed.length})`,
          Icon: Database,
          content: (
            <Section title="Khóa đã đóng" subtitle="Lịch sử khóa các năm trước" wide>
              <AdminCourseList courses={closed} />
            </Section>
          ),
        },
        {
          id: 'revenue',
          label: 'Doanh thu',
          Icon: CircleDollarSign,
          content: (
            <div className="feature-grid">
              <ChartCard title="Doanh thu tạm tính" subtitle={`Tổng ${currency.format(totalRevenue)} từ khóa đang mở`}>
                <BarList
                  data={open.map((c) => ({ label: c.name, value: Math.round((c.enrolled / c.capacity) * 100) }))}
                  max={100}
                  suffix="%"
                />
              </ChartCard>
              <Section title="Phát sinh hóa đơn tự động" subtitle="Khi PH đăng ký, hệ thống tạo invoice EXTRACURRICULAR">
                <ProcessList
                  items={[
                    'PH chọn khóa và bấm Đăng ký.',
                    'extracurricular_enrollments lưu trạng thái PENDING.',
                    'Finance Service sinh invoice với fee_category EXTRACURRICULAR.',
                    'Sau khi PH thanh toán, status đổi sang CONFIRMED.',
                  ]}
                />
              </Section>
            </div>
          ),
        },
      ]}
    />
  );
}

function AdminCourseList({ courses }: { courses: typeof adminCourses }) {
  if (courses.length === 0) {
    return <div className="empty-state"><Sparkles size={22} /><strong>Chưa có khóa</strong><span>Tạo khóa mới để mở đăng ký.</span></div>;
  }
  return (
    <div className="info-grid">
      {courses.map((course) => {
        const ratio = Math.round((course.enrolled / course.capacity) * 100);
        return (
          <article key={course.code} className="info-tile">
            <span>{course.code}</span>
            <strong>{course.name}</strong>
            <small>GV {course.instructor} · {currency.format(course.fee)}</small>
            <div className="score-meter" style={{ marginTop: 6 }}>
              <i style={{ width: `${Math.min(100, ratio)}%` }} />
            </div>
            <small>{course.enrolled}/{course.capacity} HS · {ratio}%</small>
          </article>
        );
      })}
    </div>
  );
}

// =========== A6: Audit log ===========

export function AdminAuditFeature() {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'stream',
          label: 'Sự kiện gần nhất',
          Icon: History,
          content: (
            <Section
              title="Audit stream"
              subtitle="Mongo collection audit_logs — index theo actorUserId, entity, timestamp"
              action={<CommandButton Icon={Eye} label="Tải thêm" />}
              wide
            >
              <div className="compact-table">
                {auditEvents.map((event) => (
                  <div key={event.id}>
                    <strong>{event.time}</strong>
                    <span>@{event.actor}</span>
                    <span>{event.module} · {event.action}</span>
                    <small>{event.entity}</small>
                    <StatusPill value={event.note} />
                  </div>
                ))}
              </div>
            </Section>
          ),
        },
        {
          id: 'module',
          label: 'Theo module',
          Icon: Database,
          content: (
            <div className="feature-grid">
              <ChartCard title="Số sự kiện theo module" subtitle="Tích lũy 30 ngày">
                <BarList data={auditModuleStats} max={400} suffix=" evts" />
              </ChartCard>
              <ChartCard title="Số sự kiện theo action" subtitle="LOGIN, CREATE, UPDATE, DELETE, PAYMENT">
                <BarList data={auditActionStats} max={400} suffix=" evts" />
              </ChartCard>
            </div>
          ),
        },
        {
          id: 'actor',
          label: 'Theo actor',
          Icon: UserRoundCog,
          content: (
            <Section title="Hành động theo người dùng" subtitle="Group by actor — phục vụ điều tra sự cố" wide>
              <InfoGrid
                items={[
                  { title: '@admin', value: '128 events', meta: 'CREATE/UPDATE/EXPORT' },
                  { title: '@gv.tranhuy', value: '42 events', meta: 'UPDATE grade + assignment' },
                  { title: '@ph.mailan', value: '18 events', meta: 'PAYMENT + LOGIN' },
                  { title: '@system', value: '318 events', meta: 'Notification dispatch' },
                ]}
              />
            </Section>
          ),
        },
        {
          id: 'retention',
          label: 'Retention',
          Icon: Trash2,
          content: (
            <Section title="Chính sách lưu trữ" subtitle="TTL 2 năm cho audit_logs, archive sau 6 tháng" wide>
              <ProcessList
                items={[
                  'Ghi mọi action CRUD nhạy cảm vào audit_logs (before/after snapshot).',
                  'Index { actorUserId, timestamp DESC } và { entityType, entityId, timestamp DESC }.',
                  'TTL 2 năm để giảm dung lượng.',
                  'Export PDF khi có yêu cầu thanh tra.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

// =========== A9: Template thông báo ===========

export function NotificationTemplateFeature() {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'list',
          label: `Tất cả (${notificationTemplates.length})`,
          Icon: Bell,
          content: (
            <Section
              title="Notification templates"
              subtitle="Render bằng Handlebars — biến binh: {{studentName}} {{score}} {{invoiceCode}}..."
              action={<CommandButton Icon={Plus} label="Tạo template" />}
              wide
            >
              <TemplateGrid templates={notificationTemplates} />
            </Section>
          ),
        },
        {
          id: 'push',
          label: 'Push',
          Icon: Send,
          content: (
            <Section title="Push (FCM)" subtitle="Chỉ tiêu đề + body ngắn cho mobile" wide>
              <TemplateGrid templates={notificationTemplates.filter((t) => t.channel === 'PUSH')} />
            </Section>
          ),
        },
        {
          id: 'email',
          label: 'Email',
          Icon: FileSpreadsheet,
          content: (
            <Section title="Email (SendGrid)" subtitle="Subject + Body với Handlebars" wide>
              <TemplateGrid templates={notificationTemplates.filter((t) => t.channel === 'EMAIL')} />
            </Section>
          ),
        },
        {
          id: 'rules',
          label: 'Quy tắc',
          Icon: Settings,
          content: (
            <Section title="Quy tắc dispatch" subtitle="Notification Service xử lý event và chọn template" wide>
              <ProcessList
                items={[
                  'Service publish event vào RabbitMQ exchange events.topic.',
                  'Notification worker render template ứng với category + channel.',
                  'Check user_notification_preferences để bật/tắt kênh.',
                  'Retry 3 lần với exponential backoff nếu thất bại.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

function TemplateGrid({ templates }: { templates: typeof notificationTemplates }) {
  if (templates.length === 0) {
    return <div className="empty-state"><Bell size={22} /><strong>Không có template</strong></div>;
  }
  return (
    <div className="info-grid">
      {templates.map((template) => (
        <article key={template.code} className="info-tile" style={{ alignItems: 'flex-start' }}>
          <span>{template.code}</span>
          <strong>{template.name}</strong>
          <small>{template.category} · {template.channel}</small>
          {template.channel === 'EMAIL' && (
            <small style={{ marginTop: 4 }}><b>Subject:</b> {template.subject}</small>
          )}
          <small style={{ marginTop: 4, lineHeight: 1.4 }}>{template.body}</small>
          <div style={{ marginTop: 6 }}>
            <Badge tone={template.active ? 'green' : 'red'}>{template.active ? 'ACTIVE' : 'INACTIVE'}</Badge>
          </div>
        </article>
      ))}
    </div>
  );
}
