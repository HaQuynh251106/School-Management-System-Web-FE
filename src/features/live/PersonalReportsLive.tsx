import { BarChart3, BookOpenCheck, ClipboardCheck, Download, FileCheck2, GraduationCap, WalletCards } from 'lucide-react';
import { api } from '../../api/client';
import { useActiveChild } from '../../api/activeChild';
import { useApi } from '../../api/useApi';
import { Section } from '../../components/ui';
import { Async, money, useToast } from './common';

type PersonalReport = {
  role: string; studentCount: number; classCount: number; gradeCount: number; averageScore: number;
  subjectAverages: Record<string, number>; attendanceTotal: number; attendanceRate: number;
  present: number; late: number; absentExcused: number; absentUnexcused: number;
  submissionCount: number; gradedSubmissionCount: number;
  finance?: { invoiceCount: number; paidInvoiceCount: number; totalAmount: number; paidAmount: number; outstanding: number };
};

export function PersonalReportsLive({ actor }: { actor: 'teacher' | 'student' | 'parent' }) {
  const { childId } = useActiveChild();
  const query = actor === 'parent' && childId ? `?childId=${encodeURIComponent(childId)}` : '';
  const report = useApi<PersonalReport>(actor === 'parent' && !childId ? null : `/me/reports${query}`);
  const toast = useToast();

  const exportCsv = async () => {
    try {
      const result = await api.download(`/me/reports/export${query}`);
      const href = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = result.filename || 'bao-cao-ca-nhan.csv';
      anchor.click();
      URL.revokeObjectURL(href);
      toast.show('ok', 'Đã xuất báo cáo CSV');
    } catch (error: any) { toast.show('err', error.message); }
  };

  if (actor === 'parent' && !childId) return <Section title="Báo cáo của con" subtitle="Chưa chọn học sinh" wide><div className="live-loading">Chọn học sinh trước khi xem báo cáo.</div></Section>;
  return <Section title={actor === 'teacher' ? 'Báo cáo giảng dạy' : actor === 'student' ? 'Báo cáo học tập cá nhân' : 'Báo cáo của con'} subtitle="Số liệu đúng phạm vi vai trò, có thể xuất CSV để lưu trữ" wide action={<button className="live-btn" onClick={exportCsv}><Download size={15} /> Xuất báo cáo</button>}>
    {toast.node}
    <Async state={report}>{(data) => <div className="personal-report-page">
      <div className="personal-report-kpis">
        <article><span><GraduationCap size={20} /></span><small>{actor === 'teacher' ? 'Học sinh phụ trách' : 'Điểm trung bình'}</small><strong>{actor === 'teacher' ? data.studentCount : data.averageScore.toFixed(1)}</strong><p>{actor === 'teacher' ? `${data.classCount} lớp` : `${data.gradeCount} đầu điểm`}</p></article>
        <article><span><ClipboardCheck size={20} /></span><small>Tỷ lệ chuyên cần</small><strong>{data.attendanceRate}%</strong><p>{data.attendanceTotal} lượt ghi nhận</p></article>
        <article><span><FileCheck2 size={20} /></span><small>Bài tập đã chấm</small><strong>{data.gradedSubmissionCount}/{data.submissionCount}</strong><p>Bài làm đã nộp</p></article>
        {data.finance && <article><span><WalletCards size={20} /></span><small>Công nợ còn lại</small><strong>{money(data.finance.outstanding)}</strong><p>{data.finance.paidInvoiceCount}/{data.finance.invoiceCount} hóa đơn hoàn tất</p></article>}
      </div>
      <div className="personal-report-grid">
        <article className="personal-report-panel"><header><BookOpenCheck size={18} /><div><strong>Kết quả theo môn</strong><small>Trung bình các đầu điểm hiện có</small></div></header>
          {Object.keys(data.subjectAverages).length ? <div className="personal-subject-bars">{Object.entries(data.subjectAverages).map(([subject, score]) => <div key={subject}><span><strong>{subject}</strong><small>{score.toFixed(1)}/10</small></span><i><b style={{ width: `${score * 10}%` }} /></i></div>)}</div> : <p className="live-loading">Chưa có dữ liệu điểm.</p>}
        </article>
        <article className="personal-report-panel"><header><BarChart3 size={18} /><div><strong>Cơ cấu chuyên cần</strong><small>Tổng hợp toàn bộ dữ liệu được phép xem</small></div></header>
          <div className="personal-attendance-stats"><div><span>Có mặt</span><strong>{data.present}</strong></div><div><span>Đi muộn</span><strong>{data.late}</strong></div><div><span>Vắng có phép</span><strong>{data.absentExcused}</strong></div><div><span>Vắng không phép</span><strong>{data.absentUnexcused}</strong></div></div>
        </article>
      </div>
    </div>}</Async>
  </Section>;
}
