import { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Mail, MapPin, MessageSquare, Save, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { ApiUser, NotificationPreference } from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async, useToast } from './common';

const CHANNELS = [
  { id: 'IN_APP', label: 'Trong ứng dụng', description: 'Hiển thị tại hộp thư và dashboard', Icon: BellRing },
  { id: 'PUSH', label: 'Thông báo đẩy', description: 'Nhận cảnh báo trên thiết bị đã đăng ký', Icon: Smartphone },
  { id: 'EMAIL', label: 'Email', description: 'Nhận bản sao qua địa chỉ email hồ sơ', Icon: Mail },
] as const;

export function ProfileSettingsLive({ actor }: { actor: 'teacher' | 'student' | 'parent' }) {
  const profile = useApi<ApiUser>('/me');
  const preferences = useApi<NotificationPreference[]>('/notification-preferences');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', phone: '', avatarUrl: '', address: '', guardianName: '', guardianPhone: '' });

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      email: profile.data.email || '', phone: profile.data.phone || '', avatarUrl: profile.data.avatarUrl || '',
      address: profile.data.address || '', guardianName: profile.data.guardianName || '', guardianPhone: profile.data.guardianPhone || '',
    });
  }, [profile.data]);

  const save = async () => {
    setBusy(true);
    try { await api.put('/me/profile', form); toast.show('ok', 'Đã cập nhật hồ sơ cá nhân'); profile.reload(); }
    catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  const toggle = async (channel: string, enabled: boolean) => {
    try {
      await api.put('/notification-preferences', { channel, enabled });
      toast.show('ok', `Đã ${enabled ? 'bật' : 'tắt'} kênh thông báo`);
      preferences.reload();
    } catch (error: any) { toast.show('err', error.message); }
  };

  return <Section title="Hồ sơ & thông báo" subtitle="Quản lý thông tin liên hệ và cách bạn muốn nhận cập nhật" wide>
    {toast.node}
    <Async state={profile}>{(user) => <div className="profile-settings-page">
      <header className="profile-settings-hero">
        <div className="profile-settings-avatar">{form.avatarUrl ? <img src={form.avatarUrl} alt="Ảnh đại diện" /> : <span>{user.fullName.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span>}</div>
        <div><small>HỒ SƠ {actor === 'teacher' ? 'GIÁO VIÊN' : actor === 'student' ? 'HỌC SINH' : 'PHỤ HUYNH'}</small><h3>{user.fullName}</h3><p>@{user.username} · {user.className || user.mainSubject || 'Cổng thông tin nhà trường'}</p></div>
        <StatusPill value={user.status} />
      </header>
      <div className="profile-settings-grid">
        <article className="profile-settings-card">
          <header><span><UserRound size={18} /></span><div><strong>Thông tin liên hệ</strong><small>Các thay đổi được lưu vào hồ sơ thật</small></div></header>
          <div className="profile-form-grid">
            <label><span>Email</span><input className="live-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label><span>Số điện thoại</span><input className="live-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label className="wide"><span>Đường dẫn ảnh đại diện</span><input className="live-input" placeholder="https://..." value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} /></label>
            <label className="wide"><span><MapPin size={14} /> Địa chỉ</span><textarea className="live-input" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
            {actor === 'student' && <><label><span>Người giám hộ</span><input className="live-input" value={form.guardianName} onChange={(event) => setForm({ ...form, guardianName: event.target.value })} /></label><label><span>SĐT người giám hộ</span><input className="live-input" value={form.guardianPhone} onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })} /></label></>}
          </div>
          <footer><span><ShieldCheck size={15} /> Mã, lớp và chuyên môn chỉ quản trị viên được thay đổi.</span><button className="live-btn" disabled={busy} onClick={save}><Save size={15} /> {busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></footer>
        </article>
        <article className="profile-settings-card notification-settings-card">
          <header><span><MessageSquare size={18} /></span><div><strong>Cấu hình thông báo</strong><small>Áp dụng cho tài khoản đang đăng nhập</small></div></header>
          <Async state={preferences}>{(items) => <div className="notification-channel-list">{CHANNELS.map(({ id, label, description, Icon }) => {
            const preference = items.find((item) => item.channel === id);
            const enabled = preference?.enabled ?? true;
            return <label key={id}><span className="notification-channel-icon"><Icon size={18} /></span><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={enabled} onChange={(event) => toggle(id, event.target.checked)} /><i aria-hidden="true"><CheckCircle2 size={13} /></i></label>;
          })}</div>}</Async>
        </article>
      </div>
    </div>}</Async>
  </Section>;
}
