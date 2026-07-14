import { useState } from 'react';
import { GraduationCap, ClipboardCheck, LogIn, School, UserRoundCog, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../api/auth';
import { api } from '../../api/client';
import type { CSSProperties } from 'react';

const demos = [
  { label: 'Admin', username: 'admin', password: 'admin@123', Icon: UserRoundCog, color: '#2563eb' },
  { label: 'Teacher', username: 'gv.hoa', password: 'teacher@123', Icon: ClipboardCheck, color: '#0f766e' },
  { label: 'Student', username: 'hs.an', password: 'student@123', Icon: GraduationCap, color: '#7c3aed' },
  { label: 'Parent', username: 'ph.pham', password: 'parent@123', Icon: RefreshCcw, color: '#c2410c' },
];

type View = 'login' | 'forgot' | 'reset';

export function LoginPage() {
  const { login } = useAuth();
  const resetToken = new URLSearchParams(window.location.search).get('token');
  const [view, setView] = useState<View>(resetToken ? 'reset' : 'login');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin@123');
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await action(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Không thể thực hiện yêu cầu'); }
    finally { setBusy(false); }
  };

  const submitLogin = (u = username, p = password) => run(() => login(u, p));
  const submitForgot = () => run(async () => {
    const value = identifier.trim();
    await api.post('/auth/forgot-password', value.includes('@') ? { email: value } : { username: value });
    setMessage('Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.');
  });
  const submitReset = () => run(async () => {
    if (!resetToken) throw new Error('Liên kết đặt lại mật khẩu không hợp lệ');
    if (newPassword.length < 8) throw new Error('Mật khẩu phải có ít nhất 8 ký tự');
    if (newPassword !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp');
    await api.post('/auth/reset-password', { token: resetToken, newPassword });
    window.history.replaceState({}, '', window.location.pathname);
    setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.');
    setView('login');
  });

  return (
    <div className="login-screen"><div className="login-card">
      <div className="login-brand"><div className="brand-mark"><School size={26} /></div><div><strong>Smart School Ecosystem</strong><span>ReactJS Web Console</span></div></div>

      {view === 'login' && <>
        <h1>Đăng nhập</h1><p className="login-sub">Kết nối an toàn tới hệ thống quản lý trường học</p>
        <form onSubmit={(event) => { event.preventDefault(); submitLogin(); }}>
          <label className="login-field"><span>Tên đăng nhập</span><input value={username} onChange={(event) => setUsername(event.target.value)} autoFocus autoComplete="username" /></label>
          <label className="login-field"><span>Mật khẩu</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          <Feedback error={error} message={message} />
          <button className="login-submit" type="submit" disabled={busy}><LogIn size={18} />{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          <button className="link-button" type="button" onClick={() => { setView('forgot'); setError(null); setMessage(null); }}>Quên mật khẩu?</button>
        </form>
        <div className="login-divider"><span>Tài khoản phát triển local</span></div>
        <div className="demo-chips">{demos.map((demo) => <button key={demo.username} type="button" disabled={busy} onClick={() => { setUsername(demo.username); setPassword(demo.password); submitLogin(demo.username, demo.password); }} style={{ '--role-color': demo.color } as CSSProperties}><demo.Icon size={18} /><span>{demo.label}</span><small>{demo.username}</small></button>)}</div>
      </>}

      {view === 'forgot' && <>
        <h1>Quên mật khẩu</h1><p className="login-sub">Nhập email hoặc tên đăng nhập của bạn.</p>
        <form onSubmit={(event) => { event.preventDefault(); submitForgot(); }}>
          <label className="login-field"><span>Email hoặc tên đăng nhập</span><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoFocus /></label>
          <Feedback error={error} message={message} />
          <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi hướng dẫn'}</button>
          <button className="link-button" type="button" onClick={() => setView('login')}>Quay lại đăng nhập</button>
        </form>
      </>}

      {view === 'reset' && <>
        <h1>Đặt lại mật khẩu</h1><p className="login-sub">Tạo mật khẩu mới có ít nhất 8 ký tự.</p>
        <form onSubmit={(event) => { event.preventDefault(); submitReset(); }}>
          <label className="login-field"><span>Mật khẩu mới</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={8} autoFocus autoComplete="new-password" /></label>
          <label className="login-field"><span>Xác nhận mật khẩu</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" /></label>
          <Feedback error={error} message={message} />
          <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</button>
        </form>
      </>}
    </div></div>
  );
}

function Feedback({ error, message }: { error: string | null; message: string | null }) {
  return <>{error && <div className="login-error">{error}</div>}{message && <div className="login-success">{message}</div>}</>;
}
