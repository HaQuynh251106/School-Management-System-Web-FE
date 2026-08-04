import { useState } from 'react';
import { BellRing, CalendarDays, CircleDollarSign, GraduationCap, Megaphone, RefreshCw, School, Send, UserRound, UsersRound } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { Announcement, NotificationDeliveryLog } from '../../api/types';
import { Badge, Section, StatusPill } from '../../components/ui';
import { Async, fmtDateTime, useToast } from './common';

const ANNOUNCEMENT_CATEGORIES = [
  { value: 'GENERAL', label: 'Thông báo chung', hint: 'Thông tin điều hành và nhắc nhở chung', title: 'Thông báo từ nhà trường', body: 'Kính gửi quý thầy cô, học sinh và phụ huynh,\n\nNhà trường trân trọng thông báo:' },
  { value: 'HOLIDAY_EVENT', label: 'Nghỉ lễ & sự kiện', hint: 'Lịch nghỉ hoặc hoạt động toàn trường', title: 'Thông báo nghỉ lễ / sự kiện', body: 'Kính gửi quý thầy cô, học sinh và phụ huynh,\n\nNhà trường trân trọng thông báo:' },
  { value: 'ADMINISTRATIVE', label: 'Hành chính & quy định', hint: 'Quy định, hướng dẫn và thủ tục chung', title: 'Thông báo hành chính', body: 'Nhà trường thông báo quy định và hướng dẫn thực hiện như sau:' },
  { value: 'MEETING', label: 'Lịch họp chung', hint: 'Lịch họp và nội dung phối hợp toàn trường', title: 'Thông báo lịch họp', body: 'Nhà trường trân trọng thông báo lịch họp chung như sau:' },
  { value: 'EMERGENCY', label: 'Thông báo khẩn cấp', hint: 'Thông tin cần được chú ý và xử lý ngay', title: 'THÔNG BÁO KHẨN', body: 'Nhà trường thông báo khẩn cấp tới toàn thể cán bộ, giáo viên, học sinh và phụ huynh:' },
];

const ANNOUNCEMENT_AUDIENCES = [
  { value: 'ALL', label: 'Toàn trường', hint: 'Giáo viên, học sinh và phụ huynh', Icon: School },
  { value: 'TEACHER', label: 'Giáo viên', hint: 'Toàn bộ giáo viên đang hoạt động', Icon: UsersRound },
  { value: 'STUDENT', label: 'Học sinh', hint: 'Toàn bộ học sinh đang hoạt động', Icon: GraduationCap },
  { value: 'PARENT', label: 'Phụ huynh', hint: 'Toàn bộ phụ huynh đang hoạt động', Icon: UserRound },
];

const ANNOUNCEMENT_CATEGORY_LABEL: Record<string, string> = {
  ...Object.fromEntries(ANNOUNCEMENT_CATEGORIES.map((item) => [item.value, item.label])),
  HOLIDAY: 'Nghỉ lễ (dữ liệu cũ)', EVENT: 'Sự kiện (dữ liệu cũ)', PARENT_MEETING: 'Họp phụ huynh (dữ liệu cũ)',
};
const ANNOUNCEMENT_AUDIENCE_LABEL = Object.fromEntries(ANNOUNCEMENT_AUDIENCES.map((item) => [item.value, item.label]));
const ANNOUNCEMENT_PRIORITY_LABEL: Record<string, string> = { NORMAL: 'Thông thường', IMPORTANT: 'Quan trọng', URGENT: 'Khẩn cấp' };

