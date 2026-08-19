import { AlertTriangle, BookOpenCheck, CheckCircle2, Info, Scale, UsersRound } from 'lucide-react';
import type {
  ScheduleGenerationReadiness,
  SubjectStaffingRow,
  TeacherStaffingAnalysis,
} from '../../api/types';
import { ErrorBlock, LoadingBlock } from './common';

type Props = {
  analysis: TeacherStaffingAnalysis | null;
  loading: boolean;
  error: string | null;
  readiness: ScheduleGenerationReadiness | null;
};

function staffingStatus(item: SubjectStaffingRow) {
  if (!item.countedAsSubjectTeacher) return { label: 'GVCN phụ trách', className: 'activity' };
  if (item.shortage > 0) return { label: `Thiếu ${item.shortage} GV chuyên môn`, className: 'shortage' };
  if (item.assignedTeacherCount < item.minimumTeachersForSemester) {
    return { label: 'Chưa phân công đủ', className: 'unassigned' };
  }
  return { label: 'Đủ điều kiện', className: 'enough' };
}

function calculationTitle(item: SubjectStaffingRow, norm: number, weeks: number) {
  if (!item.countedAsSubjectTeacher) {
    return 'Hoạt động giáo dục do giáo viên chủ nhiệm phụ trách, không cộng vào nhu cầu giáo viên bộ môn.';
  }
  const weeklyRatio = item.selectedWeeklyPeriods / norm;
  const annualCapacity = norm * weeks;
  const annualRatio = item.annualPeriods / annualCapacity;
  return [
    `Theo học kỳ: ${item.selectedWeeklyPeriods} tiết/tuần ÷ ${norm} = ${weeklyRatio.toFixed(2)} → ${item.minimumTeachersForSemester} GV.`,
    `Theo năm: ${item.annualPeriods.toLocaleString('vi-VN')} tiết ÷ (${norm} × ${weeks}) = ${annualRatio.toFixed(2)} → ${item.minimumTeachersForYear} GV.`,
    'Hệ thống lấy nhu cầu lớn hơn để kiểm tra nguồn lực.',
  ].join(' ');
}

