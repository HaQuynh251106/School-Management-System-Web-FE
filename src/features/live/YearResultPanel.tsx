import { useMemo, useState } from 'react';
import {
  Award, BookOpenCheck, CalendarCheck2, Download, FileSpreadsheet,
  GraduationCap, ShieldCheck,
} from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { StudentYearResult, YearReviewResult } from '../../api/types';
import { Badge, Section } from '../../components/ui';
import { Async, PaginatedData, useToast } from './common';

export function YearResultPanel({ studentId }: { studentId?: string | null }) {
  const path = studentId
    ? `/year-results/students/${encodeURIComponent(studentId)}`
    : '/year-results/me';
  const results = useApi<StudentYearResult[]>(path);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const toast = useToast();
  const selected = useMemo(() => {
    if (!results.data?.length) return null;
    return results.data.find((row) => row.academicYearId === selectedYearId) || results.data[0];
  }, [results.data, selectedYearId]);

  const download = async (format: 'PDF' | 'XLSX') => {
    if (!selected) return;
    setDownloading(format);
    try {
      const file = await api.download(
        `/year-results/students/${encodeURIComponent(selected.studentId)}/${encodeURIComponent(selected.academicYearId)}/export?format=${format}`,
      );
      const href = URL.createObjectURL(file.blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = file.filename || `phieu-tong-ket.${format === 'PDF' ? 'pdf' : 'xlsx'}`;
      anchor.click();
      URL.revokeObjectURL(href);
      toast.show('ok', `Đã tải phiếu tổng kết ${format}.`);
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Section
      title="Kết quả cuối năm"
      subtitle="Chỉ hiển thị kết quả đã được nhà trường chốt và công bố"
      wide
      action={results.data?.length ? (
        <select className="live-select year-result-year-select" aria-label="Chọn năm học" value={selected?.academicYearId || ''} onChange={(event) => setSelectedYearId(event.target.value)}>
          {results.data.map((result) => <option key={result.academicYearId} value={result.academicYearId}>{result.academicYearName}</option>)}
        </select>
      ) : undefined}
    >
      {toast.node}
      <Async state={results} empty="Nhà trường chưa công bố kết quả năm học" itemLabel="năm học">
        {() => selected ? (
          <div className="year-result-shell">
            <header className="year-result-header">
              <div>
                <span className="year-result-kicker"><GraduationCap size={16} /> {selected.academicYearName}</span>
                <h3>{selected.studentName}</h3>
                <p>{selected.studentCode || 'Chưa có mã học sinh'} · Lớp {selected.classCode}</p>
              </div>
              <Badge tone={resultTone(selected.result)}>{resultLabel(selected.result)}</Badge>
            </header>

            <div className="year-result-metrics">
              <article><Award size={20} /><span><small>Trung bình năm</small><strong>{score(selected.yearlyAverage)}</strong></span></article>
              <article><CalendarCheck2 size={20} /><span><small>Chuyên cần</small><strong>{percent(selected.attendanceRate)}</strong></span></article>
              <article><ShieldCheck size={20} /><span><small>Hạnh kiểm</small><strong>{conductLabel(selected.conductGrade)}</strong></span></article>
              <article><GraduationCap size={20} /><span><small>Lớp tiếp theo</small><strong>{selected.nextClassCode || nextClassFallback(selected)}</strong></span></article>
            </div>

            <div className="year-result-semesters">
              {selected.semesters.map((semester) => (
                <article key={semester.semesterId}>
                  <span>{semester.semesterName}</span>
                  <strong>{score(semester.average)}</strong>
                  <small>{percent(semester.attendanceRate)} chuyên cần</small>
                </article>
              ))}
            </div>

            <div className="year-result-subjects">
              <div className="year-result-subject-title"><BookOpenCheck size={18} /><strong>Kết quả theo môn</strong></div>
              <div className="year-result-table-wrap"><PaginatedData items={selected.subjects} itemLabel="môn học" resetKey={selected.academicYearId}>{(pageItems) => <table className="live-table">
                <thead><tr><th>Môn học</th><th>HK1</th><th>HK2</th><th>Cả năm</th><th>Đánh giá</th></tr></thead>
                <tbody>{pageItems.map((subject) => <tr key={subject.subjectId}>
                  <td><strong>{subject.subjectName}</strong></td>
                  <td>{score(subject.semesterOneAverage)}</td>
                  <td>{score(subject.semesterTwoAverage)}</td>
                  <td><strong>{score(subject.yearlyAverage)}</strong></td>
                  <td><Badge tone={subject.belowMinimum ? 'red' : 'green'}>{subject.belowMinimum ? 'Dưới ngưỡng' : 'Đạt'}</Badge></td>
                </tr>)}</tbody>
              </table>}</PaginatedData></div>
              {!selected.subjects.length && <p className="year-result-no-subjects">Kết quả tổng quát đã công bố; chưa có snapshot chi tiết môn học.</p>}
            </div>

            {selected.reason && <div className="year-result-reason"><strong>Ghi chú xét kết quả</strong><span>{selected.reason}</span></div>}
            <footer className="year-result-actions">
              <span>Công bố lúc {formatDateTime(selected.publishedAt)}</span>
              <div>
                <button className="live-btn ghost" type="button" disabled={downloading !== null} onClick={() => download('PDF')}><Download size={15} /> PDF</button>
                <button className="live-btn ghost" type="button" disabled={downloading !== null} onClick={() => download('XLSX')}><FileSpreadsheet size={15} /> Excel</button>
              </div>
            </footer>
          </div>
        ) : null}
      </Async>
    </Section>
  );
}

function score(value?: number | null) {
  return value == null ? '—' : value.toFixed(1);
}
function percent(value?: number | null) {
  return value == null ? '—' : `${value.toFixed(1)}%`;
}
function resultLabel(result: YearReviewResult) {
  if (result === 'PROMOTED') return 'Lên lớp';
  if (result === 'RETAINED') return 'Lưu ban';
  if (result === 'ELIGIBLE_FOR_GRADUATION') return 'Đủ điều kiện tốt nghiệp';
  if (result === 'INCOMPLETE') return 'Chưa hoàn tất';
  return 'Chờ xét';
}
function resultTone(result: YearReviewResult): 'green' | 'red' | 'orange' {
  if (result === 'PROMOTED' || result === 'ELIGIBLE_FOR_GRADUATION') return 'green';
  if (result === 'RETAINED' || result === 'INCOMPLETE') return 'red';
  return 'orange';
}
function conductLabel(value?: string | null) {
  return ({ GOOD: 'Tốt', FAIR: 'Khá', PASS: 'Đạt', FAIL: 'Chưa đạt' } as Record<string, string>)[value || ''] || '—';
}
function nextClassFallback(result: StudentYearResult) {
  if (result.result === 'RETAINED') return `Học lại ${result.classCode}`;
  if (result.result === 'ELIGIBLE_FOR_GRADUATION') return 'Hoàn thành THPT';
  return 'Chờ xếp lớp';
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}
