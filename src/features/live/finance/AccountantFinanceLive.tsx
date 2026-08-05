import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BellRing, CalendarRange, CheckCircle2, CircleDollarSign, Download,
  Landmark, Plus, ReceiptText, RefreshCw, Save, Search, Send,
  ShieldCheck, Trash2, UsersRound, WalletCards,
} from 'lucide-react';
import { api } from '../../../api/client';
import { useApi } from '../../../api/useApi';
import { useHashNumber, useHashString } from '../../../api/urlState';
import type {
  AcademicYear, FeePeriod, FeePeriodItem, FinanceClassSummary, FinanceOverview,
  HomeroomDebtReminderResult, Invoice, InvoiceGenerationPreview, PageResponse,
  PaymentView, VietQrPendingPayment,
} from '../../../api/types';
import { confirmAction } from '../../../components/confirmAction';
import { FunctionTabs, Section, StatusPill } from '../../../components/ui';
import { Async, PaginatedData, ServerPagination, fmtDate, fmtDateTime, money, useToast } from '../common';
import { Field, Modal } from '../Modal';

const GRADES = ['K10', 'K11', 'K12'];
const EMPTY_PERIOD = { code: '', name: '', academicYearId: '', grades: [] as string[], dueDate: '' };

interface FinanceIntegrationStatus {
  paymentMode: string;
  vietQr: { configured: boolean; bankId: string; accountSuffix: string; accountName: string; template: string };
  notifications: Record<string, boolean>;
}

function yearLabel(year?: AcademicYear | null) {
  if (!year) return 'Chưa xác định năm học';
  const status = year.status === 'ACTIVE' ? 'Đang hoạt động' : year.status === 'CLOSED' ? 'Đã đóng · chỉ xem' : 'Sắp diễn ra';
  return `${year.code} · ${status}`;
}

