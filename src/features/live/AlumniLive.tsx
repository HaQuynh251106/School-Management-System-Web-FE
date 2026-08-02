import { useEffect, useMemo, useState } from 'react';
import {
  Archive, ArrowLeft, CalendarCheck, ChevronRight, Clock3, GraduationCap, History,
  RefreshCw, School, Search, ShieldCheck, UserRound, Users,
} from 'lucide-react';
import { useApi } from '../../api/useApi';
import { updateHashQuery, useHashNumber, useHashString } from '../../api/urlState';
import type { AlumniClassSummary, AlumniRecord, PageResponse } from '../../api/types';
import { Badge, viLabel } from '../../components/ui';
import { Async, fmtDate, ServerPagination } from './common';

export function AlumniLive() {
  const [area] = useHashString('khu_vuc', 'hien_tai');
  const [cohortId] = useHashString('nien_khoa', '');
  const [graduationYearId] = useHashString('nam_tot_nghiep', '');
  const [classId] = useHashString('lop', '');
  const isArchive = area === 'luu_tru';

  const currentClasses = useApi<AlumniClassSummary[]>('/alumni/classes');
  const archiveClasses = useApi<AlumniClassSummary[]>(isArchive ? '/alumni/classes/archive' : null);
  const filteredArchiveItems = useMemo(() => (archiveClasses.data ?? []).filter((item) =>
    (!cohortId || item.cohortId === cohortId)
    && (!graduationYearId || item.graduationAcademicYearId === graduationYearId)),
  [archiveClasses.data, cohortId, graduationYearId]);
  const activeClasses = isArchive ? { ...archiveClasses, data: archiveClasses.data ? filteredArchiveItems : null } : currentClasses;
  const selectedClass = activeClasses.data?.find((item) => item.classId === classId) ?? null;
  const currentBatch = currentClasses.data?.[0] ?? null;
  const archiveCohorts = useMemo(() => Array.from(new Map((archiveClasses.data ?? []).map((item) => [item.cohortId, item])).values()), [archiveClasses.data]);
  const archiveYears = useMemo(() => Array.from(new Map((archiveClasses.data ?? []).map((item) => [item.graduationAcademicYearId, item])).values()), [archiveClasses.data]);

  useEffect(() => {
    if (!classId || activeClasses.loading || !activeClasses.data) return;
    if (!selectedClass) updateHashQuery({ lop: null, q: null, page: null, size: null }, 'replace');
  }, [activeClasses.data, activeClasses.loading, classId, selectedClass]);

  const totals = useMemo(() => {
    const items = activeClasses.data ?? [];
    return {
      students: items.reduce((sum, item) => sum + item.studentCount, 0),
      classes: items.length,
    };
  }, [activeClasses.data]);

  const switchArea = (nextArea: 'hien_tai' | 'luu_tru') => {
    updateHashQuery({
      khu_vuc: nextArea === 'hien_tai' ? null : nextArea,
      nien_khoa: null,
      nam_tot_nghiep: null,
      lop: null,
      q: null,
      page: null,
      size: null,
    }, 'push');
  };

  const changeArchiveFilter = (key: 'nien_khoa' | 'nam_tot_nghiep', value: string) => {
    updateHashQuery({ [key]: value || null, lop: null, q: null, page: null, size: null }, 'replace');
  };

  const openClass = (item: AlumniClassSummary) => {
    updateHashQuery({ lop: item.classId, q: null, page: null, size: null }, 'push');
  };

  const backToClasses = () => {
    updateHashQuery({ lop: null, q: null, page: null, size: null }, 'push');
  };

  return <div className="alumni-portal">
    <section className="alumni-hero">
      <div>
        <span><GraduationCap size={16} /> Quản lý hồ sơ sau tốt nghiệp</span>
        <h2>Hồ sơ học sinh đã tốt nghiệp</h2>
        <p>Đợt hiện tại phục vụ công việc hằng ngày; các khóa trước được chuyển vào kho lưu trữ để tra cứu khi cần.</p>
      </div>
      <div className="alumni-hero-badge"><ShieldCheck size={24} /><div><small>Dữ liệu lịch sử</small><strong>Được bảo toàn</strong></div></div>
    </section>

    <nav className="alumni-area-tabs" aria-label="Khu vực hồ sơ tốt nghiệp">
      <button type="button" className={!isArchive ? 'active' : ''} onClick={() => switchArea('hien_tai')}><CalendarCheck size={19} /><span><strong>Đợt hiện tại</strong><small>Khóa tốt nghiệp mới nhất</small></span>{!currentClasses.loading && <em>{currentClasses.data?.length ?? 0} lớp</em>}</button>
      <button type="button" className={isArchive ? 'active' : ''} onClick={() => switchArea('luu_tru')}><History size={19} /><span><strong>Kho lưu trữ</strong><small>Tra cứu các khóa trước</small></span></button>
    </nav>

    <section className="alumni-summary-grid">
      <article><span><Archive size={20} /></span><div><small>Học sinh trong khu vực</small><strong>{activeClasses.loading ? '—' : totals.students}</strong></div></article>
      <article><span><School size={20} /></span><div><small>Lớp cuối cấp</small><strong>{activeClasses.loading ? '—' : totals.classes}</strong></div></article>
      <article><span>{isArchive ? <History size={20} /> : <CalendarCheck size={20} />}</span><div><small>{isArchive ? 'Phạm vi lưu trữ' : 'Đợt đang hiển thị'}</small><strong>{activeClasses.loading ? '—' : isArchive ? 'Các khóa trước' : currentBatch?.graduationAcademicYearCode || 'Chưa có'}</strong></div></article>
    </section>

    {!isArchive ? <section className="alumni-workspace">
      <header>
        <div><span><CalendarCheck size={18} /></span><div><h3>Phạm vi tốt nghiệp hiện hành</h3><p>Được xác định tự động, giáo vụ không cần chọn lại năm.</p></div></div>
        <button className="live-btn ghost" type="button" onClick={currentClasses.reload}><RefreshCw size={15} /> Làm mới</button>
      </header>
      <div className="alumni-current-cycle">
        <div className="alumni-cycle-card"><span><GraduationCap size={20} /></span><div><small>Niên khóa tốt nghiệp</small><strong>{currentBatch?.cohortName || currentBatch?.cohortCode || (currentClasses.loading ? 'Đang tải…' : 'Chưa có dữ liệu')}</strong></div></div>
        <div className="alumni-cycle-card"><span><CalendarCheck size={20} /></span><div><small>Năm học tốt nghiệp</small><strong>{currentBatch?.graduationAcademicYearCode || (currentClasses.loading ? 'Đang tải…' : 'Chưa có dữ liệu')}</strong></div></div>
        <div className="alumni-cycle-card policy"><span><Clock3 size={20} /></span><div><small>Thời gian hiển thị</small><strong>Đến khi có khóa mới</strong></div></div>
        <div className="alumni-flow-hint"><span>1</span><div><strong>Chọn lớp</strong><small>Sau đó hệ thống mới tải học sinh</small></div><ChevronRight size={18} /></div>
      </div>
    </section> : <section className="alumni-workspace alumni-archive-workspace">
      <header>
        <div><span><History size={18} /></span><div><h3>Tìm trong kho lưu trữ</h3><p>Chọn niên khóa hoặc năm tốt nghiệp, sau đó mở lớp cần tra cứu.</p></div></div>
        <button className="live-btn ghost" type="button" onClick={archiveClasses.reload}><RefreshCw size={15} /> Làm mới</button>
      </header>
      <div className="alumni-archive-filters">
        <label><span>Niên khóa</span><select className="live-select" value={cohortId} onChange={(event) => changeArchiveFilter('nien_khoa', event.target.value)}><option value="">Tất cả niên khóa cũ</option>{archiveCohorts.map((item) => <option key={item.cohortId} value={item.cohortId ?? ''}>{item.cohortName || item.cohortCode}</option>)}</select></label>
        <label><span>Năm tốt nghiệp</span><select className="live-select" value={graduationYearId} onChange={(event) => changeArchiveFilter('nam_tot_nghiep', event.target.value)}><option value="">Tất cả năm cũ</option>{archiveYears.map((item) => <option key={item.graduationAcademicYearId} value={item.graduationAcademicYearId ?? ''}>{item.graduationAcademicYearCode}</option>)}</select></label>
        <div className="alumni-archive-note"><ShieldCheck size={18} /><div><strong>Chỉ đọc</strong><small>Dữ liệu khóa cũ được giữ nguyên để đối soát.</small></div></div>
      </div>
    </section>}

    {!selectedClass ? <ClassList state={activeClasses} onSelect={openClass} archive={isArchive} /> : <StudentList alumniClass={selectedClass} onBack={backToClasses} />}
  </div>;
}

