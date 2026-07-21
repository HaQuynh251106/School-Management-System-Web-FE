import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, Clock3, CreditCard, BookOpen, ClipboardCheck, Download, FileText, ListChecks, RefreshCw, Trophy, Users } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useActiveChild } from '../../api/activeChild';
import type { ApiUser, Assignment, AttendanceRecord, ExamCategory, Grade, Invoice, PaymentInitResponse, Semester, Submission } from '../../api/types';
import { Section, FunctionTabs, StatusPill, Badge, InfoGrid } from '../../components/ui';
import { Async, useToast, ATT_LABEL, fmtDate, fmtDateTime, money } from './common';
import { WeeklyTimetable } from './SharedLive';
import { formatScore, gradeColumns, scoreTone, weightedAverage } from './gradebook';

function useChildren() {
  return useApi<ApiUser[]>('/me/children');
}

/* ===== D1 — Switch Profile ===== */
export function ParentSwitchLive() {
  const children = useChildren();
  const { childId, setChildId } = useActiveChild();

  useEffect(() => {
    if (!childId && children.data && children.data.length) setChildId(children.data[0].id);
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
  const children = useChildren();
  const activeChild = (children.data || []).find((child) => child.id === childId);
  const semesters = useApi<Semester[]>('/semesters');
  const categories = useApi<ExamCategory[]>('/exam-categories');
  const [semesterId, setSemesterId] = useState('');
  const effectiveSemesterId = semesterId || semesters.data?.find((item) => item.status === 'ACTIVE')?.id || semesters.data?.[0]?.id || '';
  const grades = useApi<Grade[]>(childId && effectiveSemesterId ? `/grades?studentId=${childId}&semesterId=${effectiveSemesterId}` : null);
  const att = useApi<AttendanceRecord[]>(childId ? `/attendance?studentId=${childId}` : null);
  const assignments = useApi<Assignment[]>(childId ? `/children/${childId}/assignments` : null);
  const submissions = useApi<Submission[]>(childId ? `/children/${childId}/submissions` : null);
  const toast = useToast();

  const categoryList = useMemo<ExamCategory[]>(() => {
    if (categories.data?.length) return categories.data;
    const unique = new Map<string, ExamCategory>();
    (grades.data || []).forEach((grade) => unique.set(grade.category, {
      id: grade.category, code: grade.category, name: grade.categoryName, weight: 1,
    }));
    return [...unique.values()];
  }, [categories.data, grades.data]);
  const columns = useMemo(() => gradeColumns(categoryList), [categoryList]);
  const subjectRows = useMemo(() => {
    const grouped = new Map<string, { subjectId: string; subjectName: string; grades: Grade[] }>();
    (grades.data || []).forEach((grade) => {
      const row = grouped.get(grade.subjectId) || { subjectId: grade.subjectId, subjectName: grade.subjectName, grades: [] };
      row.grades.push(grade);
      grouped.set(grade.subjectId, row);
    });
    return [...grouped.values()].map((row) => ({ ...row, average: weightedAverage(row.grades, categoryList) }));
  }, [grades.data, categoryList]);
  const submissionMap = useMemo(() => new Map((submissions.data || []).map((item) => [item.assignmentId, item])), [submissions.data]);
  const averages = subjectRows.map((row) => row.average).filter((score): score is number => score != null);
  const semesterAverage = averages.length ? Math.round(averages.reduce((sum, score) => sum + score, 0) / averages.length * 10) / 10 : null;
  const bestSubject = subjectRows.reduce<(typeof subjectRows)[number] | null>((best, row) => (
    row.average != null && (!best || best.average == null || row.average > best.average) ? row : best
  ), null);

  const downloadFile = async (fileId?: string | null, fallback?: string | null) => {
    if (!fileId) return;
    try {
      const result = await api.download(`/files/${fileId}/content`);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename || fallback || 'tep-dinh-kem';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error: any) { toast.show('err', error.message); }
  };

  if (!childId) {
    return <Section title="Theo dõi học tập" subtitle="Bạn chưa chọn học sinh" wide>
      <div className="live-loading">Hãy vào mục “Chọn học sinh” để tiếp tục.</div></Section>;
  }

  return (
    <>{toast.node}<div className="parent-child-context"><Users size={17} /><span>Đang theo dõi</span><strong>{activeChild?.fullName || 'Học sinh'}</strong><small>{activeChild?.className || 'Chưa xếp lớp'}</small></div><FunctionTabs tabs={[
      { id: 'timetable', label: 'Thời khóa biểu', Icon: CalendarDays, content: (
        <Section title="Thời khóa biểu của con" subtitle={`Lịch học trong tuần của ${activeChild?.fullName || 'học sinh'}`} wide>
          {activeChild?.classId
            ? <WeeklyTimetable path={`/timetableSlots?classId=${encodeURIComponent(activeChild.classId)}`} />
            : <div className="live-loading">Học sinh chưa được xếp lớp.</div>}
        </Section>
      ) },
      { id: 'grades', label: 'Điểm', Icon: BookOpen, content: (
        <Section title="Bảng điểm đầy đủ" subtitle="Từng đầu điểm, hệ số và tổng kết học kỳ của con" wide action={
          <select className="live-select gradebook-semester-select" aria-label="Chọn học kỳ" value={effectiveSemesterId} onChange={(event) => setSemesterId(event.target.value)}>
            {(semesters.data || []).map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
          </select>}>
          <Async paginate state={{ data: subjectRows, loading: grades.loading, error: grades.error }} empty="Chưa có điểm trong học kỳ này" itemLabel="môn học">
            {(rows) => <div className="gradebook-shell">
              <div className="gradebook-summary student-grade-summary">
                <article className="gradebook-stat primary"><span><BarChart3 size={19} /></span><div><small>Trung bình học kỳ</small><strong>{formatScore(semesterAverage)}</strong><p>{averages.length} môn đủ dữ liệu</p></div></article>
                <article className="gradebook-stat"><span><Trophy size={19} /></span><div><small>Môn nổi bật</small><strong>{bestSubject?.subjectName || '—'}</strong><p>{bestSubject?.average == null ? 'Chưa đủ dữ liệu' : `${formatScore(bestSubject.average)} điểm`}</p></div></article>
                <article className="gradebook-stat"><span><CheckCircle2 size={19} /></span><div><small>Đầu điểm đã có</small><strong>{grades.data?.length || 0}</strong><p>{subjectRows.length} môn trong kỳ</p></div></article>
              </div>
              <div className="gradebook-table-wrap"><table className="gradebook-table student-gradebook-table"><thead><tr>
                <th className="gradebook-sticky-col">Môn học</th>{columns.map((column) => <th key={`${column.category.code}-${column.assessmentIndex}`}><span>{column.label}</span><small>Hệ số {column.category.weight}</small></th>)}<th className="gradebook-total-head">Tổng kết</th>
              </tr></thead><tbody>{rows.map((row) => <tr key={row.subjectId}>
                <td className="gradebook-sticky-col"><strong>{row.subjectName}</strong><small>{row.grades.length} đầu điểm</small></td>
                {columns.map((column) => { const grade = row.grades.find((item) => item.category === column.category.code && (item.assessmentIndex ?? 1) === column.assessmentIndex); return <td key={`${column.category.code}-${column.assessmentIndex}`}><span className={`grade-score ${scoreTone(grade?.score ?? null)}`}>{formatScore(grade?.score ?? null)}</span></td>; })}
                <td className="gradebook-total-cell"><strong className={`grade-total ${scoreTone(row.average)}`}>{row.average == null ? '' : formatScore(row.average)}</strong><small>{row.average == null ? 'Chưa đủ điểm' : 'Thang 10'}</small></td>
              </tr>)}</tbody></table></div>
              <p className="gradebook-note">Tổng kết chỉ hiển thị khi môn học đã có đủ tất cả đầu điểm bắt buộc.</p>
            </div>}
          </Async>
        </Section>
      ) },
      { id: 'assignments', label: 'Bài tập', Icon: ListChecks, content: (
        <Section title="Bài tập của con" subtitle="Đề bài, hạn nộp, trạng thái bài làm và kết quả chấm" wide>
          <Async paginate state={assignments} empty="Chưa có bài tập được giao" itemLabel="bài tập">
            {(items) => <div className="assignment-grid">{items.map((assignment) => {
              const submission = submissionMap.get(assignment.id);
              return <article className="assignment-card" key={assignment.id}>
                <div className="assignment-card-top"><span className="assignment-subject-icon"><FileText size={19} /></span><div><small>{assignment.subjectName}</small><strong>{assignment.title}</strong></div><StatusPill value={submission?.status || assignment.status} /></div>
                <p>{assignment.description || 'Không có mô tả bổ sung.'}</p>
                <div className="assignment-meta"><span><Clock3 size={14} /> {assignment.deadline ? `Hạn ${fmtDateTime(assignment.deadline)}` : 'Không giới hạn hạn nộp'}</span></div>
                {assignment.attachmentFileId && <button className="assignment-attachment" onClick={() => downloadFile(assignment.attachmentFileId, assignment.attachmentName)}><Download size={15} /><span>{assignment.attachmentName}</span><small>Tải đề</small></button>}
                <div className="parent-assignment-result"><strong>{submission ? `Đã nộp ${fmtDateTime(submission.submittedAt)}` : 'Chưa nộp bài'}</strong>{submission?.score != null && <span>Điểm {formatScore(submission.score)}/10</span>}<p>{submission?.feedback || (submission ? 'Giáo viên chưa để lại nhận xét.' : 'Phụ huynh có thể nhắc con hoàn thành đúng hạn.')}</p></div>
              </article>;
            })}</div>}
          </Async>
        </Section>
      ) },
      { id: 'att', label: 'Chuyên cần', Icon: ClipboardCheck, content: (
        <Section title="Chuyên cần của con" subtitle="Lịch sử đi học và ghi chú" wide>
          <Async paginate state={att} empty="Chưa có dữ liệu" itemLabel="lượt điểm danh">
            {(l) => (<table className="live-table"><thead><tr><th>Ngày</th><th>Môn</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
              <tbody>{l.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((r) => <tr key={r.id}><td>{fmtDate(r.date)}</td><td>{r.subjectName}</td><td><StatusPill value={ATT_LABEL[r.status] || r.status} /></td><td><small>{r.note || '—'}</small></td></tr>)}</tbody></table>)}
          </Async>
        </Section>
      ) },
    ]} /></>
  );
}

/* ===== D4 — Học phí ===== */
export function ParentInvoiceLive() {
  const invoices = useApi<Invoice[]>('/invoices');
  const toast = useToast();
  const reloadInvoices = invoices.reload;
  const showToast = toast.show;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const responseCode = params.get('vnp_ResponseCode');
    if (!responseCode) return;
    showToast(responseCode === '00' ? 'ok' : 'err', responseCode === '00'
      ? 'VNPAY đã tiếp nhận giao dịch. Hệ thống đang xác nhận qua kênh IPN an toàn.'
      : `Giao dịch chưa hoàn tất (mã ${responseCode}).`);
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    window.setTimeout(() => reloadInvoices(), 1200);
  }, [reloadInvoices, showToast]);
  const pay = async (inv: Invoice) => {
    try {
      const initiated = await api.post<PaymentInitResponse>('/payments', { invoiceId: inv.id, method: 'VNPAY' });
      if (initiated.paymentUrl) {
        window.location.assign(initiated.paymentUrl);
        return;
      } else if (initiated.callbackUrl && initiated.sandboxCallback) {
        await api.post(initiated.callbackUrl, initiated.sandboxCallback);
        toast.show('ok', `Thanh toán ${inv.code} thành công`);
      } else {
        toast.show('ok', `Giao dịch ${inv.code} đang chờ cổng thanh toán xác nhận`);
      }
      invoices.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };
  return (
    <Section title="Học phí" subtitle="Theo dõi và thanh toán các khoản thu" wide
      action={<button className="live-btn ghost" onClick={() => invoices.reload()}><RefreshCw size={14} /> Tải lại</button>}>
      {toast.node}
      <Async paginate state={invoices} empty="Chưa có hóa đơn. Vui lòng liên hệ nhà trường." itemLabel="hóa đơn">
        {(l) => (
          <table className="live-table">
            <thead><tr><th>Mã HĐ</th><th>Học sinh</th><th>Tổng</th><th>Đã trả</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>{l.map((i) => (
              <tr key={i.id}>
                <td><strong>{i.code}</strong></td><td>{i.studentName}</td><td>{money(i.totalAmount)}</td><td>{money(i.paidAmount)}</td>
                <td><StatusPill value={i.status} /></td>
                <td>{i.status !== 'PAID'
                  ? <button className="live-btn" onClick={() => pay(i)}><CreditCard size={14} /> Thanh toán</button>
                  : <Badge tone="green">Đã thanh toán</Badge>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Async>
    </Section>
  );
}
