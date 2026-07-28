import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  History,
  Mail,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { children, currency, parentInvoices } from '../../data/mockData';
import { Badge, CommandButton, FormPreview, FunctionTabs, InfoGrid, ProcessList, Section, StatusPill } from '../../components/ui';
import { ChildSummary, ChildSwitcher, StudentScoreTable } from '../shared/FeatureWidgets';

export function ParentSwitchFeature() {
  const [activeChildId, setActiveChildId] = useState(children[0].id);
  const activeChild = children.find((child) => child.id === activeChildId) ?? children[0];

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'children',
          label: 'Danh sách con',
          Icon: Users,
          content: (
            <div className="feature-grid">
              <Section title="Switch Profile" subtitle="D1 - activeStudentId gửi qua header X-Active-Student-Id">
                <ChildSwitcher activeChildId={activeChild.id} onChange={setActiveChildId} />
              </Section>
              <Section title="Hồ sơ đang xem" subtitle={`${activeChild.name} · ${activeChild.className}`}>
                <ChildSummary child={activeChild} />
              </Section>
            </div>
          ),
        },
        {
          id: 'context',
          label: 'Ngữ cảnh',
          Icon: RefreshCcw,
          content: (
            <Section title="Active student context" subtitle="Client gửi X-Active-Student-Id ở mọi request của phụ huynh" wide>
              <ProcessList
                items={[
                  'Parent login và gọi GET /me/children.',
                  'Người dùng chọn một hồ sơ con đang theo dõi.',
                  'Client lưu activeStudentId trong memory.',
                  'Backend kiểm tra parent_student_relations trước khi trả dữ liệu.',
                ]}
              />
            </Section>
          ),
        },
        {
          id: 'access',
          label: 'Quyền truy cập',
          Icon: ShieldCheck,
          content: (
            <Section title="Kiểm soát quyền phụ huynh" subtitle="Chặn truy cập chéo học sinh bằng mapping parent-student" wide>
              <FormPreview
                rows={[
                  ['Header', 'X-Active-Student-Id: child-1'],
                  ['API điểm', 'GET /students/:id/grades'],
                  ['API chuyên cần', 'GET /students/:id/attendance'],
                  ['Không hợp lệ', '403 Forbidden'],
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function ParentMonitorFeature() {
  const activeChild = children[0];

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'overview',
          label: 'Tổng quan',
          Icon: BarChart3,
          content: (
            <Section title="Tổng quan học tập" subtitle={`D2 - ${activeChild.name} · ${activeChild.className}`} wide>
              <ChildSummary child={activeChild} />
            </Section>
          ),
        },
        {
          id: 'grades',
          label: 'Điểm',
          Icon: BookOpenCheck,
          content: (
            <Section title="Điểm học kỳ của con" subtitle="Theo dõi điểm mới publish từ giáo viên" wide>
              <StudentScoreTable />
            </Section>
          ),
        },
        {
          id: 'attendance',
          label: 'Chuyên cần',
          Icon: ClipboardCheck,
          content: (
            <Section
              title="Cảnh báo chuyên cần"
              subtitle="Notification Service gửi push/email/in-app sau sự kiện absent"
              action={<CommandButton Icon={Mail} label="Phản hồi GVCN" />}
              wide
            >
              <div className="alert-box">
                <AlertTriangle size={22} />
                <div>
                  <strong>{activeChild.alert}</strong>
                  <span>Trạng thái xác nhận được đồng bộ vào delivery log.</span>
                </div>
              </div>
            </Section>
          ),
        },
        {
          id: 'comment',
          label: 'Nhận xét',
          Icon: MessageSquareText,
          content: (
            <Section title="Nhận xét GVCN" subtitle="Thông tin định tính đi kèm biểu đồ học tập" wide>
              <ProcessList
                items={[
                  'Hoàn thành bài tập đúng hạn trong 3 tuần gần nhất.',
                  'Cần tăng tốc phần hình học không gian.',
                  'Phụ huynh đã xác nhận lý do vắng ngày 15/05.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

// =========== D4: Học phí - góc nhìn phụ huynh ===========

export function ParentInvoiceFeature() {
  const pending = parentInvoices.filter((inv) => inv.status !== 'PAID');
  const paid = parentInvoices.filter((inv) => inv.status === 'PAID');
  const totalDue = pending.reduce((sum, inv) => sum + inv.total, 0);
  const totalPaid = paid.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'pending',
          label: `Cần thanh toán (${pending.length})`,
          Icon: AlertTriangle,
          content: (
            <Section
              title="Hóa đơn cần thanh toán"
              subtitle={`Tổng ${currency.format(totalDue)} cần xử lý`}
              action={<CommandButton Icon={CreditCard} label="Thanh toán VietQR" />}
              wide
            >
              <ParentInvoiceList invoices={pending} />
            </Section>
          ),
        },
        {
          id: 'paid',
          label: `Đã thanh toán (${paid.length})`,
          Icon: CheckCircle2,
          content: (
            <Section
              title="Hóa đơn đã thanh toán"
              subtitle={`Tổng ${currency.format(totalPaid)} trong năm học`}
              wide
            >
              <ParentInvoiceList invoices={paid} />
            </Section>
          ),
        },
        {
          id: 'history',
          label: 'Lịch sử giao dịch',
          Icon: History,
          content: (
            <Section title="Lịch sử thanh toán" subtitle="payment_gateway_transactions log" wide>
              <div className="compact-table">
                <div>
                  <strong>VN20250215</strong>
                  <span>VietQR</span>
                  <span>HD-2025-HK1-0042</span>
                  <b>{currency.format(4500000)}</b>
                  <StatusPill value="SUCCESS" />
                </div>
                <div>
                  <strong>VN20240908</strong>
                  <span>VietQR</span>
                  <span>HD-2025-DN-0042</span>
                  <b>{currency.format(850000)}</b>
                  <StatusPill value="SUCCESS" />
                </div>
                <div>
                  <strong>VQR-XX12</strong>
                  <span>VietQR</span>
                  <span>HD-2024-HK2-0042</span>
                  <b>{currency.format(4200000)}</b>
                  <StatusPill value="REFUNDED" />
                </div>
              </div>
            </Section>
          ),
        },
        {
          id: 'methods',
          label: 'Phương thức',
          Icon: WalletCards,
          content: (
            <Section title="Phương thức hỗ trợ" subtitle="Cổng thanh toán đã tích hợp" wide>
              <InfoGrid
                items={[
                  { title: 'VietQR', value: 'ACTIVE', meta: 'Chuyển khoản nhanh qua ứng dụng ngân hàng' },
                  { title: 'Đối soát', value: 'ACTIVE', meta: 'Xác nhận giao dịch trước khi ghi nhận hóa đơn' },
                  { title: 'Bank Transfer', value: 'MANUAL', meta: 'Đối soát thủ công sau 24h' },
                  { title: 'Tiền mặt', value: 'CASHIER', meta: 'Thu tại văn phòng' },
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

function ParentInvoiceList({ invoices }: { invoices: typeof parentInvoices }) {
  if (invoices.length === 0) {
    return <div className="empty-state"><WalletCards size={22} /><strong>Không có hóa đơn</strong></div>;
  }
  return (
    <div className="invoice-list">
      {invoices.map((invoice) => (
        <div key={invoice.code} className="invoice-row">
          <div>
            <strong>{invoice.title}</strong>
            <span>{invoice.code} · {invoice.status === 'PAID' ? `Đã TT ${invoice.paidAt}` : `Hạn ${invoice.dueDate}`}</span>
          </div>
          <b>{currency.format(invoice.total)}</b>
          <Badge
            tone={
              invoice.status === 'PAID' ? 'green' : invoice.status === 'OVERDUE' ? 'red' : 'orange'
            }
          >
            {invoice.status === 'PAID' ? 'Đã thanh toán' : invoice.status === 'OVERDUE' ? 'Quá hạn' : 'Chưa TT'}
          </Badge>
          {invoice.status !== 'PAID' ? (
            <CommandButton Icon={CreditCard} label="Thanh toán" />
          ) : (
            <small>Biên nhận đã gửi email</small>
          )}
        </div>
      ))}
    </div>
  );
}
