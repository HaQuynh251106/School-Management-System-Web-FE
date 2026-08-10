import { useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  CircleX,
  Clock3,
  MessageSquareText,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { LeaveRequest } from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, fmtDateTime, useToast } from './common';

type DecisionKind = 'positive' | 'reject';
type DecisionDrafts = Record<string, Partial<Record<DecisionKind, string>>>;

export function LeaveRequestsLive({ actor }: { actor: 'student' | 'parent' | 'teacher' }) {
  const requests = useApi<LeaveRequest[]>('/leave-requests');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<{ id: string; kind: DecisionKind } | null>(null);
  const [notes, setNotes] = useState<DecisionDrafts>({});
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ startDate: today, endDate: today, reason: '' });

  const create = async () => {
    if (!form.reason.trim()) return toast.show('err', 'Vui lòng nhập lý do xin nghỉ');
    setBusy(true);
    try {
      await api.post('/leave-requests', form);
      setForm({ startDate: today, endDate: today, reason: '' });
      toast.show('ok', 'Đã gửi đơn để phụ huynh xác nhận');
      requests.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setBusy(false);
    }
  };

  const decide = async (id: string, action: string, success: string, note?: string) => {
    setBusy(true);
    try {
      await api.post(`/leave-requests/${id}/${action}`, { note: note?.trim() || null });
      setDecision(null);
      setNotes((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      toast.show('ok', success);
      requests.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setBusy(false);
    }
  };

  const submitDecision = (item: LeaveRequest, kind: DecisionKind) => {
    const note = notes[item.id]?.[kind]?.trim() || '';
    if (kind === 'reject' && !note) {
      return toast.show('err', 'Vui lòng nhập lý do từ chối');
    }

    if (actor === 'parent') {
      return decide(
        item.id,
        kind === 'positive' ? 'parent-confirm' : 'parent-reject',
        kind === 'positive' ? 'Đã xác nhận và chuyển đơn tới GVCN' : 'Đã từ chối xác nhận',
        note,
      );
    }

    return decide(
      item.id,
      kind === 'positive' ? 'approve' : 'reject',
      kind === 'positive' ? 'Đã duyệt đơn xin nghỉ' : 'Đã từ chối đơn xin nghỉ',
      note,
    );
  };

  const updateDecisionNote = (id: string, kind: DecisionKind, value: string) => {
    setNotes((current) => ({
      ...current,
      [id]: { ...current[id], [kind]: value },
    }));
  };

  const title = actor === 'student'
    ? 'Xin nghỉ học'
    : actor === 'parent'
      ? 'Xác nhận đơn xin nghỉ'
      : 'Duyệt đơn xin nghỉ';
  const subtitle = actor === 'student'
    ? 'Tạo đơn và theo dõi đủ hai bước xác nhận của phụ huynh, giáo viên chủ nhiệm'
    : actor === 'parent'
      ? 'Kiểm tra lý do và xác nhận trước khi chuyển giáo viên chủ nhiệm'
      : 'Chỉ xử lý đơn của lớp chủ nhiệm đã được phụ huynh xác nhận';
  const actionable = (item: LeaveRequest) => actor === 'parent'
    ? item.status === 'PENDING_PARENT'
    : actor === 'teacher'
      ? item.status === 'PENDING_HOMEROOM'
      : ['PENDING_PARENT', 'PENDING_HOMEROOM'].includes(item.status);

  return (
    <Section title={title} subtitle={subtitle} wide>
      {toast.node}

      {actor === 'student' && (
        <div className="leave-composer">
          <div className="leave-composer-title">
            <span><Plus size={18} /></span>
            <div>
              <strong>Tạo đơn xin nghỉ</strong>
              <small>Đơn chỉ có hiệu lực sau khi GVCN phê duyệt</small>
            </div>
          </div>
          <label>
            <span>Từ ngày</span>
            <input
              className="live-input"
              type="date"
              min={today}
              value={form.startDate}
              onChange={(event) => setForm({
                ...form,
                startDate: event.target.value,
                endDate: event.target.value > form.endDate ? event.target.value : form.endDate,
              })}
            />
          </label>
          <label>
            <span>Đến ngày</span>
            <input
              className="live-input"
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
            />
          </label>
          <label className="leave-reason">
            <span>Lý do</span>
            <textarea
              className="live-input"
              placeholder="Trình bày rõ lý do và thông tin cần thiết..."
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </label>
          <button className="live-btn" type="button" disabled={busy} onClick={create}>
            <CalendarCheck2 size={15} /> Gửi đơn
          </button>
        </div>
      )}

      <Async paginate state={requests} empty="Chưa có đơn xin nghỉ" itemLabel="đơn xin nghỉ">
        {(items) => (
          <div className="leave-request-list">
            {items.map((item) => {
              const selectedDecision = decision?.id === item.id ? decision.kind : null;
              const isRejecting = selectedDecision === 'reject';
              const decisionNote = selectedDecision ? notes[item.id]?.[selectedDecision] || '' : '';
              const positiveLabel = actor === 'parent' ? 'Xác nhận' : 'Duyệt đơn';

              return (
                <article className="leave-request-card" data-status={item.status} key={item.id}>
                  <div className="leave-request-main">
                    <div className="leave-request-date">
                      <span className="leave-request-date-icon"><CalendarCheck2 size={20} /></span>
                      <small>Ngày nghỉ</small>
                      <strong>{fmtDate(item.startDate)}</strong>
                      <span>{item.startDate === item.endDate ? 'Một ngày' : `Đến ${fmtDate(item.endDate)}`}</span>
                    </div>

                    <div className="leave-request-info">
                      <div className="leave-request-identity">
                        <strong>{item.studentName}</strong>
                        <span className="leave-request-class">{item.classCode || 'Chưa xếp lớp'}</span>
                        <StatusPill value={item.status} />
                      </div>
                      <div className="leave-request-reason">
                        <span>Lý do xin nghỉ</span>
                        <p>{item.reason}</p>
                      </div>
                      <div className="leave-request-meta">
                        <span><Clock3 size={13} /> Gửi lúc {fmtDateTime(item.createdAt)}</span>
                        {item.parentName && <span>Phụ huynh: <b>{item.parentName}</b></span>}
                        {item.homeroomTeacherName && <span>GVCN: <b>{item.homeroomTeacherName}</b></span>}
                      </div>
                      {item.decisionNote && (
                        <div className="leave-request-response">
                          <MessageSquareText size={15} />
                          <span><small>Phản hồi gần nhất</small><strong>{item.decisionNote}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {actionable(item) && (
                    <div className="leave-request-actions">
                      {actor !== 'student' && (
                        <>
                          <div className="leave-action-label">
                            <ShieldCheck size={17} />
                            <span>
                              <strong>Chờ bạn xử lý</strong>
                              <small>Kiểm tra thông tin trước khi quyết định</small>
                            </span>
                          </div>
                          <div className="leave-action-buttons">
                            <button
                              className={`live-btn leave-approve-button${selectedDecision === 'positive' ? ' active' : ''}`}
                              type="button"
                              disabled={busy}
                              aria-expanded={selectedDecision === 'positive'}
                              onClick={() => setDecision({ id: item.id, kind: 'positive' })}
                            >
                              <CheckCircle2 size={15} /> {positiveLabel}
                            </button>
                            <button
                              className={`live-btn danger leave-reject-button${isRejecting ? ' active' : ''}`}
                              type="button"
                              disabled={busy}
                              aria-expanded={isRejecting}
                              onClick={() => setDecision({ id: item.id, kind: 'reject' })}
                            >
                              <CircleX size={15} /> Từ chối
                            </button>
                          </div>
                        </>
                      )}
                      {actor === 'student' && (
                        <button
                          className="live-btn danger"
                          type="button"
                          disabled={busy}
                          onClick={() => decide(item.id, 'cancel', 'Đã hủy đơn')}
                        >
                          <X size={14} /> Hủy đơn
                        </button>
                      )}
                    </div>
                  )}

                  {selectedDecision && actor !== 'student' && (
                    <div className={`leave-decision-panel ${selectedDecision}`}>
                      <div className="leave-decision-heading">
                        <span>{isRejecting ? <AlertTriangle size={19} /> : <CheckCircle2 size={19} />}</span>
                        <div>
                          <strong>{isRejecting ? 'Từ chối đơn xin nghỉ' : `${positiveLabel} xin nghỉ`}</strong>
                          <small>
                            {isRejecting
                              ? 'Lý do sẽ được gửi tới học sinh và phụ huynh.'
                              : 'Bạn có thể bổ sung lời nhắn để gia đình dễ theo dõi.'}
                          </small>
                        </div>
                        <button
                          className="leave-decision-close"
                          type="button"
                          aria-label="Đóng vùng xử lý"
                          onClick={() => setDecision(null)}
                        >
                          <X size={17} />
                        </button>
                      </div>
                      <label className="leave-decision-field">
                        <span>
                          {isRejecting ? 'Lý do từ chối' : 'Ghi chú phản hồi'}
                          {isRejecting ? <b>Bắt buộc</b> : <small>Không bắt buộc</small>}
                        </span>
                        <textarea
                          className="live-input"
                          rows={3}
                          maxLength={500}
                          autoFocus
                          required={isRejecting}
                          placeholder={isRejecting
                            ? 'Ví dụ: Vui lòng bổ sung giấy xác nhận hoặc thông tin lịch khám...'
                            : 'Ví dụ: Đã ghi nhận, chúc em sớm hồi phục...'}
                          value={decisionNote}
                          onChange={(event) => updateDecisionNote(item.id, selectedDecision, event.target.value)}
                        />
                      </label>
                      <div className="leave-decision-footer">
                        <small>{decisionNote.length}/500 ký tự</small>
                        <div>
                          <button className="live-btn ghost" type="button" disabled={busy} onClick={() => setDecision(null)}>
                            Hủy
                          </button>
                          <button
                            className={`live-btn ${isRejecting ? 'danger' : 'leave-approve-button'}`}
                            type="button"
                            disabled={busy || (isRejecting && !decisionNote.trim())}
                            onClick={() => submitDecision(item, selectedDecision)}
                          >
                            {isRejecting ? <CircleX size={15} /> : <CheckCircle2 size={15} />}
                            {busy
                              ? 'Đang xử lý…'
                              : isRejecting
                                ? 'Xác nhận từ chối'
                                : actor === 'parent'
                                  ? 'Xác nhận đồng ý'
                                  : 'Xác nhận duyệt'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Async>
    </Section>
  );
}
