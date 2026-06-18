import { useState } from 'react';
import Lottie from 'lottie-react';
import { GraduationCap, ClipboardCheck, LogIn, School, UserRoundCog, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../api/auth';
import loginAnimation from '../../assets/Login.json';

const demos = [
  { label: 'Admin', username: 'admin', password: 'admin@123', Icon: UserRoundCog, color: '#2563eb' },
  { label: 'Teacher', username: 'gv.hoa', password: 'teacher@123', Icon: ClipboardCheck, color: '#0f766e' },
  { label: 'Student', username: 'hs.an', password: 'student@123', Icon: GraduationCap, color: '#7c3aed' },
  { label: 'Parent', username: 'ph.pham', password: 'parent@123', Icon: RefreshCcw, color: '#c2410c' },
];

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin@123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (u = username, p = password) => {
    setBusy(true);
    setError(null);
    try {
      await login(u, p);
    } catch (e: any) {
      setError(e?.message || 'Đăng nhập thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-split">
        <div className="login-art">
          <Lottie animationData={loginAnimation} loop autoplay style={{ width: '100%', maxWidth: 460 }} />
          <div className="login-art-caption">
            <strong>Smart School Ecosystem</strong>
            <span>Quản lý trường học thông minh — Admin · Giáo viên · Học sinh · Phụ huynh</span>
          </div>
        </div>

        <div className="login-card">
          <div className="login-brand">
            <div className="brand-mark"><School size={26} /></div>
            <div>
              <strong>Smart School Ecosystem</strong>
              <span>Cổng đăng nhập</span>
            </div>
          </div>

          <h1>Đăng nhập</h1>
          <p className="login-sub">Kết nối backend thật tại <code>localhost:4000</code></p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label className="login-field">
              <span>Tên đăng nhập</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </label>
            <label className="login-field">
              <span>Mật khẩu</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>

            {error && <div className="login-error">{error}</div>}

            <button className="login-submit" type="submit" disabled={busy}>
              <LogIn size={18} />
              {busy ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="login-divider"><span>Đăng nhập nhanh (demo)</span></div>
          <div className="demo-chips">
            {demos.map((d) => (
              <button
                key={d.username}
                type="button"
                disabled={busy}
                onClick={() => {
                  setUsername(d.username);
                  setPassword(d.password);
                  submit(d.username, d.password);
                }}
                style={{ ['--role-color' as any]: d.color }}
              >
                <d.Icon size={18} />
                <span>{d.label}</span>
                <small>{d.username}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
