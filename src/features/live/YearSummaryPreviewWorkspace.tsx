import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpenCheck, CalendarRange, CheckCircle2, RefreshCw, School, UsersRound } from 'lucide-react';
import { useApi } from '../../api/useApi';
import type { AcademicYear, SchoolClass, Semester, YearSummaryPreview } from '../../api/types';
import { Badge, Section } from '../../components/ui';
import { Async, fmtDateTime, PaginatedData } from './common';

export function YearSummaryPreviewWorkspace({ teacherId }: { teacherId?: string }) {
  const years = useApi<AcademicYear[]>('/academicYears');
  const [academicYearId, setAcademicYearId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [classId, setClassId] = useState('');
  const semesters = useApi<Semester[]>(academicYearId
    ? `/semesters?academicYearId=${encodeURIComponent(academicYearId)}` : null);
  const classes = useApi<SchoolClass[]>(academicYearId
    ? `/classes?academicYearId=${encodeURIComponent(academicYearId)}` : null);

  useEffect(() => {
    if (academicYearId || !years.data?.length) return;
    setAcademicYearId((years.data.find((year) => year.status === 'ACTIVE') || years.data[0]).id);
  }, [academicYearId, years.data]);

  useEffect(() => {
    setSemesterId('');
    setClassId('');
  }, [academicYearId]);

  useEffect(() => {
    if (semesterId || !semesters.data?.length) return;
    const preferred = semesters.data.find((semester) => semester.status === 'ACTIVE')
      || [...semesters.data].sort((left, right) => left.sequence - right.sequence)[0];
    setSemesterId(preferred.id);
  }, [semesterId, semesters.data]);

  const availableClasses = useMemo(() => {
    const rows = classes.data || [];
    return teacherId ? rows.filter((schoolClass) => schoolClass.homeroomTeacherId === teacherId) : rows;
  }, [classes.data, teacherId]);

  useEffect(() => {
    if (classId && !availableClasses.some((schoolClass) => schoolClass.id === classId)) setClassId('');
  }, [availableClasses, classId]);

  const query = academicYearId && semesterId && classId
    ? `/reports/year-summary-preview?academicYearId=${encodeURIComponent(academicYearId)}&semesterId=${encodeURIComponent(semesterId)}&classId=${encodeURIComponent(classId)}`
    : null;
  const preview = useApi<YearSummaryPreview>(query);
  const selectionReady = Boolean(query);

  return (
    <Section
      title="Xem trước tổng kết học kỳ"
      subtitle="Tổng hợp điểm và chuyên cần hiện tại, chưa khóa điểm hoặc chuyển lớp"
      wide
      action={selectionReady ? (
        <button className="live-btn ghost" type="button" onClick={preview.reload} disabled={preview.loading}>
          <RefreshCw size={15} /> Tải lại
        </button>
      ) : undefined}
    >
      <div className="year-summary-filters">
        <label><span>Năm học</span><select className="live-select" value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)}>
          <option value="">Chọn năm học</option>
          {(years.data || []).map((year) => <option key={year.id} value={year.id}>{year.name || year.code}</option>)}
        </select></label>
        <label><span>Học kỳ</span><select className="live-select" value={semesterId} onChange={(event) => setSemesterId(event.target.value)} disabled={!academicYearId}>
          <option value="">Chọn học kỳ</option>
          {[...(semesters.data || [])].sort((left, right) => left.sequence - right.sequence)
            .map((semester) => <option key={semester.id} value={semester.id}>{semester.name || semester.code}</option>)}
        </select></label>
        <label><span>Lớp</span><select className="live-select" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={!academicYearId}>
          <option value="">Chọn lớp</option>
          {availableClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code}</option>)}
        </select></label>
      </div>

      {teacherId && classes.data && availableClasses.length === 0 && (
        <div className="year-summary-notice"><AlertTriangle size={17} /> Tài khoản chưa được phân công làm giáo viên chủ nhiệm trong năm học này.</div>
      )}
      {!selectionReady ? (
        <div className="year-summary-empty">
          <CalendarRange size={30} />
          <strong>Chọn đủ năm học, học kỳ và lớp</strong>
          <span>Hệ thống sẽ tính lại trực tiếp từ sổ điểm và sổ chuyên cần.</span>
        </div>
      ) : (
        <Async state={preview} empty="Không có dữ liệu tổng kết cho phạm vi đã chọn">
          {(data) => <YearSummaryResult data={data} />}
        </Async>
      )}
    </Section>
  );
}

