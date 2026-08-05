import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, ArrowLeft, BookOpenCheck, ChevronRight, Download,
  FileSpreadsheet, Filter, GraduationCap, RefreshCw, RotateCcw, Search,
  ShieldCheck, TrendingUp, UserRound, Users,
} from 'lucide-react';
import { api } from '../../../api/client';
import { useApi } from '../../../api/useApi';
import { updateHashQuery, useHashNumber, useHashString } from '../../../api/urlState';
import type { AcademicYear, CohortArchiveOverview, CohortArchiveSummary, CohortStudentListItem, PageResponse } from '../../../api/types';
import { Badge } from '../../../components/ui';
import { fmtDate, ServerPagination, useToast } from '../common';
import { AlumniStudentProfile } from './AlumniStudentProfile';
import {
  ArchiveEmpty, ArchiveError, ArchiveFilterSelect, ArchiveMetric, ArchiveSkeleton,
  archiveLabel, archiveScore, archiveTone,
} from './archiveUi';

type LoadState<T> = { data: T | null; loading: boolean; error: string | null; reload: () => Promise<void> };

export function AlumniLive() {
  const [cohortId] = useHashString('nien_khoa', '');
  const [studentId] = useHashString('hoc_sinh', '');
  const cohorts = useApi<CohortArchiveSummary[]>('/alumni/cohorts');

  useEffect(() => {
    if (!cohortId || cohorts.loading || !cohorts.data) return;
    if (!cohorts.data.some((item) => item.id === cohortId)) updateHashQuery({ nien_khoa: null, hoc_sinh: null }, 'replace');
  }, [cohortId, cohorts.data, cohorts.loading]);

  if (studentId && cohortId) return <AlumniStudentProfile cohortId={cohortId} studentId={studentId} />;
  if (cohortId) return <CohortWorkspace cohortId={cohortId} cohorts={cohorts.data ?? []} />;
  return <CohortDirectory state={cohorts} />;
}

function CohortDirectory({ state }: { state: LoadState<CohortArchiveSummary[]> }) {
  return <div className="archive-v2">
    <section className="archive-v2-hero">
      <div><span className="eyebrow"><Archive size={15} /> Kho dữ liệu học tập dài hạn</span><h2>Kho lưu trữ niên khóa</h2><p>Chọn một niên khóa để xem toàn bộ học sinh và hành trình học tập từ lớp 10 đến lớp 12.</p></div>
      <div className="archive-v2-hero-mark"><ShieldCheck size={26} /><span><strong>Dữ liệu bất biến</strong><small>Khóa đã đóng chỉ được tra cứu</small></span></div>
    </section>
    <section className="archive-v2-panel">
      <header className="archive-v2-section-head"><div><GraduationCap size={20} /><span><h3>Danh sách niên khóa</h3><p>Niên khóa mới nhất được đặt lên trước.</p></span></div><button className="live-btn ghost" type="button" onClick={state.reload}><RefreshCw size={16} /> Làm mới</button></header>
      {state.loading && <ArchiveSkeleton rows={4} />}
      {state.error && <ArchiveError message={state.error} retry={state.reload} />}
      {!state.loading && !state.error && !state.data?.length && <ArchiveEmpty title="Chưa có niên khóa" detail="Niên khóa sẽ xuất hiện sau khi Giáo vụ tạo cơ cấu năm học." />}
      {!!state.data?.length && <div className="archive-v2-cohort-table-wrap"><table className="archive-v2-table archive-v2-cohort-table"><thead><tr><th>Niên khóa</th><th>Trạng thái</th><th>Học sinh</th><th>Tốt nghiệp</th><th>Lưu ban</th><th>Chuyển trường</th><th>Điểm TB</th><th>Hoàn thành</th><th /></tr></thead><tbody>{state.data.map((item) => <tr key={item.id}>
        <td><button className="archive-v2-cohort-link" type="button" onClick={() => updateHashQuery({ nien_khoa: item.id }, 'push')}><span><GraduationCap size={18} /></span><div><strong>{item.code}</strong><small>{item.name}</small></div></button></td>
        <td><Badge tone={archiveTone(item.status)}>{archiveLabel(item.status)}</Badge></td><td><strong>{item.studentCount.toLocaleString('vi-VN')}</strong></td><td>{item.graduatedCount.toLocaleString('vi-VN')}</td><td>{item.retainedCount.toLocaleString('vi-VN')}</td><td>{item.transferredCount.toLocaleString('vi-VN')}</td><td><strong>{archiveScore(item.averageScore)}</strong></td>
        <td><div className="archive-v2-progress"><span><i style={{ width: `${Math.min(100, item.completionRate)}%` }} /></span><strong>{item.completionRate.toFixed(1)}%</strong></div></td>
        <td><button className="icon-button" type="button" aria-label={`Mở niên khóa ${item.code}`} onClick={() => updateHashQuery({ nien_khoa: item.id }, 'push')}><ChevronRight size={18} /></button></td>
      </tr>)}</tbody></table></div>}
    </section>
  </div>;
}

