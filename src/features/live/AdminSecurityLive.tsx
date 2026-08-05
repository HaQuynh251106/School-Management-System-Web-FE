import { useState } from 'react';
import { CheckCircle2, KeyRound, Laptop, LogOut, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { Section, StatusPill } from '../../components/ui';
import { Async, useToast } from './common';
import { Modal } from './Modal';
import { ProfileSettingsLive } from './ProfileSettingsLive';

type Session = { id: string; device: string; ipAddress?: string; createdAt: string; expiresAt: string; current: boolean };
type LoginHistory = { id: string; success: boolean; failureReason?: string; ipAddress?: string; userAgent?: string; createdAt: string };
type TwoFactorSetup = { secret: string; otpauthUri: string };
const time = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export function AdminSecurityLive() {
  const sessions = useApi<Session[]>('/auth/sessions');
  const history = useApi<LoginHistory[]>('/auth/login-history');
  const twoFactor = useApi<{ enabled: boolean }>('/auth/two-factor/status');
  const toast = useToast();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Session | 'others' | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);

  const beginSetup = async () => {
    setBusy(true);
    try { setSetup(await api.post<TwoFactorSetup>('/auth/two-factor/setup')); setCode(''); }
    catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };
  const enable = async () => {
    setBusy(true);
    try { await api.post('/auth/two-factor/enable', { code }); setSetup(null); setCode(''); await twoFactor.reload(); toast.show('ok', 'Đã bật xác thực hai lớp cho tài khoản Admin.'); }
    catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try { await api.post('/auth/two-factor/disable', { code }); setDisableOpen(false); setCode(''); await twoFactor.reload(); toast.show('ok', 'Đã tắt xác thực hai lớp.'); }
    catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      if (revokeTarget === 'others') await api.post('/auth/sessions/revoke-others');
      else await api.del(`/auth/sessions/${revokeTarget.id}`);
      setRevokeTarget(null); await sessions.reload(); toast.show('ok', 'Đã thu hồi phiên đăng nhập đã chọn.');
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  return <div className="admin-security-page">
    {toast.node}
    {setup && <Modal title="Thiết lập xác thực hai lớp" onClose={() => !busy && setSetup(null)} footer={<><button className="live-btn ghost" type="button" disabled={busy} onClick={() => setSetup(null)}>Hủy</button><button className="live-btn" type="button" disabled={busy || code.length !== 6} onClick={enable}><ShieldCheck size={15} /> Xác nhận bật 2FA</button></>}>
      <div className="security-setup-guide"><span>1</span><p>Mở Google Authenticator, Microsoft Authenticator hoặc ứng dụng TOTP tương thích.</p><span>2</span><p>Chọn nhập khóa thiết lập và dùng khóa dưới đây.</p></div>
      <code className="security-secret">{setup.secret}</code>
      <label className="modal-field"><span>Mã 6 chữ số đang hiển thị</span><input className="live-input" autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
    </Modal>}
    {disableOpen && <Modal title="Tắt xác thực hai lớp" onClose={() => !busy && setDisableOpen(false)} footer={<><button className="live-btn ghost" type="button" onClick={() => setDisableOpen(false)}>Hủy</button><button className="live-btn danger" type="button" disabled={busy || code.length !== 6} onClick={disable}>Xác nhận tắt</button></>}><div className="security-warning"><TriangleAlert size={22} /><p>Thao tác này làm giảm mức bảo vệ tài khoản. Nhập mã hiện tại để xác nhận.</p></div><label className="modal-field"><span>Mã xác thực</span><input className="live-input" autoFocus inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label></Modal>}
    {revokeTarget && <Modal title="Thu hồi phiên đăng nhập" onClose={() => !busy && setRevokeTarget(null)} footer={<><button className="live-btn ghost" type="button" onClick={() => setRevokeTarget(null)}>Hủy</button><button className="live-btn danger" type="button" disabled={busy} onClick={revoke}><LogOut size={15} /> Thu hồi phiên</button></>}><p>{revokeTarget === 'others' ? 'Tất cả phiên khác sẽ phải đăng nhập lại. Phiên đang sử dụng vẫn được giữ.' : `Thiết bị ${revokeTarget.device} sẽ mất quyền truy cập khi token hết hiệu lực.`}</p></Modal>}
    <ProfileSettingsLive actor="admin" />
    <Section title="Bảo vệ phiên đăng nhập" subtitle="Kiểm soát thiết bị, đăng nhập bất thường và xác thực hai lớp" wide>
      <div className="security-overview-grid">
        <article><span className={twoFactor.data?.enabled ? 'ok' : 'warning'}><ShieldCheck size={21} /></span><div><strong>Xác thực hai lớp</strong><small>{twoFactor.data?.enabled ? 'Đang bảo vệ tài khoản Admin' : 'Nên bật để ngăn đăng nhập trái phép'}</small></div><button className={`live-btn ${twoFactor.data?.enabled ? 'ghost' : ''}`} type="button" disabled={busy || twoFactor.loading} onClick={() => { setCode(''); if (twoFactor.data?.enabled) setDisableOpen(true); else void beginSetup(); }}>{twoFactor.data?.enabled ? 'Tắt 2FA' : 'Bật 2FA'}</button></article>
        <article><span className="ok"><Laptop size={21} /></span><div><strong>{sessions.data?.length ?? 0} phiên đang hoạt động</strong><small>Thu hồi ngay thiết bị không còn sử dụng</small></div><button className="live-btn ghost" type="button" disabled={(sessions.data?.length ?? 0) <= 1} onClick={() => setRevokeTarget('others')}>Thu hồi phiên khác</button></article>
      </div>
      <div className="security-columns">
        <article className="ops-panel"><header><div><strong>Thiết bị đã đăng nhập</strong><small>Phiên hiện tại được đánh dấu rõ ràng</small></div></header><Async state={sessions} allowEmpty>{(items) => <div className="security-session-list">{items.map((item) => <div key={item.id}><span>{/mobile|android|iphone/i.test(item.device) ? <Smartphone size={19} /> : <Laptop size={19} />}</span><div><strong>{item.device}</strong><small>{item.ipAddress || 'Không rõ IP'} · tạo {time(item.createdAt)}</small></div>{item.current ? <StatusPill value="CURRENT" /> : <button className="live-btn small ghost" type="button" onClick={() => setRevokeTarget(item)}>Thu hồi</button>}</div>)}</div>}</Async></article>
        <article className="ops-panel"><header><div><strong>Lịch sử đăng nhập gần đây</strong><small>Đăng nhập thất bại được làm nổi bật để Admin phát hiện bất thường</small></div></header><Async state={history} allowEmpty>{(items) => <div className="security-login-list">{items.slice(0, 12).map((item) => <div key={item.id} className={item.success ? '' : 'failed'}><span>{item.success ? <CheckCircle2 size={17} /> : <KeyRound size={17} />}</span><div><strong>{item.success ? 'Đăng nhập thành công' : 'Đăng nhập thất bại'}</strong><small>{time(item.createdAt)} · {item.ipAddress || 'Không rõ IP'}{item.failureReason ? ` · ${item.failureReason}` : ''}</small></div></div>)}</div>}</Async></article>
      </div>
    </Section>
  </div>;
}
