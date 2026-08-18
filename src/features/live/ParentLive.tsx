import { useEffect, useMemo, useState } from 'react';
import { CreditCard, BookOpen, ClipboardCheck, Users, RefreshCw, CalendarDays, ExternalLink, ShieldCheck, Landmark, WalletCards, QrCode, Upload, Copy, FileCheck2, AlertTriangle, Download, History, MessageSquareText, Search } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useShortcutFilter } from '../../api/shortcutFilter';
import { useActiveChild } from '../../api/activeChild';
import type { ApiUser, Grade, AttendanceRecord, Invoice, PaymentInitResponse, PaymentProof, PaymentHistory, PaymentRefund, PaymentReceiptDownload } from '../../api/types';
import { Section, FunctionTabs, StatusPill, Badge, InfoGrid } from '../../components/ui';
import { Async, useToast, ATT_LABEL, fmtDate, fmtDateTime, money } from './common';
import { ExtracurricularLive, WeeklyTimetable } from './SharedLive';
import { AssignmentsLive } from './AssignmentWorkspace';
import { AttendanceOverview, GradeOverview } from './LearningOverview';
import { Modal } from './Modal';
import { YearResultPanel } from './YearResultPanel';
import { PublishedExamSchedule } from './ExamScheduleWorkspace';
import { PublishedEducationPlan } from './StudentLive';
import { AttendanceExcusePanel } from './AttendanceExcusePanel';
import { HomeroomRemarksPanel } from './HomeroomRemarksPanel';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  MB_BANK_TRANSFER: 'Chuyển khoản MB',
  VNPAY: 'VNPAY',
  MOMO: 'MoMo',
  OTHER: 'Phương thức khác',
};

const REFUND_TYPE_LABEL: Record<string, string> = {
  PARTIAL: 'Hoàn một phần',
  FULL: 'Hoàn toàn bộ còn lại',
};

/* ===== D5 — Đăng ký ngoại khóa cho con (dùng con đang chọn) ===== */
const PARENT_FEE_TYPE_LABEL: Record<string, string> = {
  TUITION: 'Học phí',
  MEAL: 'Bán trú / ăn uống',
  TRANSPORT: 'Xe đưa đón',
  ACTIVITY: 'Ngoại khóa',
  OTHER: 'Khoản thu khác',
};

export function ParentExtracurricularLive() {
  const { childId } = useActiveChild();
  return <ExtracurricularLive actor="parent" childId={childId} />;
}

function useChildren() {
  return useApi<ApiUser[]>('/me/children');
}

/* ===== D1 — Switch Profile ===== */
export function ParentSwitchLive() {
  const children = useChildren();
  const { childId, setChildId } = useActiveChild();

  useEffect(() => {
    if (children.data?.length && (!childId || !children.data.some((child) => child.id === childId))) {
      setChildId(children.data[0].id);
    }
  }, [children.data, childId, setChildId]);

  return (
    <Section title="Chọn học sinh" subtitle="Chọn con cần theo dõi" wide>
      <Async state={children} empty="Tài khoản chưa liên kết học sinh">
        {(list) => {
          const active = list.find((c) => c.id === childId) || list[0];
          return (
            <>
              <div className="child-tabs">
                {list.map((c) => (
                  <button key={c.id} className={c.id === (active?.id) ? 'active' : ''} onClick={() => setChildId(c.id)}>
                    <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{c.fullName} · {c.className}
                  </button>
                ))}
              </div>
              {active && (
                <InfoGrid items={[
                  { title: 'Họ tên', value: active.fullName, meta: '@' + active.username },
                  { title: 'Mã học sinh', value: active.studentCode || '—', meta: 'Mã định danh' },
                  { title: 'Lớp', value: active.className || '—', meta: active.classId || '' },
                  { title: 'Trạng thái', value: 'Đang theo dõi', meta: 'Đã chọn' },
                ]} />
              )}
            </>
          );
        }}
      </Async>
    </Section>
  );
}