function ClassList({ state, onSelect, archive }: {
  state: ReturnType<typeof useApi<AlumniClassSummary[]>>;
  onSelect: (item: AlumniClassSummary) => void;
  archive: boolean;
}) {
  return <section className="alumni-list-panel alumni-class-panel">
    <header><div><span>{archive ? <History size={18} /> : <School size={18} />}</span><div><h3>{archive ? 'Các lớp trong kho lưu trữ' : 'Danh sách lớp tốt nghiệp hiện tại'}</h3><p>Nhấn vào một lớp để mở danh sách học sinh.</p></div></div></header>
    <Async state={state} empty={archive ? 'Chưa có khóa cũ trong kho lưu trữ' : 'Chưa có lớp trong đợt tốt nghiệp hiện tại'} itemLabel="lớp">
      {(items) => <div className="alumni-class-grid">
        {items.map((item) => {
          const goodRate = item.studentCount ? Math.round((item.goodConductCount / item.studentCount) * 100) : 0;
          return <button key={`${item.classId}-${item.graduationAcademicYearId ?? ''}`} className="alumni-class-card" type="button" onClick={() => onSelect(item)}>
            <div className="alumni-class-card-top"><span><School size={21} /></span><div><strong>{item.classCode}</strong><small>{item.className && item.className !== item.classCode ? item.className : 'Lớp cuối cấp'}</small></div><ChevronRight size={20} /></div>
            <div className="alumni-class-meta"><span><Users size={15} /> {item.studentCount} học sinh</span><span><GraduationCap size={15} /> {item.graduationAcademicYearCode || 'Chưa rõ năm'}</span></div>
            <div className="alumni-class-stats"><div><small>Niên khóa</small><strong>{item.cohortCode || item.cohortName || '—'}</strong></div><div><small>Điểm TB</small><strong>{item.averageScore == null ? '—' : item.averageScore.toFixed(1)}</strong></div><div><small>Hạnh kiểm tốt</small><strong>{goodRate}%</strong></div></div>
            <span className="alumni-class-action">Mở danh sách học sinh <ChevronRight size={16} /></span>
          </button>;
        })}
      </div>}
    </Async>
  </section>;
}