function CohortWorkspace({ cohortId, cohorts }: { cohortId: string; cohorts: CohortArchiveSummary[] }) {
  const toast = useToast();
  const selected = cohorts.find((item) => item.id === cohortId);
  const overview = useApi<CohortArchiveOverview>(`/alumni/cohorts/${encodeURIComponent(cohortId)}/overview`);
  const years = useApi<AcademicYear[]>('/academicYears');
  const [query, setQuery] = useHashString('q', '');
  const [classId, setClassId] = useHashString('lop', '');
  const [graduationYear, setGraduationYear] = useHashString('nam_tot_nghiep', '');
  const [finalResult, setFinalResult] = useHashString('ket_qua_nam', '');
  const [graduationResult, setGraduationResult] = useHashString('tot_nghiep', '');
  const [performance, setPerformance] = useHashString('hoc_luc', '');
  const [conduct, setConduct] = useHashString('ren_luyen', '');
  const [recordStatus, setRecordStatus] = useHashString('ho_so', '');
  const [sort, setSort] = useHashString('sort', 'fullName');
  const [direction, setDirection] = useHashString('dir', 'asc');
  const [page, setPage] = useHashNumber('page', 1);
  const [size, setSize] = useHashNumber('size', 20);
  const [debounced, setDebounced] = useState(query.trim());
  const [exporting, setExporting] = useState<string | null>(null);
  const graduationYears = !selected?.graduationYear ? (years.data ?? [])
    : (years.data ?? []).filter((year) => year.code.endsWith(String(selected.graduationYear)));

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebounced(query.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [query, setPage]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({ page: String(page - 1), size: String(size), sort, direction });
    if (debounced) params.set('q', debounced);
    if (classId) params.set('finalClassId', classId);
    if (graduationYear) params.set('graduationAcademicYearId', graduationYear);
    if (finalResult) params.set('finalYearResult', finalResult);
    if (graduationResult) params.set('graduationResult', graduationResult);
    if (performance) params.set('academicPerformance', performance);
    if (conduct) params.set('conductGrade', conduct);
    if (recordStatus) params.set('recordStatus', recordStatus);
    return params;
  }, [classId, conduct, debounced, direction, finalResult, graduationResult, graduationYear, page, performance, recordStatus, size, sort]);
  const students = useApi<PageResponse<CohortStudentListItem>>(`/alumni/cohorts/${encodeURIComponent(cohortId)}/students?${queryParams}`);
  const filtersActive = Boolean(query || classId || graduationYear || finalResult || graduationResult || performance || conduct || recordStatus || sort !== 'fullName' || direction !== 'asc');

  const resetPage = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  const clearFilters = () => updateHashQuery({ q: null, lop: null, nam_tot_nghiep: null, ket_qua_nam: null, tot_nghiep: null, hoc_luc: null, ren_luyen: null, ho_so: null, sort: null, dir: null, page: null }, 'replace');
  const exportFile = async (format: 'xlsx' | 'pdf') => {
    setExporting(format);
    try {
      const params = new URLSearchParams(queryParams); params.delete('page'); params.delete('size'); params.set('format', format);
      const result = await api.download(`/alumni/cohorts/${encodeURIComponent(cohortId)}/export?${params}`);
      const url = URL.createObjectURL(result.blob); const link = document.createElement('a');
      link.href = url; link.download = result.filename || `nien-khoa-${selected?.code || cohortId}.${format}`; link.click(); URL.revokeObjectURL(url);
      toast.show('ok', `Đã xuất ${format === 'xlsx' ? 'Excel' : 'PDF'} theo đúng bộ lọc hiện tại`);
    } catch (error: any) { toast.show('err', error.message); } finally { setExporting(null); }
  };

  return <div className="archive-v2 archive-v2-workspace">{toast.node}
    <nav className="archive-v2-breadcrumb" aria-label="Điều hướng niên khóa"><button type="button" onClick={() => updateHashQuery({ nien_khoa: null, hoc_sinh: null, q: null, lop: null, nam_tot_nghiep: null, ket_qua_nam: null, tot_nghiep: null, hoc_luc: null, ren_luyen: null, ho_so: null, sort: null, dir: null, page: null, size: null }, 'push')}><ArrowLeft size={16} /> Kho niên khóa</button><ChevronRight size={15} /><strong>{selected?.code || 'Niên khóa'}</strong></nav>
    <section className="archive-v2-hero compact"><div><span className="eyebrow"><GraduationCap size={15} /> Phạm vi đang tra cứu</span><h2>{selected?.name || selected?.code}</h2><p>Danh sách toàn khóa; lớp chỉ là bộ lọc hỗ trợ.</p></div><Badge tone={archiveTone(selected?.status)}>{archiveLabel(selected?.status)}</Badge></section>
    {overview.loading && <ArchiveSkeleton rows={2} />}{overview.error && <ArchiveError message={overview.error} retry={overview.reload} />}
    {overview.data && <><section className="archive-v2-metrics">
      <ArchiveMetric icon={<Users />} label="Tổng học sinh" value={overview.data.cohort.studentCount} detail={`${overview.data.classes.length} lớp cuối cấp`} />
      <ArchiveMetric icon={<GraduationCap />} label="Đã tốt nghiệp" value={overview.data.cohort.graduatedCount} detail={`${overview.data.cohort.completionRate.toFixed(1)}% toàn khóa`} tone="success" />
      <ArchiveMetric icon={<TrendingUp />} label="Điểm trung bình" value={archiveScore(overview.data.cohort.averageScore)} detail={`${overview.data.excellentCount} học sinh xuất sắc`} />
      <ArchiveMetric icon={<BookOpenCheck />} label="Rèn luyện tốt" value={overview.data.goodConductCount} detail={`${overview.data.fairConductCount} mức khá`} tone="mint" />
      <ArchiveMetric icon={<AlertTriangle />} label="Cần lưu ý" value={overview.data.cohort.retainedCount + overview.data.cohort.transferredCount} detail={`${overview.data.cohort.retainedCount} lưu ban · ${overview.data.cohort.transferredCount} chuyển trường`} tone="warning" />
    </section><details className="archive-v2-distribution"><summary><span><Users size={17} /> Phân bố theo lớp cuối cấp</span><small>{overview.data.classes.length} lớp · nhấn để xem</small></summary><div>{overview.data.classes.map((item) => <button type="button" key={item.classId} className={classId === item.classId ? 'active' : ''} onClick={() => resetPage(setClassId, classId === item.classId ? '' : item.classId)}><strong>{item.classCode}</strong><span>{item.studentCount} học sinh</span><small>Điểm TB {archiveScore(item.averageScore)}</small></button>)}</div></details></>}
    <StudentDirectory
      state={students} overview={overview.data} years={graduationYears} query={query} setQuery={setQuery}
      filters={{ classId, graduationYear, finalResult, graduationResult, performance, conduct, recordStatus, sort, direction }}
      setFilter={resetPage} setters={{ setClassId, setGraduationYear, setFinalResult, setGraduationResult, setPerformance, setConduct, setRecordStatus, setSort, setDirection }}
      filtersActive={filtersActive} clearFilters={clearFilters} exporting={exporting} exportFile={exportFile}
      setPage={setPage} setSize={setSize}
    />
  </div>;
}

