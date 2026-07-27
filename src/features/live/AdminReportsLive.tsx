import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Download,
  GraduationCap,
  RefreshCw,
  School,
  TrendingUp,
  UserCheck,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { AcademicYear, FeePeriod, SchoolClass, Semester, Subject } from '../../api/types';
import { Badge, Section } from '../../components/ui';
import { Async, money, useToast } from './common';
import { useHashString } from '../../api/urlState';

type OverviewReport = {
  students: number;
  teachers: number;
  parents: number;
  admins: number;
  classes: number;
  subjects: number;
};

type GradeBand = { band: string; count: number };

type AttendanceReport = {
  present: number;
  late: number;
  absentExcused: number;
  absentUnexcused: number;
  total: number;
  attendanceRate: number;
};

type RevenueReport = {
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  invoiceCount: number;
  paidCount: number;
};

const GRADE_TONES = ['danger', 'muted', 'primary', 'success'];

export function AdminReportsLive() {
  const [semesterId, setSemesterId] = useHashString('semester', '');
  const [yearId, setYearId] = useHashString('year', '');
  const [classId, setClassId] = useHashString('class', '');
  const [subjectId, setSubjectId] = useHashString('subject', '');
  const [feePeriodId, setFeePeriodId] = useHashString('fee_period', '');
  const [startDate, setStartDate] = useHashString('from', '');
  const [endDate, setEndDate] = useHashString('to', '');
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const overview = useApi<OverviewReport>('/reports/overview');
  const gradeQuery = new URLSearchParams();
  if (semesterId) gradeQuery.set('semesterId', semesterId);
  if (classId) gradeQuery.set('classId', classId);
  if (subjectId) gradeQuery.set('subjectId', subjectId);
  const attendanceQuery = new URLSearchParams();
  if (classId) attendanceQuery.set('classId', classId);
  if (startDate) attendanceQuery.set('startDate', startDate);
  if (endDate) attendanceQuery.set('endDate', endDate);
  const revenueQuery = new URLSearchParams();
  if (classId) revenueQuery.set('classId', classId);
  if (feePeriodId) revenueQuery.set('periodId', feePeriodId);
  const dist = useApi<GradeBand[]>(`/reports/grade-distribution${gradeQuery.size ? `?${gradeQuery}` : ''}`);
  const attendance = useApi<AttendanceReport>(`/reports/attendance-summary${attendanceQuery.size ? `?${attendanceQuery}` : ''}`);
  const revenue = useApi<RevenueReport>(`/reports/revenue${revenueQuery.size ? `?${revenueQuery}` : ''}`);
  const years = useApi<AcademicYear[]>('/academicYears');
  const semesters = useApi<Semester[]>('/semesters');
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const feePeriods = useApi<FeePeriod[]>('/fee-periods');
  const promotion = useApi<Record<string, number>>(yearId ? `/reports/promotion?academicYearId=${encodeURIComponent(yearId)}` : null);
  const toast = useToast();

  useEffect(() => {
    if (yearId || !years.data?.length) return;
    const active = years.data.find((year) => year.status === 'ACTIVE') || years.data[0];
    setYearId(active.id);
  }, [yearId, years.data, setYearId]);

  const selectedSemester = semesters.data?.find((semester) => semester.id === semesterId);
  const gradeTotal = (dist.data || []).reduce((sum, item) => sum + item.count, 0);
  const lowGradeCount = dist.data?.[0]?.count || 0;
  const goodGradeCount = (dist.data || []).slice(2).reduce((sum, item) => sum + item.count, 0);
  const attendanceRate = attendance.data?.attendanceRate || 0;
  const collectionRate = revenue.data?.totalAmount
    ? Math.round((revenue.data.paidAmount || 0) / revenue.data.totalAmount * 1000) / 10
    : 0;
  const outstandingInvoices = Math.max(0, (revenue.data?.invoiceCount || 0) - (revenue.data?.paidCount || 0));
  const loading = overview.loading || dist.loading || attendance.loading || revenue.loading;
  const firstError = overview.error || dist.error || attendance.error || revenue.error;

  const attendanceItems = useMemo(() => [
    { label: 'Có mặt', value: attendance.data?.present || 0, tone: 'success' },
    { label: 'Đi muộn', value: attendance.data?.late || 0, tone: 'primary' },
    { label: 'Vắng có phép', value: attendance.data?.absentExcused || 0, tone: 'muted' },
    { label: 'Vắng không phép', value: attendance.data?.absentUnexcused || 0, tone: 'danger' },
  ], [attendance.data]);

  const reloadAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([overview.reload(), dist.reload(), attendance.reload(), revenue.reload(), years.reload(),
        semesters.reload(), classes.reload(), subjects.reload(), feePeriods.reload(), yearId ? promotion.reload() : Promise.resolve()]);
      setUpdatedAt(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const exportReport = async (type: string) => {
    try {
      const query = new URLSearchParams({ type });
      if (classId) query.set('classId', classId);
      if (type === 'grades' && semesterId) query.set('semesterId', semesterId);
      if (type === 'grades' && subjectId) query.set('subjectId', subjectId);
      if (type === 'attendance' && startDate) query.set('startDate', startDate);
      if (type === 'attendance' && endDate) query.set('endDate', endDate);
      if (type === 'revenue' && feePeriodId) query.set('periodId', feePeriodId);
      const result = await api.download(`/reports/export?${query}`);
      const href = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = result.filename || `bao-cao-${type}.csv`;
      anchor.click();
      URL.revokeObjectURL(href);
      toast.show('ok', 'Đã xuất báo cáo CSV từ dữ liệu hiện tại');
    } catch (error: any) {
      toast.show('err', error.message);
    }
  };

  const kpis = [
    { label: 'Quy mô học sinh', value: overview.data?.students || 0, suffix: 'học sinh', hint: `${overview.data?.classes || 0} lớp đang quản lý`, Icon: GraduationCap, tone: 'blue' },
    { label: 'Đội ngũ giảng dạy', value: overview.data?.teachers || 0, suffix: 'giáo viên', hint: `${overview.data?.subjects || 0} môn học`, Icon: UsersRound, tone: 'violet' },
    { label: 'Tỷ lệ chuyên cần', value: attendanceRate, suffix: '%', hint: `${attendance.data?.total || 0} lượt điểm danh`, Icon: UserCheck, tone: 'green' },
    { label: 'Tỷ lệ đã thu', value: collectionRate, suffix: '%', hint: `${revenue.data?.paidCount || 0}/${revenue.data?.invoiceCount || 0} hóa đơn`, Icon: WalletCards, tone: 'cyan' },
  ];

  return (
    <div className="report-modern-page">
      {toast.node}

      <section className="report-hero">
        <div className="report-hero-copy">
          <span className="report-eyebrow"><BarChart3 size={15} /> Trung tâm dữ liệu điều hành</span>
          <h2>Bức tranh toàn cảnh của nhà trường</h2>
          <p>Theo dõi học tập, chuyên cần và tài chính trên cùng một màn hình để ra quyết định nhanh, có căn cứ.</p>
          <div className="report-live-status"><i className={loading ? 'loading' : ''} /><span>{loading ? 'Đang đồng bộ dữ liệu…' : `Dữ liệu mới nhất lúc ${updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}</span></div>
        </div>
        <div className="report-hero-actions">
          <button type="button" className="report-refresh" onClick={reloadAll} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'is-spinning' : ''} /> Làm mới</button>
          <div className="report-export-menu">
            <span><Download size={16} /> Xuất dữ liệu</span>
            <button type="button" onClick={() => exportReport('overview')}>Tổng quan</button>
            <button type="button" onClick={() => exportReport('grades')}>Học tập</button>
            <button type="button" onClick={() => exportReport('attendance')}>Chuyên cần</button>
            <button type="button" onClick={() => exportReport('revenue')}>Tài chính</button>
          </div>
        </div>
      </section>

      <section className="report-filter-bar">
        <div><CalendarRange size={18} /><p><strong>Phạm vi phân tích</strong><small>Các biểu đồ và tệp xuất dùng đúng bộ lọc đang chọn</small></p></div>
        <label><span>Lớp</span><select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Toàn trường</option>{(classes.data || []).map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
        <label><span>Học kỳ</span><select value={semesterId} onChange={(event) => setSemesterId(event.target.value)}><option value="">Tất cả học kỳ</option>{(semesters.data || []).map((semester) => <option key={semester.id} value={semester.id}>{semester.name || semester.code}</option>)}</select></label>
        <label><span>Môn học</span><select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Tất cả môn</option>{(subjects.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Chuyên cần từ ngày</span><input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label><span>Đến ngày</span><input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
        <label><span>Khoản thu</span><select value={feePeriodId} onChange={(event) => setFeePeriodId(event.target.value)}><option value="">Tất cả khoản thu</option>{(feePeriods.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <span className="report-filter-context">{classId ? `Đang xem lớp ${(classes.data || []).find((item) => item.id === classId)?.code}` : selectedSemester ? `Đang xem: ${selectedSemester.name || selectedSemester.code}` : 'Dữ liệu toàn hệ thống'}</span>
      </section>

      {firstError && <div className="report-error"><AlertCircle size={18} /><span>Không thể tải đầy đủ dữ liệu: {firstError}</span><button type="button" onClick={reloadAll}>Thử lại</button></div>}

      <section className="report-kpi-grid">
        {kpis.map(({ label, value, suffix, hint, Icon, tone }) => (
          <article key={label} className={`report-kpi report-kpi--${tone}`}>
            <header><span><Icon size={20} /></span><ArrowUpRight size={16} /></header>
            <small>{label}</small>
            <strong>{loading && value === 0 ? '—' : formatNumber(value)} <em>{suffix}</em></strong>
            <p>{hint}</p>
          </article>
        ))}
      </section>

      <section className="report-analytics-grid">
        <article className="report-panel report-grade-panel">
          <header className="report-panel-head"><div><span><BookOpenCheck size={19} /></span><p><strong>Phân bố kết quả học tập</strong><small>{selectedSemester?.name || 'Tất cả học kỳ'} · {gradeTotal} đầu điểm</small></p></div><Badge tone={lowGradeCount ? 'red' : 'green'}>{gradeTotal ? `${Math.round(goodGradeCount / gradeTotal * 100)}% khá, giỏi` : 'Chưa có dữ liệu'}</Badge></header>
          <Async state={dist} empty="Chưa có điểm trong phạm vi đã chọn">{(items) => (
            <div className="report-bar-chart">{items.map((item, index) => {
              const ratio = gradeTotal ? item.count / gradeTotal * 100 : 0;
              return <div className="report-bar-row" key={item.band}>
                <div><strong>{item.band}</strong><small>{item.count} kết quả</small></div>
                <span><i className={`tone-${GRADE_TONES[index]}`} style={{ width: `${ratio}%` }} /></span>
                <b>{Math.round(ratio)}%</b>
              </div>;
            })}</div>
          )}</Async>
          <footer><span><TrendingUp size={15} /> Tập trung hỗ trợ nhóm dưới 5 điểm</span><strong>{lowGradeCount} kết quả cần chú ý</strong></footer>
        </article>

        <article className="report-panel report-attendance-panel">
          <header className="report-panel-head"><div><span><UserCheck size={19} /></span><p><strong>Sức khỏe chuyên cần</strong><small>Tổng hợp từ sổ điểm danh điện tử</small></p></div><Badge tone={attendanceRate >= 90 ? 'green' : attendanceRate >= 80 ? 'blue' : 'red'}>{attendanceRate >= 90 ? 'Ổn định' : 'Cần theo dõi'}</Badge></header>
          <Async state={attendance}>{(data) => (
            <div className="report-attendance-body">
              <div className="report-donut" style={{ background: `conic-gradient(#0f766e 0 ${Math.min(100, data.attendanceRate)}%, #e6eef3 ${Math.min(100, data.attendanceRate)}% 100%)` }}><span><strong>{data.attendanceRate}%</strong><small>chuyên cần</small></span></div>
              <div className="report-legend">{attendanceItems.map((item) => <div key={item.label}><i className={`tone-${item.tone}`} /><span>{item.label}</span><strong>{item.value}</strong><small>{percentNumber(item.value, data.total)}%</small></div>)}</div>
            </div>
          )}</Async>
          <footer><span>Tổng lượt ghi nhận</span><strong>{formatNumber(attendance.data?.total || 0)} lượt</strong></footer>
        </article>
      </section>

      <section className="report-finance-panel">
        <div className="report-finance-main">
          <header><span><CircleDollarSign size={22} /></span><div><small>Tình hình các khoản thu</small><strong>{money(revenue.data?.totalAmount || 0)}</strong><p>Tổng giá trị đã phát hành</p></div></header>
          <div className="report-progress"><i style={{ width: `${Math.min(100, collectionRate)}%` }} /></div>
          <footer><span>Tiến độ thu <strong>{collectionRate}%</strong></span><span>Còn phải thu <strong>{money(revenue.data?.outstanding || 0)}</strong></span></footer>
        </div>
        <div className="report-finance-stats">
          <article><span><CheckCircle2 size={18} /></span><div><small>Đã thu</small><strong>{money(revenue.data?.paidAmount || 0)}</strong><p>{revenue.data?.paidCount || 0} hóa đơn hoàn tất</p></div></article>
          <article className={outstandingInvoices ? 'needs-attention' : ''}><span><AlertCircle size={18} /></span><div><small>Cần theo dõi</small><strong>{outstandingInvoices} hóa đơn</strong><p>{outstandingInvoices ? 'Chưa hoàn tất thanh toán' : 'Không còn công nợ mở'}</p></div></article>
        </div>
      </section>

      <section className="report-priority-grid">
        <article className={lowGradeCount ? 'danger' : 'success'}><span><BookOpenCheck size={19} /></span><div><small>Học tập</small><strong>{lowGradeCount ? `${lowGradeCount} kết quả dưới trung bình` : 'Kết quả học tập ổn định'}</strong><p>{lowGradeCount ? 'Cần rà soát kế hoạch phụ đạo và trao đổi với giáo viên.' : 'Chưa ghi nhận đầu điểm dưới trung bình.'}</p></div></article>
        <article className={(attendance.data?.absentUnexcused || 0) ? 'danger' : 'success'}><span><UserCheck size={19} /></span><div><small>Chuyên cần</small><strong>{attendance.data?.absentUnexcused || 0} lượt vắng không phép</strong><p>Ưu tiên xác minh và phối hợp với giáo viên chủ nhiệm.</p></div></article>
        <article className={outstandingInvoices ? 'primary' : 'success'}><span><WalletCards size={19} /></span><div><small>Tài chính</small><strong>{outstandingInvoices} hóa đơn chưa hoàn tất</strong><p>Theo dõi công nợ và nhắc phụ huynh đúng thời điểm.</p></div></article>
      </section>

      <Section title="Kết quả tổng kết năm học" subtitle="Theo dõi trạng thái lên lớp và tốt nghiệp theo năm học" wide
        action={<label className="report-year-picker"><School size={15} /><select value={yearId} onChange={(event) => setYearId(event.target.value)}><option value="">Chọn năm học</option>{(years.data || []).map((year) => <option key={year.id} value={year.id}>{year.name || year.code}</option>)}</select></label>}>
        {!yearId ? <div className="report-empty-year">Chọn năm học để xem kết quả tổng kết.</div> : <Async state={promotion}>{(data) => {
          const rows = [
            { label: 'Lên lớp', value: data.promoted || 0, tone: 'success' },
            { label: 'Chờ xếp lớp', value: data.pendingClass || 0, tone: 'primary' },
            { label: 'Tốt nghiệp', value: data.graduated || 0, tone: 'violet' },
            { label: 'Lưu ban', value: data.retained || 0, tone: 'danger' },
            { label: 'Chưa hoàn tất', value: data.incomplete || 0, tone: 'muted' },
          ];
          return <div className="report-promotion-grid">{rows.map((row) => <article key={row.label}><div><i className={`tone-${row.tone}`} /><span>{row.label}</span><strong>{row.value}</strong></div><span><i className={`tone-${row.tone}`} style={{ width: `${percentNumber(row.value, data.total)}%` }} /></span><small>{percentNumber(row.value, data.total)}% tổng số học sinh</small></article>)}</div>;
        }}</Async>}
      </Section>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value);
}

function percentNumber(value?: number, total?: number) {
  return total ? Math.round((value || 0) / total * 100) : 0;
}