function downloadClassFinanceCsv(rows: FinanceClassSummary[]) {
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const data = [
    ['Khối', 'Lớp', 'Giáo viên chủ nhiệm', 'Số hóa đơn', 'Đã hoàn thành', 'Tổng phải thu', 'Đã thu', 'Công nợ', 'Tỷ lệ thu', 'Quá hạn'],
    ...rows.map((row) => [row.gradeLevel || '', row.classCode, row.homeroomTeacherName || 'Chưa phân công',
      row.invoiceCount, row.paidCount, row.totalAmount, row.paidAmount, row.outstanding,
      `${row.collectionRate.toFixed(1)}%`, row.overdueCount]),
  ];
  const blob = new Blob([`\uFEFF${data.map((row) => row.map(quote).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `cong-no-theo-lop-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function FinanceOverviewModule({ overview, selectedYear, integrations }: {
  overview: ReturnType<typeof useApi<FinanceOverview>>;
  selectedYear?: AcademicYear;
  integrations: ReturnType<typeof useApi<FinanceIntegrationStatus>>;
}) {
  return <div className="finance-module-stack">
    <Async state={overview}>{(data) => <>
      <div className="finance-kpi-grid">
        <article><span className="finance-kpi-icon blue"><CircleDollarSign size={20} /></span><small>Tổng phải thu</small><strong>{money(data.totalAmount)}</strong><p>{data.invoiceCount} hóa đơn trong {selectedYear?.code}</p></article>
        <article><span className="finance-kpi-icon green"><CheckCircle2 size={20} /></span><small>Đã thu</small><strong>{money(data.paidAmount)}</strong><p>{data.collectionRate.toFixed(1)}% tổng phải thu</p></article>
        <article className={data.outstanding ? 'attention' : ''}><span className="finance-kpi-icon orange"><WalletCards size={20} /></span><small>Còn công nợ</small><strong>{money(data.outstanding)}</strong><p>{data.overdueInvoiceCount} hóa đơn quá hạn</p></article>
        <article><span className="finance-kpi-icon violet"><CalendarRange size={20} /></span><small>Thu trong tháng</small><strong>{money(data.collectedThisMonth)}</strong><p>{data.dueSoonInvoiceCount} hóa đơn sắp đến hạn</p></article>
      </div>
      <Section title="Tiến độ các đợt thu" subtitle={`Chỉ thống kê dữ liệu thuộc năm học ${selectedYear?.code || 'đã chọn'}`} wide>
        {data.periods.length === 0 ? <div className="finance-empty-guide"><ReceiptText size={24} /><strong>Chưa có đợt thu trong năm học này</strong><span>Chuyển sang khu vực Đợt thu để tạo mới.</span></div>
          : <div className="finance-period-progress-list">{data.periods.map((period) => <article key={period.periodId}>
            <div><strong>{period.name || period.code}</strong><small>{period.code}</small></div>
            <div className="finance-progress-copy"><span><i style={{ width: `${Math.min(100, period.collectionRate)}%` }} /></span><b>{period.collectionRate.toFixed(1)}%</b></div>
            <div><strong>{money(period.paidAmount)}</strong><small>Còn {money(period.outstanding)}</small></div>
            <StatusPill value={period.status} />
          </article>)}</div>}
      </Section>
    </>}</Async>
    <Async state={integrations}>{(status) => <div className="finance-system-health">
      <ShieldCheck size={20} /><div><strong>Sẵn sàng vận hành</strong><span>VietQR {status.vietQr.configured ? 'đã cấu hình' : 'chưa cấu hình'} · Email {status.notifications?.email ? 'đang bật' : 'chưa bật'} · Đối soát do Kế toán xác nhận</span></div>
    </div>}</Async>
  </div>;
}

function PeriodsModule({ periods, selectedYear, readonly, reloadAll }: {
  periods: ReturnType<typeof useApi<FeePeriod[]>>;
  selectedYear?: AcademicYear;
  readonly: boolean;
  reloadAll: () => void;
}) {
  const toast = useToast();
  const [query, setQuery] = useHashString('finance_period_q', '');
  const [selectedId, setSelectedId] = useHashString('finance_period_id', '');
  const selected = periods.data?.find((period) => period.id === selectedId) || null;
  const items = useApi<FeePeriodItem[]>(selected ? `/fee-periods/${selected.id}/items` : null);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<FeePeriod | null>(null);
  const [form, setForm] = useState({ ...EMPTY_PERIOD });
  const [itemForm, setItemForm] = useState({ name: '', amount: 1000000, gradeLevel: '' });
  const [preview, setPreview] = useState<InvoiceGenerationPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = showEditor && JSON.stringify(form) !== JSON.stringify(editing ? {
    code: editing.code, name: editing.name || '', academicYearId: editing.academicYearId,
    grades: (editing.applyToGrades || '').split(',').filter(Boolean), dueDate: editing.dueDate || '',
  } : { ...EMPTY_PERIOD, academicYearId: selectedYear?.id || '' });

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const visible = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('vi');
    return (periods.data || []).filter((period) => !value || period.code.toLocaleLowerCase('vi').includes(value)
      || (period.name || '').toLocaleLowerCase('vi').includes(value));
  }, [periods.data, query]);

  const closeEditor = async () => {
    if (dirty && !await confirmAction({ title: 'Bỏ thay đổi chưa lưu?', description: 'Thông tin đang nhập sẽ không được lưu.', confirmLabel: 'Bỏ thay đổi', tone: 'danger' })) return;
    setShowEditor(false);
  };
  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_PERIOD, academicYearId: selectedYear?.id || '' });
    setShowEditor(true);
  };
  const openEdit = (period: FeePeriod) => {
    setEditing(period);
    setForm({ code: period.code, name: period.name || '', academicYearId: period.academicYearId,
      grades: (period.applyToGrades || '').split(',').filter(Boolean), dueDate: period.dueDate || '' });
    setShowEditor(true);
  };
  const save = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.academicYearId) return toast.show('err', 'Vui lòng nhập đủ mã, tên và năm học');
    setBusy(true);
    try {
      const payload = { code: form.code.trim(), name: form.name.trim(), academicYearId: form.academicYearId,
        applyToGrades: form.grades.length ? form.grades.join(',') : null, dueDate: form.dueDate || null };
      if (editing) await api.put(`/fee-periods/${editing.id}`, payload);
      else {
        const created = await api.post<FeePeriod>('/fee-periods', payload);
        setSelectedId(created.id, 'push');
      }
      setShowEditor(false); reloadAll(); toast.show('ok', editing ? 'Đã cập nhật đợt thu' : 'Đã tạo đợt thu mới');
    } catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };
  const remove = async (period: FeePeriod) => {
    if (!await confirmAction({ title: `Xóa đợt thu “${period.name || period.code}”?`, description: 'Chỉ đợt nháp chưa phát sinh hóa đơn mới có thể xóa.', confirmLabel: 'Xóa đợt thu', tone: 'danger' })) return;
    try { await api.del(`/fee-periods/${period.id}`); if (selectedId === period.id) setSelectedId(''); reloadAll(); toast.show('ok', 'Đã xóa đợt thu'); }
    catch (error: any) { toast.show('err', error.message); }
  };
  const addItem = async () => {
    if (!selected || !itemForm.name.trim() || itemForm.amount <= 0) return toast.show('err', 'Nhập tên và số tiền hợp lệ');
    try { await api.post(`/fee-periods/${selected.id}/items`, { ...itemForm, gradeLevel: itemForm.gradeLevel || null }); setItemForm({ name: '', amount: 1000000, gradeLevel: '' }); items.reload(); toast.show('ok', 'Đã thêm khoản thu'); }
    catch (error: any) { toast.show('err', error.message); }
  };
  const removeItem = async (item: FeePeriodItem) => {
    if (!selected || !await confirmAction({
      title: `Xóa khoản thu “${item.name}”?`,
      description: `${money(item.amount)} sẽ bị loại khỏi đợt thu ${selected.name || selected.code}.`,
      confirmLabel: 'Xóa khoản thu', tone: 'danger',
    })) return;
    try {
      await api.del(`/fee-periods/${selected.id}/items/${item.id}`);
      items.reload();
      toast.show('ok', 'Đã xóa khoản thu');
    } catch (error: any) { toast.show('err', error.message); }
  };
  const changeStatus = async (period: FeePeriod, action: 'open' | 'close') => {
    try { await api.post(`/fee-periods/${period.id}/${action}`); reloadAll(); toast.show('ok', action === 'open' ? 'Đã mở đợt thu' : 'Đã đóng đợt thu'); }
    catch (error: any) { toast.show('err', error.message); }
  };
  const loadPreview = async (period: FeePeriod) => {
    setBusy(true);
    try { setPreview(await api.get<InvoiceGenerationPreview>(`/fee-periods/${period.id}/invoice-preview`)); }
    catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };
  const publish = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const rows = await api.post<Invoice[]>(`/fee-periods/${preview.periodId}/generate-invoices`);
      toast.show('ok', `Đã đồng bộ ${rows.length} hóa đơn đúng phạm vi năm học`);
      setPreview(null); reloadAll();
    } catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  return <div className="finance-module-stack">{toast.node}
    {readonly && <div className="finance-history-banner"><ShieldCheck size={20} /><div><strong>Năm học đã đóng — chế độ chỉ xem</strong><span>Bạn có thể tra cứu đợt thu và công nợ nhưng không thể thay đổi hoặc phát hành thêm.</span></div></div>}
    <Section title="Danh sách đợt thu" subtitle="Tạo, cấu hình khoản thu và kiểm tra phạm vi trước khi phát hành" wide action={!readonly ? <button className="live-btn" onClick={openCreate}><Plus size={15} /> Tạo đợt thu</button> : undefined}>
      <div className="finance-filterbar"><label className="finance-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã hoặc tên đợt thu" /></label><span>{visible.length} đợt thu</span></div>
      <Async state={{ ...periods, data: visible }} empty="Chưa có đợt thu trong năm học đã chọn">
        {(rows) => <PaginatedData items={rows} pageSize={10} itemLabel="đợt thu" urlStateKey="finance_periods">
          {(pageRows) => <div className="finance-table-wrap"><table className="live-table finance-table"><thead><tr><th>Đợt thu</th><th>Phạm vi</th><th>Hạn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{pageRows.map((period) => <tr key={period.id} className={selectedId === period.id ? 'selected-row' : ''}>
            <td><strong>{period.name || period.code}</strong><small>{period.code}</small></td>
            <td>{period.applyToGrades ? period.applyToGrades.split(',').join(' · ') : 'Toàn trường'}</td><td>{fmtDate(period.dueDate)}</td><td><StatusPill value={period.status} /></td>
            <td><div className="finance-row-actions"><button className="live-btn ghost" onClick={() => setSelectedId(period.id, 'push')}>Chi tiết</button>{!readonly && period.status === 'DRAFT' && <><button className="icon-action" title="Sửa" onClick={() => openEdit(period)}><Save size={15} /></button><button className="icon-action danger" title="Xóa" onClick={() => remove(period)}><Trash2 size={15} /></button><button className="live-btn subtle" onClick={() => changeStatus(period, 'open')}>Mở đợt</button></>}{!readonly && period.status === 'OPEN' && <><button className="live-btn" disabled={busy} onClick={() => loadPreview(period)}><Send size={14} /> Xem trước phát hành</button><button className="live-btn subtle" onClick={() => changeStatus(period, 'close')}>Đóng đợt</button></>}</div></td>
          </tr>)}</tbody></table></div>}
        </PaginatedData>}
      </Async>
    </Section>
    {selected && <Section title={`Thiết lập · ${selected.name || selected.code}`} subtitle={selected.status === 'DRAFT' ? 'Thêm các khoản trước khi mở đợt' : 'Danh sách khoản thu đã khóa theo trạng thái đợt'} wide>
      {selected.status === 'DRAFT' && !readonly && <div className="finance-inline-editor"><input className="live-input grow" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Tên khoản thu" /><input className="live-input" type="number" min="1" value={itemForm.amount} onChange={(e) => setItemForm({ ...itemForm, amount: Number(e.target.value) })} /><select className="live-input" value={itemForm.gradeLevel} onChange={(e) => setItemForm({ ...itemForm, gradeLevel: e.target.value })}><option value="">Mọi khối</option>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select><button className="live-btn" onClick={addItem}><Plus size={14} /> Thêm khoản</button></div>}
      <Async state={items} empty="Đợt thu chưa có khoản thu">{(rows) => <div className="finance-item-grid">{rows.map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{item.gradeLevel || 'Mọi khối'}</small></div><b>{money(item.amount)}</b>{selected.status === 'DRAFT' && !readonly && <button className="icon-action danger" aria-label={`Xóa khoản thu ${item.name}`} title="Xóa khoản" onClick={() => removeItem(item)}><Trash2 size={14} /></button>}</article>)}</div>}</Async>
    </Section>}
    {showEditor && <Modal title={editing ? 'Sửa đợt thu nháp' : 'Tạo đợt thu mới'} onClose={closeEditor} footer={<><button className="live-btn ghost" onClick={closeEditor}>Hủy</button><button className="live-btn" disabled={busy} onClick={save}><Save size={15} /> {busy ? 'Đang lưu…' : 'Lưu đợt thu'}</button></>}>
      <div className="finance-modal-form"><Field label="Năm học *"><select className="live-input" disabled value={form.academicYearId}><option value={selectedYear?.id}>{yearLabel(selectedYear)}</option></select></Field><Field label="Mã đợt thu *"><input className="live-input" disabled={!!editing} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="HP-HK1-2026" /></Field><Field label="Tên đợt thu *"><input className="live-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Học phí học kỳ 1" /></Field><Field label="Hạn thanh toán"><input className="live-input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field></div>
      <fieldset className="finance-grade-picker"><legend>Khối áp dụng</legend><p>Không chọn khối nào nghĩa là áp dụng toàn trường.</p><div>{GRADES.map((grade) => <label key={grade}><input type="checkbox" checked={form.grades.includes(grade)} onChange={() => setForm({ ...form, grades: form.grades.includes(grade) ? form.grades.filter((item) => item !== grade) : [...form.grades, grade] })} /><span>{grade.replace('K', 'Khối ')}</span></label>)}</div></fieldset>
    </Modal>}
    {preview && <Modal title="Kiểm tra phạm vi phát hành" onClose={() => !busy && setPreview(null)} footer={<><button className="live-btn ghost" disabled={busy} onClick={() => setPreview(null)}>Quay lại</button><button className="live-btn" disabled={busy || preview.invoicesToCreate === 0} onClick={publish}><Send size={15} /> {busy ? 'Đang phát hành…' : `Phát hành ${preview.invoicesToCreate} hóa đơn`}</button></>}>
      <div className="invoice-preview-scope"><div className="finance-scope-heading"><CalendarRange size={22} /><div><strong>{preview.periodName || preview.periodCode}</strong><span>{preview.academicYearCode} · {preview.gradeLevels.length ? preview.gradeLevels.join(', ') : 'Toàn trường'}</span></div></div><div className="invoice-preview-kpis"><article><small>Lớp phù hợp</small><strong>{preview.classCount}</strong></article><article><small>Học sinh hợp lệ</small><strong>{preview.eligibleStudents}</strong></article><article><small>Tạo mới</small><strong>{preview.invoicesToCreate}</strong></article><article><small>Giá trị phát hành</small><strong>{money(preview.expectedNewReceivable)}</strong></article></div>{preview.warnings.map((warning) => <p className="finance-preview-warning" key={warning}><AlertTriangle size={15} /> {warning}</p>)}<div className="finance-preview-classes">{preview.classes.map((row) => <article key={row.classId}><strong>{row.classCode}</strong><span>{row.eligibleStudents} học sinh · {money(row.amountPerStudent)}/học sinh</span><small>{row.existingInvoices ? `${row.existingInvoices} hóa đơn đã có` : 'Tạo mới toàn bộ'}{row.missingParents ? ` · ${row.missingParents} thiếu phụ huynh` : ''}</small></article>)}</div></div>
    </Modal>}
  </div>;
}

