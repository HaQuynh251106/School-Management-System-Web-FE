import { useApi } from '../../api/useApi';
import { Section, InfoGrid } from '../../components/ui';
import { BarList, ChartCard } from '../../components/charts';
import { Async, money } from './common';

/** A8: Báo cáo & thống kê — GỘP tất cả vào một trang (tổng quan + phổ điểm + chuyên cần + doanh thu). */
export function AdminReportsLive() {
  const overview = useApi<Record<string, number>>('/reports/overview');
  const dist = useApi<Array<{ band: string; count: number }>>('/reports/grade-distribution');
  const att = useApi<Record<string, number>>('/reports/attendance-summary');
  const rev = useApi<Record<string, number>>('/reports/revenue');

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Section title="Tổng quan hệ thống" subtitle="/reports/overview" wide>
        <Async state={overview}>{(d) => (
          <InfoGrid items={[
            { title: 'Học sinh', value: String(d.students ?? 0), meta: 'role=STUDENT' },
            { title: 'Giáo viên', value: String(d.teachers ?? 0), meta: 'role=TEACHER' },
            { title: 'Phụ huynh', value: String(d.parents ?? 0), meta: 'role=PARENT' },
            { title: 'Lớp / Môn', value: `${d.classes ?? 0} / ${d.subjects ?? 0}`, meta: 'cơ cấu đào tạo' },
          ]} />
        )}</Async>
      </Section>

      <div className="feature-grid">
        <ChartCard title="Phổ điểm toàn trường" subtitle="/reports/grade-distribution">
          <Async state={dist}>{(d) => (
            <BarList data={d.map((b) => ({ label: b.band, value: b.count }))}
              max={Math.max(1, ...d.map((b) => b.count))} suffix="" />
          )}</Async>
        </ChartCard>

        <Section title="Thống kê chuyên cần" subtitle="/reports/attendance-summary">
          <Async state={att}>{(d) => (
            <InfoGrid items={[
              { title: 'Tỉ lệ chuyên cần', value: `${d.attendanceRate ?? 0}%`, meta: `${d.total ?? 0} lượt` },
              { title: 'Có mặt', value: String(d.present ?? 0), meta: 'PRESENT' },
              { title: 'Vắng (P/KP)', value: `${d.absentExcused ?? 0} / ${d.absentUnexcused ?? 0}`, meta: 'có phép / không phép' },
              { title: 'Đi muộn', value: String(d.late ?? 0), meta: 'LATE' },
            ]} />
          )}</Async>
        </Section>
      </div>

      <Section title="Doanh thu học phí" subtitle="/reports/revenue" wide>
        <Async state={rev}>{(d) => (
          <InfoGrid items={[
            { title: 'Tổng phải thu', value: money(d.totalAmount ?? 0), meta: `${d.invoiceCount ?? 0} hóa đơn` },
            { title: 'Đã thu', value: money(d.paidAmount ?? 0), meta: `${d.paidCount ?? 0} HĐ đã trả` },
            { title: 'Còn nợ', value: money(d.outstanding ?? 0), meta: 'outstanding' },
          ]} />
        )}</Async>
      </Section>
    </div>
  );
}
