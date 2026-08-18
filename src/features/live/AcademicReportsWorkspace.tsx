import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { AcademicReportResponse, AcademicYear, SchoolClass, Semester, Subject } from '../../api/types';
import { Section } from '../../components/ui';
import { Async, PaginatedData, useToast } from './common';
import { useShortcutFilter } from '../../api/shortcutFilter';

export function AcademicReportsWorkspace() {
  const shortcut = useShortcutFilter('A8');
  const toast = useToast();
  const years = useApi<AcademicYear[]>('/academicYears');
  const semesters = useApi<Semester[]>('/semesters');
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const [filter, setFilter] = useState({ academicYearId: '', semesterId: '', gradeLevel: '', classId: '', subjectId: '' });
  const query = useMemo(() => new URLSearchParams(Object.entries(filter).filter(([, value]) => value)).toString(), [filter]);
  const report = useApi<AcademicReportResponse>(`/reports/academic?${query}`);
  const visibleClasses = (classes.data || []).filter((item) => (!filter.academicYearId || item.academicYearId === filter.academicYearId) && (!filter.gradeLevel || item.gradeLevel === filter.gradeLevel));
  const visibleSemesters = (semesters.data || []).filter((item) => !filter.academicYearId || item.academicYearId === filter.academicYearId);
  const yearById = useMemo(() => new Map((years.data || []).map((item) => [item.id, item.code])), [years.data]);
  const scopedLabel = (name: string, academicYearId?: string) => filter.academicYearId || !academicYearId
    ? name
    : `${name} · ${yearById.get(academicYearId) || academicYearId}`;

  const applyShortcutFilter = (students: AcademicReportResponse['students']) => {
    if (shortcut.get('grades') === 'missing') return students.filter((item) => item.averageScore == null);
    if (shortcut.get('assignments') === 'ungraded') {
      return students.filter((item) => item.submittedAssignments > item.gradedAssignments);
    }
    return students;
  };

  const exportFile = async (format: 'XLSX' | 'PDF') => {
    try {
      const result = await api.download(`/reports/academic/export?format=${format}&${query}`);
      const url = URL.createObjectURL(result.blob); const link = document.createElement('a');
      link.href = url; link.download = result.filename || `bao-cao-hoc-vu.${format === 'PDF' ? 'pdf' : 'xlsx'}`; link.click(); URL.revokeObjectURL(url);
      toast.show('ok', `Đã xuất báo cáo ${format}`);
    } catch (error: any) { toast.show('err', error.message); }
  };

  return <Section title="Báo cáo học vụ" subtitle="Điểm, chuyên cần và tiến độ bài tập từ cùng một nguồn dữ liệu" wide action={<div className="report-export-actions"><button className="live-btn subtle" onClick={() => exportFile('XLSX')}><FileSpreadsheet size={15} /> Excel</button><button className="live-btn subtle" onClick={() => exportFile('PDF')}><FileText size={15} /> PDF</button></div>}>
    {toast.node}
    <div className="academic-report-filters">
      <select className="live-select" value={filter.academicYearId} onChange={(event) => setFilter({ ...filter, academicYearId: event.target.value, semesterId: '', classId: '' })}><option value="">Tất cả năm học</option>{(years.data || []).map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select>
      <select className="live-select" value={filter.semesterId} onChange={(event) => setFilter({ ...filter, semesterId: event.target.value })}><option value="">Tất cả học kỳ</option>{visibleSemesters.map((item) => <option key={item.id} value={item.id}>{scopedLabel(item.name, item.academicYearId)}</option>)}</select>
      <select className="live-select" value={filter.gradeLevel} onChange={(event) => setFilter({ ...filter, gradeLevel: event.target.value, classId: '' })}><option value="">Tất cả khối</option><option value="10">Khối 10</option><option value="11">Khối 11</option><option value="12">Khối 12</option></select>
      <select className="live-select" value={filter.classId} onChange={(event) => setFilter({ ...filter, classId: event.target.value })}><option value="">Tất cả lớp</option>{visibleClasses.map((item) => <option key={item.id} value={item.id}>{scopedLabel(item.code, item.academicYearId)}</option>)}</select>
      <select className="live-select" value={filter.subjectId} onChange={(event) => setFilter({ ...filter, subjectId: event.target.value })}><option value="">Tất cả môn</option>{(subjects.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
    </div>
    <Async state={report} empty="Không có dữ liệu trong phạm vi đã chọn">{(data) => <>
      <div className="report-summary-strip"><span>Học sinh <strong>{data.summary.studentCount}</strong></span><span>Điểm TB <strong>{data.summary.averageScore ?? '—'}</strong></span><span>Chuyên cần <strong>{data.summary.attendanceRate ?? '—'}%</strong></span><span>Bài đã nộp <strong>{data.summary.submittedAssignments}</strong></span><span>Bài đã chấm <strong>{data.summary.gradedAssignments}</strong></span></div>
      <PaginatedData items={applyShortcutFilter(data.students)} pageSize={20} itemLabel="học sinh" resetKey={`${query}|${shortcut.toString()}`}>
        {(rows) => <div className="live-table-wrap"><table className="live-table"><thead><tr><th>Mã HS</th><th>Họ tên</th><th>Lớp</th><th>Điểm TB</th><th>Chuyên cần</th><th>Bài nộp / đã chấm</th></tr></thead><tbody>{rows.map((item) => <tr key={item.studentId}><td>{item.studentCode || '—'}</td><td><strong>{item.studentName}</strong></td><td>{item.className}</td><td>{item.averageScore ?? '—'}</td><td>{item.attendanceRate ?? '—'}%</td><td>{item.submittedAssignments} / {item.gradedAssignments}</td></tr>)}</tbody></table></div>}
      </PaginatedData>
    </>}</Async>
  </Section>;
}