function PaymentsModule({ selectedYear, periods }: { selectedYear?: AcademicYear; periods: FeePeriod[] }) {
  const [query, setQuery] = useHashString('payment_q', '');
  const [status, setStatus] = useHashString('payment_status', 'ALL');
  const [periodId, setPeriodId] = useHashString('payment_period', 'ALL');
  const [page, setPage] = useHashNumber('payment_page', 1);
  const [size, setSize] = useHashNumber('payment_size', 20);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => setPage(1), [debouncedQuery, status, periodId, selectedYear?.id, setPage]);
  const params = new URLSearchParams({ academicYearId: selectedYear?.id || '', page: String(page - 1), size: String(size) });
  if (debouncedQuery) params.set('q', debouncedQuery); if (status !== 'ALL') params.set('status', status); if (periodId !== 'ALL') params.set('periodId', periodId);
  const payments = useApi<PageResponse<PaymentView>>(selectedYear ? `/payments/page?${params}` : null);
  return <Section title="Lịch sử thanh toán" subtitle="Tra cứu giao dịch theo học sinh, lớp, hóa đơn hoặc mã giao dịch" wide action={<button className="live-btn ghost" onClick={() => payments.reload()}><RefreshCw size={15} /> Làm mới</button>}>
    <div className="finance-filterbar finance-filterbar-prominent"><label className="finance-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm học sinh, lớp, hóa đơn, mã giao dịch" /></label><select className="live-input" value={periodId} onChange={(e) => setPeriodId(e.target.value)}><option value="ALL">Tất cả đợt thu</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.name || period.code}</option>)}</select><select className="live-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="SUCCESS">Thành công</option><option value="PENDING">Chờ xử lý</option><option value="FAILED">Thất bại</option></select>{(query || status !== 'ALL' || periodId !== 'ALL') && <button className="live-btn ghost" onClick={() => { setQuery(''); setStatus('ALL'); setPeriodId('ALL'); }}>Xóa bộ lọc</button>}</div>
    <Async state={payments} empty="Không có giao dịch phù hợp">{(data) => <><div className="finance-result-count">Tìm thấy <strong>{data.totalElements}</strong> giao dịch</div><div className="finance-table-wrap"><table className="live-table finance-table"><thead><tr><th>Giao dịch</th><th>Hóa đơn</th><th>Học sinh / lớp</th><th>Đợt thu</th><th>Số tiền</th><th>Trạng thái</th></tr></thead><tbody>{data.items.map((payment) => <tr key={payment.id}><td><strong>{payment.txnRef || payment.id}</strong><small>{fmtDateTime(payment.paidAt || payment.createdAt)}</small></td><td><strong>{payment.invoiceCode}</strong><small>{payment.method === 'VIETQR' ? 'VietQR' : 'Tiền mặt'}</small></td><td><strong>{payment.studentName}</strong><small>{payment.classCode || 'Chưa có lớp'}</small></td><td>{payment.feePeriodName}</td><td><strong>{money(payment.amount)}</strong></td><td><StatusPill value={payment.status} /></td></tr>)}</tbody></table></div><ServerPagination data={data} itemLabel="giao dịch" onPageChange={(next) => setPage(next + 1, 'push')} onPageSizeChange={(next) => { setSize(next); setPage(1); }} /></>}</Async>
  </Section>;
}

