import { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, KeyRound, Mail, MapPin, MessageSquare, Save, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type { ApiUser, NotificationPreference } from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async, useToast } from './common';
import { browserPushConfigured, registerBrowserPush } from '../../api/push';

const CHANNELS = [
  { id: 'IN_APP', label: 'Trong ứng dụng', description: 'Hiển thị tại hộp thư và dashboard', Icon: BellRing },
  { id: 'PUSH', label: 'Thông báo đẩy', description: 'Nhận cảnh báo trên thiết bị đã đăng ký', Icon: Smartphone },
  { id: 'EMAIL', label: 'Email', description: 'Nhận bản sao qua địa chỉ email hồ sơ', Icon: Mail },
] as const;

export function ProfileSettingsLive({ actor }: { actor: 'teacher' | 'student' | 'parent' }) {
  const profile = useApi<ApiUser>('/me');
  const preferences = useApi<NotificationPreference[]>('/notification-preferences');
  const capabilities = useApi<Record<string, boolean>>('/notification-capabilities');
  const toast = useToast();
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [registeringPush, setRegisteringPush] = useState(false);
  const [form, setForm] = useState({ email: '', phone: '', avatarUrl: '', address: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmation: '' });

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      email: profile.data.email || '', phone: profile.data.phone || '', avatarUrl: profile.data.avatarUrl || '',
      address: profile.data.address || '',
    });
  }, [profile.data]);

  const save = async () => {
    setBusy(true);
    try { await api.put('/me/profile', form); toast.show('ok', 'Đã cập nhật hồ sơ cá nhân'); profile.reload(); }
    catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  const changePassword = async () => {
    if (password.newPassword.length < 10) return toast.show('err', 'Mật khẩu mới phải có ít nhất 10 ký tự');
    if (password.newPassword !== password.confirmation) return toast.show('err', 'Mật khẩu xác nhận không khớp');
    if (password.currentPassword === password.newPassword) return toast.show('err', 'Mật khẩu mới phải khác mật khẩu hiện tại');
    setBusy(true);
    try {
      await api.put('/me/password', { currentPassword: password.currentPassword, newPassword: password.newPassword });
      window.alert('Đổi mật khẩu thành công. Vui lòng đăng nhập lại để bảo vệ tài khoản.');
      logout();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const toggle = async (channel: string, enabled: boolean) => {
    try {
      if (channel === 'PUSH' && enabled) {
        setRegisteringPush(true);
        await registerBrowserPush();
      }
      await api.put('/notification-preferences', { channel, enabled });
      toast.show('ok', `Đã ${enabled ? 'bật' : 'tắt'} kênh thông báo`);
      preferences.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setRegisteringPush(false); }
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
            {actor === 'student' && <><label><span>Người giám hộ</span><input className="live-input" value={user.guardianName || 'Chưa cập nhật'} disabled /></label><label><span>SĐT người giám hộ</span><input className="live-input" value={user.guardianPhone || 'Chưa cập nhật'} disabled /></label></>}
          </div>
          <footer><span><ShieldCheck size={15} /> Mã, lớp và chuyên môn chỉ quản trị viên được thay đổi.</span><button className="live-btn" disabled={busy} onClick={save}><Save size={15} /> {busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button></footer>
        </article>
        <article className="profile-settings-card notification-settings-card">
          <header><span><MessageSquare size={18} /></span><div><strong>Cấu hình thông báo</strong><small>Áp dụng cho tài khoản đang đăng nhập</small></div></header>
          <Async state={preferences}>{(items) => <div className="notification-channel-list">{CHANNELS.map(({ id, label, description, Icon }) => {
            const preference = items.find((item) => item.channel === id);
            const available = capabilities.data?.[id] ?? id === 'IN_APP';
            const enabled = available && (preference?.enabled ?? id === 'IN_APP');
            const clientAvailable = id !== 'PUSH' || browserPushConfigured();
            return <label key={id} className={!available || !clientAvailable ? 'disabled' : ''}><span className="notification-channel-icon"><Icon size={18} /></span><span><strong>{label}</strong><small>{!available ? 'Nhà trường chưa cấu hình kênh này' : !clientAvailable ? 'Ứng dụng web chưa có cấu hình Firebase' : id === 'PUSH' && registeringPush ? 'Đang đăng ký thiết bị…' : description}</small></span><input type="checkbox" checked={enabled} disabled={!available || !clientAvailable || id === 'IN_APP' || registeringPush} onChange={(event) => toggle(id, event.target.checked)} /><i aria-hidden="true"><CheckCircle2 size={13} /></i></label>;
          })}</div>}</Async>
        </article>
        <article className="profile-settings-card">
          <header><span><KeyRound size={18} /></span><div><strong>Bảo mật tài khoản</strong><small>Đổi mật khẩu sẽ đăng xuất tất cả phiên cũ</small></div></header>
          <div className="profile-form-grid">
            <label className="wide"><span>Mật khẩu hiện tại</span><input className="live-input" type="password" autoComplete="current-password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /></label>
            <label><span>Mật khẩu mới</span><input className="live-input" type="password" minLength={10} autoComplete="new-password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /></label>
            <label><span>Xác nhận mật khẩu</span><input className="live-input" type="password" minLength={10} autoComplete="new-password" value={password.confirmation} onChange={(event) => setPassword({ ...password, confirmation: event.target.value })} /></label>
          </div>
          <footer><span><ShieldCheck size={15} /> Không chia sẻ mật khẩu hoặc mã xác thực với người khác.</span><button className="live-btn" disabled={busy || !password.currentPassword || !password.newPassword || !password.confirmation} onClick={changePassword}><KeyRound size={15} /> Đổi mật khẩu</button></footer>
        </article>
      </div>
    </div>}</Async>
  </Section>;
}
