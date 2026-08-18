import { useState } from 'react';
import { KeyRound, Laptop, LogOut, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type { UserDevice, UserSession } from '../../api/types';
import { Modal, Field } from '../live/Modal';
import { fmtDateTime, useToast } from '../live/common';

export function AccountSecurityModal({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth();
  const sessions = useApi<UserSession[]>('/me/sessions');
  const devices = useApi<UserDevice[]>('/me/devices');
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  const changePassword = async () => {
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(newPassword)) {
      return toast.show('err', 'Mật khẩu mới cần ít nhất 10 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt.');
    }
    if (newPassword !== confirmation) return toast.show('err', 'Mật khẩu xác nhận không khớp.');
    setBusy(true);
    try {
      await api.put('/me/password', { currentPassword, newPassword });
      logout();
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể đổi mật khẩu.');
    } finally {
      setBusy(false);
    }
  };

  const revokeSession = async (session: UserSession) => {
    try {
      await api.del(`/me/sessions/${session.id}`);
      if (session.current) return logout();
      sessions.reload();
      toast.show('ok', 'Đã đăng xuất phiên được chọn.');
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể thu hồi phiên.');
    }
  };

  const revokeAll = async () => {
    try {
      await api.del('/me/sessions');
      logout();
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể đăng xuất tất cả phiên.');
    }
  };

  const deactivateDevice = async (device: UserDevice) => {
    try {
      await api.del(`/me/devices/${device.id}`);
      devices.reload();
      sessions.reload();
      toast.show('ok', 'Đã ngừng tin cậy thiết bị.');
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể ngừng thiết bị.');
    }
  };

  return (
    <Modal title="Bảo mật tài khoản" onClose={onClose} size="wide">
      <div className="account-security">
        {toast.node}
        <section>
          <header><ShieldCheck size={19} /><div><h4>Đổi mật khẩu</h4><p>Mọi phiên đăng nhập sẽ được thu hồi sau khi đổi.</p></div></header>
          <div className="account-security-fields">
            <Field label="Mật khẩu hiện tại"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
            <Field label="Mật khẩu mới"><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field>
            <Field label="Xác nhận mật khẩu"><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>
            <button className="live-btn" type="button" disabled={busy || !currentPassword || !newPassword} onClick={changePassword}><KeyRound size={15} /> {busy ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
          </div>
        </section>

        <section>
          <header><Laptop size={19} /><div><h4>Phiên đăng nhập</h4><p>Kiểm tra và đăng xuất các trình duyệt không còn sử dụng.</p></div><button className="live-btn ghost" type="button" onClick={() => sessions.reload()}><RefreshCw size={14} /> Tải lại</button></header>
          <div className="security-list">
            {(sessions.data || []).map((session) => (
              <div key={session.id}>
                <span className="security-list-icon"><Laptop size={17} /></span>
                <div><strong>{session.deviceName || session.platform || 'Trình duyệt'}</strong><small>{session.ipAddress || 'Không rõ IP'} · Hoạt động {fmtDateTime(session.lastSeenAt || session.createdAt)}</small></div>
                {session.current && <b>Phiên hiện tại</b>}
                <button className="live-btn subtle" type="button" onClick={() => revokeSession(session)}><LogOut size={14} /> Đăng xuất</button>
              </div>
            ))}
            {!sessions.loading && (sessions.data || []).length === 0 && <p>Không có phiên đang hoạt động.</p>}
          </div>
          <button className="live-btn danger security-revoke-all" type="button" onClick={revokeAll}><LogOut size={15} /> Đăng xuất tất cả phiên</button>
        </section>

        <section>
          <header><Smartphone size={19} /><div><h4>Thiết bị đã đăng ký</h4><p>Thiết bị ngừng tin cậy sẽ không tiếp tục nhận thông báo.</p></div></header>
          <div className="security-list">
            {(devices.data || []).map((device) => (
              <div key={device.id}>
                <span className="security-list-icon"><Smartphone size={17} /></span>
                <div><strong>{device.deviceName || device.platform}</strong><small>{device.lastIpAddress || 'Không rõ IP'} · {fmtDateTime(device.lastSeenAt)}</small></div>
                <b className={device.active ? '' : 'muted'}>{device.active ? 'Đang hoạt động' : 'Đã ngừng'}</b>
                {device.active && <button className="live-btn subtle" type="button" onClick={() => deactivateDevice(device)}>Ngừng tin cậy</button>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
