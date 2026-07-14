import type React from 'react';
import { BarChart3, Bell, BookOpenCheck, CheckCircle2, ClipboardCheck, LockKeyhole, MessageSquareText, MoreHorizontal, Plus, RefreshCcw, Send, Settings, Smartphone, Upload, WalletCards, type LucideIcon } from 'lucide-react';
import { assignments, attendanceTimeline, chatThreads, children, classes, currency, extracurricularCourses, invoices, notificationFeed, notificationRows, roster, studentAssignments, subjectScores, teacherClasses, timetable, users } from '../../data/mockData';
import type { AttendanceStatus } from '../../types';
import { Badge, CommandButton, FormPreview, FunctionTabs, InfoGrid, ProcessList, Section, StatusPill } from '../../components/ui';

export function ComingSoonFeature({ Icon, title }: { Icon: LucideIcon; title: string }) {
  return (
    <Section title={title} subtitle="Màn hình chức năng đã có vị trí trong menu role" wide>
      <div className="empty-state">
        <Icon size={26} />
        <strong>Đang chờ nối backend</strong>
        <span>UI shell đã sẵn sàng để gắn API Gateway và dữ liệu thật.</span>
      </div>
    </Section>
  );
}

export function AssignmentFeature({ actor }: { actor: 'teacher' | 'student' }) {
  if (actor === 'teacher') {
    return <TeacherAssignmentFeature />;
  }
  return <StudentAssignmentFeature />;
}

function TeacherAssignmentFeature() {
  const published = assignments.filter((a) => a.status === 'PUBLISHED');
  const drafts = assignments.filter((a) => a.status === 'DRAFT');
  const closed = assignments.filter((a) => a.status === 'CLOSED');

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'published',
          label: `Đã phát hành (${published.length})`,
          Icon: BookOpenCheck,
          content: (
            <Section
              title="Bài tập đã phát hành"
              subtitle="Theo dõi tiến độ nộp bài theo lớp"
              action={<CommandButton Icon={Plus} label="Tạo bài" />}
              wide
            >
              <TeacherAssignmentList items={published} />
            </Section>
          ),
        },
        {
          id: 'drafts',
          label: `Bản nháp (${drafts.length})`,
          Icon: Upload,
          content: (
            <Section title="Bản nháp" subtitle="Hoàn thiện đề bài trước khi phát hành" wide>
              <TeacherAssignmentList items={drafts} />
            </Section>
          ),
        },
        {
          id: 'closed',
          label: `Đã đóng (${closed.length})`,
          Icon: CheckCircle2,
          content: (
            <Section title="Bài đã đóng" subtitle="Lưu lịch sử và phổ điểm" wide>
              <TeacherAssignmentList items={closed} />
            </Section>
          ),
        },
        {
          id: 'grading',
          label: 'Chấm bài',
          Icon: CheckCircle2,
          content: (
            <Section title="Bảng chấm bài tuần này" subtitle="Tap từng HS để xem submission và nhập điểm" wide>
              <InfoGrid
                items={[
                  { title: 'Nguyễn An', value: '8.5/10', meta: 'Nộp đúng hạn · cần trình bày rõ hơn' },
                  { title: 'Đỗ Minh', value: '7.0/10', meta: 'Thiếu câu 3b' },
                  { title: 'Phạm Vy', value: 'Chưa chấm', meta: 'Nộp muộn 1 ngày' },
                  { title: 'Lê Ngọc', value: '9.5/10', meta: 'Trình bày sạch' },
                  { title: 'Hoàng Nam', value: 'Chưa nộp', meta: 'Đã quá hạn 2 ngày' },
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

function StudentAssignmentFeature() {
  const pending = studentAssignments.filter((a) => a.status === 'PENDING');
  const submitted = studentAssignments.filter((a) => a.status === 'SUBMITTED' || a.status === 'LATE');
  const graded = studentAssignments.filter((a) => a.status === 'GRADED');

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'all',
          label: `Tất cả (${studentAssignments.length})`,
          Icon: BookOpenCheck,
          content: (
            <Section title="Bài tập của tôi" subtitle="Tổng hợp theo deadline và trạng thái" wide>
              <StudentAssignmentList items={studentAssignments} />
            </Section>
          ),
        },
        {
          id: 'pending',
          label: `Chưa nộp (${pending.length})`,
          Icon: Upload,
          content: (
            <Section
              title="Bài chưa nộp"
              subtitle="Upload file PDF/DOCX/ảnh — metadata lưu DB, binary lưu MinIO"
              action={<CommandButton Icon={Upload} label="Upload bài" />}
              wide
            >
              <StudentAssignmentList items={pending} />
            </Section>
          ),
        },
        {
          id: 'submitted',
          label: `Đã nộp (${submitted.length})`,
          Icon: CheckCircle2,
          content: (
            <Section title="Bài đã nộp, chờ chấm" subtitle="Status SUBMITTED hoặc LATE" wide>
              <StudentAssignmentList items={submitted} />
            </Section>
          ),
        },
        {
          id: 'graded',
          label: `Đã chấm (${graded.length})`,
          Icon: CheckCircle2,
          content: (
            <Section title="Đã có điểm" subtitle="Xem feedback của giáo viên" wide>
              <StudentAssignmentList items={graded} />
            </Section>
          ),
        },
      ]}
    />
  );
}