type Filters = { classId: string; graduationYear: string; finalResult: string; graduationResult: string; performance: string; conduct: string; recordStatus: string; sort: string; direction: string };
type Setter = (value: string) => void;
type Setters = { setClassId: Setter; setGraduationYear: Setter; setFinalResult: Setter; setGraduationResult: Setter; setPerformance: Setter; setConduct: Setter; setRecordStatus: Setter; setSort: Setter; setDirection: Setter };

function StudentDirectory({ state, overview, years, query, setQuery, filters, setFilter, setters, filtersActive, clearFilters, exporting, exportFile, setPage, setSize }: {
  state: LoadState<PageResponse<CohortStudentListItem>>; overview: CohortArchiveOverview | null; years: AcademicYear[];
  query: string; setQuery: Setter; filters: Filters; setFilter: (setter: Setter, value: string) => void; setters: Setters;
  filtersActive: boolean; clearFilters: () => void; exporting: string | null; exportFile: (format: 'xlsx' | 'pdf') => void;
  setPage: (value: number, mode?: 'push' | 'replace') => void; setSize: (value: number) => void;
}) {
  const { classId, graduationYear, finalResult, graduationResult, performance, conduct, recordStatus, sort, direction } = filters;
  return <section className="archive-v2-panel archive-v2-students">
    <header className="archive-v2-section-head"><div><UserRound size={20} /><span><h3>Danh sách học sinh niên khóa</h3><p>Tra cứu trực tiếp, không cần nhớ học sinh từng học lớp nào.</p></span></div><div className="archive-v2-export"><button className="live-btn ghost" disabled={!!exporting} type="button" onClick={() => exportFile('xlsx')}><FileSpreadsheet size={16} /> {exporting === 'xlsx' ? 'Đang xuất…' : 'Excel'}</button><button className="live-btn ghost" disabled={!!exporting} type="button" onClick={() => exportFile('pdf')}><Download size={16} /> {exporting === 'pdf' ? 'Đang xuất…' : 'PDF'}</button></div></header>
    <div className="archive-v2-filter-card"><div className="archive-v2-filter-title"><span><Filter size={17} /><strong>Tìm kiếm và bộ lọc</strong></span>{filtersActive && <button type="button" onClick={clearFilters}><RotateCcw size={15} /> Xóa bộ lọc</button>}</div><div className="archive-v2-filter-grid">
      <label className="wide"><span>Tìm học sinh</span><div className="archive-v2-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, mã học sinh hoặc email…" /></div></label>
      <ArchiveFilterSelect label="Lớp cuối cấp" value={classId} onChange={(v) => setFilter(setters.setClassId, v)} options={(overview?.classes || []).map((x) => [x.classId, x.classCode])} />
      <ArchiveFilterSelect label="Năm tốt nghiệp" value={graduationYear} onChange={(v) => setFilter(setters.setGraduationYear, v)} options={years.map((x) => [x.id, x.code])} />
      <ArchiveFilterSelect label="Kết quả cuối năm" value={finalResult} onChange={(v) => setFilter(setters.setFinalResult, v)} options={[['PROMOTED', 'Lên lớp'], ['RETAINED', 'Lưu ban'], ['GRADUATED', 'Tốt nghiệp'], ['INCOMPLETE', 'Chưa hoàn thiện']]} />
      <ArchiveFilterSelect label="Tốt nghiệp" value={graduationResult} onChange={(v) => setFilter(setters.setGraduationResult, v)} options={[['GRADUATED', 'Đã tốt nghiệp'], ['NOT_GRADUATED', 'Chưa tốt nghiệp'], ['TRANSFERRED', 'Chuyển trường'], ['WITHDRAWN', 'Thôi học']]} />
      <ArchiveFilterSelect label="Học lực" value={performance} onChange={(v) => setFilter(setters.setPerformance, v)} options={[['EXCELLENT', 'Xuất sắc'], ['GOOD', 'Tốt'], ['AVERAGE', 'Trung bình'], ['WEAK', 'Yếu'], ['INCOMPLETE', 'Chưa đủ dữ liệu']]} />
      <ArchiveFilterSelect label="Rèn luyện" value={conduct} onChange={(v) => setFilter(setters.setConduct, v)} options={[['GOOD', 'Tốt'], ['FAIR', 'Khá'], ['AVERAGE', 'Trung bình'], ['WEAK', 'Yếu'], ['INCOMPLETE', 'Chưa đánh giá']]} />
      <ArchiveFilterSelect label="Trạng thái hồ sơ" value={recordStatus} onChange={(v) => setFilter(setters.setRecordStatus, v)} options={[['PUBLISHED', 'Đã phát hành'], ['LOCKED', 'Đã khóa'], ['APPROVED', 'Đã duyệt'], ['DRAFT', 'Bản nháp'], ['MISSING', 'Chưa có hồ sơ']]} />
      <ArchiveFilterSelect label="Sắp xếp" value={`${sort}:${direction}`} onChange={(value) => { const [nextSort, nextDir] = value.split(':'); setters.setSort(nextSort); setters.setDirection(nextDir); }} options={[['fullName:asc', 'Tên A–Z'], ['finalClass:asc', 'Lớp tăng dần'], ['annualAverage:desc', 'Điểm cao nhất'], ['graduatedAt:desc', 'Tốt nghiệp gần nhất']]} includeAll={false} />
    </div><div className="archive-v2-result-line"><strong>{state.data?.totalElements.toLocaleString('vi-VN') ?? '—'} học sinh</strong><span>{filtersActive ? 'theo bộ lọc hiện tại' : 'trong toàn niên khóa'}</span></div></div>
    {state.loading && <ArchiveSkeleton rows={6} />}{state.error && <ArchiveError message={state.error} retry={state.reload} />}
    {!state.loading && !state.error && state.data?.items.length === 0 && <ArchiveEmpty title="Không tìm thấy học sinh" detail="Hãy xóa bớt bộ lọc hoặc thử từ khóa khác." />}
    {!!state.data?.items.length && <div className="archive-v2-table-wrap"><table className="archive-v2-table archive-v2-student-table"><thead><tr><th>Học sinh</th><th>Lớp cuối cấp</th><th>Kết quả cuối năm</th><th>Tốt nghiệp</th><th>Điểm TB</th><th>Học lực</th><th>Rèn luyện</th><th>Hồ sơ</th><th /></tr></thead><tbody>{state.data.items.map((item) => <StudentRow key={item.id} item={item} />)}</tbody></table></div>}
    {state.data && <ServerPagination data={state.data} itemLabel="học sinh" onPageChange={(next) => setPage(next + 1, 'push')} onPageSizeChange={(next) => { setSize(next); setPage(1); }} />}
  </section>;
}

function StudentRow({ item }: { item: CohortStudentListItem }) {
  const open = () => updateHashQuery({ hoc_sinh: item.id }, 'push');
  return <tr onDoubleClick={open}><td><div className="archive-v2-person"><span>{item.fullName.trim().split(/\s+/).slice(-1)[0]?.[0] || 'H'}</span><div><strong>{item.fullName}</strong><small>{item.studentCode || 'Chưa có mã'} · {fmtDate(item.dateOfBirth)}</small></div></div></td><td><strong>{item.finalClassCode || '—'}</strong></td><td><Badge tone={archiveTone(item.finalYearResult)}>{archiveLabel(item.finalYearResult)}</Badge></td><td><Badge tone={archiveTone(item.graduationResult)}>{archiveLabel(item.graduationResult)}</Badge></td><td><strong className="archive-v2-score">{archiveScore(item.annualAverage)}</strong></td><td>{archiveLabel(item.academicPerformance)}</td><td>{archiveLabel(item.conductGrade)}</td><td><Badge tone={archiveTone(item.recordStatus)}>{archiveLabel(item.recordStatus)}</Badge></td><td><button className="live-btn ghost compact" type="button" onClick={open}>Xem hồ sơ <ChevronRight size={15} /></button></td></tr>;
}
