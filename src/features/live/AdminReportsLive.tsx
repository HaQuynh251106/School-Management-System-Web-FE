import { useApi } from '../../api/useApi';
import { Section, StatusPill } from '../../components/ui';
import { Async, money } from './common';

/** A8: Báo cáo & thống kê — GỘP tất cả vào một trang (tổng quan + phổ điểm + chuyên cần + doanh thu). */
export function AdminReportsLive() {
  const overview = useApi<Record<string, number>>('/reports/overview');
  const dist = useApi<Array<{ band: string; count: number }>>('/reports/grade-distribution');
  const att = useApi<Record<string, number>>('/reports/attendance-summary');
  const rev = useApi<Record<string, number>>('/reports/revenue');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
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
          <Async state={dist}>{(d) => (
            <div className="admin-table-scroll"><table className="live-table admin-data-table">
              <thead><tr><th>Khoảng điểm</th><th>Số kết quả</th><th>Tỷ trọng</th></tr></thead>
              <tbody>{d.map((band) => {
                const total = d.reduce((sum, item) => sum + item.count, 0);
                return <tr key={band.band}><td><strong>{band.band}</strong></td><td className="admin-table-value">{band.count}</td><td>{total ? Math.round(band.count / total * 100) : 0}%</td></tr>;
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

      <Section title="Doanh thu học phí" subtitle="Tổng hợp các khoản thu" wide>
        <Async state={rev}>{(d) => (
          <div className="admin-table-scroll"><table className="live-table admin-data-table operation-table">
            <thead><tr><th>Hạng mục</th><th>Giá trị</th><th>Thông tin hóa đơn</th><th>Trạng thái</th></tr></thead>
            <tbody>
              <tr><td><strong>Tổng phải thu</strong></td><td className="admin-table-value">{money(d.totalAmount ?? 0)}</td><td>{d.invoiceCount ?? 0} hóa đơn</td><td><StatusPill value="ACTIVE" /></td></tr>
              <tr><td><strong>Đã thu</strong></td><td className="admin-table-value">{money(d.paidAmount ?? 0)}</td><td>{d.paidCount ?? 0} hóa đơn đã thanh toán</td><td><StatusPill value="PAID" /></td></tr>
              <tr><td><strong>Còn phải thu</strong></td><td className="admin-table-value">{money(d.outstanding ?? 0)}</td><td>{Math.max(0, (d.invoiceCount ?? 0) - (d.paidCount ?? 0))} hóa đơn chưa hoàn tất</td><td><StatusPill value={(d.outstanding ?? 0) > 0 ? 'PENDING' : 'PAID'} /></td></tr>
            </tbody>
          </table></div>
        )}</Async>
      </Section>
    </div>
  );
}

function percent(value?: number, total?: number) {
  return total ? `${Math.round((value ?? 0) / total * 100)}%` : '0%';
}