export function TeacherStaffingPanel({ analysis, loading, error, readiness }: Props) {
  if (loading) return <div className="staffing-analysis-panel staffing-analysis-v2"><LoadingBlock /></div>;
  if (error) return <div className="staffing-analysis-panel staffing-analysis-v2"><ErrorBlock msg={error} /></div>;
  if (!analysis) return null;

  const policy = analysis.policy;
  const hasCeilingWarning = !analysis.withinLegalCeiling;
  const countedSubjects = analysis.subjects.filter((item) => item.countedAsSubjectTeacher);
  const blockingClassIssues = (readiness?.issues || []).filter((item) =>
    item.level === 'ERROR' && Boolean(item.classId));

  return (
    <section className="staffing-analysis-panel staffing-analysis-v2" aria-labelledby="staffing-title">
      <header className="staffing-heading">
        <div className="staffing-heading-copy">
          <span className="staffing-heading-icon"><UsersRound size={20} /></span>
          <span>
            <strong id="staffing-title">Nhu cầu giáo viên để xếp lịch</strong>
            <small>Tính từ kế hoạch GĐ3, tổ hợp môn và tải dạy của năm học đang mở</small>
          </span>
        </div>
        <div className="staffing-standard" title="Căn cứ TT 20/2023/TT-BGDĐT và TT 05/2025/TT-BGDĐT">
          <span><BookOpenCheck size={15} /> THPT công lập</span>
          <strong>17 tiết/tuần · 35 tuần/năm</strong>
          <small>Khoảng phù hợp: 2,25–2,40 GV/lớp</small>
        </div>
      </header>

      <div className="staffing-metrics staffing-metrics-v2">
        <article>
          <span className="staffing-metric-icon blue"><UsersRound size={17} /></span>
          <small>Nhu cầu GV tối thiểu theo tải năm</small>
          <strong>{analysis.minimumSubjectTeachersForYear} <em>GV</em></strong>
          <span>Lý thuyết, chưa trừ tiết giảm kiêm nhiệm</span>
        </article>
        <article>
          <span className="staffing-metric-icon cyan"><BookOpenCheck size={17} /></span>
          <small>Nhu cầu GV tối thiểu học kỳ</small>
          <strong>{analysis.minimumSubjectTeachersForSemester} <em>GV</em></strong>
          <span>{analysis.totalSelectedWeeklyPeriods.toLocaleString('vi-VN')} tiết kế hoạch/tuần</span>
        </article>
        <article>
          <span className="staffing-metric-icon green"><CheckCircle2 size={17} /></span>
          <small>GV thuộc diện tính định biên</small>
          <strong>{analysis.currentActiveTeacherCount} <em>GV</em></strong>
          <span>Tài khoản giáo viên đang hoạt động</span>
        </article>
        <article>
          <span className="staffing-metric-icon amber"><Scale size={17} /></span>
          <small>Biên chế phù hợp theo số lớp</small>
          <strong>{analysis.minimumWholeTeachers}–{analysis.maximumWholeTeachers} <em>GV</em></strong>
          <span>{analysis.schoolClassCount} lớp × 2,25–2,40 GV/lớp</span>
        </article>
      </div>

      {analysis.errors.length > 0 && (
        <div className="staffing-status invalid">
          <AlertTriangle size={18} />
          <div><strong>Chưa đủ nguồn lực để tạo thời khóa biểu</strong>{analysis.errors.map((message) => <small key={message}>{message}</small>)}</div>
        </div>
      )}

      {analysis.errors.length === 0 && hasCeilingWarning && (
        <div className="staffing-status warning">
          <Info size={18} />
          <div>
            <strong>Nhân sự giáo viên đang cao hơn mức khuyến nghị</strong>
            <small>{analysis.schoolClassCount} lớp cần từ {analysis.minimumWholeTeachers} đến {analysis.maximumWholeTeachers} GV. Hiện có {analysis.currentActiveTeacherCount} GV đang hoạt động.</small>
            <small>Cảnh báo này không chặn xếp lịch vì nhà trường vẫn đủ giáo viên đúng chuyên môn.</small>
          </div>
        </div>
      )}

      {analysis.errors.length === 0 && !hasCeilingWarning && (
        <div className="staffing-status valid">
          <CheckCircle2 size={18} />
          <div><strong>Đủ giáo viên đúng chuyên môn</strong><small>Có thể tiếp tục kiểm tra phân công và tạo lịch.</small></div>
        </div>
      )}

      {readiness && (
        <div className={`staffing-readiness ${readiness.ready ? 'ready' : 'blocked'}`}>
          {readiness.ready ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
          <div>
            <strong>{readiness.ready ? 'Đủ điều kiện kỹ thuật để xếp lịch' : 'Chưa đủ điều kiện kỹ thuật để xếp lịch'}</strong>
            <span>{readiness.classCount} lớp · {readiness.requiredPeriods.toLocaleString('vi-VN')} vị trí tiết TKB cần xếp/tuần</span>
            <small>Nguồn: {readiness.sourcePlanSummary || 'kế hoạch GĐ3'} · Số tiết TKB và số tiết dùng tính tải GV được hiển thị riêng để đối chiếu.</small>
          </div>
        </div>
      )}

      {blockingClassIssues.length > 0 && (
        <details className="staffing-readiness-issues" open>
          <summary>
            <AlertTriangle size={16} />
            <span>{blockingClassIssues.length} lỗi theo lớp cần xử lý</span>
            <small>Hiển thị rõ lớp và môn còn thiếu trước khi tạo lịch</small>
          </summary>
          <div>
            {blockingClassIssues.map((item, index) => (
              <span key={`${item.code}-${item.classId}-${item.subjectId || index}`}>
                {item.message}
              </span>
            ))}
          </div>
        </details>
      )}

      <details className="staffing-subject-details" open>
        <summary><span>Xem nhu cầu theo từng môn</span><small>{countedSubjects.length} môn bộ môn · bấm vào số nhu cầu để xem công thức</small></summary>
        <div className="live-table-scroll">
          <table className="live-table staffing-table">
            <thead><tr><th>Môn học</th><th>Số lớp</th><th>Tổng tiết/năm</th><th>Tiết học kỳ</th><th>Nhu cầu GV</th><th>GV đủ chuyên môn</th><th>GV đã phân công</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {analysis.subjects.map((item) => {
                const status = staffingStatus(item);
                const calculation = calculationTitle(item, policy.weeklyTeachingNorm, policy.teachingWeeks);
                return (
                  <tr key={item.subjectId} className={item.shortage > 0 ? 'staffing-shortage-row' : ''}>
                    <td><strong>{item.subjectName}</strong><small>{item.subjectCode} · {item.countedAsSubjectTeacher ? 'Môn học' : 'Hoạt động giáo dục'}</small></td>
                    <td>{item.applicableClassCount}</td>
                    <td>{item.annualPeriods.toLocaleString('vi-VN')}</td>
                    <td>{item.selectedSemesterPeriods.toLocaleString('vi-VN')}<small>{item.selectedWeeklyPeriods} tiết/tuần</small></td>
                    <td>{item.countedAsSubjectTeacher
                      ? <button className="staffing-formula" title={calculation}><strong>{item.minimumTeachersForYear} GV</strong><small>Học kỳ: {item.minimumTeachersForSemester} GV · xem cách tính</small></button>
                      : <><strong>—</strong><small>Không tính GV bộ môn</small></>}</td>
                    <td>{item.countedAsSubjectTeacher ? item.qualifiedTeacherCount : '—'}</td>
                    <td>{item.countedAsSubjectTeacher ? item.assignedTeacherCount : 'Theo GVCN'}</td>
                    <td><span className={`staffing-result ${status.className}`}>{status.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <p className="staffing-legal-note"><Info size={14} /> Nhu cầu tối thiểu là kết quả tính tải phục vụ xếp lịch, không phải mức biên chế tối thiểu theo pháp luật. Định mức cơ sở chưa tính trường hợp bổ sung do số học sinh dư; Ban giám hiệu và nhân viên hỗ trợ được quản lý riêng.</p>
    </section>
  );
}