function TeacherAssignmentList({ items }: { items: typeof assignments }) {
  if (items.length === 0) {
    return <div className="empty-state"><BookOpenCheck size={22} /><strong>Không có bài tập</strong></div>;
  }
  return (
    <div className="assignment-list">
      {items.map((item) => {
        const percent = item.total === 0 ? 0 : Math.round((item.submitted / item.total) * 100);
        return (
          <article key={item.title} className="assignment-card">
            <div>
              <strong>{item.title}</strong>
              <span>{item.className} · {item.subject} · hạn {item.due}</span>
            </div>
            <div className="score-meter">
              <i style={{ width: `${percent}%` }} />
            </div>
            <small>{item.submitted}/{item.total} nộp · {percent}%</small>
            <StatusPill value={item.status} />
          </article>
        );
      })}
    </div>
  );
}

function StudentAssignmentList({ items }: { items: typeof studentAssignments }) {
  if (items.length === 0) {
    return <div className="empty-state"><BookOpenCheck size={22} /><strong>Không có bài tập</strong></div>;
  }
  return (
    <div className="assignment-list">
      {items.map((item) => (
        <article key={item.title} className="assignment-card">
          <div>
            <strong>{item.title}</strong>
            <span>{item.subject} · {item.teacher} · hạn {item.due}</span>
          </div>
          {item.score != null ? (
            <b style={{ minWidth: 60 }}>{item.score.toFixed(1)}/10</b>
          ) : (
            <small>—</small>
          )}
          <StatusPill value={item.status} />
          {item.feedback && (
            <small style={{ gridColumn: '1 / -1', fontStyle: 'italic', color: 'var(--text-muted, #6b7280)' }}>
              GV: {item.feedback}
            </small>
          )}
        </article>
      ))}
    </div>
  );
}

