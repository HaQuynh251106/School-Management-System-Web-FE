import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Award, BookCheck, CheckCircle2, ClipboardCheck,
  Clock3, GraduationCap, School, ShieldCheck, Sparkles, UserCheck, Users,
} from 'lucide-react';
import { api } from '../../api/client';
import { useActiveChild } from '../../api/activeChild';
import { useApi } from '../../api/useApi';
import type { AcademicYear, ApiUser, SchoolClass, StudentYearlySummary } from '../../api/types';
import { Badge, Section, StatusPill } from '../../components/ui';
import { Async, useToast } from './common';
import { useHashString } from '../../api/urlState';

const CONDUCT_OPTIONS = [
  { value: 'GOOD', label: 'Tốt' },
  { value: 'FAIR', label: 'Khá' },
  { value: 'AVERAGE', label: 'Trung bình' },
  { value: 'WEAK', label: 'Yếu' },
];

function conductLabel(value?: string | null) {
  return CONDUCT_OPTIONS.find((item) => item.value === value)?.label || 'Chưa đánh giá';
}

function yearEndLabel(status?: string | null) {
  return ({
    READY: 'Đủ điều kiện tổng kết', INCOMPLETE: 'Đang hoàn thiện', PROMOTED: 'Được lên lớp',
    PROMOTED_PENDING_CLASS: 'Lên lớp, chờ xếp lớp', RETAINED: 'Ở lại lớp',
    RETAINED_PENDING_CLASS: 'Ở lại lớp, chờ xếp lớp', GRADUATED: 'Đã tốt nghiệp',
  } as Record<string, string>)[status || ''] || status || 'Đang tổng hợp';
}

function score(value?: number | null) {
  return value == null ? '—' : value.toFixed(2);
}

function useAcademicYearSelection() {
  const years = useApi<AcademicYear[]>('/academicYears');
  const availableYears = useMemo(() => (years.data || [])
    .filter((year) => year.status !== 'PLANNED')
    .slice()
    .sort((a, b) => b.code.localeCompare(a.code)), [years.data]);
  const [yearId, setYearId] = useHashString('year', '');

  useEffect(() => {
    if (!availableYears.length) return;
    if (!availableYears.some((year) => year.id === yearId)) {
      setYearId(availableYears.find((year) => year.status === 'ACTIVE')?.id || availableYears[0].id);
    }
  }, [availableYears, yearId, setYearId]);

  return {
    years,
    availableYears,
    yearId,
    setYearId,
    selectedYear: availableYears.find((year) => year.id === yearId),
  };
}