function DebtsModule({ selectedYear, periods }: { selectedYear?: AcademicYear; periods: FeePeriod[] }) {
  const toast = useToast();
  const [sendingBatch, setSendingBatch] = useState(false);
  const [query, setQuery] = useHashString('debt_q', ''); const [grade, setGrade] = useHashString('debt_grade', 'ALL');
  const [periodId, setPeriodId] = useHashString('debt_period', 'ALL'); const [status, setStatus] = useHashString('debt_status', 'ALL');
  const params = new URLSearchParams(); if (selectedYear) params.set('academicYearId', selectedYear.id); if (periodId !== 'ALL') params.set('periodId', periodId); if (grade !== 'ALL') params.set('gradeLevel', grade); if (status !== 'ALL') params.set('status', status);
  const summaries = useApi<FinanceClassSummary[]>(selectedYear ? `/finance/classes?${params}` : null);
  const visible = useMemo(() => { const value = query.trim().toLocaleLowerCase('vi'); return (summaries.data || []).filter((row) => !value || row.classCode.toLocaleLowerCase('vi').includes(value) || (row.homeroomTeacherName || '').toLocaleLowerCase('vi').includes(value)); }, [query, summaries.data]);
  const remind = async (row: FinanceClassSummary) => { try { await api.post(`/finance/classes/${row.classId}/remind-homeroom${periodId === 'ALL' ? '' : `?periodId=${periodId}`}`); toast.show('ok', `Đã nhắc GVCN lớp ${row.classCode}`); summaries.reload(); } catch (error: any) { toast.show('err', error.message); } };
  const remindable = visible.filter((row) => !row.completed && !!row.homeroomTeacherId && !row.reminderSentToday);
  const remindVisible = async () => {
    if (!remindable.length) return toast.show('err', 'Không có lớp nào cần nhắc mới trong danh sách hiện tại');
    if (!await confirmAction({ title: `Nhắc GVCN của ${remindable.length} lớp?`, description: 'Thông báo công nợ sẽ được gửi tới các GVCN trong kết quả đang lọc.', confirmLabel: 'Gửi nhắc hàng loạt' })) return;
    setSendingBatch(true);
    try {
      const result = await api.post<HomeroomDebtReminderResult>('/finance/classes/remind-homerooms', {
        periodId: periodId === 'ALL' ? null : periodId,
        classIds: remindable.map((row) => row.classId),
      });
      toast.show('ok', `Đã nhắc ${result.recipientCount} GVCN của ${result.classCount} lớp`);
      summaries.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSendingBatch(false); }
  };
  return <Section title="Công nợ theo lớp" subtitle="Lọc đúng năm học, khối và đợt thu trước khi nhắc giáo viên chủ nhiệm" wide action={<div className="finance-section-actions"><button className="live-btn ghost" onClick={() => downloadClassFinanceCsv(visible)}><Download size={15} /> Xuất CSV</button><button className="live-btn" disabled={sendingBatch || remindable.length === 0} onClick={remindVisible}><BellRing size={15} /> {sendingBatch ? 'Đang gửi…' : `Nhắc ${remindable.length} GVCN`}</button></div>}>
    {toast.node}<div className="finance-filterbar finance-filterbar-prominent"><label className="finance-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm lớp hoặc GVCN" /></label><select className="live-input" value={periodId} onChange={(e) => setPeriodId(e.target.value)}><option value="ALL">Tất cả đợt thu</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.name || period.code}</option>)}</select><select className="live-input" value={grade} onChange={(e) => setGrade(e.target.value)}><option value="ALL">Tất cả khối</option>{GRADES.map((item) => <option key={item}>{item}</option>)}</select><select className="live-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="INCOMPLETE">Chưa hoàn thành</option><option value="OVERDUE">Có quá hạn</option><option value="COMPLETED">Đã hoàn thành</option></select>{(query || grade !== 'ALL' || periodId !== 'ALL' || status !== 'ALL') && <button className="live-btn ghost" onClick={() => { setQuery(''); setGrade('ALL'); setPeriodId('ALL'); setStatus('ALL'); }}>Xóa bộ lọc</button>}</div>
    <Async state={{ ...summaries, data: visible }} empty="Không có lớp phù hợp">{(data) => <PaginatedData items={data} pageSize={10} itemLabel="lớp" urlStateKey="finance_debts">{(rows) => <div className="finance-table-wrap"><table className="live-table finance-table"><thead><tr><th>Lớp</th><th>GVCN</th><th>Hóa đơn</th><th>Đã thu</th><th>Còn nợ</th><th>Tiến độ</th><th>Điều phối</th></tr></thead><tbody>{rows.map((row) => <tr key={row.classId}><td><strong>{row.classCode}</strong><small>{row.gradeLevel}</small></td><td>{row.homeroomTeacherName || 'Chưa phân công'}</td><td>{row.paidCount}/{row.invoiceCount}</td><td><strong>{money(row.paidAmount)}</strong></td><td><strong>{money(row.outstanding)}</strong>{row.overdueCount > 0 && <small>{row.overdueCount} quá hạn</small>}</td><td><div className="finance-progress-copy"><span><i style={{ width: `${Math.min(100, row.collectionRate)}%` }} /></span><b>{row.collectionRate.toFixed(1)}%</b></div></td><td>{row.completed ? <span className="finance-complete-label"><CheckCircle2 size={14} /> Hoàn thành</span> : <button className="live-btn subtle" disabled={!row.homeroomTeacherId || row.reminderSentToday} onClick={() => remind(row)}><BellRing size={14} /> {row.reminderSentToday ? 'Đã nhắc hôm nay' : 'Nhắc GVCN'}</button>}</td></tr>)}</tbody></table></div>}</PaginatedData>}</Async>
  </Section>;
}