export function CommunicationFeature({ actor }: { actor: 'teacher' | 'parent' }) {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'threads',
          label: 'Hội thoại',
          Icon: MessageSquareText,
          content: (
            <Section title={actor === 'teacher' ? 'Chat HS/PH' : 'Chat với GVCN'} subtitle="Danh sách hội thoại gần nhất" wide>
              <ChatThreadList />
            </Section>
          ),
        },
        {
          id: 'broadcast',
          label: 'Broadcast',
          Icon: Send,
          content: (
            <Section title="Broadcast lớp" subtitle="Gửi thông báo tới lớp hoặc nhóm phụ huynh" wide>
              <FormPreview
                rows={[
                  ['Phạm vi', actor === 'teacher' ? 'Lớp 10A1' : 'GVCN 10A1'],
                  ['Tiêu đề', 'Nhắc lịch kiểm tra 15 phút'],
                  ['Kênh', 'In-app + Push'],
                  ['Trạng thái', 'QUEUED'],
                ]}
              />
            </Section>
          ),
        },
        {
          id: 'templates',
          label: 'Mẫu tin',
          Icon: Settings,
          content: (
            <Section title="Mẫu thông báo" subtitle="Template dùng cho các tình huống lặp lại" wide>
              <ProcessList
                items={[
                  'Nhắc lịch kiểm tra hoặc deadline bài tập.',
                  'Xác nhận lý do vắng và yêu cầu bổ sung minh chứng.',
                  'Thông báo họp phụ huynh hoặc lịch sinh hoạt lớp.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function NotificationFeature() {
  const unread = notificationFeed.filter((n) => !n.read);
  const all = notificationFeed;

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'all',
          label: `Tất cả (${all.length})`,
          Icon: Bell,
          content: (
            <Section title="Hộp thông báo" subtitle="Hợp nhất In-app · Push · Email theo thời gian" wide>
              <NotificationFeedList items={all} />
            </Section>
          ),
        },
        {
          id: 'unread',
          label: `Chưa đọc (${unread.length})`,
          Icon: Bell,
          content: (
            <Section title="Chưa đọc" subtitle="Đánh dấu đã đọc khi mở chi tiết" wide>
              <NotificationFeedList items={unread} />
            </Section>
          ),
        },
        {
          id: 'channels',
          label: 'Theo kênh',
          Icon: Smartphone,
          content: (
            <Section title="Trạng thái dispatch" subtitle="Notification Service thống kê theo kênh" wide>
              <div className="compact-table">
                {notificationRows.map((item) => (
                  <div key={item.channel}>
                    <strong>{item.channel}</strong>
                    <span>{item.count.toLocaleString('vi-VN')} bản ghi</span>
                    <StatusPill value={item.status} />
                  </div>
                ))}
              </div>
            </Section>
          ),
        },
        {
          id: 'chat',
          label: 'Chat GV',
          Icon: MessageSquareText,
          content: (
            <Section title="Chat với giáo viên" subtitle="Luồng C5 mở hội thoại với GV hoặc GVCN" wide>
              <ChatThreadList />
            </Section>
          ),
        },
        {
          id: 'rules',
          label: 'Quy tắc',
          Icon: Settings,
          content: (
            <Section title="Push FCM + Email" subtitle="Worker retry exponential backoff, max 3 lần" wide>
              <ProcessList
                items={[
                  'Client đăng ký device token sau khi login.',
                  'Notification Service render template theo event.',
                  'Worker retry tối đa 3 lần nếu FCM lỗi tạm thời.',
                  'IN_APP push qua WebSocket nếu user đang online.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

function NotificationFeedList({ items }: { items: typeof notificationFeed }) {
  if (items.length === 0) {
    return <div className="empty-state"><Bell size={22} /><strong>Không có thông báo</strong></div>;
  }
  return (
    <div className="chat-list">
      {items.map((item) => (
        <div key={item.id} className="chat-row" style={{ alignItems: 'flex-start' }}>
          <div className="avatar"><Bell size={16} /></div>
          <div>
            <strong>{item.title}</strong>
            <span>{item.body}</span>
            <small style={{ display: 'block', marginTop: 4, color: 'var(--text-muted, #6b7280)' }}>
              {item.category} · {item.channel} · {item.time}
            </small>
          </div>
          {item.read ? <Badge tone="green">Đã đọc</Badge> : <Badge tone="orange">Mới</Badge>}
        </div>
      ))}
    </div>
  );
}

export function ExtracurricularFeature({ actor }: { actor: 'student' | 'parent' }) {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'open',
          label: 'Khóa mở',
          Icon: Plus,
          content: (
            <Section title="Khóa ngoại khóa đang mở" subtitle="Lọc theo lịch học, số chỗ và học phí" wide>
              <ExtracurricularList />
            </Section>
          ),
        },
        {
          id: 'registered',
          label: 'Đã đăng ký',
          Icon: CheckCircle2,
          content: (
            <Section title={actor === 'parent' ? 'Đăng ký cho con' : 'Đăng ký của tôi'} subtitle="Trạng thái giữ chỗ và invoice liên quan" wide>
              <InfoGrid
                items={[
                  { title: 'Robotics cơ bản', value: 'APPROVED', meta: 'T7 08:00 · invoice pending' },
                  { title: 'Bóng rổ', value: 'WAITLIST', meta: 'Chờ xác nhận chỗ trống' },
                ]}
              />
            </Section>
          ),
        },
        {
          id: 'fees',
          label: 'Chi phí',
          Icon: WalletCards,
          content: (
            <Section title="Chi phí ngoại khóa" subtitle="Khoản phí có thể phát sinh invoice tự động" wide>
              <InfoGrid
                items={extracurricularCourses.map((item) => ({
                  title: item.name,
                  value: currency.format(item.fee),
                  meta: `${item.schedule} · ${item.seats}`,
                }))}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function UserList() {
  return (
    <div className="user-list">
      {users.map((user) => (
        <div key={user.username} className="user-row">
          <div className="avatar">{user.name.slice(0, 1)}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.username} · {user.role}</span>
          </div>
          <StatusPill value={user.status} />
          <small>{user.lastLogin}</small>
          <div className="row-actions">
            <button className="icon-button compact" aria-label="Reset mật khẩu" title="Reset mật khẩu">
              <RefreshCcw size={16} />
            </button>
            <button className="icon-button compact" aria-label="Khóa tài khoản" title="Khóa tài khoản">
              <LockKeyhole size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TeacherClassList() {
  return (
    <div className="class-stack">
      {teacherClasses.map((item) => (
        <article key={item.className} className="class-card">
          <div>
            <strong>{item.className}</strong>
            <span>{item.subject} · {item.semester}</span>
          </div>
          <Badge tone="blue">{item.students} HS</Badge>
          <small>{item.nextSlot}</small>
        </article>
      ))}
    </div>
  );
}

export function RosterList() {
  return (
    <div className="attendance-list">
      {roster.map((student) => (
        <div key={student.id} className="attendance-row">
          <div>
            <strong>{student.name}</strong>
            <span>{student.code} · {student.note}</span>
          </div>
          <StatusPill value="ACTIVE" />
        </div>
      ))}
    </div>
  );
}

export function AttendanceEditor({
  attendance,
  onChange,
}: {
  attendance: Record<string, AttendanceStatus>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, AttendanceStatus>>>;
}) {
  return (
    <div className="attendance-list">
      {roster.map((student) => (
        <div key={student.id} className="attendance-row">
          <div>
            <strong>{student.name}</strong>
            <span>{student.code} · {student.note}</span>
          </div>
          <SegmentedStatus
            value={attendance[student.id]}
            onChange={(value) => onChange((current) => ({ ...current, [student.id]: value }))}
          />
        </div>
      ))}
    </div>
  );
}

export function GradeEditor({
  grades,
  onChange,
}: {
  grades: Record<string, number>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}) {
  return (
    <div className="gradebook">
      {roster.map((student) => (
        <label key={student.id} className="grade-row">
          <span>
            <strong>{student.name}</strong>
            <small>{student.code}</small>
          </span>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={grades[student.id]}
            onChange={(event) => onChange((current) => ({ ...current, [student.id]: Number(event.target.value) }))}
          />
          <div className="score-bar">
            <i style={{ width: `${Math.max(0, Math.min(10, grades[student.id])) * 10}%` }} />
          </div>
        </label>
      ))}
    </div>
  );
}

export function StudentProfileCard() {
  return (
    <div className="profile-card">
      <div className="profile-photo">A</div>
      <div>
        <strong>Nguyễn An</strong>
        <span>10A1 · Mã HS: HS001 · GVCN Nguyễn Minh Trang</span>
        <div className="profile-tags">
          <Badge tone="green">ACTIVE</Badge>
          <Badge tone="blue">HK1 2025-2026</Badge>
        </div>
      </div>
    </div>
  );
}

export function ChildSwitcher({ activeChildId, onChange }: { activeChildId: string; onChange: (id: string) => void }) {
  return (
    <div className="child-switcher">
      {children.map((child) => (
        <button key={child.id} className={activeChildId === child.id ? 'active' : ''} onClick={() => onChange(child.id)}>
          <span>{child.name.slice(0, 1)}</span>
          <strong>{child.name}</strong>
          <small>{child.className}</small>
        </button>
      ))}
    </div>
  );
}

export function ChildSummary({ child }: { child: (typeof children)[number] }) {
  return (
    <div className="parent-summary">
      <div>
        <BarChart3 size={20} />
        <strong>{child.avg}</strong>
        <span>Điểm TB HK1</span>
      </div>
      <div>
        <ClipboardCheck size={20} />
        <strong>{child.attendance}%</strong>
        <span>Chuyên cần</span>
      </div>
      <div>
        <MessageSquareText size={20} />
        <strong>{child.homeroom}</strong>
        <span>GVCN</span>
      </div>
    </div>
  );
}

export function InvoiceSection() {
  return (
    <Section
      title="Học phí & hóa đơn"
      subtitle="Invoice, trạng thái thanh toán và lịch sử giao dịch"
      action={<CommandButton Icon={WalletCards} label="Thanh toán" />}
      wide
    >
      <div className="invoice-list">
        {invoices.map((invoice) => (
          <div key={invoice.code} className="invoice-row">
            <div>
              <strong>{invoice.title}</strong>
              <span>{invoice.code} · hạn {invoice.due}</span>
            </div>
            <b>{currency.format(invoice.amount)}</b>
            <StatusPill value={invoice.status} />
            <button className="icon-button compact" aria-label="Xem chi tiết hóa đơn" title="Xem chi tiết">
              <MoreHorizontal size={16} />
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function AssignmentList() {
  return (
    <div className="assignment-list">
      {assignments.map((item) => (
        <article key={item.title} className="assignment-card">
          <div>
            <strong>{item.title}</strong>
            <span>{item.className} · deadline {item.due}</span>
          </div>
          <div className="score-meter">
            <i style={{ width: `${Math.round((item.submitted / item.total) * 100)}%` }} />
          </div>
          <small>{item.submitted}/{item.total} bài nộp</small>
          <StatusPill value={item.status} />
        </article>
      ))}
    </div>
  );
}

export function ChatThreadList() {
  return (
    <div className="chat-list">
      {chatThreads.map((thread) => (
        <div key={`${thread.name}-${thread.context}`} className="chat-row">
          <div className="avatar">{thread.name.slice(0, 1)}</div>
          <div>
            <strong>{thread.name}</strong>
            <span>{thread.context} · {thread.last}</span>
          </div>
          {thread.unread > 0 ? <Badge tone="orange">{thread.unread} mới</Badge> : <Badge tone="green">Đã đọc</Badge>}
        </div>
      ))}
    </div>
  );
}

export function ExtracurricularList() {
  return (
    <div className="assignment-list">
      {extracurricularCourses.map((item) => (
        <article key={item.name} className="assignment-card">
          <div>
            <strong>{item.name}</strong>
            <span>{item.schedule} · {item.seats} chỗ</span>
          </div>
          <b>{currency.format(item.fee)}</b>
          <CommandButton Icon={Plus} label="Đăng ký" />
        </article>
      ))}
    </div>
  );
}

export function ClassTable() {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Lớp</th>
            <th>Khối</th>
            <th>GVCN</th>
            <th>Sĩ số</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((item) => (
            <tr key={item.name}>
              <td><strong>{item.name}</strong></td>
              <td>{item.grade}</td>
              <td>{item.homeroom}</td>
              <td>{item.students}</td>
              <td><StatusPill value={item.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TimetableGrid() {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6'];
  return (
    <div className="timetable" role="table" aria-label="Thời khóa biểu">
      <div className="time-head empty-cell" />
      {days.map((day) => (
        <div key={day} className="time-head">{day}</div>
      ))}
      {timetable.map((row, rowIndex) => [
        <div key={`period-${rowIndex}`} className="time-period">Tiết {rowIndex + 1}</div>,
        ...row.map((cell, cellIndex) => (
          <div key={`${rowIndex}-${cellIndex}`} className={`time-cell ${cell.includes('trùng') ? 'conflict' : ''}`}>
            <span>{days[cellIndex]}</span>
            <strong>{cell}</strong>
            <small>{cell.includes('trùng') ? '409 conflict' : `P${200 + cellIndex + rowIndex}`}</small>
          </div>
        )),
      ])}
    </div>
  );
}

export function StudentSchedule() {
  return (
    <div className="timeline-list">
      {['Toán · P201', 'Vật lý · P304', 'Tiếng Anh · P108', 'CLB Robotics · Lab 2'].map((item, index) => (
        <div key={item} className="timeline-item">
          <span>Tiết {index + 1}</span>
          <strong>{item}</strong>
          <small>{index === 3 ? 'Ngoại khóa' : 'Bắt buộc'}</small>
        </div>
      ))}
    </div>
  );
}

export function StudentScoreTable() {
  return (
    <div className="score-table">
      {subjectScores.map((score) => (
        <div key={score.subject} className="score-row">
          <strong>{score.subject}</strong>
          <span>Miệng {score.oral}</span>
          <span>GK {score.mid}</span>
          <span>CK {score.final}</span>
          <div className="score-meter">
            <i style={{ width: `${score.avg * 10}%` }} />
          </div>
          <b>{score.avg}</b>
        </div>
      ))}
    </div>
  );
}

export function AttendanceHistory() {
  return (
    <div className="attendance-history">
      {attendanceTimeline.map((item) => (
        <div key={`${item.date}-${item.slot}`} className="history-row">
          <span>{item.date}</span>
          <strong>{item.subject}</strong>
          <StatusPill value={item.status} />
          <small>{item.note}</small>
        </div>
      ))}
    </div>
  );
}

export function SegmentedStatus({
  value,
  onChange,
}: {
  value: AttendanceStatus;
  onChange: (value: AttendanceStatus) => void;
}) {
  const options: Array<{ value: AttendanceStatus; label: string }> = [
    { value: 'present', label: 'Có mặt' },
    { value: 'late', label: 'Trễ' },
    { value: 'absent', label: 'Vắng' },
  ];

  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button key={option.value} type="button" className={value === option.value ? 'active' : ''} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