/* ============ A9 — Trung tâm thông báo ============ */
export function AdminNotificationsLive() {
  const announcements = useApi<Announcement[]>('/admin/announcements');
  const audienceCounts = useApi<Record<string, number>>('/admin/announcements/audience-counts');
  const deliveryLogs = useApi<NotificationDeliveryLog[]>('/notification-delivery-logs');
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ audience: 'ALL', category: 'GENERAL', priority: 'NORMAL', title: '', body: '', holidayMode: false, holidayStartDate: '', holidayEndDate: '' });
  const selectedCategory = ANNOUNCEMENT_CATEGORIES.find((item) => item.value === form.category) || ANNOUNCEMENT_CATEGORIES[0];
  const recipientCount = audienceCounts.data?.[form.audience] ?? 0;

  const applyCategory = (category: typeof ANNOUNCEMENT_CATEGORIES[number]) => {
    setForm((current) => ({
      ...current,
      category: category.value,
      audience: category.value === 'EMERGENCY' ? 'ALL' : current.audience,
      priority: category.value === 'EMERGENCY' ? 'URGENT' : current.priority,
      title: category.title,
      body: category.body,
      holidayMode: category.value === 'HOLIDAY_EVENT' ? current.holidayMode : false,
      holidayStartDate: category.value === 'HOLIDAY_EVENT' ? current.holidayStartDate : '',
      holidayEndDate: category.value === 'HOLIDAY_EVENT' ? current.holidayEndDate : '',
    }));
  };

  const sendAnnouncement = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.show('err', 'Vui lòng nhập tiêu đề và nội dung thông báo');
    if (form.holidayMode && (!form.holidayStartDate || !form.holidayEndDate)) return toast.show('err', 'Vui lòng chọn đầy đủ thời gian nghỉ');
    if (form.holidayMode && form.holidayEndDate < form.holidayStartDate) return toast.show('err', 'Ngày kết thúc không được trước ngày bắt đầu');
    if (!recipientCount) return toast.show('err', 'Phạm vi đã chọn hiện không có người nhận');
    setSending(true);
    try {
      const sent = await api.post<Announcement>('/announcements', {
        audience: form.audience,
        category: form.category,
        priority: form.priority,
        title: form.title.trim(),
        body: form.body.trim(),
        holidayStartDate: form.holidayMode ? form.holidayStartDate : null,
        holidayEndDate: form.holidayMode ? form.holidayEndDate : null,
      });
      toast.show('ok', form.holidayMode
        ? `Đã thông báo nghỉ và tự động miễn điểm danh trong ${form.holidayStartDate === form.holidayEndDate ? 'ngày đã chọn' : 'khoảng thời gian đã chọn'}`
        : `Đã gửi thông báo tới ${sent.recipientCount ?? recipientCount} người nhận`);
      setForm((current) => ({ ...current, title: '', body: '', priority: 'NORMAL', holidayStartDate: '', holidayEndDate: '' }));
      announcements.reload();
      deliveryLogs.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-notification-center">
      {toast.node}
      <Section title="Trung tâm thông báo" subtitle="Soạn và gửi thông tin đúng đối tượng trong toàn trường" wide
        action={<button className="live-btn ghost" onClick={() => { announcements.reload(); audienceCounts.reload(); deliveryLogs.reload(); }}><RefreshCw size={14} /> Cập nhật dữ liệu</button>}>
        <div className="announcement-audience-summary">
          {ANNOUNCEMENT_AUDIENCES.map(({ value, label, Icon }) => (
            <article key={value} className={form.audience === value ? 'active' : ''}>
              <span><Icon size={18} /></span><div><small>{label}</small><strong>{audienceCounts.data?.[value] ?? '—'}</strong><p>người nhận</p></div>
            </article>
          ))}
        </div>

        <div className="announcement-automation-note">
          <span><CircleDollarSign size={20} /></span>
          <div><strong>Thông báo khoản thu được gửi tự động</strong><small>Khi hóa đơn được phát hành, hệ thống tự gửi số tiền, hạn thanh toán và mã hóa đơn tới toàn bộ phụ huynh liên kết với học sinh.</small></div>
          <Badge tone="green">Tự động</Badge>
        </div>

        <div className="announcement-compose-layout">
          <div className="announcement-compose-form">
            <div className="announcement-compose-heading"><span><Megaphone size={19} /></span><div><strong>Soạn thông báo mới</strong><small>Chọn mẫu tình huống hoặc tự nhập nội dung</small></div></div>

            <div className="announcement-field-group">
              <label>Loại thông báo</label>
              <div className="announcement-category-grid">
                {ANNOUNCEMENT_CATEGORIES.map((category) => (
                  <button type="button" key={category.value} className={form.category === category.value ? 'active' : ''} onClick={() => applyCategory(category)}>
                    <strong>{category.label}</strong><small>{category.hint}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="announcement-field-group">
              <label>Phạm vi nhận</label>
              <div className="announcement-audience-grid">
                {ANNOUNCEMENT_AUDIENCES.map(({ value, label, hint, Icon }) => (
                  <button type="button" key={value} className={form.audience === value ? 'active' : ''} disabled={(form.holidayMode || form.category === 'EMERGENCY') && value !== 'ALL'} onClick={() => setForm({ ...form, audience: value })}>
                    <span><Icon size={17} /></span><div><strong>{label}</strong><small>{hint}</small></div><b>{audienceCounts.data?.[value] ?? 0}</b>
                  </button>
                ))}
              </div>
              {(form.holidayMode || form.category === 'EMERGENCY') && <small className="announcement-holiday-help">{form.holidayMode ? 'Thông báo nghỉ áp dụng cho toàn trường và tự động tắt yêu cầu điểm danh trong thời gian đã chọn.' : 'Thông báo khẩn cấp luôn gửi tới toàn trường với mức độ Khẩn cấp.'}</small>}
            </div>

            <div className="announcement-form-grid">
              {form.category === 'HOLIDAY_EVENT' && <label className="wide admin-user-exception-confirm"><input type="checkbox" checked={form.holidayMode} onChange={(event) => setForm({ ...form, holidayMode: event.target.checked, audience: event.target.checked ? 'ALL' : form.audience, holidayStartDate: event.target.checked ? form.holidayStartDate : '', holidayEndDate: event.target.checked ? form.holidayEndDate : '' })} /><span>Đây là thông báo ngày nghỉ; tự động miễn điểm danh trong khoảng thời gian bên dưới.</span></label>}
              {form.holidayMode && <>
                <label><span>Ngày bắt đầu nghỉ</span><input type="date" value={form.holidayStartDate} onChange={(event) => setForm({ ...form, holidayStartDate: event.target.value, holidayEndDate: form.holidayEndDate && form.holidayEndDate < event.target.value ? event.target.value : form.holidayEndDate })} /></label>
                <label><span>Ngày kết thúc nghỉ</span><input type="date" min={form.holidayStartDate} value={form.holidayEndDate} onChange={(event) => setForm({ ...form, holidayEndDate: event.target.value })} /></label>
              </>}
              <label className="wide"><span>Tiêu đề</span><input maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Nhập tiêu đề rõ ràng, dễ hiểu" /></label>
              <label><span>Mức độ</span><select value={form.priority} disabled={form.category === 'EMERGENCY'} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="NORMAL">Thông thường</option><option value="IMPORTANT">Quan trọng</option><option value="URGENT">Khẩn cấp</option></select></label>
              <label className="wide"><span>Nội dung</span><textarea maxLength={4000} rows={7} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Nhập đầy đủ thời gian, địa điểm và hướng dẫn cần thiết…" /><small>{form.body.length}/4000 ký tự</small></label>
            </div>
          </div>

          <aside className="announcement-preview">
            <div className="announcement-preview-heading"><BellRing size={18} /><div><strong>Xem trước thông báo</strong><small>Nội dung người nhận sẽ nhìn thấy</small></div></div>
            <div className={`announcement-preview-card priority-${form.priority.toLowerCase()}`}>
              <header><Badge tone={form.priority === 'URGENT' ? 'red' : 'blue'}>{selectedCategory.label}</Badge><span>{ANNOUNCEMENT_PRIORITY_LABEL[form.priority]}</span></header>
              <strong>{form.title || 'Tiêu đề thông báo'}</strong>
              <p>{form.body || 'Nội dung thông báo sẽ hiển thị tại đây.'}</p>
              {form.holidayMode && <small><CalendarDays size={14} /> {form.holidayStartDate || 'Chọn ngày bắt đầu'} → {form.holidayEndDate || 'Chọn ngày kết thúc'}</small>}
              <small>Vừa xong · Từ Ban quản trị nhà trường</small>
            </div>
            <div className="announcement-send-summary"><span>Đối tượng</span><strong>{ANNOUNCEMENT_AUDIENCE_LABEL[form.audience]}</strong><span>Dự kiến nhận</span><strong>{recipientCount} người</strong></div>
            <p className="announcement-send-note">Thông báo được lưu vào hộp thư trong ứng dụng và gửi thêm qua email/push nếu người dùng đã bật kênh tương ứng.</p>
            <button type="button" className="live-btn announcement-send-button" disabled={sending || !recipientCount || !form.title.trim() || !form.body.trim()} onClick={sendAnnouncement}><Send size={16} /> {sending ? 'Đang gửi…' : `Gửi ngay tới ${recipientCount} người`}</button>
          </aside>
        </div>
      </Section>

      <Section title="Lịch sử gửi thông báo" subtitle="Theo dõi phạm vi, nội dung và số lượng người nhận" wide>
        <Async paginate state={announcements} empty="Chưa có thông báo nào được gửi" itemLabel="thông báo">
          {(items) => <div className="admin-table-scroll"><table className="live-table announcement-history-table"><thead><tr><th>Thời gian</th><th>Loại</th><th>Đối tượng</th><th>Nội dung</th><th>Mức độ</th><th>Người nhận</th><th>Trạng thái</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}><td>{fmtDateTime(item.createdAt)}</td><td><Badge tone="blue">{ANNOUNCEMENT_CATEGORY_LABEL[item.category || 'GENERAL'] || item.category}</Badge></td><td><strong>{ANNOUNCEMENT_AUDIENCE_LABEL[item.audience] || item.audience}</strong></td><td><strong>{item.title}</strong><small>{item.body}</small>{['HOLIDAY', 'HOLIDAY_EVENT'].includes(item.category || '') && item.holidayStartDate && <small>Thời gian nghỉ: {item.holidayStartDate} → {item.holidayEndDate}</small>}</td><td><span className={`announcement-priority priority-${(item.priority || 'NORMAL').toLowerCase()}`}>{ANNOUNCEMENT_PRIORITY_LABEL[item.priority || 'NORMAL'] || item.priority}</span></td><td><strong>{item.recipientCount ? item.recipientCount : '—'}</strong></td><td><StatusPill value={item.status === 'SENT' ? 'Đã gửi' : item.status || 'Đã gửi'} /></td></tr>)}</tbody>
          </table></div>}
        </Async>
      </Section>

      <Section title="Nhật ký chuyển phát" subtitle="Kiểm tra kênh nào đã nhận, bị bỏ qua hoặc gửi thất bại" wide>
        <Async paginate state={deliveryLogs} empty="Chưa có lượt chuyển phát" itemLabel="lượt chuyển phát">
          {(items) => <div className="admin-table-scroll"><table className="live-table"><thead><tr><th>Thời gian</th><th>Kênh</th><th>Người nhận</th><th>Trạng thái</th><th>Số lần</th><th>Chi tiết</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>
            <td>{fmtDateTime(item.createdAt)}</td><td><strong>{{ IN_APP: 'Trong ứng dụng', EMAIL: 'Email', PUSH: 'Thông báo đẩy' }[item.channel]}</strong></td><td>{item.recipientId}</td><td><StatusPill value={item.status} /></td><td>{item.attempts}</td><td>{item.detail || 'Đã chuyển phát thành công'}</td>
          </tr>)}</tbody></table></div>}
        </Async>
      </Section>

    </div>
  );
}