function VietQrModule({ receipts = false }: { receipts?: boolean }) {
  const toast = useToast();
  const endpoint = receipts ? '/payments/vietqr/receipts' : '/payments/vietqr/pending';
  const rows = useApi<VietQrPendingPayment[]>(endpoint);
  const [busyId, setBusyId] = useState('');
  const [reconcileTarget, setReconcileTarget] = useState<VietQrPendingPayment | null>(null);
  const [bankTransactionRef, setBankTransactionRef] = useState('');
  const action = async (item: VietQrPendingPayment, accepted: boolean) => {
    if (accepted) { setReconcileTarget(item); setBankTransactionRef(''); return; }
    if (!await confirmAction({ title: 'Từ chối giao dịch?', description: 'Giao dịch sẽ chuyển sang trạng thái thất bại.', confirmLabel: 'Từ chối', tone: 'danger' })) return;
    setBusyId(item.payment.id); try { await api.post(`/payments/${item.payment.id}/reject-vietqr`); rows.reload(); toast.show('ok', 'Đã từ chối giao dịch'); } catch (error: any) { toast.show('err', error.message); } finally { setBusyId(''); }
  };
  const confirmReconciliation = async () => {
    if (!reconcileTarget) return;
    const reference = bankTransactionRef.trim();
    if (!reference) return toast.show('err', 'Vui lòng nhập mã giao dịch trên sao kê ngân hàng');
    setBusyId(reconcileTarget.payment.id);
    try {
      await api.post(`/payments/${reconcileTarget.payment.id}/confirm-vietqr`, { bankTransactionRef: reference });
      setReconcileTarget(null); setBankTransactionRef(''); rows.reload();
      toast.show('ok', 'Đã xác nhận tiền về và đưa email biên nhận vào hàng đợi');
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusyId(''); }
  };
  const resendReceipt = async (item: VietQrPendingPayment) => {
    setBusyId(item.payment.id);
    try { await api.post(`/payments/${item.payment.id}/resend-receipt`); toast.show('ok', `Đã gửi lại biên nhận ${item.invoice.code}`); window.setTimeout(rows.reload, 800); }
    catch (error: any) { toast.show('err', error.message); }
    finally { setBusyId(''); }
  };
  return <Section title={receipts ? 'Email biên nhận' : 'Đối soát VietQR'} subtitle={receipts ? 'Theo dõi trạng thái gửi biên nhận sau thanh toán' : 'Kiểm tra sao kê trước khi xác nhận tiền về'} wide action={<button className="live-btn ghost" onClick={() => rows.reload()}><RefreshCw size={15} /> Làm mới</button>}>
    {toast.node}<Async state={rows} empty={receipts ? 'Chưa có biên nhận thanh toán' : 'Không có giao dịch chờ đối soát'}>{(data) => <PaginatedData items={data} pageSize={10} itemLabel={receipts ? 'biên nhận' : 'giao dịch'}>{(pageRows) => <div className="finance-table-wrap"><table className="live-table finance-table"><thead><tr><th>Hóa đơn</th><th>Học sinh</th><th>Số tiền</th><th>Nội dung</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{pageRows.map((item) => { const emailStatus = item.emailDelivery?.status || 'NOT_SENT'; const retryable = receipts && ['FAILED', 'SKIPPED', 'NOT_SENT'].includes(emailStatus); return <tr key={item.payment.id}><td><strong>{item.invoice.code}</strong><small>{fmtDateTime(item.payment.paidAt || item.payment.createdAt)}</small></td><td><strong>{item.invoice.studentName}</strong><small>{item.invoice.classCode}</small></td><td><strong>{money(item.payment.amount)}</strong></td><td>{item.transferContent || item.payment.txnRef}</td><td><StatusPill value={receipts ? emailStatus : item.gatewayStatus} />{receipts && <small>{item.emailDelivery?.attempts || 0} lần thử</small>}</td><td>{receipts ? (retryable ? <button className="live-btn subtle" disabled={busyId === item.payment.id} onClick={() => resendReceipt(item)}><Send size={14} /> Gửi lại</button> : <span className="finance-complete-label"><CheckCircle2 size={14} /> Không cần xử lý</span>) : <div className="finance-row-actions"><button className="live-btn ghost" disabled={busyId === item.payment.id} onClick={() => action(item, false)}>Từ chối</button><button className="live-btn" disabled={busyId === item.payment.id} onClick={() => action(item, true)}><CheckCircle2 size={14} /> Xác nhận</button></div>}</td></tr>; })}</tbody></table></div>}</PaginatedData>}</Async>
    {reconcileTarget && <Modal title="Xác nhận tiền VietQR đã về" onClose={() => !busyId && setReconcileTarget(null)} footer={<><button className="live-btn ghost" disabled={!!busyId} onClick={() => setReconcileTarget(null)}>Hủy</button><button className="live-btn" disabled={!!busyId || !bankTransactionRef.trim()} onClick={confirmReconciliation}><CheckCircle2 size={15} /> {busyId ? 'Đang xác nhận…' : 'Xác nhận tiền về'}</button></>}><div className="finance-reconcile-summary"><p><span>Hóa đơn</span><strong>{reconcileTarget.invoice.code}</strong></p><p><span>Học sinh</span><strong>{reconcileTarget.invoice.studentName}</strong></p><p><span>Số tiền</span><strong>{money(reconcileTarget.payment.amount)}</strong></p></div><Field label="Mã giao dịch trên sao kê *"><input className="live-input" autoFocus value={bankTransactionRef} onChange={(event) => setBankTransactionRef(event.target.value)} placeholder="Nhập đúng mã từ ứng dụng ngân hàng" /></Field><p className="finance-modal-note"><AlertTriangle size={15} /> Chỉ xác nhận khi số tiền, nội dung chuyển khoản và mã giao dịch đều khớp sao kê.</p></Modal>}
  </Section>;
}

