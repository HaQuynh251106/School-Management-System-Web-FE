import { useMemo, useState } from 'react';
import {
  AlertTriangle, Banknote, CalendarDays, FileSpreadsheet, FileText, Filter, Landmark,
  ReceiptText, RotateCcw, Undo2, WalletCards,
} from 'lucide-react';
import { api } from '../../api/client';
import type {
  ApiUser, FeePeriod, FinanceDebtGroupRow, FinanceReport, SchoolClass, Semester,
} from '../../api/types';
import { useApi } from '../../api/useApi';
import { Section, StatusPill } from '../../components/ui';
import { Async, EmptyState, PaginatedData, fmtDate, fmtDateTime, money, useToast } from './common';

type ReportFilters = {
  fromDate: string;
  toDate: string;
  feePeriodId: string;
  gradeLevel: string;
  classId: string;
  studentId: string;
  method: string;
  feeType: string;
  semesterId: string;
  settlementStatus: string;
};

type DebtView = 'period' | 'grade' | 'class';

const today = inputDate(new Date());
const monthStart = `${today.slice(0, 7)}-01`;
const initialFilters: ReportFilters = {
  fromDate: monthStart,
  toDate: today,
  feePeriodId: '',
  gradeLevel: '',
  classId: '',
  studentId: '',
  method: '',
  feeType: '',
  semesterId: '',
  settlementStatus: '',
};

const feeTypeLabels: Record<string, string> = {
  TUITION: 'Học phí',
  MEAL: 'Bán trú / ăn uống',
  TRANSPORT: 'Xe đưa đón',
  ACTIVITY: 'Ngoại khóa',
  OTHER: 'Khoản thu khác',
};

