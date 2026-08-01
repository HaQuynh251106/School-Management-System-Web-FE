import { useState } from 'react';
import { Beaker, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { Subject, SubjectRoomRequirement } from '../../api/types';
import { useToast } from './common';

const ROOM_TYPES = [
  ['LAB', 'Phòng thí nghiệm'], ['COMPUTER', 'Phòng máy tính'], ['LANGUAGE', 'Phòng ngoại ngữ'],
  ['SPORT', 'Phòng thể chất'], ['ART', 'Phòng nghệ thuật'], ['LIBRARY', 'Thư viện'], ['MULTIPURPOSE', 'Phòng đa năng'],
];

export function SubjectRoomRequirements({ subjects }: { subjects: Subject[] }) {
  const requirements = useApi<SubjectRoomRequirement[]>('/subject-room-requirements');
  const toast = useToast();
  const [form, setForm] = useState({ subjectId: '', roomType: 'LAB', requiredEquipment: '', weeklyPeriods: 1, mandatory: true, priority: 50 });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.subjectId) return toast.show('err', 'Hãy chọn môn học');
    setBusy(true);
    try { await api.post('/subject-room-requirements', form); requirements.reload(); toast.show('ok', 'Đã lưu yêu cầu phòng chức năng'); }
    catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Xóa yêu cầu phòng chức năng này?')) return;
    setBusy(true);
    try { await api.del(`/subject-room-requirements/${id}`); requirements.reload(); toast.show('ok', 'Đã xóa yêu cầu'); }
    catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };
  return <div className="subject-room-rules">
    {toast.node}
    <header><span><Beaker size={19} /></span><div><strong>Phòng chức năng theo môn</strong><small>Quy định số tiết mỗi tuần phải học tại phòng chuyên dụng; thuật toán sẽ tự tìm phòng đủ sức chứa và thiết bị.</small></div></header>
    <div className="subject-room-rules__form">
      <label><span>Môn học</span><select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}><option value="">Chọn môn</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
      <label><span>Loại phòng</span><select value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })}>{ROOM_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>Số tiết/tuần</span><input type="number" min="0" max="20" value={form.weeklyPeriods} onChange={(e) => setForm({ ...form, weeklyPeriods: Number(e.target.value) })} /></label>
      <label className="grow"><span>Thiết bị bắt buộc</span><input value={form.requiredEquipment} onChange={(e) => setForm({ ...form, requiredEquipment: e.target.value })} placeholder="máy chiếu, máy tính..." /></label>
      <label className="subject-room-rules__check"><input type="checkbox" checked={form.mandatory} onChange={(e) => setForm({ ...form, mandatory: e.target.checked })} /><span>Bắt buộc</span></label>
      <button className="live-btn" disabled={busy} onClick={save}><Plus size={15} /> Lưu yêu cầu</button>
    </div>
    {(requirements.data || []).length > 0 && <div className="subject-room-rules__list">{requirements.data?.map((item) => <article key={item.id}><span><Beaker size={16} /></span><div><strong>{item.subjectName}</strong><small>{ROOM_TYPES.find(([type]) => type === item.roomType)?.[1] || item.roomType} · {item.weeklyPeriods} tiết/tuần{item.requiredEquipment ? ` · ${item.requiredEquipment}` : ''}</small></div><b>{item.mandatory ? 'Bắt buộc' : 'Ưu tiên'}</b><button title="Xóa" disabled={busy} onClick={() => remove(item.id)}><Trash2 size={15} /></button></article>)}</div>}
  </div>;
}
