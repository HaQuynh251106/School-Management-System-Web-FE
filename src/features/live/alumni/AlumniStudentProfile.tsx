import { useEffect, useState, type KeyboardEvent } from 'react';
import { AlertTriangle, ArrowLeft, ChevronRight, History, ShieldCheck, TrendingUp } from 'lucide-react';
import { useApi } from '../../../api/useApi';
import { updateHashQuery } from '../../../api/urlState';
import type { StudentArchiveProfile } from '../../../api/types';
import { Badge } from '../../../components/ui';
import { fmtDate } from '../common';
import { ArchiveEmpty, ArchiveError, ArchiveSkeleton, archiveLabel, archiveScore, archiveTone } from './archiveUi';

export function AlumniStudentProfile({ cohortId, studentId }: { cohortId: string; studentId: string }) {
  const profile = useApi<StudentArchiveProfile>(`/alumni/cohorts/${encodeURIComponent(cohortId)}/students/${encodeURIComponent(studentId)}`);
  const [yearId, setYearId] = useState('');

  useEffect(() => {
    if (!profile.data?.academicYears.length || profile.data.academicYears.some((item) => item.academicYearId === yearId)) return;
    setYearId(profile.data.academicYears[profile.data.academicYears.length - 1]?.academicYearId || '');
  }, [profile.data, yearId]);

  if (profile.loading) return <div className="archive-v2"><ArchiveSkeleton rows={8} /></div>;
  if (profile.error || !profile.data) return <div className="archive-v2"><ArchiveError message={profile.error || 'Không tìm thấy hồ sơ'} retry={profile.reload} /></div>;

  const data = profile.data;
  const selectedYear = data.academicYears.find((item) => item.academicYearId === yearId) || data.academicYears[0];
  const moveYearTab = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const { key } = event;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const last = data.academicYears.length - 1;
    const next = key === 'Home' ? 0 : key === 'End' ? last
      : key === 'ArrowRight' ? (index + 1) % data.academicYears.length
        : (index - 1 + data.academicYears.length) % data.academicYears.length;
    setYearId(data.academicYears[next].academicYearId);
    window.requestAnimationFrame(() => document.getElementById(`archive-year-${next}`)?.focus());
  };
  return <div className="archive-v2 archive-v2-profile">
    <nav className="archive-v2-breadcrumb" aria-label="Điều hướng hồ sơ">
      <button type="button" onClick={() => updateHashQuery({ hoc_sinh: null }, 'push')}><ArrowLeft size={16} /> Danh sách học sinh</button>
      <ChevronRight size={15} /><span>{data.cohortCode}</span><ChevronRight size={15} /><strong>{data.fullName}</strong>
    </nav>

    <section className="archive-v2-profile-hero">
      <div className="archive-v2-avatar">{initial(data.fullName)}</div>
      <div className="archive-v2-profile-main"><span className="eyebrow"><ShieldCheck size={14} /> Hồ sơ học tập toàn cấp</span><h2>{data.fullName}</h2><p>{data.studentCode || 'Chưa có mã'} · Niên khóa {data.cohortCode} · Lớp cuối cấp {data.finalClassCode || '—'}</p><div><Badge tone={archiveTone(data.graduationResult)}>{archiveLabel(data.graduationResult)}</Badge><Badge tone={archiveTone(data.recordStatus)}>{archiveLabel(data.recordStatus)}</Badge></div></div>
      <div className="archive-v2-program-score"><small>Điểm trung bình toàn cấp</small><strong>{archiveScore(data.wholeProgramAverage)}</strong><span>{data.academicYears.filter((item) => item.annualAverage != null).length}/3 năm có tổng kết</span></div>
    </section>

    <section className="archive-v2-profile-grid">
      <article><span>Ngày sinh</span><strong>{fmtDate(data.dateOfBirth)}</strong></article>
      <article><span>Giới tính</span><strong>{archiveLabel(data.gender)}</strong></article>
      <article><span>Email</span><strong>{data.email || '—'}</strong></article>
      <article><span>Điện thoại</span><strong>{data.phone || '—'}</strong></article>
      <article><span>Nơi sinh</span><strong>{data.placeOfBirth || '—'}</strong></article>
      <article><span>Địa chỉ</span><strong>{data.address || '—'}</strong></article>
    </section>

    <section className="archive-v2-progress-card" aria-label="Tiến trình học tập ba năm">
      <header><div><TrendingUp size={19} /><span><strong>Tiến trình học tập toàn cấp</strong><small>Điểm tổng kết từng năm từ lớp 10 đến lớp 12</small></span></div><b>{archiveScore(data.wholeProgramAverage)}<small>TB toàn cấp</small></b></header>
      <div>{data.academicYears.map((item) => <article key={item.academicYearId}><span><strong>{item.gradeLevel?.replace('K', 'Lớp ')}</strong><small>{item.academicYearCode}</small></span><i><em style={{ width: `${Math.max(0, Math.min(100, (item.annualAverage || 0) * 10))}%` }} /></i><b>{archiveScore(item.annualAverage)}</b></article>)}</div>
    </section>

    <section className="archive-v2-panel">
      <header className="archive-v2-section-head"><div><TrendingUp size={20} /><span><h3>Kết quả học tập lớp 10–12</h3><p>Chọn một năm để xem điểm tổng kết từng môn.</p></span></div></header>
      <div className="archive-v2-year-tabs" role="tablist" aria-label="Kết quả theo năm học">
        {data.academicYears.map((item, index) => <button id={`archive-year-${index}`} key={item.academicYearId} type="button" role="tab" tabIndex={item.academicYearId === selectedYear?.academicYearId ? 0 : -1} aria-selected={item.academicYearId === selectedYear?.academicYearId} className={item.academicYearId === selectedYear?.academicYearId ? 'active' : ''} onClick={() => setYearId(item.academicYearId)} onKeyDown={(event) => moveYearTab(event, index)}><span>{item.gradeLevel?.replace('K', 'Lớp ') || item.academicYearCode}</span><strong>{archiveScore(item.annualAverage)}</strong><small>{item.classCode || 'Chưa xếp lớp'} · {archiveLabel(item.finalYearResult)}</small>{item.annualAverage == null && <em>Thiếu dữ liệu</em>}</button>)}
      </div>
      {selectedYear && <YearResult year={selectedYear} />}
    </section>

    <section className="archive-v2-panel">
      <header className="archive-v2-section-head"><div><History size={20} /><span><h3>Lịch sử lớp học</h3><p>Lưu nguyên trạng khi học sinh chuyển lớp hoặc lưu ban.</p></span></div></header>
      {data.enrollments.length ? <div className="archive-v2-timeline">{data.enrollments.map((item, index) => <article key={`${item.academicYearId}-${item.classId}-${item.enrolledAt}`}><i>{index + 1}</i><div><strong>{item.academicYearCode} · Lớp {item.classCode}</strong><span>{archiveLabel(item.status)} · {fmtDate(item.enrolledAt)}{item.endedAt ? ` → ${fmtDate(item.endedAt)}` : ''}</span></div></article>)}</div> : <ArchiveEmpty title="Chưa có lịch sử ghi danh" detail="Hệ thống chưa ghi nhận lớp học trong niên khóa này." />}
    </section>
  </div>;
}

