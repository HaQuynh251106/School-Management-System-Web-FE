import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useActiveChild } from '../../api/activeChild';
import { useApi } from '../../api/useApi';
import type { ApiUser, Club, ClubRegistration } from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, money, useToast } from './common';

export function ClubLive({ actor }: { actor: 'admin' | 'student' | 'parent' }) {
  const clubs = useApi<Club[]>('/clubs');
  const { childId, setChildId } = useActiveChild();
  const children = useApi<ApiUser[]>(actor === 'parent' ? '/me/children' : null);
  useEffect(() => { if (actor === 'parent' && !childId && children.data?.length) setChildId(children.data[0].id); }, [actor, childId, children.data, setChildId]);
  const registrations = useApi<ClubRegistration[]>(actor === 'admin' ? '/admin/club-registrations' : actor === 'student' ? '/me/club-registrations' : childId ? `/children/${childId}/club-registrations` : null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', schedule: '', capacity: 20, feeAmount: 0, approvalRequired: true, registrationStart: '', registrationEnd: '' });
  const [busyId, setBusyId] = useState('');
  const toast = useToast();
  const reload = async () => { await Promise.all([clubs.reload(), registrations.reload()]); };
  const create = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.schedule.trim() || !form.registrationStart || !form.registrationEnd) return toast.show('err', 'Nhập đủ mã, tên, lịch sinh hoạt và thời gian đăng ký');
    setBusyId('create');
    try { await api.post('/clubs', { ...form, code: form.code.trim(), name: form.name.trim(), description: form.description.trim() || null, schedule: form.schedule.trim(), active: true }); toast.show('ok', 'Đã tạo câu lạc bộ'); setShowCreate(false); await reload(); }
    catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể tạo câu lạc bộ'); }
    finally { setBusyId(''); }
  };
  const register = async (club: Club) => {
    if (actor === 'parent' && !childId) return toast.show('err', 'Chọn học sinh trước khi đăng ký');
    setBusyId(club.id);
    try { await api.post(`/clubs/${club.id}/registrations`, actor === 'parent' ? { studentId: childId } : {}); toast.show('ok', 'Đã gửi đăng ký câu lạc bộ'); await reload(); }
    catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể đăng ký'); }
    finally { setBusyId(''); }
  };
  const decide = async (item: ClubRegistration, action: 'approve' | 'reject' | 'cancel') => {
    setBusyId(item.id);
    try { await api.post(`/club-registrations/${item.id}/${action}`, action === 'cancel' ? { reason: 'Hủy theo yêu cầu' } : { note: action === 'approve' ? 'Đủ điều kiện tham gia' : 'Không đủ điều kiện' }); toast.show('ok', 'Đã cập nhật đăng ký'); await reload(); }
    catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể cập nhật đăng ký'); }
    finally { setBusyId(''); }
  };
  const existing = new Map((registrations.data || []).map((item) => [item.clubId, item]));
  return <div>{toast.node}<Section title={actor === 'admin' ? 'Quản lý câu lạc bộ' : 'Câu lạc bộ ngoại khóa'} subtitle="Sức chứa, trạng thái duyệt và khoản phí được đồng bộ trực tiếp với hệ thống" wide action={<div className="finance-row-actions">{actor === 'admin' && <button className="live-btn" onClick={() => setShowCreate(!showCreate)}><Plus size={15} /> Tạo câu lạc bộ</button>}<button className="live-btn ghost" onClick={reload}><RefreshCw size={15} /> Làm mới</button></div>}>
    {actor === 'parent' && <label><span>Học sinh</span><select className="live-select" value={childId || ''} onChange={(e) => setChildId(e.target.value || null)}>{(children.data || []).map((child) => <option value={child.id} key={child.id}>{child.fullName}</option>)}</select></label>}
    {showCreate && <div className="live-form-grid"><label><span>Mã</span><input className="live-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label><label><span>Tên câu lạc bộ</span><input className="live-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label><span>Lịch sinh hoạt</span><input className="live-input" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></label><label><span>Sức chứa</span><input className="live-input" type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label><label><span>Phí tham gia</span><input className="live-input" type="number" min="0" value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: Number(e.target.value) })} /></label><label><span>Mở đăng ký</span><input className="live-input" type="date" value={form.registrationStart} onChange={(e) => setForm({ ...form, registrationStart: e.target.value })} /></label><label><span>Đóng đăng ký</span><input className="live-input" type="date" min={form.registrationStart} value={form.registrationEnd} onChange={(e) => setForm({ ...form, registrationEnd: e.target.value })} /></label><label className="span-2"><span>Mô tả</span><input className="live-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><button className="live-btn" disabled={busyId === 'create'} onClick={create}>Lưu câu lạc bộ</button></div>}
    <Async state={clubs} allowEmpty empty="Chưa có câu lạc bộ đang mở">{(rows) => <div className="live-card-grid">{rows.map((club) => { const registered = existing.get(club.id); return <article className="live-summary-card" key={club.id}><div><small>{club.code}</small><h3>{club.name}</h3><p>{club.description || club.schedule}</p></div><span>{club.schedule}</span><span>{fmtDate(club.registrationStart)} – {fmtDate(club.registrationEnd)}</span><strong>{club.approvedCount}/{club.capacity} thành viên · còn {club.availableSlots} chỗ</strong><span>{club.feeAmount ? money(club.feeAmount) : 'Miễn phí'}</span>{actor !== 'admin' && (registered ? <><StatusPill value={registered.status} />{!['CANCELLED', 'REJECTED'].includes(registered.status) && <button className="live-btn subtle" disabled={busyId === registered.id} onClick={() => decide(registered, 'cancel')}>Hủy đăng ký</button>}</> : <button className="live-btn" disabled={busyId === club.id || !club.active} onClick={() => register(club)}>Đăng ký</button>)}</article>; })}</div>}</Async>
  </Section>{actor === 'admin' && <Section title="Đơn đăng ký" subtitle="Duyệt theo sức chứa; hóa đơn câu lạc bộ được sinh đúng một lần khi đủ điều kiện" wide><Async state={registrations} allowEmpty empty="Chưa có đơn đăng ký">{(rows) => <div className="live-table-wrap"><table className="live-table"><thead><tr><th>Học sinh</th><th>Câu lạc bộ</th><th>Ngày gửi</th><th>Trạng thái</th><th>Xử lý</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td>{item.studentName}</td><td>{item.clubName}</td><td>{fmtDate(item.createdAt)}</td><td><StatusPill value={item.status} /></td><td>{item.status === 'PENDING' ? <div className="finance-row-actions"><button className="live-btn" disabled={busyId === item.id} onClick={() => decide(item, 'approve')}><CheckCircle2 size={14} /> Duyệt</button><button className="live-btn subtle" disabled={busyId === item.id} onClick={() => decide(item, 'reject')}><XCircle size={14} /> Từ chối</button></div> : '—'}</td></tr>)}</tbody></table></div>}</Async></Section>}</div>;
}