/* ===== D2 — Giám sát học tập ===== */
export function ParentMonitorLive() {
  const { childId } = useActiveChild();
  const encodedChildId = childId ? encodeURIComponent(childId) : '';
  const grades = useApi<Grade[]>(childId ? `/students/${encodedChildId}/grades` : null);
  const att = useApi<AttendanceRecord[]>(childId ? `/students/${encodedChildId}/attendance` : null);

  if (!childId) {
    return <Section title="Theo dõi học tập" subtitle="Bạn chưa chọn học sinh" wide>
      <div className="live-loading">Hãy vào mục “Chọn học sinh” để tiếp tục.</div></Section>;
  }

  return (
    <FunctionTabs tabs={[
      { id: 'timetable', label: 'Thời khóa biểu', Icon: CalendarDays, content: (
        <Section title="Thời khóa biểu của con" subtitle="Lịch học được cập nhật trực tiếp từ nhà trường" wide>
          <WeeklyTimetable path={`/students/${encodedChildId}/timetable`} />
        </Section>
      ) },
      { id: 'exams', label: 'Lịch thi', Icon: CalendarDays, content: (
        <PublishedExamSchedule path={`/exam-periods/students/${encodedChildId}/schedule`} />
      ) },
      { id: 'education-plan', label: 'Kế hoạch giáo dục', Icon: BookOpen, content: (
        <PublishedEducationPlan studentId={childId} />
      ) },
      { id: 'grades', label: 'Điểm', Icon: BookOpen, content: (
        <Section title="Điểm của con" subtitle="Kết quả học tập theo từng môn" wide>
          {(grades.data?.length ?? 0) > 0 && <GradeOverview grades={grades.data ?? []} />}
          <Async paginate state={grades} empty="Chưa có điểm" itemLabel="điểm số">
            {(l) => (<table className="live-table"><thead><tr><th>Môn</th><th>Loại điểm</th><th>Điểm</th><th>Ngày</th></tr></thead>
              <tbody>{l.map((g) => <tr key={g.id}><td><strong>{g.subjectName}</strong></td><td>{g.categoryName}</td><td><strong>{g.score?.toFixed(1)}</strong></td><td>{fmtDate(g.recordedAt)}</td></tr>)}</tbody></table>)}
          </Async>
        </Section>
      ) },
      { id: 'att', label: 'Chuyên cần', Icon: ClipboardCheck, content: (
        <>
        <Section title="Chuyên cần của con" subtitle="Lịch sử đi học và ghi chú" wide>
          {(att.data?.length ?? 0) > 0 && <AttendanceOverview records={att.data ?? []} />}
          <Async paginate state={att} empty="Chưa có dữ liệu" itemLabel="lượt điểm danh">
            {(l) => (<table className="live-table"><thead><tr><th>Ngày</th><th>Môn</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
              <tbody>{l.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((r) => <tr key={r.id}><td>{fmtDate(r.date)}</td><td>{r.subjectName}</td><td><StatusPill value={ATT_LABEL[r.status] || r.status} /></td><td><small>{r.note || '—'}</small></td></tr>)}</tbody></table>)}
          </Async>
        </Section>
        <AttendanceExcusePanel mode="request" studentId={childId} records={att.data || []} />
        </>
      ) },
      { id: 'year-result', label: 'Kết quả năm', Icon: FileCheck2, content: (
        <YearResultPanel studentId={childId} />
      ) },
      { id: 'homeroom-remarks', label: 'Nhận xét GVCN', Icon: MessageSquareText, content: (
        <HomeroomRemarksPanel studentId={childId} />
      ) },
      { id: 'assignments', label: 'Bài tập', Icon: BookOpen, content: (
        <AssignmentsLive actor="parent" childId={childId} />
      ) },
    ]} />
  );
}

