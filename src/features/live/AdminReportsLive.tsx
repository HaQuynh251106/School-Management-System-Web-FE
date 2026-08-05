import { useApi } from '../../api/useApi';
import { useState } from 'react';
import type { AcademicYear } from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async } from './common';
import { FinanceReportsWorkspace } from './FinanceReportsWorkspace';
import { YearSummaryPreviewWorkspace } from './YearSummaryPreviewWorkspace';
import { YearReviewWorkspace } from './YearReviewWorkspace';
import { StudentPromotionWorkspace } from './StudentPromotionWorkspace';
import { YearResultPublicationWorkspace } from './YearResultPublicationWorkspace';

/** A8: Báo cáo & thống kê — GỘP tất cả vào một trang (tổng quan + phổ điểm + chuyên cần + doanh thu). */
export function AdminReportsLive() {
  const overview = useApi<Record<string, number>>('/reports/overview');
  const dist = useApi<Array<{ band: string; count: number }>>('/reports/grade-distribution');
  const att = useApi<Record<string, number>>('/reports/attendance-summary');
  const years = useApi<AcademicYear[]>('/academicYears');
  const [yearId, setYearId] = useState('');
  const promotion = useApi<Record<string, number>>(yearId ? `/reports/promotion?academicYearId=${yearId}` : null);
  const gradeTotal = (dist.data ?? []).reduce((sum, item) => sum + item.count, 0);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <YearSummaryPreviewWorkspace />
      <YearReviewWorkspace />
      <YearResultPublicationWorkspace />
      <StudentPromotionWorkspace />
      <FinanceReportsWorkspace />
      <Section title="Tổng quan hệ thống" subtitle="Số liệu vận hành hiện tại" wide>
        <Async state={overview}>{(d) => (
          <div className="admin-table-scroll"><table className="live-table admin-data-table">
            <thead><tr><th>Nhóm dữ liệu</th><th>Số lượng</th><th>Phạm vi quản lý</th><th>Trạng thái</th></tr></thead>
            <tbody>
              <tr><td><strong>Học sinh</strong></td><td className="admin-table-value">{d.students ?? 0}</td><td>Tài khoản học sinh toàn trường</td><td><StatusPill value="ACTIVE" /></td></tr>
              <tr><td><strong>Giáo viên</strong></td><td className="admin-table-value">{d.teachers ?? 0}</td><td>Nhân sự giảng dạy</td><td><StatusPill value="ACTIVE" /></td></tr>
              <tr><td><strong>Phụ huynh</strong></td><td className="admin-table-value">{d.parents ?? 0}</td><td>Tài khoản đã liên kết học sinh</td><td><StatusPill value="ACTIVE" /></td></tr>
              <tr><td><strong>Lớp học</strong></td><td className="admin-table-value">{d.classes ?? 0}</td><td>{d.subjects ?? 0} môn học đang quản lý</td><td><StatusPill value="ACTIVE" /></td></tr>
            </tbody>
          </table></div>
        )}</Async>
      </Section>

      <div className="admin-dashboard-table-grid">
        <Section title="Phổ điểm toàn trường" subtitle="Phân bố kết quả học tập">
          <Async paginate state={dist} itemLabel="khoảng điểm">{(d) => (
            <div className="admin-table-scroll"><table className="live-table admin-data-table">
              <thead><tr><th>Khoảng điểm</th><th>Số kết quả</th><th>Tỷ trọng</th></tr></thead>
              <tbody>{d.map((band) => {
                return <tr key={band.band}><td><strong>{band.band}</strong></td><td className="admin-table-value">{band.count}</td><td>{gradeTotal ? Math.round(band.count / gradeTotal * 100) : 0}%</td></tr>;
              })}</tbody>
            </table></div>
          )}</Async>
        </Section>

        <Section title="Thống kê chuyên cần" subtitle="Tình hình đi học toàn trường">
          <Async state={att}>{(d) => (
            <div className="admin-table-scroll"><table className="live-table admin-data-table">
              <thead><tr><th>Trạng thái</th><th>Số lượt</th><th>Tỷ lệ</th></tr></thead>
              <tbody>
                <tr><td><strong>Có mặt</strong></td><td className="admin-table-value">{d.present ?? 0}</td><td>{percent(d.present, d.total)}</td></tr>
                <tr><td><strong>Đi muộn</strong></td><td className="admin-table-value">{d.late ?? 0}</td><td>{percent(d.late, d.total)}</td></tr>
                <tr><td><strong>Vắng có phép</strong></td><td className="admin-table-value">{d.absentExcused ?? 0}</td><td>{percent(d.absentExcused, d.total)}</td></tr>
                <tr><td><strong>Vắng không phép</strong></td><td className="admin-table-value">{d.absentUnexcused ?? 0}</td><td>{percent(d.absentUnexcused, d.total)}</td></tr>
              </tbody>
              <tfoot><tr><td><strong>Tỷ lệ chuyên cần</strong></td><td>{d.total ?? 0} lượt</td><td className="admin-table-value">{d.attendanceRate ?? 0}%</td></tr></tfoot>
            </table></div>
          )}</Async>
        </Section>
      </div>

      <Section title="Kết quả lên lớp" subtitle="Tổng hợp sau khi chốt năm học" wide
        action={<select className="live-select" value={yearId} onChange={(e) => setYearId(e.target.value)}><option value="">— Chọn năm học —</option>{(years.data ?? []).map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select>}>
        {!yearId ? <div className="live-loading">Chọn năm học để xem kết quả lên lớp.</div> : (
          <Async state={promotion}>{(data) => <div className="admin-table-scroll"><table className="live-table admin-data-table">
            <thead><tr><th>Kết quả</th><th>Số học sinh</th><th>Tỷ lệ</th></tr></thead>
            <tbody>
              <tr><td><strong>Lên lớp</strong></td><td>{data.promoted ?? 0}</td><td>{percent(data.promoted, data.total)}</td></tr>
              <tr><td><strong>Chờ xếp lớp</strong></td><td>{data.pendingClass ?? 0}</td><td>{percent(data.pendingClass, data.total)}</td></tr>
              <tr><td><strong>Tốt nghiệp</strong></td><td>{data.graduated ?? 0}</td><td>{percent(data.graduated, data.total)}</td></tr>
              <tr><td><strong>Lưu ban</strong></td><td>{data.retained ?? 0}</td><td>{percent(data.retained, data.total)}</td></tr>
              <tr><td><strong>Chưa hoàn tất</strong></td><td>{data.incomplete ?? 0}</td><td>{percent(data.incomplete, data.total)}</td></tr>
            </tbody>
          </table></div>}</Async>
        )}
      </Section>
    </div>
  );
}

function percent(value?: number, total?: number) {
  return total ? `${Math.round((value ?? 0) / total * 100)}%` : '0%';
}