function YearResult({ year }: { year: StudentArchiveProfile['academicYears'][number] }) {
  return <div className="archive-v2-year-detail">
    <div className="archive-v2-year-summary">
      <div><small>Năm học</small><strong>{year.academicYearCode}</strong></div><div><small>Lớp</small><strong>{year.classCode || '—'}</strong></div>
      <div><small>Học kỳ 1</small><strong>{archiveScore(year.semesterOneAverage)}</strong></div><div><small>Học kỳ 2</small><strong>{archiveScore(year.semesterTwoAverage)}</strong></div>
      <div><small>Cả năm</small><strong>{archiveScore(year.annualAverage)}</strong></div><div><small>Học lực</small><strong>{archiveLabel(year.academicPerformance)}</strong></div>
      <div><small>Rèn luyện</small><strong>{archiveLabel(year.conductGrade)}</strong></div><div><small>Kết quả</small><strong>{archiveLabel(year.finalYearResult)}</strong></div>
      <div><small>Học bạ</small><strong>{archiveLabel(year.reportCardStatus)}</strong></div>
    </div>
    {year.missingRequirements && <div className="archive-v2-warning"><AlertTriangle size={17} /><span><strong>Dữ liệu chưa hoàn chỉnh</strong><small>{year.missingRequirements}</small></span></div>}
    {year.subjects.length ? <div className="archive-v2-table-wrap"><table className="archive-v2-table archive-v2-grade-table"><thead><tr><th>Môn học</th><th>Học kỳ 1</th><th>Học kỳ 2</th><th>Cả năm</th><th>Trạng thái</th></tr></thead><tbody>{year.subjects.map((subject) => <tr key={subject.subjectId}><td><strong>{subject.subjectName}</strong></td><td>{archiveScore(subject.semesterOneAverage)}</td><td>{archiveScore(subject.semesterTwoAverage)}</td><td><strong>{archiveScore(subject.annualAverage)}</strong></td><td><Badge tone={subject.complete ? 'green' : 'orange'}>{subject.complete ? 'Đủ đầu điểm' : 'Chưa đủ điểm'}</Badge></td></tr>)}</tbody></table></div> : <ArchiveEmpty title="Chưa có bảng điểm môn học" detail="Năm này chưa có phân công môn hoặc dữ liệu điểm tổng kết." />}
    <div className="archive-v2-attendance"><strong>Chuyên cần {year.academicYearCode}</strong><span>Có mặt <b>{year.attendance.present}</b></span><span>Vắng có phép <b>{year.attendance.excusedAbsence}</b></span><span>Vắng không phép <b>{year.attendance.unexcusedAbsence}</b></span><span>Đi muộn <b>{year.attendance.late}</b></span></div>
    {(year.verificationCode || year.reportCardPublishedAt) && <div className="archive-v2-document"><ShieldCheck size={17} /><span><strong>Học bạ điện tử {archiveLabel(year.reportCardStatus)}</strong><small>{year.verificationCode ? `Mã xác thực ${year.verificationCode}` : 'Chưa có mã xác thực'}{year.reportCardPublishedAt ? ` · Phát hành ${fmtDate(year.reportCardPublishedAt)}` : ''}</small></span></div>}
  </div>;
}

function initial(name: string) {
  return name.trim().split(/\s+/).slice(-1)[0]?.[0] || 'H';
}