/* ===== D4 — Học phí ===== */
export function ParentInvoiceLive() {
  const shortcut = useShortcutFilter('D4');
  const children = useChildren();
  const { childId, setChildId } = useActiveChild();
  const [noticeChecked, setNoticeChecked] = useState(false);
  const [accessGranted, setAccessGranted] = useState(false);
  const invoices = useApi<Invoice[]>(accessGranted ? '/invoices' : null);
  const proofs = useApi<PaymentProof[]>(accessGranted ? '/payment-proofs' : null);
  const history = useApi<PaymentHistory[]>(accessGranted ? '/payment-history' : null);
  const refunds = useApi<PaymentRefund[]>(accessGranted ? '/payment-refunds' : null);
  const reloadInvoices = invoices.reload;
  const reloadHistory = history.reload;
  const reloadRefunds = refunds.reload;
  const toast = useToast();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [checkout, setCheckout] = useState<{ invoice: Invoice; initiated: PaymentInitResponse } | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');

  useEffect(() => {
    if (children.data?.length && (!childId || !children.data.some((child) => child.id === childId))) {
      setChildId(children.data[0].id);
    }
  }, [children.data, childId, setChildId]);

  const activeChild = (children.data || []).find((child) => child.id === childId) || children.data?.[0] || null;
  const selectedChildInvoices = useMemo(() => (invoices.data || [])
    .filter((invoice) => invoice.studentId === activeChild?.id)
    .filter((invoice) => shortcut.get('status') !== 'OVERDUE' || invoice.status === 'OVERDUE'),
  [invoices.data, activeChild?.id, shortcut]);
  const childInvoiceStats = useMemo(() => {
    const stats = new Map<string, { unpaid: number; remaining: number }>();
    for (const child of children.data || []) stats.set(child.id, { unpaid: 0, remaining: 0 });
    for (const invoice of invoices.data || []) {
      const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      if (remaining <= 0 || ['PAID', 'CANCELLED', 'VOID'].includes(invoice.status)) continue;
      const current = stats.get(invoice.studentId) || { unpaid: 0, remaining: 0 };
      stats.set(invoice.studentId, { unpaid: current.unpaid + 1, remaining: current.remaining + remaining });
    }
    return stats;
  }, [children.data, invoices.data]);
  const invoiceGroups = useMemo(() => {
    const grouped = new Map<string, {
      key: string; label: string; detail: string; unclassified: boolean;
      unpaid: Invoice[]; paid: Invoice[]; inactive: Invoice[];
    }>();
    for (const invoice of selectedChildInvoices) {
      const key = invoice.semesterId || 'UNCLASSIFIED';
      const label = invoice.semesterName
        ? `${invoice.academicYearName || 'Năm học chưa xác định'} · ${invoice.semesterName}`
        : 'Chưa phân loại học kỳ';
      const group = grouped.get(key) || {
        key,
        label,
        detail: invoice.semesterName
          ? 'Các khoản thu được nhà trường phát hành trong học kỳ này.'
          : 'Đợt thu cũ chưa được Admin gán năm học và học kỳ.',
        unclassified: !invoice.semesterName,
        unpaid: [],
        paid: [],
        inactive: [],
      };
      const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      if (['CANCELLED', 'VOID'].includes(invoice.status)) group.inactive.push(invoice);
      else if (invoice.status === 'PAID' || remaining === 0) group.paid.push(invoice);
      else group.unpaid.push(invoice);
      grouped.set(key, group);
    }
    return [...grouped.values()]
      .map((group) => ({
        ...group,
        unpaid: group.unpaid.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),
        paid: group.paid.sort((a, b) => (b.issuedAt || '').localeCompare(a.issuedAt || '')),
      }))
      .sort((a, b) => Number(b.unpaid.length > 0) - Number(a.unpaid.length > 0)
        || Number(a.unclassified) - Number(b.unclassified)
        || b.label.localeCompare(a.label, 'vi'));
  }, [selectedChildInvoices]);
  const activeChildOutstanding = childInvoiceStats.get(activeChild?.id || '') || { unpaid: 0, remaining: 0 };

  const latestProofByInvoice = useMemo(() => {
    const byInvoice = new Map<string, PaymentProof>();
    for (const proof of proofs.data || []) {
      if (!byInvoice.has(proof.invoiceId)) byInvoice.set(proof.invoiceId, proof);
    }
    return byInvoice;
  }, [proofs.data]);

  const historyRows = useMemo(() => {
    const query = historyQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim();
    return (history.data || [])
      .filter((payment) => payment.studentId === activeChild?.id)
      .filter((payment) => !query || [
      payment.studentName, payment.studentCode, payment.invoiceCode, payment.feePeriodCode,
      payment.txnRef, payment.providerTransactionId, payment.receiptNumber,
    ].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').includes(query));
  }, [history.data, historyQuery, activeChild?.id]);
  const childRefundRows = useMemo(() => (refunds.data || [])
    .filter((refund) => refund.studentId === activeChild?.id), [refunds.data, activeChild?.id]);

  useEffect(() => {
    const reloadOnFocus = () => { reloadInvoices(); reloadHistory(); reloadRefunds(); };
    window.addEventListener('focus', reloadOnFocus);
    return () => window.removeEventListener('focus', reloadOnFocus);
  }, [reloadInvoices, reloadHistory, reloadRefunds]);

  const pay = async (inv: Invoice, method: 'VNPAY' | 'MOMO' | 'MB_BANK_TRANSFER') => {
    setPayingId(inv.id);
    try {
      const initiated = await api.post<PaymentInitResponse>('/payments', { invoiceId: inv.id, method });
      setPaymentTarget(null);
      setProofFile(null);
      setCheckout({ invoice: inv, initiated });
      invoices.reload();
      proofs.reload();
      history.reload();
    } catch (e: any) {
      toast.show('err', e.message);
    } finally {
      setPayingId(null);
    }
  };
  const providerLabel = checkout?.initiated.payment.method === 'MOMO'
    ? 'MoMo'
    : checkout?.initiated.payment.method === 'MB_BANK_TRANSFER' ? 'MB Bank' : 'VNPAY';
  const isBankTransfer = checkout?.initiated.payment.method === 'MB_BANK_TRANSFER';
  const isGatewayUrl = checkout?.initiated.paymentUrl
    ? /^https:\/\/([a-z0-9-]+\.)*(vnpayment|momo)\.vn\//i.test(checkout.initiated.paymentUrl)
    : false;
  const payable = (status: string) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(status);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.show('ok', `Đã sao chép ${label}`);
    } catch {
      toast.show('err', `Không thể sao chép ${label}`);
    }
  };

  const receiptContentType = (file: File) => {
    if (file.type) return file.type;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'png') return 'image/png';
    return 'image/jpeg';
  };

  const submitProof = async () => {
    if (!checkout || !isBankTransfer) return;
    if (!proofFile) return toast.show('err', 'Bắt buộc chọn ảnh biên lai');
    const contentType = receiptContentType(proofFile);
    if (!['image/jpeg', 'image/png'].includes(contentType)) {
      return toast.show('err', 'Biên lai chỉ nhận ảnh JPG hoặc PNG');
    }
    if (proofFile.size <= 0 || proofFile.size > 5 * 1024 * 1024) {
      return toast.show('err', 'Biên lai phải có dung lượng từ 1 byte đến 5MB');
    }
    setUploadingProof(true);
    try {
      const upload = await api.post<{ id: string; uploadUrl: string; method: string }>('/files/presigned-upload', {
        scope: 'PAYMENT_PROOF',
        fileName: proofFile.name,
        contentType,
        sizeBytes: proofFile.size,
      });
      const uploaded = await fetch(upload.uploadUrl, {
        method: upload.method,
        headers: { 'Content-Type': contentType },
        body: proofFile,
      });
      if (!uploaded.ok) throw new Error('Không thể tải biên lai lên MinIO');
      await api.post(`/files/${upload.id}/complete`);
      await api.post(`/payments/${checkout.initiated.payment.id}/proofs`, { fileId: upload.id });
      toast.show('ok', 'Đã gửi ảnh biên lai, vui lòng chờ Admin đối chiếu');
      setProofFile(null);
      setCheckout(null);
      proofs.reload();
      invoices.reload();
      history.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setUploadingProof(false);
    }
  };

  const childRecordsReady = Boolean(children.data?.length)
    && (children.data || []).every((child) => child.studentCode && child.fullName);

  const acknowledgeFinanceNotices = async () => {
    setAccessGranted(true);
    try {
      await api.post('/notifications/finance/read-all');
      window.dispatchEvent(new CustomEvent('sse:notifications-changed'));
    } catch (error: any) {
      toast.show('err', `Không thể cập nhật trạng thái thông báo: ${error.message}`);
    }
  };

  const downloadPaymentReceipt = async (payment: PaymentHistory) => {
    setPayingId(payment.paymentId);
    try {
      const result = await api.get<PaymentReceiptDownload>(`/payments/${encodeURIComponent(payment.paymentId)}/receipt`);
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setPayingId(null);
    }
  };

  const renderInvoiceTable = (rows: Invoice[], mode: 'UNPAID' | 'PAID' | 'INACTIVE') => (
    <div className="parent-semester-table-wrap">
      <table className="live-table parent-semester-invoice-table">
        <thead><tr><th>Khoản thu</th><th>Hạn đóng</th><th>Tổng tiền</th><th>{mode === 'PAID' ? 'Đã thu' : 'Còn phải đóng'}</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{rows.map((invoice) => {
          const proof = latestProofByInvoice.get(invoice.id);
          const remaining = Math.max(0, invoice.totalAmount - invoice.paidAmount);
          return (
            <tr key={invoice.id}>
              <td><strong>{invoice.feePeriodName || invoice.code}</strong><small>{invoice.feePeriodCode || invoice.code} · {PARENT_FEE_TYPE_LABEL[invoice.feeType || 'OTHER'] || 'Khoản thu khác'}</small>
                {proof && <small className="invoice-proof-state"><StatusPill value={proof.status} /><span>Gửi biên lai lúc {fmtDateTime(proof.submittedAt)}</span>{proof.reviewReason && <span className="invoice-proof-reason">{proof.reviewReason}</span>}</small>}
              </td>
              <td>{invoice.dueDate ? fmtDate(invoice.dueDate) : '—'}</td>
              <td><strong>{money(invoice.totalAmount)}</strong></td>
              <td><strong className={mode === 'UNPAID' ? 'parent-outstanding-money' : ''}>{money(mode === 'PAID' ? invoice.paidAmount : remaining)}</strong>{mode === 'UNPAID' && invoice.paidAmount > 0 && <small>Đã thu {money(invoice.paidAmount)}</small>}</td>
              <td><StatusPill value={invoice.status} /></td>
              <td>{mode === 'UNPAID' && proof?.status === 'SUBMITTED'
                ? <Badge tone="orange">Chờ Admin duyệt</Badge>
                : mode === 'UNPAID' && payable(invoice.status)
                  ? <button className="live-btn compact" disabled={payingId === invoice.id} onClick={() => setPaymentTarget(invoice)}><CreditCard size={14} /> {payingId === invoice.id ? 'Đang tạo…' : proof?.status === 'RETRY_REQUIRED' ? 'Thanh toán lại' : 'Thanh toán'}</button>
                  : mode === 'PAID' ? <Badge tone="green">Đã đóng đủ</Badge> : <StatusPill value={invoice.status} />}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );

  if (!accessGranted) {
    return (
      <Section title="Xác nhận trước khi thanh toán" subtitle="Thông tin bắt buộc trên nội dung chuyển khoản" wide>
        {toast.node}
        <div className="payment-entry-notice">
          <span className="payment-entry-icon"><AlertTriangle size={24} /></span>
          <div>
            <strong>Không tự nhập hoặc xóa nội dung chuyển khoản</strong>
            <p>Mỗi giao dịch phải có đúng mã học sinh và họ tên của con. Hệ thống sẽ điền sẵn nội dung này trong mã VietQR.</p>
          </div>
          <div className="payment-student-identities">
            <Async state={children} empty="Tài khoản chưa liên kết học sinh">
              {(list) => <>{list.map((child) => (
                <div key={child.id}><span>{child.fullName}</span><strong>{child.studentCode || 'Chưa có mã học sinh'}</strong></div>
              ))}</>}
            </Async>
          </div>
          {!childRecordsReady && children.data && (
            <p className="payment-entry-error">Có hồ sơ chưa đủ mã học sinh hoặc họ tên. Vui lòng liên hệ Admin trước khi thanh toán.</p>
          )}
          <label className="payment-entry-check">
            <input type="checkbox" checked={noticeChecked} onChange={(event) => setNoticeChecked(event.target.checked)} />
            <span>Tôi đã đọc và sẽ giữ nguyên mã học sinh, tên học sinh trong nội dung chuyển khoản.</span>
          </label>
          <button className="live-btn payment-entry-continue" disabled={!noticeChecked || !childRecordsReady} onClick={acknowledgeFinanceNotices}>
            <CreditCard size={16} /> Tiếp tục đến các khoản phải thanh toán
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Học phí" subtitle="Theo dõi và thanh toán các khoản thu" wide
      action={<button className="live-btn ghost" onClick={() => { invoices.reload(); proofs.reload(); history.reload(); refunds.reload(); }}><RefreshCw size={14} /> Tải lại</button>}>
      {toast.node}
      {paymentTarget && (
        <Modal
          title="Chọn phương thức thanh toán"
          onClose={() => setPaymentTarget(null)}
          footer={<button className="live-btn ghost" type="button" onClick={() => setPaymentTarget(null)}>Đóng</button>}
        >
          <div className="payment-method-summary">
            <span>{paymentTarget.code} · {paymentTarget.studentName}</span>
            <strong>{money(paymentTarget.totalAmount - paymentTarget.paidAmount)}</strong>
          </div>
          <div className="payment-method-options">
            <button className="recommended" type="button" disabled={payingId === paymentTarget.id} onClick={() => pay(paymentTarget, 'MB_BANK_TRANSFER')}>
              <QrCode size={22} /><span><strong>Chuyển khoản MB</strong><small>VietQR và gửi biên lai để Admin xác nhận</small></span>
            </button>
            <button type="button" disabled={payingId === paymentTarget.id} onClick={() => pay(paymentTarget, 'VNPAY')}>
              <Landmark size={22} /><span><strong>VNPAY</strong><small>QR, ATM nội địa và thẻ quốc tế</small></span>
            </button>
            <button type="button" disabled={payingId === paymentTarget.id} onClick={() => pay(paymentTarget, 'MOMO')}>
              <WalletCards size={22} /><span><strong>Ví MoMo</strong><small>Ví điện tử và QR MoMo</small></span>
            </button>
          </div>
        </Modal>
      )}
      {checkout && (
        <Modal
          title={isBankTransfer ? 'Chuyển khoản MB Bank' : `Xác nhận thanh toán ${providerLabel}`}
          onClose={() => setCheckout(null)}
          footer={(
            <>
              <button className="live-btn ghost" type="button" onClick={() => setCheckout(null)}>Đóng</button>
              {isGatewayUrl && !isBankTransfer && (
                <a
                  className="live-btn"
                  href={checkout.initiated.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toast.show('ok', `Đã mở cổng ${providerLabel} trong tab mới`)}
                >
                  <ExternalLink size={15} /> Mở cổng {providerLabel}
                </a>
              )}
            </>
          )}
        >
          {isBankTransfer && checkout.initiated.bankTransfer ? (
            <div className="mb-transfer-checkout">
              <div className="mb-transfer-qr">
                <img src={checkout.initiated.bankTransfer.qrImageUrl} alt={`VietQR ${checkout.invoice.code}`} />
                <small>Quét bằng ứng dụng MB Bank hoặc ngân hàng bất kỳ</small>
              </div>
              <dl className="mb-transfer-details">
                <div><dt>Ngân hàng</dt><dd>{checkout.initiated.bankTransfer.bankName}</dd></div>
                <div><dt>Chủ tài khoản</dt><dd>{checkout.initiated.bankTransfer.accountName}</dd></div>
                <div><dt>Số tài khoản</dt><dd><strong>{checkout.initiated.bankTransfer.accountNumber}</strong><button className="icon-inline-btn" title="Sao chép số tài khoản" onClick={() => copyText(checkout.initiated.bankTransfer!.accountNumber, 'số tài khoản')}><Copy size={15} /></button></dd></div>
                <div><dt>Số tiền</dt><dd><strong>{money(checkout.initiated.bankTransfer.amount)}</strong></dd></div>
                <div className="transfer-content-row"><dt>Nội dung bắt buộc</dt><dd><strong>{checkout.initiated.bankTransfer.transferContent}</strong><button className="icon-inline-btn" title="Sao chép nội dung" onClick={() => copyText(checkout.initiated.bankTransfer!.transferContent, 'nội dung chuyển khoản')}><Copy size={15} /></button></dd></div>
              </dl>
              <div className="payment-proof-upload">
                <div><FileCheck2 size={20} /><span><strong>Gửi ảnh biên lai sau khi chuyển khoản</strong><small>Ảnh phải nhìn rõ số tiền, thời gian và mã giao dịch; JPG hoặc PNG, tối đa 5MB</small></span></div>
                <label className="live-btn ghost">
                  <Upload size={15} /> {proofFile ? 'Chọn ảnh khác' : 'Chọn ảnh biên lai *'}
                  <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={(event) => setProofFile(event.target.files?.[0] || null)} />
                </label>
                {proofFile && <span className="selected-file">{proofFile.name} · {(proofFile.size / 1024).toFixed(0)} KB</span>}
                <button className="live-btn" disabled={!proofFile || uploadingProof} onClick={submitProof}>
                  <Upload size={15} /> {uploadingProof ? 'Đang gửi biên lai…' : 'Gửi biên lai cho Admin'}
                </button>
              </div>
            </div>
          ) : (
          <div className="payment-checkout">
            <span className="payment-checkout-icon"><ShieldCheck size={25} /></span>
            <div>
              <strong>{checkout.invoice.code}</strong>
              <p>{checkout.invoice.studentName}</p>
            </div>
            <b>{money(checkout.initiated.payment.amount)}</b>
            <dl>
              <div><dt>Mã giao dịch</dt><dd>{checkout.initiated.payment.txnRef}</dd></div>
              <div><dt>Trạng thái</dt><dd><StatusPill value={checkout.initiated.payment.status} /></dd></div>
            </dl>
            {!isGatewayUrl && !isBankTransfer && (
              <p className="payment-checkout-warning">
                {providerLabel} sandbox thật chưa được bật trên backend. Giao dịch đã tạo ở trạng thái chờ nhưng chưa thể mở trang thanh toán.
              </p>
            )}
          </div>
          )}
        </Modal>
      )}
      <div className="parent-finance-child-selector" role="tablist" aria-label="Chọn con để xem học phí">
        {(children.data || []).map((child) => {
          const stats = childInvoiceStats.get(child.id) || { unpaid: 0, remaining: 0 };
          const active = child.id === activeChild?.id;
          return (
            <button key={child.id} role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={() => {
              setChildId(child.id);
              setPaymentTarget(null);
              setCheckout(null);
              setHistoryQuery('');
            }}>
              <span><Users size={16} /><strong>{child.fullName}</strong><small>{child.className || 'Chưa phân lớp'} · {child.studentCode || child.username}</small></span>
              {stats.unpaid > 0
                ? <em>{stats.unpaid} khoản chưa đóng</em>
                : <em className="settled">Đã đóng đủ</em>}
            </button>
          );
        })}
      </div>

      {activeChild && (
        <div className="parent-finance-overview">
          <div><span>Đang xem học phí của</span><strong>{activeChild.fullName}</strong><small>{activeChild.className || 'Chưa phân lớp'} · {activeChild.studentCode || activeChild.username}</small></div>
          <div className={activeChildOutstanding.unpaid ? 'has-debt' : 'is-settled'}><span>Khoản chưa đóng</span><strong>{activeChildOutstanding.unpaid}</strong><small>Còn phải đóng {money(activeChildOutstanding.remaining)}</small></div>
        </div>
      )}

      <Async state={invoices} empty="Chưa có hóa đơn. Vui lòng liên hệ nhà trường." itemLabel="hóa đơn">
        {() => invoiceGroups.length ? (
          <div className="parent-semester-groups">
            {invoiceGroups.map((group) => (
              <section key={group.key} className={`parent-semester-group ${group.unpaid.length ? 'has-unpaid' : 'is-settled'}`}>
                <header>
                  <div><CalendarDays size={18} /><span><strong>{group.label}</strong><small>{group.detail}</small></span></div>
                  <div><Badge tone={group.unpaid.length ? 'red' : 'green'}>{group.unpaid.length ? `${group.unpaid.length} chưa đóng` : 'Đã đóng đủ'}</Badge></div>
                </header>
                {group.unpaid.length > 0 && (
                  <div className="parent-invoice-status-section outstanding">
                    <div className="parent-invoice-status-heading"><strong>Chưa đóng</strong><span>Ưu tiên thanh toán các khoản dưới đây</span></div>
                    {renderInvoiceTable(group.unpaid, 'UNPAID')}
                  </div>
                )}
                {group.paid.length > 0 && (
                  <div className="parent-invoice-status-section paid">
                    <div className="parent-invoice-status-heading"><strong>Đã đóng</strong><span>Nhà trường đã ghi nhận thanh toán</span></div>
                    {renderInvoiceTable(group.paid, 'PAID')}
                  </div>
                )}
                {group.inactive.length > 0 && (
                  <div className="parent-invoice-status-section inactive">
                    <div className="parent-invoice-status-heading"><strong>Không còn hiệu lực</strong><span>Các hóa đơn đã hủy hoặc vô hiệu</span></div>
                    {renderInvoiceTable(group.inactive, 'INACTIVE')}
                  </div>
                )}
              </section>
            ))}
          </div>
        ) : <div className="live-empty">Học sinh này chưa có khoản thu nào.</div>}
      </Async>
      <div className="parent-payment-history-heading">
        <div><History size={18} /><span><strong>Lịch sử giao dịch</strong><small>Biên nhận chỉ xuất hiện sau khi nhà trường xác nhận đã thu.</small></span></div>
        <label><Search size={15} /><input className="live-input" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Tìm học sinh, hóa đơn, mã giao dịch…" /></label>
      </div>
      <Async paginate resetKey={`${activeChild?.id || ''}|${historyQuery}`} state={{ ...history, data: history.data ? historyRows : null }} empty="Chưa có giao dịch thanh toán" itemLabel="giao dịch">
        {(list) => (
          <table className="live-table parent-payment-history-table">
            <thead><tr><th>Thời gian</th><th>Học sinh</th><th>Hóa đơn</th><th>Phương thức</th><th>Số tiền</th><th>Trạng thái</th><th>Biên nhận</th></tr></thead>
            <tbody>{list.map((payment) => (
              <tr key={payment.paymentId}>
                <td>{fmtDateTime(payment.paidAt || payment.createdAt)}</td>
                <td><strong>{payment.studentName}</strong><small>{payment.studentCode || '—'}</small></td>
                <td><strong>{payment.invoiceCode}</strong><small>{payment.feePeriodCode || '—'}</small></td>
                <td>{PAYMENT_METHOD_LABEL[payment.method] || payment.method}</td>
                <td><strong>{money(payment.amount)}</strong>{(payment.refundedAmount || 0) > 0 && <small>Đã hoàn {money(payment.refundedAmount)} · còn {money(payment.netAmount)}</small>}{(payment.pendingRefundAmount || 0) > 0 && <small>Chờ duyệt hoàn {money(payment.pendingRefundAmount)}</small>}</td>
                <td><StatusPill value={payment.status} /></td>
                <td>{payment.receiptStatus === 'ISSUED' && ['SUCCESS', 'REVERSED'].includes(payment.status)
                  ? <button className="live-btn ghost compact" disabled={payingId === payment.paymentId} onClick={() => downloadPaymentReceipt(payment)}><Download size={14} /> Tải PDF</button>
                  : payment.status === 'SUCCESS' ? <Badge tone={payment.receiptStatus === 'FAILED' ? 'red' : 'orange'}>{payment.receiptStatus === 'FAILED' ? 'Chưa tạo được' : 'Chờ nhà trường phát hành'}</Badge> : <span>—</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Async>
      <div className="parent-payment-history-heading">
        <div><History size={18} /><span><strong>Lịch sử hoàn tiền</strong><small>Hiển thị từng yêu cầu và kết quả xử lý của nhà trường.</small></span></div>
      </div>
      <Async paginate resetKey={activeChild?.id || ''} state={{ ...refunds, data: refunds.data ? childRefundRows : null }} empty="Chưa có yêu cầu hoàn tiền" itemLabel="khoản hoàn tiền">
        {(list) => (
          <table className="live-table parent-refund-history-table">
            <thead><tr><th>Mã hoàn</th><th>Học sinh</th><th>Hóa đơn</th><th>Số tiền</th><th>Lý do</th><th>Trạng thái</th><th>Hoàn lúc</th></tr></thead>
            <tbody>{list.map((refund) => (
              <tr key={refund.id}>
                <td><strong>{refund.refundNumber}</strong><small>{fmtDateTime(refund.requestedAt)}</small></td>
                <td><strong>{refund.studentName}</strong><small>{refund.studentCode || '—'}</small></td>
                <td>{refund.invoiceCode}</td><td>
                  <strong>{money(refund.amount)}</strong>
                  <small>{REFUND_TYPE_LABEL[refund.refundType || 'PARTIAL'] || refund.refundType}</small>
                  {refund.invoicePaidAmountBefore != null && refund.invoicePaidAmountAfter != null && (
                    <small>Số dư HĐ: {money(refund.invoicePaidAmountBefore)} → {money(refund.invoicePaidAmountAfter)}</small>
                  )}
                </td>
                <td>{refund.reason}{(refund.rejectionReason || refund.cancellationReason) && <small>{refund.rejectionReason || refund.cancellationReason}</small>}</td>
                <td><StatusPill value={refund.status} />{refund.refundMethod && <small>{PAYMENT_METHOD_LABEL[refund.refundMethod] || refund.refundMethod}{refund.refundReference ? ` · ${refund.refundReference}` : ''}</small>}</td><td>{refund.completedAt ? fmtDateTime(refund.completedAt) : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Async>
    </Section>
  );
}
