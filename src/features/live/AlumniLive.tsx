import { useEffect, useState } from 'react';
import { Archive, CalendarCheck, Filter, GraduationCap, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';
import { useApi } from '../../api/useApi';
import { useHashNumber, useHashString } from '../../api/urlState';
import type { AcademicYear, AlumniRecord, Cohort, PageResponse } from '../../api/types';
import { Badge, viLabel } from '../../components/ui';
import { Async, fmtDate, ServerPagination } from './common';

export function AlumniLive() {
  const [query, setQuery] = useHashString('q', '');
  const [cohortId, setCohortId] = useHashString('nien_khoa', '');
  const [graduationYearId, setGraduationYearId] = useHashString('nam_tot_nghiep', '');
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

  const cohorts = useApi<Cohort[]>('/cohorts');
  const years = useApi<AcademicYear[]>('/academicYears');
  const params = new URLSearchParams({ page: String(pageNumber - 1), size: String(pageSize) });
  if (debouncedQuery) params.set('q', debouncedQuery);
  if (cohortId) params.set('cohortId', cohortId);
  if (graduationYearId) params.set('graduationAcademicYearId', graduationYearId);
  const alumni = useApi<PageResponse<AlumniRecord>>(`/alumni/page?${params}`);
  const activeFilters = Number(Boolean(query.trim())) + Number(Boolean(cohortId)) + Number(Boolean(graduationYearId));

  const clearFilters = () => {
    setQuery('');
    setCohortId('');
    setGraduationYearId('');
    setPageNumber(1);
  };

  return <div className="alumni-portal">
    <section className="alumni-hero">
      <div>
        <span><GraduationCap size={16} /> Kho lưu trữ học sinh theo niên khóa</span>
        <h2>Cựu học sinh</h2>
        <p>Tra cứu hồ sơ học sinh đã tốt nghiệp mà không làm mất lớp học, bảng điểm, hạnh kiểm và lịch sử enrollment.</p>
      </div>
      <div className="alumni-hero-badge"><ShieldCheck size={24} /><div><small>Dữ liệu lịch sử</small><strong>Được bảo toàn</strong></div></div>
    </section>

    <section className="alumni-summary-grid">
      <article><span><Archive size={20} /></span><div><small>Tổng cựu học sinh</small><strong>{alumni.data?.summary.total ?? alumni.data?.totalElements ?? '—'}</strong></div></article>
      <article><span><CalendarCheck size={20} /></span><div><small>Số niên khóa</small><strong>{alumni.data?.summary.cohorts ?? '—'}</strong></div></article>
      <article><span><Filter size={20} /></span><div><small>Phạm vi đang xem</small><strong>{activeFilters ? `${activeFilters} bộ lọc` : 'Toàn bộ'}</strong></div></article>
    </section>

    <section className="alumni-workspace">
      <header><div><span><Filter size={18} /></span><div><h3>Tìm và lọc hồ sơ</h3><p>Lọc theo niên khóa hoặc năm tốt nghiệp để rà soát nhanh.</p></div></div>
        <button className="live-btn ghost" type="button" onClick={() => { alumni.reload(); cohorts.reload(); years.reload(); }}><RefreshCw size={15} /> Làm mới</button>
      </header>
      <div className="alumni-filter-grid">
        <label><span>Tìm kiếm</span><div className="alumni-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Họ tên, mã học sinh hoặc email..." /></div></label>
        <label><span>Niên khóa</span><select className="live-select" value={cohortId} onChange={(event) => { setCohortId(event.target.value); setPageNumber(1); }}><option value="">Tất cả niên khóa</option>{(cohorts.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name || item.code}</option>)}</select></label>
        <label><span>Năm tốt nghiệp</span><select className="live-select" value={graduationYearId} onChange={(event) => { setGraduationYearId(event.target.value); setPageNumber(1); }}><option value="">Tất cả năm học</option>{(years.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
        <button className="alumni-clear" type="button" disabled={!activeFilters} onClick={clearFilters}>Xóa bộ lọc{activeFilters ? ` (${activeFilters})` : ''}</button>
      </div>
    </section>

    <section className="alumni-list-panel">
      <header><div><span><UserRound size={18} /></span><div><h3>Danh sách hồ sơ tốt nghiệp</h3><p>{alumni.data?.totalElements ?? 0} học sinh phù hợp với điều kiện hiện tại</p></div></div></header>
      <Async state={{ ...alumni, data: alumni.data?.items ?? null }} empty="Chưa có học sinh tốt nghiệp" itemLabel="cựu học sinh">
        {(items) => <div className="alumni-table-wrap"><table className="live-table alumni-table"><thead><tr><th>Học sinh</th><th>Niên khóa</th><th>Lớp cuối cấp</th><th>Kết quả năm cuối</th><th>Tốt nghiệp</th><th>Tài khoản</th><th /></tr></thead><tbody>
          {items.map((item) => <tr key={item.id}>
            <td data-label="Học sinh"><div className="alumni-person"><span>{item.fullName.trim().split(/\s+/).slice(-1)[0]?.[0] ?? 'H'}</span><div><strong>{item.fullName}</strong><small>{item.studentCode || 'Chưa có mã học sinh'}</small></div></div></td>
            <td data-label="Niên khóa"><strong>{item.cohortName || item.cohortCode || 'Chưa xác định'}</strong>{item.entryYear && item.graduationYear ? <small className="alumni-subline">{item.entryYear} – {item.graduationYear}</small> : null}</td>
            <td data-label="Lớp cuối cấp">{item.graduationClassCode || '—'}</td>
            <td data-label="Kết quả"><strong>{item.annualAverage == null ? '—' : item.annualAverage.toFixed(1)}</strong><small className="alumni-subline">Hạnh kiểm: {viLabel(item.conductGrade || '—')}</small></td>
            <td data-label="Tốt nghiệp"><strong>{item.graduationAcademicYearCode || item.graduationYear || '—'}</strong><small className="alumni-subline">{fmtDate(item.graduatedAt)}</small></td>
            <td data-label="Tài khoản"><Badge tone={item.accountStatus === 'ACTIVE' ? 'green' : 'orange'}>{viLabel(item.accountStatus)}</Badge></td>
            <td><button className="live-btn ghost compact" type="button" onClick={() => setSelected(item)}>Xem hồ sơ</button></td>
          </tr>)}
        </tbody></table></div>}
      </Async>
      {alumni.data && <ServerPagination data={alumni.data} itemLabel="cựu học sinh" onPageChange={(page) => setPageNumber(page + 1, 'push')} onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }} />}
    </section>

    {selected && <div className="live-modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="live-modal alumni-detail" role="dialog" aria-modal="true" aria-label="Hồ sơ cựu học sinh" onClick={(event) => event.stopPropagation()}>
      <header><div><span><GraduationCap size={21} /></span><div><h3>{selected.fullName}</h3><p>{selected.studentCode} · {selected.cohortName || selected.cohortCode}</p></div></div><button type="button" onClick={() => setSelected(null)}>×</button></header>
      <div className="alumni-detail-grid"><div><small>Lớp tốt nghiệp</small><strong>{selected.graduationClassCode || '—'}</strong></div><div><small>Năm học tốt nghiệp</small><strong>{selected.graduationAcademicYearCode || '—'}</strong></div><div><small>Điểm cả năm</small><strong>{selected.annualAverage?.toFixed(1) ?? '—'}</strong></div><div><small>Hạnh kiểm</small><strong>{viLabel(selected.conductGrade || '—')}</strong></div><div><small>Email</small><strong>{selected.email || '—'}</strong></div><div><small>Điện thoại</small><strong>{selected.phone || '—'}</strong></div></div>
      <p className="alumni-history-note"><ShieldCheck size={17} /> Hồ sơ học tập và enrollment của học sinh được lưu nguyên trạng để tra cứu lịch sử.</p>
      <footer><button className="live-btn primary" type="button" onClick={() => setSelected(null)}>Đóng</button></footer>
    </section></div>}
  </div>;
}
