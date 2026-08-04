import { useState } from 'react';
import {
  BookOpenCheck, ClipboardCheck, Eye, EyeOff, GraduationCap, LockKeyhole,
  LogIn, Moon, RefreshCcw, School, ShieldCheck, Sparkles, Sun, UserRound, UserRoundCog, UsersRound,
} from 'lucide-react';
import { useAuth } from '../../api/auth';
import { api } from '../../api/client';
import { useTheme } from '../../api/theme';
import type { CSSProperties } from 'react';

const env = (import.meta as any).env || {};
const showDemoAccounts = env.VITE_SHOW_DEMO_ACCOUNTS === 'true';
const demos = showDemoAccounts ? [
  { label: 'Quản trị', username: env.VITE_DEMO_ADMIN_USERNAME || 'admin', password: env.VITE_DEMO_ADMIN_PASSWORD || 'admin@123', Icon: UserRoundCog, color: '#2563eb' },
  { label: 'Giáo viên', username: env.VITE_DEMO_TEACHER_USERNAME || 'gv.hoa', password: env.VITE_DEMO_TEACHER_PASSWORD || 'teacher@123', Icon: ClipboardCheck, color: '#0f766e' },
  { label: 'Học sinh', username: env.VITE_DEMO_STUDENT_USERNAME || 'hs.an', password: env.VITE_DEMO_STUDENT_PASSWORD || 'student@123', Icon: GraduationCap, color: '#7c3aed' },
  { label: 'Phụ huynh', username: env.VITE_DEMO_PARENT_USERNAME || 'ph.pham', password: env.VITE_DEMO_PARENT_PASSWORD || 'parent@123', Icon: RefreshCcw, color: '#c2410c' },
].filter((account) => account.username && account.password) : [];

type View = 'login' | 'forgot' | 'reset' | 'activate';

const strongPassword = (value: string) => value.length >= 10
  && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);

