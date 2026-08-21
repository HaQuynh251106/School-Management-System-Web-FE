import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useAuth } from '../../api/auth';
import { isAcademicPlanInvalidation, type DomainRealtimeEvent } from '../../api/domainRealtime';
import type { Grade, Semester, AttendanceRecord, ExamCategory, SchoolClass, PublishedEducationPlanView } from '../../api/types';
import { AttendanceExcusePanel } from './AttendanceExcusePanel';
import { Section, FunctionTabs, StatusPill, viLabel } from '../../components/ui';
import { Async, ATT_LABEL, fmtDate, PaginatedData } from './common';
import { WeeklyTimetable } from './SharedLive';
import { BarChart3, BookOpen, CalendarDays, CheckCircle2, ClipboardList, GraduationCap, IdCard, MapPin, MessageSquareText, RefreshCw, ShieldCheck, Trophy, UserRound, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatScore, gradeColumns, scoreTone, weightedAverage } from './gradebook';
import { YearResultPanel } from './YearResultPanel';
import { PublishedExamSchedule } from './ExamScheduleWorkspace';
import { HomeroomRemarksPanel } from './HomeroomRemarksPanel';

const PLAN_SUBJECT_TYPE_LABELS: Record<string, string> = {
  MANDATORY: 'Bắt buộc',
  OPTIONAL: 'Lựa chọn',
  SPECIALIZED: 'Chuyên đề',
  EDUCATIONAL_ACTIVITY: 'Hoạt động giáo dục',
};
const PLAN_ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  REGULAR: 'Thường xuyên',
  MIDTERM: 'Giữa kỳ',
  FINAL: 'Cuối kỳ',
  PRACTICAL: 'Thực hành',
  PROJECT: 'Dự án',
};

/* ===== C1 — Hồ sơ ===== */
export function StudentProfileLive() {
  const { user } = useAuth();
  const schoolClass = useApi<SchoolClass>(user?.classId ? `/classes/${encodeURIComponent(user.classId)}` : null);
  if (!user) return null;

  const classInfo = schoolClass.data;
  const completedFields = [
    user.fullName, user.studentCode, user.className, user.dateOfBirth, user.gender,
    user.email, user.phone, user.address, user.guardianName, user.guardianPhone,
  ].filter((value) => Boolean(value && String(value).trim())).length;
  const completion = Math.round(completedFields / 10 * 100);
  const initials = user.fullName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();

  return (
    <Section title="Hồ sơ cá nhân" subtitle="Thông tin định danh, học tập và liên hệ của học sinh" wide>
      <div className="student-profile-shell">
        <header className="student-profile-summary">
          <div className="student-profile-avatar">
            {user.avatarUrl ? <img src={user.avatarUrl} alt={`Ảnh đại diện của ${user.fullName}`} /> : <span>{initials || 'HS'}</span>}
          </div>
          <div className="student-profile-identity">
            <span className="student-profile-kicker">Hồ sơ học sinh</span>
            <h3>{user.fullName}</h3>
            <p>Thông tin chính thức được quản lý và xác thực bởi nhà trường.</p>
            <div className="student-profile-tags">
              <span><IdCard size={15} /> {profileValue(user.studentCode)}</span>
              <span><GraduationCap size={15} /> Lớp {profileValue(user.className)}</span>
            </div>
          </div>
          <div className="student-profile-health">
            <StatusPill value={user.status} />
            <div className="student-profile-completion">
              <div><span>Mức độ hoàn thiện</span><strong>{completion}%</strong></div>
              <div className="student-profile-progress" aria-label={`Hồ sơ đã hoàn thiện ${completion}%`}><i style={{ width: `${completion}%` }} /></div>
            </div>
          </div>
        </header>

        <div className="student-profile-grid">
          <StudentProfileGroup title="Thông tin học tập" Icon={GraduationCap} items={[
            { label: 'Mã học sinh', value: profileValue(user.studentCode) },
            { label: 'Lớp hiện tại', value: profileValue(user.className) },
            { label: 'Khối học', value: profileValue(classInfo?.gradeLevel) },
            { label: 'Giáo viên chủ nhiệm', value: profileValue(classInfo?.homeroomTeacherName) },
            { label: 'Ngày nhập học', value: profileDate(user.enrollmentDate) },
            { label: 'Trạng thái', value: viLabel(user.status) },
          ]} />

          <StudentProfileGroup title="Thông tin cá nhân" Icon={UserRound} items={[
            { label: 'Họ và tên', value: profileValue(user.fullName) },
            { label: 'Ngày sinh', value: profileDate(user.dateOfBirth) },
            { label: 'Giới tính', value: genderLabel(user.gender) },
            { label: 'Nơi sinh', value: profileValue(user.placeOfBirth) },
            { label: 'Dân tộc', value: profileValue(user.ethnicity) },
            { label: 'Quốc tịch', value: profileValue(user.nationality) },
          ]} />

          <StudentProfileGroup title="Thông tin liên hệ" Icon={MapPin} items={[
            { label: 'Email', value: profileValue(user.email) },
            { label: 'Số điện thoại', value: profileValue(user.phone) },
            { label: 'Địa chỉ thường trú', value: profileValue(user.address), wide: true },
          ]} />

          <StudentProfileGroup title="Gia đình và tài khoản" Icon={UsersRound} items={[
            { label: 'Người giám hộ', value: profileValue(user.guardianName) },
            { label: 'SĐT người giám hộ', value: profileValue(user.guardianPhone) },
            { label: 'Tên đăng nhập', value: `@${user.username}` },
            { label: 'Mã lớp hệ thống', value: profileValue(user.classId) },
          ]} />
        </div>

        <footer className="student-profile-note"><ShieldCheck size={17} /><span>Thông tin hồ sơ do nhà trường quản lý. Nếu phát hiện sai lệch, vui lòng liên hệ giáo viên chủ nhiệm hoặc bộ phận quản trị.</span></footer>
      </div>
    </Section>
  );
}