function YearSummaryResult({ data }: { data: YearSummaryPreview }) {
  return (
    <div className="year-summary-results">
      <div className="year-summary-context">
        <div><School size={19} /><span><strong>{data.className}</strong><small>{data.academicYearName} · {data.semesterName}</small></span></div>
        <Badge tone={periodTone(data.periodState)}>{periodLabel(data.periodState)}</Badge>
        <small>Cập nhật {fmtDateTime(data.generatedAt)}</small>
      </div>
      <div className={`year-summary-period-note ${data.periodState.toLowerCase()}`}>
        <CalendarRange size={17} /><span><strong>{periodLabel(data.periodState)}</strong><small>{data.periodMessage}</small></span>
      </div>

      <div className="year-summary-metrics">
        <SummaryMetric icon={UsersRound} label="Học sinh" value={String(data.metrics.totalStudents)} note="Trong lớp hiện tại" />
        <SummaryMetric icon={CheckCircle2} label="Đủ dữ liệu" value={String(data.metrics.readyStudents)} note={data.periodState === 'UPCOMING' ? 'Chưa đến kỳ yêu cầu hoàn tất' : 'Đủ điểm và chuyên cần'} tone="green" />
        <SummaryMetric icon={BookOpenCheck} label="Điểm trung bình lớp" value={score(data.metrics.classAverage)} note={`${data.subjects.length} môn được phân công`} />
        <SummaryMetric icon={CalendarRange} label="Chuyên cần" value={percent(data.metrics.attendanceRate)} note={`${data.metrics.noAttendanceStudents} học sinh chưa có dữ liệu`} tone={data.metrics.noAttendanceStudents ? 'red' : 'green'} />
      </div>

      {data.warnings.length > 0 && (
        <div className={`year-summary-warning-band ${data.periodState === 'UPCOMING' ? 'informational' : ''}`}>
          <AlertTriangle size={18} />
          <div><strong>{data.periodState === 'UPCOMING' ? 'Thông tin chuẩn bị học kỳ' : data.periodState === 'IN_PROGRESS' ? 'Tiến độ đang cập nhật' : 'Dữ liệu cần bổ sung trước khi chốt'}</strong><span>{data.warnings.join(' · ')}</span></div>
        </div>
      )}

      <div className="year-summary-subjects">
        <span>Tiến độ nhập điểm theo môn</span>
        <div className="year-summary-subject-progress">{data.subjects.map((subject) => (
          <article key={subject.subjectId}>
            <div><strong>{subject.subjectName}</strong><span>{subject.enteredGradeCount}/{subject.expectedGradeCount} đầu điểm</span></div>
            <div className="year-summary-progress-track"><i style={{ width: `${Math.min(100, subject.completionRate)}%` }} /></div>
            <small>{subject.completionRate.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% · {subject.requiredGradeCount} loại điểm/học sinh</small>
          </article>
        ))}</div>
      </div>

      <PaginatedData items={data.students} pageSize={10} itemLabel="học sinh" resetKey={`${data.semesterId}|${data.classId}`}>
        {(students) => (
          <div className="year-summary-table-wrap">
            <table className="live-table year-summary-table">
              <thead><tr>
                <th>Học sinh</th>
                {data.subjects.map((subject) => <th key={subject.subjectId}>{subject.subjectName}</th>)}
                <th>TB học kỳ</th><th>Chuyên cần</th><th>Kiểm tra dữ liệu</th>
              </tr></thead>
              <tbody>{students.map((student) => {
                const studentSubjects = new Map(student.subjects.map((subject) => [subject.subjectId, subject]));
                return (
                  <tr key={student.studentId}>
                    <td><strong>{student.studentName}</strong><small>{student.studentCode || 'Chưa có mã học sinh'}</small></td>
                    {data.subjects.map((subject) => {
                      const result = studentSubjects.get(subject.subjectId);
                      return <td key={subject.subjectId}>
                        <strong>{score(result?.average)}</strong>
                        <small className={result?.missingCategories.length ? 'year-summary-missing' : ''}>
                          {result?.missingCategories.length
                            ? `Thiếu: ${result.missingCategories.join(', ')}`
                            : `${result?.enteredGradeCount || 0}/${subject.requiredGradeCount} đầu điểm`}
                        </small>
                      </td>;
                    })}
                    <td><strong className="year-summary-score">{score(student.overallAverage)}</strong></td>
                    <td><strong>{percent(student.attendance.attendanceRate)}</strong><small>{attendanceDetail(student.attendance)}</small></td>
                    <td>{student.ready
                      ? <Badge tone="green">Đủ dữ liệu</Badge>
                      : <div className="year-summary-row-warnings"><Badge tone={data.periodState === 'UPCOMING' ? 'orange' : 'red'}>{data.periodState === 'UPCOMING' ? 'Đang chuẩn bị' : 'Cần bổ sung'}</Badge><small>{student.warnings.join(' · ')}</small></div>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </PaginatedData>
    </div>
  );
}

function SummaryMetric({ icon: Icon, label, value, note, tone = 'blue' }: {
  icon: typeof UsersRound; label: string; value: string; note: string; tone?: 'blue' | 'green' | 'red';
}) {
  return <article className={`year-summary-metric ${tone}`}><span><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

function score(value?: number | null) {
  return value == null ? '—' : value.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function percent(value?: number | null) {
  return value == null ? '—' : `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}
function attendanceDetail(attendance: YearSummaryPreview['students'][number]['attendance']) {
  if (!attendance.total) return 'Chưa có lượt điểm danh';
  return `${attendance.present} có mặt · ${attendance.late} muộn · ${attendance.absentExcused + attendance.absentUnexcused} vắng`;
}

function periodLabel(state: YearSummaryPreview['periodState']) {
  if (state === 'UPCOMING') return 'Chưa bắt đầu';
  if (state === 'CLOSED') return 'Đã kết thúc';
  return 'Đang diễn ra';
}

function periodTone(state: YearSummaryPreview['periodState']): 'blue' | 'green' | 'orange' {
  if (state === 'UPCOMING') return 'blue';
  if (state === 'CLOSED') return 'orange';
  return 'green';
}