export function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const resetToken = new URLSearchParams(window.location.search).get('token');
  const activationToken = new URLSearchParams(window.location.search).get('activationToken');
  const [view, setView] = useState<View>(activationToken ? 'activate' : resetToken ? 'reset' : 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    if (!strongPassword(newPassword)) throw new Error('Mật khẩu cần ít nhất 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
    if (newPassword !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp');
    await api.post('/auth/reset-password', { token: resetToken, newPassword });
    window.history.replaceState({}, '', window.location.pathname);
    setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.');
    setView('login');
  });
  const submitActivation = () => run(async () => {
    if (!activationToken) throw new Error('Liên kết kích hoạt tài khoản không hợp lệ');
    if (!strongPassword(newPassword)) throw new Error('Mật khẩu cần ít nhất 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
    if (newPassword !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp');
    await api.post('/auth/activate', { token: activationToken, newPassword });
    window.history.replaceState({}, '', window.location.pathname);
    setMessage('Kích hoạt tài khoản thành công. Bạn có thể đăng nhập bằng mật khẩu vừa tạo.');
    setView('login');
  });

  return (
    <div className="login-screen">
      <button className="login-theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'} title={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'}>
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        <span>{theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}</span>
      </button>
      <main className="login-shell">
        <section className="login-visual" aria-label="Không gian học tập hiện đại">
          <picture>
            <source srcSet="/images/school-login-campus.avif" type="image/avif" />
            <source srcSet="/images/school-login-campus.webp" type="image/webp" />
            <img src="/images/school-login-campus.webp" width="1003" height="1568" alt="Giáo viên và học sinh trong khuôn viên trường học hiện đại" loading="eager" fetchPriority="high" />
          </picture>
          <div className="login-visual-shade" />
          <div className="login-visual-content">
            <span className="login-visual-kicker"><Sparkles size={15} /> Hệ sinh thái giáo dục số</span>
            <div>
              <h2>Kết nối nhà trường,<br />đồng hành cùng học sinh</h2>
              <p>Một không gian quản lý thống nhất, an toàn và thân thiện cho mọi thành viên.</p>
            </div>
            <div className="login-visual-points">
              <span><BookOpenCheck size={17} /> Quản lý tập trung</span>
              <span><ShieldCheck size={17} /> Bảo mật theo vai trò</span>
              <span><UsersRound size={17} /> Kết nối liền mạch</span>
            </div>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-inner">
            <div className="login-brand">
              <div className="brand-mark"><School size={25} /></div>
              <div><strong>Trường học số</strong><span>Cổng quản lý trực tuyến</span></div>
            </div>

            {view === 'login' && <>
              <div className="login-heading">
                <span>Chào mừng trở lại</span>
                <h1>Đăng nhập</h1>
                <p className="login-sub">Nhập thông tin để tiếp tục vào hệ thống.</p>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); submitLogin(); }}>
                <label className="login-field">
                  <span>Tên đăng nhập</span>
                  <div className="login-input-wrap"><UserRound size={18} /><input value={username} onChange={(event) => setUsername(event.target.value)} autoFocus autoComplete="username" placeholder="Nhập tên đăng nhập" /></div>
                </label>
                <div className="login-field">
                  <label id="login-password-label" htmlFor="login-password">Mật khẩu</label>
                  <div className="login-input-wrap"><LockKeyhole size={18} /><input id="login-password" aria-labelledby="login-password-label" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Nhập mật khẩu" /><button type="button" className="password-toggle" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                </div>
                <div className="login-form-actions"><span>Thông tin đăng nhập được bảo mật</span><button className="link-button" type="button" onClick={() => { setView('forgot'); setError(null); setMessage(null); }}>Quên mật khẩu?</button></div>
                <Feedback error={error} message={message} />
                <button className="login-submit" type="submit" disabled={busy}><LogIn size={18} />{busy ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
              </form>
              {demos.length > 0 && <><div className="login-divider"><span>Tài khoản dùng thử</span></div>
              <div className="demo-chips">{demos.map((demo) => <button key={demo.username} type="button" disabled={busy} onClick={() => { setUsername(demo.username); setPassword(demo.password); submitLogin(demo.username, demo.password); }} style={{ '--role-color': demo.color } as CSSProperties}><demo.Icon size={18} /><span>{demo.label}</span><small>{demo.username}</small></button>)}</div></>}
            </>}

            {view === 'forgot' && <>
              <div className="login-heading"><span>Khôi phục tài khoản</span><h1>Quên mật khẩu</h1><p className="login-sub">Nhập email hoặc tên đăng nhập để nhận hướng dẫn.</p></div>
              <form onSubmit={(event) => { event.preventDefault(); submitForgot(); }}>
                <label className="login-field"><span>Email hoặc tên đăng nhập</span><div className="login-input-wrap"><UserRound size={18} /><input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoFocus placeholder="Nhập thông tin tài khoản" /></div></label>
                <Feedback error={error} message={message} />
                <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi hướng dẫn'}</button>
                <button className="link-button login-back" type="button" onClick={() => setView('login')}>Quay lại đăng nhập</button>
              </form>
            </>}

            {view === 'reset' && <>
              <div className="login-heading"><span>Bảo mật tài khoản</span><h1>Đặt lại mật khẩu</h1><p className="login-sub">Tạo mật khẩu mới có ít nhất 10 ký tự.</p></div>
              <form onSubmit={(event) => { event.preventDefault(); submitReset(); }}>
                <label className="login-field"><span>Mật khẩu mới</span><div className="login-input-wrap"><LockKeyhole size={18} /><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={10} autoFocus autoComplete="new-password" /></div></label>
                <label className="login-field"><span>Xác nhận mật khẩu</span><div className="login-input-wrap"><ShieldCheck size={18} /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={10} autoComplete="new-password" /></div></label>
                <Feedback error={error} message={message} />
                <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</button>
              </form>
            </>}

            {view === 'activate' && <>
              <div className="login-heading"><span>Kích hoạt an toàn</span><h1>Tạo mật khẩu của bạn</h1><p className="login-sub">Liên kết chỉ dùng một lần. Mật khẩu phải có chữ hoa, chữ thường, số và ký tự đặc biệt.</p></div>
              <form onSubmit={(event) => { event.preventDefault(); submitActivation(); }}>
                <label className="login-field"><span>Mật khẩu mới</span><div className="login-input-wrap"><LockKeyhole size={18} /><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={10} autoFocus autoComplete="new-password" /></div></label>
                <label className="login-field"><span>Xác nhận mật khẩu</span><div className="login-input-wrap"><ShieldCheck size={18} /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={10} autoComplete="new-password" /></div></label>
                <div className="password-policy-hint"><ShieldCheck size={15} /><span>Không dùng mật khẩu được nhà trường cấp làm mật khẩu lâu dài.</span></div>
                <Feedback error={error} message={message} />
                <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Đang kích hoạt...' : 'Kích hoạt tài khoản'}</button>
              </form>
            </>}
          </div>
          <p className="login-footer">© 2026 Trường học số · Hỗ trợ người dùng an toàn và hiệu quả</p>
        </section>
      </main>
    </div>
  );
}

function Feedback({ error, message }: { error: string | null; message: string | null }) {
  return <>{error && <div className="login-error">{error}</div>}{message && <div className="login-success">{message}</div>}</>;
}