type StudentProfileItem = { label: string; value: string; wide?: boolean };

function StudentProfileGroup({ title, Icon, items }: { title: string; Icon: LucideIcon; items: StudentProfileItem[] }) {
  return (
    <section className="student-profile-card">
      <header><span><Icon size={18} /></span><h3>{title}</h3></header>
      <dl className="student-profile-list">
        {items.map((item) => <div key={item.label} className={item.wide ? 'wide' : ''}>
          <dt>{item.label}</dt>
          <dd className={item.value === 'Chưa cập nhật' ? 'empty' : ''}>{item.value}</dd>
        </div>)}
      </dl>
    </section>
  );
}

function profileValue(value?: string | null) {
  return value?.trim() || 'Chưa cập nhật';
}

function profileDate(value?: string | null) {
  return value ? fmtDate(value) : 'Chưa cập nhật';
}

function genderLabel(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  const normalized = value.toUpperCase();
  if (normalized === 'MALE') return 'Nam';
  if (normalized === 'FEMALE') return 'Nữ';
  if (normalized === 'OTHER') return 'Khác';
  return value;
}

/* ===== C2 — Theo dõi học thuật ===== */
export function StudentAcademicLive() {
  const { user } = useAuth();
  const semesters = useApi<Semester[]>('/semesters');
  const categories = useApi<ExamCategory[]>('/exam-categories');
  const [sem, setSem] = useState('');
  const effSem = sem || semesters.data?.[0]?.id || '';
  const grades = useApi<Grade[]>(effSem ? `/grades?semesterId=${effSem}` : null);

  const categoryList = useMemo<ExamCategory[]>(() => {
    if (categories.data?.length) return categories.data;
    const unique = new Map<string, ExamCategory>();
    (grades.data || []).forEach((grade) => unique.set(grade.category, {
      id: grade.category,
      code: grade.category,
      name: grade.categoryName,
      weight: 1,
    }));
    return [...unique.values()];
  }, [categories.data, grades.data]);

  const subjectRows = useMemo(() => {
    const grouped = new Map<string, { subjectId: string; subjectName: string; grades: Grade[] }>();
    (grades.data || []).forEach((grade) => {
      const row = grouped.get(grade.subjectId) || { subjectId: grade.subjectId, subjectName: grade.subjectName, grades: [] };
      row.grades.push(grade);
      grouped.set(grade.subjectId, row);
    });
    return [...grouped.values()].map((row) => ({ ...row, average: weightedAverage(row.grades, categoryList) }));
  }, [grades.data, categoryList]);
  const columns = useMemo(() => gradeColumns(categoryList), [categoryList]);

  const subjectAverages = subjectRows.map((row) => row.average).filter((score): score is number => score != null);
  const semesterAverage = subjectAverages.length
    ? Math.round((subjectAverages.reduce((total, score) => total + score, 0) / subjectAverages.length) * 10) / 10
    : null;
  const bestSubject = subjectRows.reduce<(typeof subjectRows)[number] | null>((best, row) => (
    row.average != null && (!best || best.average == null || row.average > best.average) ? row : best
  ), null);

  return (
    <FunctionTabs tabs={[
      { id: 'tkb', label: 'Thời khóa biểu', Icon: CalendarDays, content: (
        <Section title="Thời khóa biểu" subtitle="Lịch học trong tuần" wide><WeeklyTimetable path="/me/timetable" /></Section>
      ) },
      { id: 'exams', label: 'Lịch thi', Icon: CalendarDays, content: (
        <PublishedExamSchedule path="/exam-periods/me/schedule" />
      ) },
      { id: 'education-plan', label: 'Kế hoạch giáo dục', Icon: ClipboardList, content: (
        <PublishedEducationPlan />
      ) },
      { id: 'grades', label: 'Điểm', Icon: BookOpen, content: (
        <Section title="Bảng điểm học kỳ" subtitle="Tổng hợp theo từng đầu điểm và hệ số đã cấu hình" wide
          action={<select className="live-select gradebook-semester-select" aria-label="Chọn học kỳ" value={effSem} onChange={(e) => setSem(e.target.value)}>
            {(semesters.data || []).map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
          </select>}>
          <Async paginate state={{ data: subjectRows, loading: grades.loading, error: grades.error }} empty="Chưa có điểm trong học kỳ này" itemLabel="môn học">
            {(pagedSubjectRows) => (
              <div className="gradebook-shell">
                <div className="gradebook-summary student-grade-summary">
                  <article className="gradebook-stat primary"><span><BarChart3 size={19} /></span><div><small>Trung bình học kỳ</small><strong>{formatScore(semesterAverage)}</strong><p>Trung bình {subjectAverages.length} môn có điểm</p></div></article>
                  <article className="gradebook-stat"><span><Trophy size={19} /></span><div><small>Môn nổi bật</small><strong>{bestSubject?.subjectName || '—'}</strong><p>{bestSubject?.average != null ? `${formatScore(bestSubject.average)} điểm` : 'Chưa đủ dữ liệu'}</p></div></article>
                  <article className="gradebook-stat"><span><CheckCircle2 size={19} /></span><div><small>Đầu điểm đã có</small><strong>{grades.data?.length || 0}</strong><p>{subjectRows.length} môn học trong kỳ</p></div></article>
                </div>

                <div className="gradebook-legend"><span><i className="score-dot excellent" /> Tốt</span><span><i className="score-dot average" /> Đạt</span><span><i className="score-dot needs-attention" /> Cần cải thiện</span></div>

                <div className="gradebook-table-wrap">
                  <table className="gradebook-table student-gradebook-table">
                    <thead><tr>
                      <th className="gradebook-sticky-col">Môn học</th>
                      {columns.map((column) => <th key={`${column.category.code}-${column.assessmentIndex}`}><span>{column.label}</span><small>Hệ số {column.category.weight}</small></th>)}
                      <th className="gradebook-total-head">Tổng kết</th>
                    </tr></thead>
                    <tbody>{pagedSubjectRows.map((row) => (
                      <tr key={row.subjectId}>
                        <td className="gradebook-sticky-col"><strong>{row.subjectName}</strong><small>{columns.filter((column) => row.grades.some((item) => item.category === column.category.code && (item.assessmentIndex ?? 1) === column.assessmentIndex)).length}/{columns.length} đầu điểm</small></td>
                        {columns.map((column) => {
                          const grade = row.grades.find((item) => item.category === column.category.code && (item.assessmentIndex ?? 1) === column.assessmentIndex);
                          const score = grade?.score ?? null;
                          return <td key={`${column.category.code}-${column.assessmentIndex}`}><span className={`grade-score ${scoreTone(score)}`} title={grade?.recordedAt ? `Cập nhật ${fmtDate(grade.recordedAt)}` : 'Chưa có điểm'}>{formatScore(score)}</span></td>;
                        })}
                        <td className="gradebook-total-cell"><strong className={`grade-total ${scoreTone(row.average)}`}>{row.average == null ? '' : formatScore(row.average)}</strong><small>{row.average == null ? 'Chưa đủ điểm' : 'Thang 10'}</small></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="gradebook-note">Điểm tổng kết chỉ hiển thị khi đủ điểm miệng, điểm 15 phút, điểm giữa kỳ và cuối kỳ. Thiếu đầu điểm nào thì tổng kết để trống.</p>
              </div>
            )}
          </Async>
        </Section>
      ) },
      { id: 'year-result', label: 'Kết quả năm', Icon: GraduationCap, content: (
        <YearResultPanel />
      ) },
      { id: 'homeroom-remarks', label: 'Nhận xét GVCN', Icon: MessageSquareText, content: (
        user ? <HomeroomRemarksPanel studentId={user.id} /> : <div className="live-loading">Đang tải tài khoản…</div>
      ) },
    ]} />
  );
}

export function PublishedEducationPlan({ studentId }: { studentId?: string }) {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  const view = useApi<PublishedEducationPlanView>(`/academic/training-plans/published/me${query}`);
  const semesters = useApi<Semester[]>('/semesters');
  const reloadView = view.reload;

  useEffect(() => {
    const reload = () => reloadView();
    const reloadWhenVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    const subscription = api.streamSse<DomainRealtimeEvent>(
      '/realtime/events',
      (event) => {
        if (isAcademicPlanInvalidation(event)) reload();
      },
    );

    window.addEventListener('focus', reload);
    document.addEventListener('visibilitychange', reloadWhenVisible);
    return () => {
      subscription.close();
      window.removeEventListener('focus', reload);
      document.removeEventListener('visibilitychange', reloadWhenVisible);
    };
  }, [reloadView]);

  return <Section title="Kế hoạch giáo dục đã công bố" subtitle="Môn học, số tiết và kế hoạch kiểm tra dự kiến của lớp" wide
    action={<button type="button" className="live-btn subtle" onClick={reloadView}><RefreshCw size={15} /> Tải lại</button>}>
    <Async state={view} empty="Nhà trường chưa công bố kế hoạch giáo dục cho lớp này">
      {(data) => <div className="published-plan-view">
        <div className="published-plan-summary">
          <div><small>Kế hoạch</small><strong>{data.plan.name}</strong><span>Phiên bản {data.plan.versionNumber}</span></div>
          <div><small>Lớp</small><strong>{data.classCode}</strong><span>Khối {data.plan.gradeLevel}</span></div>
          <div><small>Trạng thái</small><StatusPill value={data.plan.status} /><span>Công bố {data.plan.publishedAt ? fmtDate(data.plan.publishedAt) : '—'}</span></div>
        </div>
        <div className="planning-section-heading"><div><h3>Môn học và số tiết</h3><p>Số tiết được phân bổ theo hai học kỳ</p></div></div>
        <PaginatedData items={data.subjects} itemLabel="môn trong kế hoạch" resetKey={data.plan.id}>{(pageSubjects) => <table className="live-table"><thead><tr><th>Môn học</th><th>Loại môn</th><th>Học kỳ I</th><th>Học kỳ II</th><th>Cả năm</th></tr></thead><tbody>{pageSubjects.map((item) => <tr key={item.subjectId}><td><strong>{item.subjectName}</strong></td><td>{PLAN_SUBJECT_TYPE_LABELS[item.subjectType] || item.subjectType}</td><td>{item.semester1Periods}</td><td>{item.semester2Periods}</td><td><strong>{item.annualPeriods}</strong></td></tr>)}</tbody></table>}</PaginatedData>
        <div className="planning-section-heading"><div><h3>Kế hoạch kiểm tra dự kiến</h3><p>Lịch thi chính thức được hiển thị riêng tại tab Lịch thi</p></div></div>
        {data.assessments.length === 0 ? <div className="live-empty">Chưa có kế hoạch kiểm tra</div> : <PaginatedData items={data.assessments} itemLabel="kế hoạch kiểm tra" resetKey={data.plan.id}>{(pageAssessments) => <table className="live-table"><thead><tr><th>Học kỳ</th><th>Môn</th><th>Loại</th><th>Tuần</th><th>Thời lượng</th></tr></thead><tbody>{pageAssessments.map((item) => <tr key={item.id}><td>{semesters.data?.find((semester) => semester.id === item.semesterId)?.name || item.semesterId}</td><td>{data.subjects.find((subject) => subject.subjectId === item.subjectId)?.subjectName || item.subjectId}</td><td>{PLAN_ASSESSMENT_TYPE_LABELS[item.assessmentType] || item.assessmentType}</td><td>{item.weekNumber}</td><td>{item.durationMinutes} phút</td></tr>)}</tbody></table>}</PaginatedData>}
      </div>}
    </Async>
  </Section>;
}

/* ===== C3 — Chuyên cần ===== */
export function StudentAttendanceLive() {
  const att = useApi<AttendanceRecord[]>('/attendance');
  return (
    <>
    <Section title="Chuyên cần cá nhân" subtitle="Lịch sử đi học của bạn" wide>
      <Async paginate state={att} empty="Chưa có dữ liệu điểm danh" itemLabel="lượt điểm danh">
        {(l) => (
          <table className="live-table">
            <thead><tr><th>Ngày</th><th>Tiết</th><th>Môn</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
            <tbody>{l.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((r) => (
              <tr key={r.id}><td>{fmtDate(r.date)}</td><td>{r.periodNo ?? '—'}</td><td>{r.subjectName}</td>
                <td><StatusPill value={ATT_LABEL[r.status] || r.status} /></td><td><small>{r.note || '—'}</small></td></tr>
            ))}</tbody>
          </table>
        )}
      </Async>
    </Section>
    <AttendanceExcusePanel mode="request" records={att.data || []} />
    </>
  );
}
