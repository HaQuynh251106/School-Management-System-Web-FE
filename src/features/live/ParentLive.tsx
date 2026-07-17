import { useEffect } from 'react';
import { CreditCard, BookOpen, ClipboardCheck, Users, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useActiveChild } from '../../api/activeChild';
import type { ApiUser, Grade, AttendanceRecord, Invoice, PaymentInitResponse } from '../../api/types';
import { Section, FunctionTabs, StatusPill, Badge, InfoGrid } from '../../components/ui';
import { Async, useToast, ATT_LABEL, fmtDate, money } from './common';
import { ExtracurricularLive } from './SharedLive';

/* ===== D5 — Đăng ký ngoại khóa cho con (dùng con đang chọn) ===== */
export function ParentExtracurricularLive() {
  const { childId } = useActiveChild();
  return <ExtracurricularLive actor="parent" childId={childId} />;
}

function useChildren() {
  return useApi<ApiUser[]>('/me/children');
}

/* ===== D1 — Switch Profile ===== */
export function ParentSwitchLive() {
  const children = useChildren();
  const { childId, setChildId } = useActiveChild();

  useEffect(() => {
    if (!childId && children.data && children.data.length) setChildId(children.data[0].id);
  }, [children.data, childId, setChildId]);

  return (
    <Section title="Chọn học sinh" subtitle="Chọn con cần theo dõi" wide>
      <Async state={children} empty="Tài khoản chưa liên kết học sinh">
        {(list) => {
          const active = list.find((c) => c.id === childId) || list[0];
          return (
            <>
              <div className="child-tabs">
                {list.map((c) => (
                  <button key={c.id} className={c.id === (active?.id) ? 'active' : ''} onClick={() => setChildId(c.id)}>
                    <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />{c.fullName} · {c.className}
                  </button>
                ))}
              </div>
              {active && (
                <InfoGrid items={[
                  { title: 'Họ tên', value: active.fullName, meta: '@' + active.username },
                  { title: 'Mã học sinh', value: active.studentCode || '—', meta: 'Mã định danh' },
                  { title: 'Lớp', value: active.className || '—', meta: active.classId || '' },
                  { title: 'Trạng thái', value: 'Đang theo dõi', meta: 'Đã chọn' },
                ]} />
              )}
            </>
          );
        }}
      </Async>
    </Section>
  );
}

/* ===== D2 — Giám sát học tập ===== */
export function ParentMonitorLive() {
  const { childId } = useActiveChild();
  const grades = useApi<Grade[]>(childId ? `/grades?studentId=${childId}` : null);
  const att = useApi<AttendanceRecord[]>(childId ? `/attendance?studentId=${childId}` : null);

  if (!childId) {
    return <Section title="Theo dõi học tập" subtitle="Bạn chưa chọn học sinh" wide>
      <div className="live-loading">Hãy vào mục “Chọn học sinh” để tiếp tục.</div></Section>;
  }

  return (
    <FunctionTabs tabs={[
      { id: 'grades', label: 'Điểm', Icon: BookOpen, content: (
        <Section title="Điểm của con" subtitle="Kết quả học tập theo từng môn" wide>
          <Async paginate state={grades} empty="Chưa có điểm" itemLabel="điểm số">
            {(l) => (<table className="live-table"><thead><tr><th>Môn</th><th>Loại điểm</th><th>Điểm</th><th>Ngày</th></tr></thead>
              <tbody>{l.map((g) => <tr key={g.id}><td><strong>{g.subjectName}</strong></td><td>{g.categoryName}</td><td><strong>{g.score?.toFixed(1)}</strong></td><td>{fmtDate(g.recordedAt)}</td></tr>)}</tbody></table>)}
          </Async>
        </Section>
      ) },
      { id: 'att', label: 'Chuyên cần', Icon: ClipboardCheck, content: (
        <Section title="Chuyên cần của con" subtitle="Lịch sử đi học và ghi chú" wide>
          <Async paginate state={att} empty="Chưa có dữ liệu" itemLabel="lượt điểm danh">
            {(l) => (<table className="live-table"><thead><tr><th>Ngày</th><th>Môn</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
              <tbody>{l.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((r) => <tr key={r.id}><td>{fmtDate(r.date)}</td><td>{r.subjectName}</td><td><StatusPill value={ATT_LABEL[r.status] || r.status} /></td><td><small>{r.note || '—'}</small></td></tr>)}</tbody></table>)}
          </Async>
        </Section>
      ) },
    ]} />
  );
}

/* ===== D4 — Học phí ===== */
export function ParentInvoiceLive() {
  const invoices = useApi<Invoice[]>('/invoices');
  const toast = useToast();
  const pay = async (inv: Invoice) => {
    try {
      const initiated = await api.post<PaymentInitResponse>('/payments', { invoiceId: inv.id, method: 'VNPAY' });
      if (initiated.callbackUrl && initiated.sandboxCallback) {
        await api.post(initiated.callbackUrl, initiated.sandboxCallback);
        toast.show('ok', `Thanh toán ${inv.code} thành công`);
      } else {
        toast.show('ok', `Giao dịch ${inv.code} đang chờ cổng thanh toán xác nhận`);
      }
      invoices.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };
  return (
    <Section title="Học phí" subtitle="Theo dõi và thanh toán các khoản thu" wide
      action={<button className="live-btn ghost" onClick={() => invoices.reload()}><RefreshCw size={14} /> Tải lại</button>}>
      {toast.node}
      <Async paginate state={invoices} empty="Chưa có hóa đơn. Vui lòng liên hệ nhà trường." itemLabel="hóa đơn">
        {(l) => (
          <table className="live-table">
            <thead><tr><th>Mã HĐ</th><th>Học sinh</th><th>Tổng</th><th>Đã trả</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>{l.map((i) => (
              <tr key={i.id}>
                <td><strong>{i.code}</strong></td><td>{i.studentName}</td><td>{money(i.totalAmount)}</td><td>{money(i.paidAmount)}</td>
                <td><StatusPill value={i.status} /></td>
                <td>{i.status !== 'PAID'
                  ? <button className="live-btn" onClick={() => pay(i)}><CreditCard size={14} /> Thanh toán</button>
                  : <Badge tone="green">Đã thanh toán</Badge>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Async>
    </Section>
  );
}
