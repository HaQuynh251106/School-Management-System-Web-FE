import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, GraduationCap, ReceiptText, RefreshCw, RotateCcw, Search, ShieldCheck, SlidersHorizontal, TrendingUp, UsersRound, WalletCards } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { ClassReminderResult, FeePeriod, FinanceClassSummary, Invoice } from '../../api/types';
import { Badge, Section, StatusPill } from '../../components/ui';
import { useHashString } from '../../api/urlState';
import { confirmAction } from '../../components/confirmAction';
import { Async, fmtDate, fmtDateTime, money, PaginatedData, useToast } from './common';

/* ===== B8 — Công nợ lớp chủ nhiệm ===== */
function teacherInvoiceStatus(invoice: Invoice) {
  if (invoice.status !== 'PAID' && invoice.dueDate && new Date(`${invoice.dueDate}T23:59:59`) < new Date()) return 'OVERDUE';
  return invoice.status;
}

export function TeacherFinanceLive() {
  const periods = useApi<FeePeriod[]>('/fee-periods');
  const [periodId, setPeriodId] = useHashString('period', '');
  const summaries = useApi<FinanceClassSummary[]>(periodId
    ? `/finance/classes?periodId=${encodeURIComponent(periodId)}`
    : '/finance/classes');
  const [classId, setClassId] = useHashString('class', '');
  const [query, setQuery] = useHashString('q', '');
  const [status, setStatus] = useHashString('status', 'ALL');
  const [sending, setSending] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const toast = useToast();
  const invoiceUrl = classId
    ? `/invoices?classId=${encodeURIComponent(classId)}${periodId ? `&periodId=${encodeURIComponent(periodId)}` : ''}`
    : null;
  const invoices = useApi<Invoice[]>(invoiceUrl);

  useEffect(() => {
    if (!periodId && periods.data?.length) {
      const active = periods.data.find((item) => item.status === 'OPEN') || periods.data[0];
      setPeriodId(active.id);
    }
  }, [periodId, periods.data, setPeriodId]);

  useEffect(() => {
    const rows = summaries.data || [];
    if (!rows.length) {
      setClassId('');
      return;
    }
    if (!rows.some((item) => item.classId === classId)) setClassId(rows[0].classId);
  }, [classId, summaries.data, setClassId]);

  const selected = (summaries.data || []).find((item) => item.classId === classId);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    return (invoices.data || []).filter((invoice) => {
      const matchesQuery = !normalized || invoice.code.toLocaleLowerCase('vi').includes(normalized)
        || invoice.studentName.toLocaleLowerCase('vi').includes(normalized);
      return matchesQuery && (status === 'ALL' || teacherInvoiceStatus(invoice) === status);
    });
  }, [invoices.data, query, status]);
  const total = (summaries.data || []).reduce((sum, item) => sum + item.totalAmount, 0);
  const paid = (summaries.data || []).reduce((sum, item) => sum + item.paidAmount, 0);
  const outstanding = total - paid;
  const overdue = (summaries.data || []).reduce((sum, item) => sum + item.overdueCount, 0);
  const selectedPeriod = (periods.data || []).find((item) => item.id === periodId);
  const activeFilterCount = (periodId ? 1 : 0) + (classId ? 1 : 0) + (query.trim() ? 1 : 0) + (status !== 'ALL' ? 1 : 0);

  const remindClass = async () => {
    if (!selected) return;
    if (!await confirmAction({
      title: `Nhắc công nợ lớp ${selected.classCode}?`,
      description: 'Thông báo sẽ được gửi tới phụ huynh của tất cả học sinh còn công nợ trong phạm vi đang chọn.',
      confirmLabel: 'Gửi nhắc',
    })) return;
    setSending(true);
    try {
      const suffix = periodId ? `?periodId=${encodeURIComponent(periodId)}` : '';
      const result = await api.post<ClassReminderResult>(`/finance/homeroom/classes/${selected.classId}/remind${suffix}`);
      toast.show('ok', `Đã gửi ${result.invoiceCount} nhắc hạn tới ${result.recipientCount} phụ huynh`);
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSending(false); }
  };

  const remindInvoice = async (invoice: Invoice) => {
    if (!await confirmAction({
      title: `Nhắc phụ huynh của ${invoice.studentName}?`,
      description: `Thông báo thanh toán hóa đơn ${invoice.code} sẽ được gửi ngay.`,
      confirmLabel: 'Gửi nhắc',
    })) return;
    setSendingInvoiceId(invoice.id);
    try {
      const result = await api.post<ClassReminderResult>(`/finance/homeroom/invoices/${invoice.id}/remind`);
      toast.show('ok', `Đã gửi nhắc tới ${result.recipientCount} phụ huynh`);
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSendingInvoiceId(null); }
  };

  const refresh = () => {
    periods.reload();
    summaries.reload();
    invoices.reload();
  };

  const resetFilters = () => {
    const activePeriod = (periods.data || []).find((item) => item.status === 'OPEN') || periods.data?.[0];
    setPeriodId(activePeriod?.id || '');
    setClassId('');
    setQuery('');
    setStatus('ALL');
  };

  return (
    <div className="finance-page teacher-finance-page">
      {toast.node}
      <header className="finance-hero teacher-finance-hero">
        <div><span className="finance-eyebrow"><ShieldCheck size={15} /> Không gian tài chính lớp chủ nhiệm</span><h2>Đồng hành cùng phụ huynh, giảm tải cho nhà trường</h2><p>Theo dõi tiến độ khoản thu của đúng lớp chủ nhiệm và gửi nhắc hạn tập trung tới phụ huynh còn công nợ.</p></div>
      </header>

      <section className="teacher-finance-controls" aria-label="Bộ lọc công nợ">
        <header>
          <div className="teacher-filter-heading"><span><SlidersHorizontal size={20} /></span><div><h3>Bộ lọc và phạm vi theo dõi</h3><p>Chọn đợt thu, lớp và trạng thái để tìm đúng học sinh cần xử lý.</p></div></div>
          <strong className="teacher-filter-count">{activeFilterCount} điều kiện đang áp dụng</strong>
        </header>
        <div className="teacher-finance-filter-grid">
          <label><span>Đợt thu</span><select className="live-input" value={periodId} onChange={(event) => { setPeriodId(event.target.value); setClassId(''); }}>
            <option value="">Tất cả đợt thu</option>{(periods.data || []).map((period) => <option key={period.id} value={period.id}>{period.name || period.code} · {period.status === 'OPEN' ? 'Đang thu' : period.status === 'CLOSED' ? 'Đã đóng' : 'Bản nháp'}</option>)}
          </select></label>
          <label><span>Lớp chủ nhiệm</span><select className="live-input" value={classId} onChange={(event) => setClassId(event.target.value)}>
            {(summaries.data || []).length === 0 && <option value="">Chưa có lớp phù hợp</option>}
            {(summaries.data || []).map((summary) => <option key={summary.classId} value={summary.classId}>Lớp {summary.classCode} · {summary.invoiceCount} hóa đơn</option>)}
          </select></label>
          <label className="teacher-filter-search"><span>Tìm trong danh sách</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên học sinh hoặc mã hóa đơn" /></div></label>
          <label><span>Trạng thái công nợ</span><select className="live-input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Tất cả trạng thái</option><option value="PENDING">Chưa thanh toán</option><option value="PARTIAL">Đã thu một phần</option><option value="PAID">Đã thanh toán</option><option value="OVERDUE">Quá hạn</option>
          </select></label>
        </div>
        <footer>
          <div className="teacher-filter-context"><UsersRound size={16} /><span><b>{selectedPeriod?.name || 'Tất cả đợt thu'}</b>{selected ? ` · Lớp ${selected.classCode}` : ''} · Hiển thị <b>{filtered.length} hóa đơn</b></span></div>
          <div><button className="live-btn ghost" type="button" onClick={resetFilters}><RotateCcw size={15} /> Đặt lại</button><button className="live-btn" type="button" onClick={refresh}><RefreshCw size={15} /> Đồng bộ dữ liệu</button></div>
        </footer>
      </section>

      {selected && <div className="teacher-debt-primary"><Section title={`Công nợ lớp ${selected.classCode}`} subtitle={`${selected.paidCount}/${selected.invoiceCount} học sinh đã hoàn thành · Còn ${money(selected.outstanding)}`} wide
        action={!selected.completed ? <button className="live-btn" type="button" disabled={sending} onClick={remindClass}><BellRing size={15} /> {sending ? 'Đang gửi…' : 'Nhắc phụ huynh còn nợ'}</button> : <Badge tone="green">Lớp đã hoàn thành</Badge>}>
        <div className="teacher-active-list-filter"><SlidersHorizontal size={16} /><span>Danh sách đang áp dụng bộ lọc phía trên</span><strong>{filtered.length} hóa đơn</strong></div>
        <Async state={{ ...invoices, data: filtered }} empty="Không có hóa đơn phù hợp">
          {(rows) => <PaginatedData items={rows} pageSize={10} itemLabel="hóa đơn" resetKey={`${classId}-${periodId}-${query}-${status}`}>{(pageRows) => <div className="finance-table-wrap"><table className="live-table finance-table teacher-finance-table"><thead><tr><th>Học sinh</th><th>Hóa đơn</th><th>Phải thu</th><th>Đã thu</th><th>Còn lại</th><th>Hạn thanh toán</th><th>Trạng thái</th><th>Nhắc phụ huynh</th></tr></thead><tbody>{pageRows.map((invoice) => { const invoiceStatus = teacherInvoiceStatus(invoice); return <tr key={invoice.id}><td><strong>{invoice.studentName}</strong></td><td><strong>{invoice.code}</strong><small>{fmtDateTime(invoice.issuedAt)}</small></td><td>{money(invoice.totalAmount)}</td><td className="finance-paid-value">{money(invoice.paidAmount)}</td><td><strong>{money(invoice.totalAmount - invoice.paidAmount)}</strong></td><td>{fmtDate(invoice.dueDate)}</td><td><StatusPill value={invoiceStatus} /></td><td>{invoiceStatus === 'PAID' ? <span className="finance-complete-label"><CheckCircle2 size={14} /> Đã xong</span> : <button className="live-btn subtle" type="button" disabled={sendingInvoiceId === invoice.id} onClick={() => remindInvoice(invoice)}><BellRing size={14} /> {sendingInvoiceId === invoice.id ? 'Đang gửi…' : 'Nhắc riêng'}</button>}</td></tr>; })}</tbody></table></div>}</PaginatedData>}
        </Async>
        <div className="finance-guidance"><ReceiptText size={18} /><p>Giáo viên chủ nhiệm chỉ theo dõi và gửi nhắc hạn. Mọi thao tác tạo khoản thu, phát hành hóa đơn và ghi nhận thanh toán do Kế toán thực hiện để bảo đảm đối soát.</p></div>
      </Section></div>}

      <section className="finance-kpi-grid" aria-label="Tổng quan công nợ lớp chủ nhiệm">
        <article className="finance-kpi-card primary"><span><TrendingUp size={20} /></span><div><small>Đã thu</small><strong>{money(paid)}</strong><p>{total ? (paid * 100 / total).toFixed(1) : 0}% tổng phải thu</p></div></article>
        <article className="finance-kpi-card"><span><WalletCards size={20} /></span><div><small>Còn phải thu</small><strong>{money(outstanding)}</strong><p>{(summaries.data || []).length} lớp chủ nhiệm có dữ liệu</p></div></article>
        <article className="finance-kpi-card success"><span><CheckCircle2 size={20} /></span><div><small>Lớp hoàn thành</small><strong>{(summaries.data || []).filter((item) => item.completed).length}</strong><p>Đã đạt 100% yêu cầu tài chính</p></div></article>
        <article className={`finance-kpi-card ${overdue ? 'danger' : ''}`}><span><AlertTriangle size={20} /></span><div><small>Hóa đơn quá hạn</small><strong>{overdue}</strong><p>Cần chủ động trao đổi với phụ huynh</p></div></article>
      </section>

      <div className="teacher-finance-list-section"><Section title={`Danh sách lớp chủ nhiệm (${(summaries.data || []).length})`} subtitle="Chọn một lớp để mở danh sách công nợ và thực hiện nhắc hạn" wide
        action={<span className="teacher-list-hint"><GraduationCap size={15} /> Chọn lớp cần theo dõi</span>}>
        <Async state={summaries} empty="Chưa có khoản thu nào được phát hành cho lớp chủ nhiệm">
          {(rows) => <div className="finance-class-grid teacher-class-finance-grid">{rows.map((summary) => <button type="button" key={summary.classId} className={`teacher-finance-class ${classId === summary.classId ? 'selected' : ''} ${summary.completed ? 'complete' : ''}`} onClick={() => setClassId(summary.classId)}>
            <header><span><GraduationCap size={17} /></span><div><strong>Lớp {summary.classCode}</strong><small>{summary.gradeLevel || 'Chưa xác định khối'} · {summary.invoiceCount} học sinh</small></div><StatusPill value={summary.completed ? 'Đã hoàn thành' : summary.overdueCount ? 'Có quá hạn' : 'Đang thu'} /></header>
            <div className="finance-mini-progress"><span style={{ width: `${Math.min(100, summary.collectionRate)}%` }} /></div>
            <footer><span>{summary.collectionRate.toFixed(1)}% đã thu</span><strong>Còn {money(summary.outstanding)}</strong></footer>
          </button>)}</div>}
        </Async>
      </Section></div>

    </div>
  );
}
