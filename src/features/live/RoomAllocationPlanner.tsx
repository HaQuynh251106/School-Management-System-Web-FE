import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, CheckCircle2, DoorOpen, History, Info, LockKeyhole, RotateCcw, Sparkles, UsersRound } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { AcademicYear, Room, RoomAllocationPlan, SchoolClass } from '../../api/types';
import { Badge } from '../../components/ui';
import { useToast } from './common';

export function RoomAllocationPlanner({ years, classes, rooms, onApplied }: {
  years: AcademicYear[]; classes: SchoolClass[]; rooms: Room[]; onApplied: () => void;
}) {
  const preferred = years.find((year) => year.status === 'ACTIVE') || years.find((year) => year.status !== 'CLOSED');
  const preferredId = preferred?.id;
  const [yearId, setYearId] = useState(preferred?.id || '');
  const [preserveExisting, setPreserveExisting] = useState(true);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [plan, setPlan] = useState<RoomAllocationPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const history = useApi<RoomAllocationPlan[]>(yearId ? `/room-allocation-plans?academicYearId=${encodeURIComponent(yearId)}` : '/room-allocation-plans?academicYearId=none');
  const yearClasses = useMemo(() => classes.filter((item) => item.academicYearId === yearId), [classes, yearId]);
  const activeMainRooms = rooms.filter((room) => room.status !== 'INACTIVE' && room.status !== 'MAINTENANCE'
    && room.homeRoomEligible !== false && (room.roomType || 'GENERAL') === 'GENERAL');
  const functionalRooms = rooms.filter((room) => room.homeRoomEligible === false || (room.roomType || 'GENERAL') !== 'GENERAL');
  const availableClassSlots = activeMainRooms.reduce((total, room) => total
    + (room.supportsMorning !== false ? 1 : 0)
    + (room.supportsAfternoon !== false ? 1 : 0), 0);
  const spareClassSlots = availableClassSlots - yearClasses.length;
  const allocationReady = yearClasses.length > 0 && activeMainRooms.length > 0 && spareClassSlots >= 0;
  const readinessLabel = !yearClasses.length ? 'Chưa có lớp trong năm học'
    : !activeMainRooms.length ? 'Chưa có phòng học chính'
      : spareClassSlots >= 0 ? 'Đủ phòng để xếp' : 'Chưa đủ phòng';

  useEffect(() => {
    if (!yearId && preferredId) setYearId(preferredId);
  }, [preferredId, yearId]);

  useEffect(() => {
    setPlan(null);
    setLockedIds([]);
  }, [yearId]);

  const createPreview = async () => {
    if (!yearId) return toast.show('err', 'Hãy chọn năm học cần phân bổ');
    setBusy(true);
    try {
      const lockedAllocations = yearClasses.filter((item) => lockedIds.includes(item.id) && item.roomId)
        .map((item) => ({ classId: item.id, studyShift: item.studyShift || 'MORNING', roomId: item.roomId! }));
      const value = await api.post<RoomAllocationPlan>('/room-allocation-plans/preview', {
        academicYearId: yearId,
        name: `Phương án ${new Date().toLocaleString('vi-VN')}`,
        balanceShifts: true,
        preserveExisting,
        lockedAllocations,
      });
      setPlan(value);
      history.reload();
      toast.show(value.unassignedClasses ? 'err' : 'ok', value.unassignedClasses
        ? `Còn ${value.unassignedClasses} lớp cần xử lý` : 'Đã tạo phương án phân ca và phòng không xung đột');
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const apply = async () => {
    if (!plan || !window.confirm(`Áp dụng phương án cho ${plan.totalClasses} lớp?`)) return;
    setBusy(true);
    try {
      const value = await api.post<RoomAllocationPlan>(`/room-allocation-plans/${plan.id}/apply`, {});
      setPlan(value); history.reload(); onApplied();
      toast.show('ok', 'Đã áp dụng ca học và phòng chủ nhiệm');
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const undo = async (value: RoomAllocationPlan) => {
    if (!window.confirm('Hoàn tác phương án này và khôi phục phân phòng trước đó?')) return;
    setBusy(true);
    try {
      const restored = await api.post<RoomAllocationPlan>(`/room-allocation-plans/${value.id}/undo`, {});
      setPlan(restored); history.reload(); onApplied(); toast.show('ok', 'Đã hoàn tác phương án');
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const itemStatus = (item: RoomAllocationPlan['items'][number]) => {
    if (item.status === 'UNASSIGNED') return { label: 'Cần xử lý', tone: 'red' as const };
    if (item.locked || item.status === 'LOCKED') return { label: 'Đã khóa', tone: 'violet' as const };
    if (item.status === 'PRESERVED') return { label: 'Giữ nguyên', tone: 'blue' as const };
    return { label: 'Đề xuất mới', tone: 'green' as const };
  };

  return <div className="room-planner room-planner--guided">
    {toast.node}
    <header className="room-planner__header">
      <div><span className="room-planner__eyebrow"><Sparkles size={15} /> SẮP XẾP TỰ ĐỘNG</span><h3>Xếp ca học và phòng cho các lớp</h3><p>Mỗi lớp được gán một ca học và một phòng chủ nhiệm cố định. Bạn luôn được xem kết quả trước khi lưu.</p></div>
      <div className="room-planner__controls">
        <label><span>Năm học</span><select value={yearId} onChange={(event) => setYearId(event.target.value)}>{years.filter((year) => year.status !== 'CLOSED').map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select></label>
      </div>
    </header>

    <div className="room-planner__steps" aria-label="Quy trình xếp ca và phòng">
      <article className={allocationReady ? 'complete' : 'active'}><b>{allocationReady ? <Check size={16} /> : '1'}</b><span><small>Bước 1</small><strong>Kiểm tra dữ liệu</strong><em>{yearClasses.length} lớp · {activeMainRooms.length} phòng chính</em></span></article>
      <ArrowRight size={18} />
      <article className={lockedIds.length ? 'complete' : 'active'}><b>2</b><span><small>Bước 2</small><strong>Chọn lớp cần giữ nguyên</strong><em>{lockedIds.length ? `${lockedIds.length} lớp đã khóa` : 'Không bắt buộc'}</em></span></article>
      <ArrowRight size={18} />
      <article className={plan ? 'complete' : ''}><b>{plan ? <Check size={16} /> : '3'}</b><span><small>Bước 3</small><strong>Xem và áp dụng</strong><em>{plan ? 'Đã có phương án' : 'Chưa tạo phương án'}</em></span></article>
    </div>

    <section className="room-planner__data-check">
      <header><div><span className="room-planner__section-number">1</span><div><h4>Kiểm tra khả năng đáp ứng</h4><p>Hệ thống tính theo từng ca: một phòng có thể phục vụ một lớp sáng và một lớp chiều.</p></div></div><span className={`room-planner__readiness ${allocationReady ? 'ok' : 'warn'}`}>{allocationReady ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{readinessLabel}</span></header>
      <div className="room-capacity-widgets">
        <article><span><DoorOpen /></span><div><small>Phòng học chính</small><strong>{activeMainRooms.length} phòng</strong><em>Dùng làm phòng cố định của lớp</em></div></article>
        <article><span><UsersRound /></span><div><small>Lớp cần xếp</small><strong>{yearClasses.length} lớp</strong><em>Dự kiến {Math.ceil(yearClasses.length / 2)} sáng · {Math.floor(yearClasses.length / 2)} chiều</em></div></article>
        <article className={spareClassSlots >= 0 ? 'ok' : 'warn'}><span>{spareClassSlots >= 0 ? <CheckCircle2 /> : <AlertTriangle />}</span><div><small>Vị trí xếp lớp theo ca</small><strong>{spareClassSlots >= 0 ? `Còn ${spareClassSlots}` : `Thiếu ${Math.abs(spareClassSlots)}`}</strong><em>{availableClassSlots} vị trí − {yearClasses.length} lớp</em></div></article>
      </div>
      <div className="room-planner__functional-note"><Info size={17} /><span><strong>{functionalRooms.length} phòng chức năng được giữ riêng</strong><small>Phòng thí nghiệm, phòng máy… chỉ được sử dụng theo từng tiết trong thời khóa biểu, không gán cố định cho lớp.</small></span></div>
    </section>

    <section className="room-planner__lock-step">
      <header><div><span className="room-planner__section-number">2</span><div><h4>Lớp nào cần giữ nguyên?</h4><p>Bỏ qua bước này nếu hệ thống được phép tự cân bằng toàn bộ lớp.</p></div></div></header>
      <label className="room-planner__preserve-option"><input type="checkbox" checked={preserveExisting} onChange={(event) => setPreserveExisting(event.target.checked)} /><span><strong>Ưu tiên giữ ca và phòng đang hợp lệ</strong><small>Hệ thống chỉ thay đổi khi phòng không đủ chỗ, bị trùng hoặc cần cân bằng hai ca.</small></span></label>

      {yearClasses.some((item) => item.roomId) ? <div className="room-lock-list">
        {yearClasses.filter((item) => item.roomId).map((item) => <label key={item.id} className={lockedIds.includes(item.id) ? 'selected' : ''}>
          <input type="checkbox" checked={lockedIds.includes(item.id)} onChange={(event) => setLockedIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} />
          <span><strong>{item.code}</strong><small>{item.studyShift === 'AFTERNOON' ? 'Ca chiều' : 'Ca sáng'} · Phòng {item.roomCode}</small></span><LockKeyhole size={15} />
        </label>)}
      </div> : <div className="room-planner__empty-locks"><Info size={16} /> Chưa có lớp nào được phân ca và phòng trước đó.</div>}
      <small className="room-planner__lock-help"><LockKeyhole size={14} /> Tích vào một lớp nghĩa là tuyệt đối không thay đổi ca và phòng của lớp đó.</small>
    </section>

    <div className="room-planner__preview-action">
      <span className="room-planner__section-number">3</span>
      <div><strong>Tạo phương án để kiểm tra trước</strong><small>Thao tác này chưa thay đổi dữ liệu. Bạn sẽ được xem từng lớp trước khi xác nhận áp dụng.</small></div>
      <button className="live-btn" disabled={busy || !allocationReady} onClick={createPreview}><Sparkles size={16} /> {plan ? 'Tạo lại phương án' : 'Tạo phương án xem trước'} <ArrowRight size={16} /></button>
    </div>

    {plan && <section className="room-plan-result">
      <header><div><span className="room-plan-result__eyebrow">BƯỚC 3 · KIỂM TRA KẾT QUẢ</span><h4>Phương án đề xuất</h4><p>Chưa thay đổi dữ liệu cho đến khi bạn bấm “Áp dụng phương án”.</p></div><div className="room-plan-result__actions"><Badge tone={plan.unassignedClasses ? 'red' : 'green'}>{plan.unassignedClasses ? `${plan.unassignedClasses} lớp cần xử lý` : 'Tất cả lớp đã được xếp'}</Badge><button className="live-btn" disabled={busy || plan.unassignedClasses > 0 || plan.status !== 'PREVIEW'} onClick={apply}><CheckCircle2 size={16} /> Áp dụng phương án</button></div></header>
      <div className="room-plan-summary"><span><b>{plan.morningClasses}</b> lớp ca sáng</span><span><b>{plan.afternoonClasses}</b> lớp ca chiều</span><span><b>{plan.capacity.spareClassSlots}</b> vị trí còn trống theo ca</span><span><b>{plan.capacity.functionalRooms}</b> phòng chức năng giữ riêng</span></div>
      {plan.warnings.length > 0 && <div className="room-plan-warning"><AlertTriangle size={18} /><div><strong>Cần kiểm tra trước khi áp dụng</strong>{plan.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div></div>}
      <div className="room-plan-table"><table className="live-table"><thead><tr><th>Lớp</th><th>Học sinh / tối đa</th><th>Phân công hiện tại</th><th>Phương án đề xuất</th><th>Kết quả</th></tr></thead><tbody>{plan.items.map((item) => {
        const status = itemStatus(item);
        return <tr key={item.id}><td><strong>{item.classCode}</strong></td><td>{item.studentCount}/{item.classCapacity}</td><td>{item.previousRoomCode ? `${item.previousShift === 'AFTERNOON' ? 'Ca chiều' : 'Ca sáng'} · Phòng ${item.previousRoomCode}` : 'Chưa phân'}</td><td><strong>{item.proposedRoomCode ? `${item.proposedShift === 'AFTERNOON' ? 'Ca chiều' : 'Ca sáng'} · Phòng ${item.proposedRoomCode}` : 'Chưa xếp được'}</strong></td><td><Badge tone={status.tone}>{status.label}</Badge><small className="room-plan-item-message">{item.message}</small></td></tr>;
      })}</tbody></table></div>
    </section>}

    {(history.data || []).length > 0 && <details className="room-plan-history"><summary><History size={17} /> Lịch sử phương án ({history.data?.length})</summary><div>{history.data?.map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{item.morningClasses} sáng · {item.afternoonClasses} chiều · {item.assignedClasses}/{item.totalClasses} lớp</small></div><Badge tone={item.status === 'APPLIED' ? 'green' : item.status === 'UNDONE' ? 'violet' : 'blue'}>{item.status === 'APPLIED' ? 'Đang áp dụng' : item.status === 'UNDONE' ? 'Đã hoàn tác' : 'Bản xem trước'}</Badge>{item.status === 'APPLIED' && <button className="live-btn ghost" disabled={busy} onClick={() => undo(item)}><RotateCcw size={15} /> Hoàn tác</button>}</article>)}</div></details>}
  </div>;
}