export function AdminFinanceLive() {
  const years = useApi<AcademicYear[]>('/academicYears');
  const [yearId, setYearId] = useHashString('nam_hoc', '');
  const selectedYear = years.data?.find((year) => year.id === yearId)
    || years.data?.find((year) => year.status === 'ACTIVE') || years.data?.[0];
  useEffect(() => { if (!yearId && selectedYear) setYearId(selectedYear.id); }, [selectedYear, setYearId, yearId]);
  const yearParam = selectedYear ? `?academicYearId=${encodeURIComponent(selectedYear.id)}` : '';
  const periods = useApi<FeePeriod[]>(selectedYear ? `/fee-periods${yearParam}` : null);
  const overview = useApi<FinanceOverview>(selectedYear ? `/finance/overview${yearParam}` : null);
  const integrations = useApi<FinanceIntegrationStatus>('/finance/integrations');
  const readonly = selectedYear?.status === 'CLOSED';
  const reloadAll = () => { periods.reload(); overview.reload(); };
  const currentYears = (years.data || []).filter((year) => year.status !== 'CLOSED');
  const historyYears = (years.data || []).filter((year) => year.status === 'CLOSED');

  return <div className="live-stack accountant-finance-workspace">
    <section className="finance-command-header"><div><small>TRUNG TÂM TÀI CHÍNH</small><h2>Điều hành thu phí và công nợ</h2><p>Mỗi màn hình chỉ hiển thị dữ liệu của một năm học để tránh nhầm lẫn.</p></div><label><span>Năm học đang xem</span><select value={selectedYear?.id || ''} onChange={(event) => setYearId(event.target.value, 'push')}><optgroup label="Đang vận hành">{currentYears.map((year) => <option key={year.id} value={year.id}>{yearLabel(year)}</option>)}</optgroup>{historyYears.length > 0 && <optgroup label="Lịch sử — chỉ xem">{historyYears.map((year) => <option key={year.id} value={year.id}>{yearLabel(year)}</option>)}</optgroup>}</select></label></section>
    {readonly && <div className="finance-history-banner"><ShieldCheck size={20} /><div><strong>Đang xem lịch sử {selectedYear?.code}</strong><span>Dữ liệu đã khóa; mọi thao tác thay đổi và phát hành đều bị vô hiệu hóa.</span></div></div>}
    <FunctionTabs mode="tabs" tabs={[
      { id: 'overview', label: 'Tổng quan', description: 'Chỉ số quan trọng', Icon: CircleDollarSign, content: <FinanceOverviewModule overview={overview} selectedYear={selectedYear} integrations={integrations} /> },
      { id: 'periods', label: 'Đợt thu', description: 'Tạo và phát hành', Icon: ReceiptText, content: <PeriodsModule periods={periods} selectedYear={selectedYear} readonly={readonly} reloadAll={reloadAll} /> },
      { id: 'debts', label: 'Công nợ', description: 'Theo lớp và trạng thái', Icon: UsersRound, content: <DebtsModule selectedYear={selectedYear} periods={periods.data || []} /> },
      { id: 'payments', label: 'Thanh toán', description: 'Lịch sử giao dịch', Icon: WalletCards, content: <PaymentsModule selectedYear={selectedYear} periods={periods.data || []} /> },
      { id: 'vietqr', label: 'Đối soát VietQR', description: 'Xác nhận tiền về', Icon: Landmark, content: <VietQrModule /> },
      { id: 'receipts', label: 'Email biên nhận', description: 'Theo dõi SMTP', Icon: Send, content: <VietQrModule receipts /> },
    ]} />
  </div>;
}