export function FinanceReportsWorkspace() {
  const [draft, setDraft] = useState<ReportFilters>(initialFilters);
  const [applied, setApplied] = useState<ReportFilters>(initialFilters);
  const [debtView, setDebtView] = useState<DebtView>('period');
  const periods = useApi<FeePeriod[]>('/fee-periods');
  const semesters = useApi<Semester[]>('/semesters');
  const classes = useApi<SchoolClass[]>('/classes');
  const students = useApi<ApiUser[]>('/users?role=STUDENT');
  const query = useMemo(() => reportQuery(applied), [applied]);
  const report = useApi<FinanceReport>(`/reports/finance?${query}`);
  const toast = useToast();

  const classMap = useMemo(() => new Map((classes.data ?? []).map((item) => [item.id, item])), [classes.data]);
  const periodOptions = useMemo(() => (periods.data ?? [])
    .filter((period) => !draft.feeType || (period.feeType || 'OTHER') === draft.feeType)
    .filter((period) => !draft.semesterId || period.semesterId === draft.semesterId),
  [periods.data, draft.feeType, draft.semesterId]);
  const classOptions = useMemo(() => (classes.data ?? [])
    .filter((item) => !draft.gradeLevel || item.gradeLevel === draft.gradeLevel)
    .sort((left, right) => left.code.localeCompare(right.code, 'vi', { numeric: true })), [classes.data, draft.gradeLevel]);
  const studentOptions = useMemo(() => (students.data ?? [])
    .filter((student) => !draft.classId || student.classId === draft.classId)
    .filter((student) => !draft.gradeLevel || classMap.get(student.classId || '')?.gradeLevel === draft.gradeLevel)
    .sort((left, right) => (left.fullName || '').localeCompare(right.fullName || '', 'vi')),
  [students.data, draft.classId, draft.gradeLevel, classMap]);

  const apply = () => {
    if (!draft.fromDate || !draft.toDate) return toast.show('err', 'Hãy chọn đầy đủ ngày bắt đầu và ngày kết thúc.');
    if (draft.fromDate > draft.toDate) return toast.show('err', 'Ngày bắt đầu không được sau ngày kết thúc.');
    if (JSON.stringify(draft) === JSON.stringify(applied)) report.reload();
    else setApplied({ ...draft });
  };

  const applyQuickRange = (fromDate: string, toDate: string) => {
    const next = { ...draft, fromDate, toDate };
    setDraft(next);
    if (JSON.stringify(next) === JSON.stringify(applied)) report.reload();
    else setApplied(next);
  };

  const applyCurrentSemester = () => {
    const current = currentSemester(semesters.data ?? [], today);
    if (!current?.startDate) return toast.show('err', 'Chưa có học kỳ hiện tại với ngày bắt đầu hợp lệ.');
    applyQuickRange(current.startDate, earlierDate(current.endDate || today, today));
  };

  const reset = () => {
    setDraft(initialFilters);
    if (JSON.stringify(applied) === JSON.stringify(initialFilters)) report.reload();
    else setApplied(initialFilters);
  };

  const exportReport = async (format: 'XLSX' | 'PDF') => {
    try {
      const result = await api.download(`/reports/finance/export?format=${format}&${query}`);
      const href = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = result.filename || `bao-cao-tai-chinh.${format === 'PDF' ? 'pdf' : 'xlsx'}`;
      anchor.click();
      URL.revokeObjectURL(href);
      toast.show('ok', `Đã xuất báo cáo ${format}.`);
    } catch (error: any) {
      toast.show('err', error.message || 'Không thể xuất báo cáo.');
    }
  };

  return (
    <Section
      title="Báo cáo tài chính P5"
      subtitle="Thực thu, hoàn tiền, doanh thu ròng và công nợ theo dữ liệu giao dịch thật"
      wide
      action={(
        <div className="finance-report-export-actions">
          <button className="live-btn ghost" disabled={report.loading} onClick={() => exportReport('XLSX')}>
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button className="live-btn ghost" disabled={report.loading} onClick={() => exportReport('PDF')}>
            <FileText size={15} /> PDF
          </button>
        </div>
      )}
    >
      {toast.node}
      <div className="finance-report-filters">
        <div className="finance-report-quick-filters" aria-label="Lọc nhanh thời gian báo cáo">
          <span><CalendarDays size={15} /> Lọc nhanh</span>
          <button className={draft.fromDate === today && draft.toDate === today ? 'active' : ''} onClick={() => applyQuickRange(today, today)}>Hôm nay</button>
          <button onClick={() => applyQuickRange(daysBefore(today, 6), today)}>7 ngày</button>
          <button onClick={() => applyQuickRange(daysBefore(today, 29), today)}>30 ngày</button>
          <button className={draft.fromDate === monthStart && draft.toDate === today ? 'active' : ''} onClick={() => applyQuickRange(monthStart, today)}>Tháng này</button>
          <button onClick={applyCurrentSemester}>Học kỳ hiện tại</button>
        </div>
        <label><span>Từ ngày</span><input className="live-input" type="date" max={today} value={draft.fromDate} onChange={(event) => setDraft({ ...draft, fromDate: event.target.value })} /></label>
        <label><span>Đến ngày</span><input className="live-input" type="date" max={today} value={draft.toDate} onChange={(event) => setDraft({ ...draft, toDate: event.target.value })} /></label>
        <label><span>Loại khoản thu</span><select className="live-select" aria-label="Lọc báo cáo theo loại khoản thu" value={draft.feeType} onChange={(event) => setDraft({ ...draft, feeType: event.target.value, feePeriodId: '' })}>
          <option value="">Tất cả loại</option>
          {Object.entries(feeTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label><span>Học kỳ</span><select className="live-select" aria-label="Lọc báo cáo theo học kỳ" value={draft.semesterId} onChange={(event) => setDraft({ ...draft, semesterId: event.target.value, feePeriodId: '' })}>
          <option value="">Tất cả học kỳ</option>
          {(semesters.data ?? []).map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
        </select></label>
        <label><span>Đợt thu</span><select className="live-select" value={draft.feePeriodId} onChange={(event) => setDraft({ ...draft, feePeriodId: event.target.value })}>
          <option value="">Tất cả đợt thu</option>
          {periodOptions.map((period) => <option key={period.id} value={period.id}>{period.code} · {period.name}</option>)}
        </select></label>
        <label><span>Khối</span><select className="live-select" value={draft.gradeLevel} onChange={(event) => setDraft({ ...draft, gradeLevel: event.target.value, classId: '', studentId: '' })}>
          <option value="">Tất cả khối</option><option value="K10">Khối 10</option><option value="K11">Khối 11</option><option value="K12">Khối 12</option>
        </select></label>
        <label><span>Lớp</span><select className="live-select" value={draft.classId} onChange={(event) => {
          const selected = classMap.get(event.target.value);
          setDraft({ ...draft, classId: event.target.value, studentId: '', gradeLevel: selected?.gradeLevel || draft.gradeLevel });
        }}>
          <option value="">Tất cả lớp</option>
          {classOptions.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
        </select></label>
        <label><span>Học sinh</span><select className="live-select" value={draft.studentId} onChange={(event) => {
          const selected = studentOptions.find((item) => item.id === event.target.value);
          const selectedClass = classMap.get(selected?.classId || '');
          setDraft({ ...draft, studentId: event.target.value, classId: selected?.classId || draft.classId, gradeLevel: selectedClass?.gradeLevel || draft.gradeLevel });
        }}>
          <option value="">Tất cả học sinh</option>
          {studentOptions.map((student) => <option key={student.id} value={student.id}>{student.studentCode || student.username} · {student.fullName}</option>)}
        </select></label>
        <label><span>Phương thức</span><select className="live-select" value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })}>
          <option value="">Tất cả phương thức</option><option value="CASH">Tiền mặt</option><option value="MB_BANK_TRANSFER">Chuyển khoản MB</option><option value="VNPAY">VNPAY</option><option value="MOMO">MoMo</option>
        </select></label>
        <label><span>Tình trạng đóng phí</span><select className="live-select" aria-label="Lọc báo cáo theo tình trạng đóng phí" value={draft.settlementStatus} onChange={(event) => setDraft({ ...draft, settlementStatus: event.target.value })}>
          <option value="">Tất cả tình trạng</option>
          <option value="UNPAID">Chưa đóng / còn thiếu</option>
          <option value="PAID">Đã đóng đủ</option>
          <option value="OVERDUE">Quá hạn chưa đóng</option>
        </select></label>
        <div className="finance-report-filter-actions">
          <button className="live-btn primary" onClick={apply}><Filter size={15} /> Áp dụng</button>
          <button className="icon-inline-btn" title="Đặt lại bộ lọc" aria-label="Đặt lại bộ lọc báo cáo" onClick={reset}><RotateCcw size={16} /></button>
        </div>
        <p>Khoảng ngày áp dụng cho giao dịch và hoàn tiền. Công nợ phản ánh số dư hóa đơn hiện tại trong phạm vi đã chọn.</p>
      </div>

      <Async state={report}>{(data) => {
        const activeDays = data.dailyCashFlow.filter((row) => row.grossCollected !== 0 || row.refundAmount !== 0);
        const groups = debtGroups(data, debtView);
        return (
          <div className="finance-report-results">
            <div className="finance-report-generated">Cập nhật lúc {fmtDateTime(data.generatedAt)}</div>
            <div className="finance-report-metrics">
              <Metric Icon={ReceiptText} label="Tổng phải thu" value={money(data.summary.totalReceivable)} note={`${data.summary.invoiceCount} hóa đơn`} tone="blue" />
              <Metric Icon={Banknote} label="Thực thu trong kỳ" value={money(data.summary.grossCollected)} note={`${data.summary.paymentCount} giao dịch`} tone="green" />
              <Metric Icon={Undo2} label="Đã hoàn tiền" value={money(data.summary.refundAmount)} note={`${data.summary.refundCount} lần hoàn`} tone="red" />
              <Metric Icon={Landmark} label="Thực thu ròng" value={money(data.summary.netRevenue)} note="Thực thu trừ hoàn tiền" tone="ink" />
              <Metric Icon={WalletCards} label="Còn phải thu" value={money(data.summary.outstandingAmount)} note={`${data.summary.outstandingInvoiceCount} hóa đơn`} tone="orange" />
              <Metric Icon={AlertTriangle} label="Công nợ quá hạn" value={money(data.summary.overdueAmount)} note={`${data.summary.overdueInvoiceCount} hóa đơn`} tone="red" />
            </div>

            <div className="finance-report-split">
              <div className="finance-report-pane">
                <div className="finance-report-subhead"><div><strong>Dòng tiền theo ngày</strong><small>Chỉ hiển thị ngày có phát sinh</small></div></div>
                {activeDays.length === 0 ? <EmptyState label="Không có giao dịch trong kỳ" /> : (
                  <PaginatedData items={activeDays} pageSize={10} itemLabel="ngày giao dịch" resetKey={query}>
                    {(rows) => <div className="admin-table-scroll"><table className="live-table admin-data-table">
                      <thead><tr><th>Ngày</th><th>Thực thu</th><th>Hoàn tiền</th><th>Thực thu ròng</th></tr></thead>
                      <tbody>{rows.map((row) => <tr key={row.date}><td><strong>{fmtDate(row.date)}</strong><small className="finance-report-cell-note">{row.paymentCount} thu · {row.refundCount} hoàn</small></td><td>{money(row.grossCollected)}</td><td>{money(row.refundAmount)}</td><td className="admin-table-value">{money(row.netRevenue)}</td></tr>)}</tbody>
                    </table></div>}
                  </PaginatedData>
                )}
              </div>
              <div className="finance-report-pane">
                <div className="finance-report-subhead"><div><strong>Theo phương thức</strong><small>Khoản hoàn được quy về phương thức thu ban đầu</small></div></div>
                {data.byMethod.length === 0 ? <EmptyState label="Không có phương thức phát sinh" /> : <div className="admin-table-scroll"><table className="live-table admin-data-table">
                  <thead><tr><th>Phương thức</th><th>Thực thu</th><th>Hoàn tiền</th><th>Ròng</th></tr></thead>
                  <tbody>{data.byMethod.map((row) => <tr key={row.method}><td><strong>{methodLabel(row.method)}</strong><small className="finance-report-cell-note">{row.paymentCount} giao dịch</small></td><td>{money(row.grossCollected)}</td><td>{money(row.refundAmount)}</td><td className="admin-table-value">{money(row.netRevenue)}</td></tr>)}</tbody>
                </table></div>}
              </div>
            </div>

            <div className="finance-report-debt">
              <div className="finance-report-subhead">
                <div><strong>Công nợ theo phạm vi</strong><small>So sánh phải thu, đã thu, còn nợ và nợ quá hạn</small></div>
                <div className="finance-report-view-tabs" role="tablist" aria-label="Góc nhìn công nợ">
                  <button className={debtView === 'period' ? 'active' : ''} onClick={() => setDebtView('period')}>Đợt thu</button>
                  <button className={debtView === 'grade' ? 'active' : ''} onClick={() => setDebtView('grade')}>Khối</button>
                  <button className={debtView === 'class' ? 'active' : ''} onClick={() => setDebtView('class')}>Lớp</button>
                </div>
              </div>
              {groups.length === 0 ? <EmptyState label="Không có hóa đơn trong phạm vi" /> : (
                <PaginatedData items={groups} pageSize={10} itemLabel="nhóm công nợ" resetKey={`${query}-${debtView}`}>
                  {(rows) => <DebtGroupTable rows={rows} />}
                </PaginatedData>
              )}
            </div>

            <div className="finance-report-debt-details">
              <div className="finance-report-subhead"><div><strong>Chi tiết học sinh còn nợ</strong><small>Hóa đơn quá hạn được ưu tiên lên đầu</small></div><span>{data.debts.length} hóa đơn</span></div>
              {data.debts.length === 0 ? <EmptyState label="Không còn công nợ trong phạm vi" /> : (
                <PaginatedData items={data.debts} pageSize={10} itemLabel="hóa đơn công nợ" resetKey={query}>
                  {(rows) => <div className="admin-table-scroll"><table className="live-table admin-data-table finance-report-debt-table">
                    <thead><tr><th>Học sinh</th><th>Lớp</th><th>Đợt thu / hóa đơn</th><th>Hạn thanh toán</th><th>Đã thu</th><th>Còn nợ</th><th>Trạng thái</th></tr></thead>
                    <tbody>{rows.map((row) => <tr key={row.invoiceId} className={row.overdue ? 'overdue' : ''}>
                      <td><strong>{row.studentName}</strong><small>{row.studentCode || row.studentId}</small></td>
                      <td>{row.classCode}</td>
                      <td><strong>{row.feePeriodCode || 'Không có mã đợt'}</strong><small>{row.invoiceCode}</small></td>
                      <td>{fmtDate(row.dueDate)}</td><td>{money(row.paidAmount)}</td><td className="admin-table-value">{money(row.outstandingAmount)}</td><td><StatusPill value={row.overdue ? 'OVERDUE' : row.status} /></td>
                    </tr>)}</tbody>
                  </table></div>}
                </PaginatedData>
              )}
            </div>
          </div>
        );
      }}</Async>
    </Section>
  );
}

function Metric({ Icon, label, value, note, tone }: { Icon: typeof ReceiptText; label: string; value: string; note: string; tone: string }) {
  return <article className={`finance-report-metric ${tone}`}><span><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

function DebtGroupTable({ rows }: { rows: FinanceDebtGroupRow[] }) {
  return <div className="admin-table-scroll"><table className="live-table admin-data-table">
    <thead><tr><th>Phạm vi</th><th>Hóa đơn</th><th>Học sinh còn nợ</th><th>Phải thu</th><th>Đã thu</th><th>Còn nợ</th><th>Nợ quá hạn</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={`${row.dimension}-${row.key}`}><td><strong>{row.code}</strong><small className="finance-report-cell-note">{row.name}</small></td><td>{row.invoiceCount}</td><td>{row.debtorCount}</td><td>{money(row.totalReceivable)}</td><td>{money(row.currentPaidAmount)}</td><td className="admin-table-value">{money(row.outstandingAmount)}</td><td className={row.overdueAmount > 0 ? 'finance-report-overdue-value' : ''}>{money(row.overdueAmount)}<small className="finance-report-cell-note">{row.overdueInvoiceCount} hóa đơn</small></td></tr>)}</tbody>
  </table></div>;
}

function debtGroups(report: FinanceReport, view: DebtView) {
  if (view === 'grade') return report.debtByGrade;
  if (view === 'class') return report.debtByClass;
  return report.debtByFeePeriod;
}

function reportQuery(filters: ReportFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params.toString();
}

function methodLabel(method: string) {
  return ({ CASH: 'Tiền mặt', MB_BANK_TRANSFER: 'Chuyển khoản MB', VNPAY: 'VNPAY', MOMO: 'MoMo' } as Record<string, string>)[method] || method;
}

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBefore(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - days);
  return inputDate(value);
}

function earlierDate(left: string, right: string) {
  return left < right ? left : right;
}

function currentSemester(semesters: Semester[], date: string) {
  return semesters.find((semester) => semester.startDate && semester.endDate
    && semester.startDate <= date && semester.endDate >= date)
    || semesters.find((semester) => semester.status === 'ACTIVE');
}