function StudentList({ alumniClass, onBack }: { alumniClass: AlumniClassSummary; onBack: () => void }) {
  const [query, setQuery] = useHashString('q', '');
  const [pageNumber, setPageNumber] = useHashNumber('page', 1);
  const [pageSize, setPageSize] = useHashNumber('size', 20);
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());
  const [selected, setSelected] = useState<AlumniRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPageNumber(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, setPageNumber]);

  const params = new URLSearchParams({
    graduationClassId: alumniClass.classId,
    page: String(pageNumber - 1),
    size: String(pageSize),
  });
  if (debouncedQuery) params.set('q', debouncedQuery);
  const alumni = useApi<PageResponse<AlumniRecord>>(`/alumni/page?${params}`);

  return <section className="alumni-list-panel alumni-student-panel">
    <div className="alumni-breadcrumb">
      <button className="live-btn ghost compact" type="button" onClick={onBack}><ArrowLeft size={16} /> Danh sách lớp</button>
      <ChevronRight size={16} />
      <strong>Lớp {alumniClass.classCode}</strong>
    </div>
    <header>
      <div><span><UserRound size={18} /></span><div><h3>Học sinh lớp {alumniClass.classCode}</h3><p>{alumniClass.cohortName || alumniClass.cohortCode || 'Chưa rõ niên khóa'} · Tốt nghiệp {alumniClass.graduationAcademicYearCode || '—'}</p></div></div>
      <div className="alumni-student-count"><Users size={17} /><strong>{alumni.data?.totalElements ?? alumniClass.studentCount}</strong><span>học sinh</span></div>
    </header>
    <div className="alumni-student-toolbar">
      <label className="alumni-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm trong lớp theo họ tên, mã học sinh hoặc email..." /></label>
      <button className="live-btn ghost" type="button" onClick={alumni.reload}><RefreshCw size={15} /> Làm mới</button>
    </div>
    <Async state={{ ...alumni, data: alumni.data?.items ?? null }} empty="Không tìm thấy học sinh trong lớp này" itemLabel="học sinh">
      {(items) => <div className="alumni-table-wrap"><table className="live-table alumni-table"><thead><tr><th>Học sinh</th><th>Kết quả năm cuối</th><th>Ngày tốt nghiệp</th><th>Tài khoản</th><th /></tr></thead><tbody>
        {items.map((item) => <tr key={item.id}>
          <td data-label="Học sinh"><div className="alumni-person"><span>{item.fullName.trim().split(/\s+/).slice(-1)[0]?.[0] ?? 'H'}</span><div><strong>{item.fullName}</strong><small>{item.studentCode || 'Chưa có mã học sinh'}</small></div></div></td>
          <td data-label="Kết quả"><strong>{item.annualAverage == null ? '—' : item.annualAverage.toFixed(1)}</strong><small className="alumni-subline">Hạnh kiểm: {viLabel(item.conductGrade || '—')}</small></td>
          <td data-label="Tốt nghiệp"><strong>{item.graduationAcademicYearCode || item.graduationYear || '—'}</strong><small className="alumni-subline">{fmtDate(item.graduatedAt)}</small></td>
          <td data-label="Tài khoản"><Badge tone={item.accountStatus === 'ACTIVE' ? 'green' : 'orange'}>{viLabel(item.accountStatus)}</Badge></td>
          <td><button className="live-btn ghost compact" type="button" onClick={() => setSelected(item)}>Xem hồ sơ</button></td>
        </tr>)}
      </tbody></table></div>}
    </Async>
    {alumni.data && <ServerPagination data={alumni.data} itemLabel="học sinh" onPageChange={(page) => setPageNumber(page + 1, 'push')} onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }} />}

    {selected && <div className="live-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="live-modal alumni-detail" role="dialog" aria-modal="true" aria-label="Hồ sơ học sinh đã tốt nghiệp" onClick={(event) => event.stopPropagation()}>
      <header><div><span><GraduationCap size={21} /></span><div><h3>{selected.fullName}</h3><p>{selected.studentCode} · Lớp {selected.graduationClassCode}</p></div></div><button type="button" aria-label="Đóng" onClick={() => setSelected(null)}>×</button></header>
      <div className="alumni-detail-grid"><div><small>Niên khóa</small><strong>{selected.cohortName || selected.cohortCode || '—'}</strong></div><div><small>Năm học tốt nghiệp</small><strong>{selected.graduationAcademicYearCode || '—'}</strong></div><div><small>Điểm cả năm</small><strong>{selected.annualAverage?.toFixed(1) ?? '—'}</strong></div><div><small>Hạnh kiểm</small><strong>{viLabel(selected.conductGrade || '—')}</strong></div><div><small>Email</small><strong>{selected.email || '—'}</strong></div><div><small>Điện thoại</small><strong>{selected.phone || '—'}</strong></div></div>
      <p className="alumni-history-note"><ShieldCheck size={17} /> Hồ sơ học tập và lịch sử lớp của học sinh được lưu nguyên trạng để giáo vụ tra cứu.</p>
      <footer><button className="live-btn primary" type="button" onClick={() => setSelected(null)}>Đóng</button></footer>
    </section></div>}
  </section>;
}
