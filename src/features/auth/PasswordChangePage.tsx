import { useState } from 'react';
import { Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';

export function PasswordChangePage() {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (newPassword.length < 10) return setError('Mật khẩu mới phải có ít nhất 10 ký tự.');
    if (newPassword !== confirmation) return setError('Mật khẩu xác nhận không khớp.');
    if (newPassword === currentPassword) return setError('Mật khẩu mới phải khác mật khẩu hiện tại.');
    setBusy(true);
    try {
      await api.put('/me/password', { currentPassword, newPassword });
      logout();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật mật khẩu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen password-change-screen">
      <main className="password-change-card">
        <div className="password-change-icon"><ShieldCheck size={30} /></div>
        <span className="login-visual-kicker"><KeyRound size={15} /> Bảo vệ tài khoản</span>
        <h1>Đổi mật khẩu lần đầu</h1>
        <p>Xin chào <strong>{user?.fullName}</strong>. Tài khoản này đang dùng mật khẩu tạm; hãy đổi mật khẩu trước khi tiếp tục.</p>
        <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label className="login-field"><span>Mật khẩu hiện tại</span><div className="login-input-wrap"><KeyRound size={18} /><input type={show ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoFocus autoComplete="current-password" /></div></label>
          <label className="login-field"><span>Mật khẩu mới</span><div className="login-input-wrap"><KeyRound size={18} /><input type={show ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={10} autoComplete="new-password" /><button type="button" className="password-toggle" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShow((value) => !value)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <label className="login-field"><span>Xác nhận mật khẩu mới</span><div className="login-input-wrap"><ShieldCheck size={18} /><input type={show ? 'text' : 'password'} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={10} autoComplete="new-password" /></div></label>
          {error && <div className="login-error">{error}</div>}
          <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Đang cập nhật...' : 'Đổi mật khẩu và đăng nhập lại'}</button>
        </form>
        <button className="link-button password-change-logout" type="button" onClick={logout}><LogOut size={15} /> Đăng xuất</button>
      </main>
    </div>
  );
}