export function TeacherConductLive() {
  const { years, availableYears, yearId, setYearId, selectedYear } = useAcademicYearSelection();
  const profile = useApi<ApiUser>('/me');
  const classes = useApi<SchoolClass[]>(yearId ? `/classes?academicYearId=${encodeURIComponent(yearId)}` : null);
  const summaries = useApi<StudentYearlySummary[]>(yearId ? `/academic-years/${yearId}/homeroom-summaries` : null);
  const toast = useToast();
  const [classId, setClassId] = useHashString('class', '');
  const [savingId, setSavingId] = useState('');
  const homeroomClasses = useMemo(() => (classes.data || [])
    .filter((item) => item.homeroomTeacherId === profile.data?.id), [classes.data, profile.data?.id]);
  const classMap = useMemo(() => new Map((classes.data || []).map((item) => [item.id, item])), [classes.data]);
  const filtered = useMemo(() => (summaries.data || [])
    .filter((item) => !classId || item.classId === classId), [summaries.data, classId]);
  const assessedCount = filtered.filter((item) => item.conductGrade).length;
  const readyCount = filtered.filter((item) => item.promotionStatus === 'READY' || item.finalizedAt).length;

  useEffect(() => setClassId(''), [yearId, setClassId]);

  const setConduct = async (studentId: string, conductGrade: string) => {
    setSavingId(studentId);
    try {
      await api.put(`/academic-years/${yearId}/students/${studentId}/conduct`, { conductGrade });
      toast.show('ok', 'Đã lưu đánh giá hạnh kiểm');
      await summaries.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setSavingId('');
    }
  };

  return <div className="year-end-portal teacher-conduct-page">
    {toast.node}
    <header className="year-end-hero teacher">
      <div><span><ClipboardCheck size={15} /> Dành cho giáo viên chủ nhiệm</span>
        <h2>Đánh giá hạnh kiểm và tổng kết lớp</h2>
        <p>Hoàn thiện hạnh kiểm từng học sinh, theo dõi điểm hai học kỳ và các điều kiện còn thiếu trước khi nhà trường xét lên lớp.</p>
      </div>
      <div className="year-end-hero-mark"><UserCheck size={34} /><strong>{assessedCount}/{filtered.length}</strong><span>đã đánh giá</span></div>
    </header>

    <Section title="Lớp chủ nhiệm" subtitle="Chỉ GVCN được thay đổi hạnh kiểm; giáo viên bộ môn không có quyền thao tác" wide>
      <div className="year-end-toolbar">
        <label><span>Năm học</span><select className="live-select" value={yearId} onChange={(event) => setYearId(event.target.value)}>
          {availableYears.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}
        </select></label>
        <label><span>Lớp</span><select className="live-select" value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">Tất cả lớp chủ nhiệm</option>
          {homeroomClasses.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
        </select></label>
        <div className="year-end-permission"><ShieldCheck size={18} /><span><strong>Phân quyền an toàn</strong><small>Dữ liệu chỉ thuộc lớp bạn chủ nhiệm</small></span></div>
      </div>
      <Async state={years} allowEmpty empty="Chưa có năm học">
        {() => <Async state={profile}>{() => homeroomClasses.length === 0 && !classes.loading
          ? <div className="year-end-empty"><School size={30} /><strong>Bạn chưa được phân công chủ nhiệm trong năm học này</strong><span>Khi admin phân công GVCN, danh sách học sinh sẽ tự động xuất hiện tại đây.</span></div>
          : <Async state={{ ...summaries, data: filtered }} empty="Lớp chưa có học sinh" allowEmpty>
            {(rows) => <>
              <div className="conduct-kpis">
                <article><Users size={19} /><span><small>Học sinh</small><strong>{rows.length}</strong></span></article>
                <article className={assessedCount === rows.length && rows.length ? 'success' : ''}><Award size={19} /><span><small>Đã có hạnh kiểm</small><strong>{assessedCount}/{rows.length}</strong></span></article>
                <article className={readyCount === rows.length && rows.length ? 'success' : ''}><CheckCircle2 size={19} /><span><small>Sẵn sàng tổng kết</small><strong>{readyCount}/{rows.length}</strong></span></article>
              </div>
              {rows.length === 0 ? <div className="year-end-empty compact"><Users size={27} /><strong>Lớp chưa có học sinh</strong></div> :
                <div className="year-end-table-wrap"><table className="live-table conduct-table"><thead><tr>
                  <th>Học sinh</th><th>Lớp</th><th>TB HKI</th><th>TB HKII</th><th>TB cả năm</th><th>Hạnh kiểm</th><th>Tiến độ</th>
                </tr></thead><tbody>{rows.map((row) => <tr key={row.id}>
                  <td><strong>{row.studentName}</strong><small className="table-subline">{row.studentId}</small></td>
                  <td><Badge tone="blue">{classMap.get(row.classId)?.code || row.classId}</Badge></td>
                  <td className="year-end-number">{score(row.semesterOneAverage)}</td>
                  <td className="year-end-number">{score(row.semesterTwoAverage)}</td>
                  <td className="year-end-number annual">{score(row.averageScore)}</td>
                  <td><select className="live-select conduct-select" aria-label={`Hạnh kiểm của ${row.studentName}`}
                    value={row.conductGrade || ''} disabled={Boolean(row.finalizedAt) || selectedYear?.status === 'CLOSED' || savingId === row.studentId}
                    onChange={(event) => setConduct(row.studentId, event.target.value)}>
                    <option value="">Chọn hạnh kiểm</option>{CONDUCT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select></td>
                  <td>{row.missingRequirements
                    ? <span className="year-end-progress warning" title={row.missingRequirements}><Clock3 size={14} /> Thiếu dữ liệu điểm</span>
                    : !row.conductGrade ? <span className="year-end-progress warning"><AlertTriangle size={14} /> Chưa đánh giá</span>
                      : <span className="year-end-progress ready"><CheckCircle2 size={14} /> {row.finalizedAt ? yearEndLabel(row.promotionStatus) : 'Đủ dữ liệu'}</span>}</td>
                </tr>)}</tbody></table></div>}
            </>}
          </Async>}</Async>}
      </Async>
    </Section>
  </div>;
}

function SummaryView({ summary, year, studentName, className }: {
  summary: StudentYearlySummary; year?: AcademicYear; studentName?: string; className?: string | null;
}) {
  const missing = (summary.missingRequirements || '').split(';').map((item) => item.trim()).filter(Boolean);
  const complete = Boolean(summary.finalizedAt);
  return <div className="student-year-summary">
    <div className={`year-summary-result ${complete ? 'final' : 'provisional'}`}>
      <div className="year-summary-emblem">{complete ? <GraduationCap size={34} /> : <Sparkles size={32} />}</div>
      <div><small>{complete ? 'KẾT QUẢ CHÍNH THỨC' : 'KẾT QUẢ ĐANG TỔNG HỢP'}</small>
        <h3>{yearEndLabel(summary.promotionStatus)}</h3>
        <p>{studentName || summary.studentName} · {className || summary.classId} · Năm học {year?.code || summary.academicYearId}</p>
      </div>
      <StatusPill value={complete ? 'Đã chốt' : 'Chưa chốt'} />
    </div>
    <div className="year-summary-scores">
      <article><span>Trung bình học kỳ I</span><strong>{score(summary.semesterOneAverage)}</strong><small>{summary.semesterOneAverage == null ? 'Chưa đủ đầu điểm' : 'Thang điểm 10'}</small></article>
      <article><span>Trung bình học kỳ II</span><strong>{score(summary.semesterTwoAverage)}</strong><small>{summary.semesterTwoAverage == null ? 'Chưa đủ đầu điểm' : 'Thang điểm 10'}</small></article>
      <article className="annual"><span>Trung bình cả năm</span><strong>{score(summary.averageScore)}</strong><small>(HKI + HKII × 2) ÷ 3</small></article>
      <article className="conduct"><span>Hạnh kiểm</span><strong>{conductLabel(summary.conductGrade)}</strong><small>Do giáo viên chủ nhiệm đánh giá</small></article>
    </div>
    <div className="year-summary-details">
      <article><header><BookCheck size={19} /><div><strong>Điều kiện tổng kết</strong><span>Điểm của cả hai học kỳ và hạnh kiểm</span></div></header>
        {missing.length ? <ul>{missing.slice(0, 8).map((item) => <li key={item}><AlertTriangle size={14} />{item}</li>)}</ul>
          : <div className="summary-complete"><CheckCircle2 size={18} /><span>{summary.conductGrade ? 'Đã đủ dữ liệu học tập và hạnh kiểm.' : 'Đã đủ điểm, đang chờ GVCN đánh giá hạnh kiểm.'}</span></div>}
      </article>
      <article><header><ShieldCheck size={19} /><div><strong>Trạng thái xác nhận</strong><span>Minh bạch từng giai đoạn tổng kết</span></div></header>
        <ol className="summary-timeline">
          <li className={summary.semesterOneAverage != null ? 'done' : ''}><i /> <span>Hoàn tất điểm học kỳ I</span></li>
          <li className={summary.semesterTwoAverage != null ? 'done' : ''}><i /> <span>Hoàn tất điểm học kỳ II</span></li>
          <li className={summary.conductGrade ? 'done' : ''}><i /> <span>GVCN đánh giá hạnh kiểm</span></li>
          <li className={complete ? 'done' : ''}><i /> <span>Nhà trường chốt kết quả năm học</span></li>
        </ol>
      </article>
    </div>
    {!complete && <div className="year-summary-note"><Clock3 size={17} /><span><strong>Kết quả hiện tại chưa phải kết quả chính thức.</strong> Hệ thống sẽ tự cập nhật khi giáo viên hoàn thiện điểm, hạnh kiểm và nhà trường chốt năm học.</span></div>}
  </div>;
}

export function StudentYearEndLive() {
  const { years, availableYears, yearId, setYearId, selectedYear } = useAcademicYearSelection();
  const profile = useApi<ApiUser>('/me');
  const classes = useApi<SchoolClass[]>(yearId ? `/classes?academicYearId=${encodeURIComponent(yearId)}` : null);
  const summary = useApi<StudentYearlySummary>(yearId ? `/academic-years/${yearId}/my-summary` : null);
  const historicalClass = classes.data?.find((item) => item.id === summary.data?.classId)?.code;
  return <div className="year-end-portal">
    <header className="year-end-hero student"><div><span><GraduationCap size={15} /> Hồ sơ năm học của tôi</span><h2>Tổng kết năm học</h2><p>Theo dõi điểm hai học kỳ, hạnh kiểm, điều kiện xét lên lớp và kết quả chính thức tại một nơi.</p></div>
      <div className="year-end-hero-mark"><Award size={34} /><strong>{summary.data?.averageScore == null ? '—' : score(summary.data.averageScore)}</strong><span>trung bình cả năm</span></div></header>
    <Section title="Kết quả cá nhân" subtitle="Dữ liệu được tự động tổng hợp từ bảng điểm và đánh giá của GVCN" wide action={<select className="live-select year-picker" value={yearId} onChange={(event) => setYearId(event.target.value)}>{availableYears.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select>}>
      <Async state={years} empty="Chưa có năm học">{() => <Async state={summary} empty="Chưa có kết quả tổng kết">{(data) => <SummaryView summary={data} year={selectedYear} studentName={profile.data?.fullName} className={historicalClass || profile.data?.className} />}</Async>}</Async>
    </Section>
  </div>;
}

export function ParentYearEndLive() {
  const { childId, setChildId } = useActiveChild();
  const children = useApi<ApiUser[]>('/me/children');
  const { years, availableYears, yearId, setYearId, selectedYear } = useAcademicYearSelection();
  const classes = useApi<SchoolClass[]>(yearId ? `/classes?academicYearId=${encodeURIComponent(yearId)}` : null);
  useEffect(() => {
    if (children.data?.length && (!childId || !children.data.some((item) => item.id === childId))) setChildId(children.data[0].id);
  }, [children.data, childId, setChildId]);
  const activeChild = children.data?.find((item) => item.id === childId);
  const summary = useApi<StudentYearlySummary>(yearId && childId ? `/academic-years/${yearId}/children/${childId}/summary` : null);
  const historicalClass = classes.data?.find((item) => item.id === summary.data?.classId)?.code;

  return <div className="year-end-portal">
    <header className="year-end-hero parent"><div><span><Users size={15} /> Đồng hành cùng con</span><h2>Tổng kết năm học của con</h2><p>Nắm rõ điểm hai học kỳ, hạnh kiểm, điều kiện còn thiếu và kết quả xét lên lớp đã được nhà trường xác nhận.</p></div>
      <div className="year-end-hero-mark"><Award size={34} /><strong>{summary.data?.averageScore == null ? '—' : score(summary.data.averageScore)}</strong><span>trung bình cả năm</span></div></header>
    <Section title="Hồ sơ tổng kết" subtitle="Chỉ hiển thị học sinh đã được liên kết với tài khoản phụ huynh" wide>
      <div className="year-end-toolbar parent">
        <label><span>Học sinh</span><select className="live-select" value={childId || ''} onChange={(event) => setChildId(event.target.value || null)}>{(children.data || []).map((child) => <option key={child.id} value={child.id}>{child.fullName} · {child.className}</option>)}</select></label>
        <label><span>Năm học</span><select className="live-select" value={yearId} onChange={(event) => setYearId(event.target.value)}>{availableYears.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select></label>
        {activeChild && <div className="year-end-child"><GraduationCap size={18} /><span><strong>{activeChild.fullName}</strong><small>{activeChild.studentCode} · {activeChild.className}</small></span></div>}
      </div>
      <Async state={children} empty="Tài khoản chưa liên kết học sinh">{() => <Async state={years} empty="Chưa có năm học">{() => <Async state={summary} empty="Chưa có kết quả tổng kết">{(data) => <SummaryView summary={data} year={selectedYear} studentName={activeChild?.fullName} className={historicalClass || activeChild?.className} />}</Async>}</Async>}</Async>
    </Section>
  </div>;
}
