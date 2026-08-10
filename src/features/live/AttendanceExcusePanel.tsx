import { useMemo, useState } from 'react';
import { Check, Send, X } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { AttendanceExcuseRequest, AttendanceRecord } from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, useToast } from './common';

type Props = {
  mode: 'request' | 'review';
  studentId?: string | null;
  records?: AttendanceRecord[];
};

export function AttendanceExcusePanel({ mode, studentId, records = [] }: Props) {
  const toast = useToast();
  const query = mode === 'request' && studentId ? `?studentId=${encodeURIComponent(studentId)}` : mode === 'review' ? '?status=PENDING' : '';
  const requests = useApi<AttendanceExcuseRequest[]>(query || mode === 'review' ? `/attendance/excuse-requests${query}` : null);
  const [recordId, setRecordId] = useState('');
  const [reason, setReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestable = useMemo(() => records.filter((record) => ['LATE', 'ABSENT_UNEXCUSED'].includes(record.status)), [records]);
  const recordById = useMemo(() => new Map(records.map((record) => [record.id, record])), [records]);

  const submit = async () => {
    if (!recordId) return toast.show('err', 'Chọn lượt vắng hoặc đi muộn cần xin phép');
    if (!reason.trim()) return toast.show('err', 'Nhập lý do xin phép');
    setBusyId(recordId);
    try {
      await api.post(`/attendance/${encodeURIComponent(recordId)}/excuse-requests`, { reason: reason.trim() });
      toast.show('ok', 'Đã gửi đơn xin phép để giáo viên duyệt');
      setRecordId('');
      setReason('');
      requests.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setBusyId(null);
    }
  };

  const review = async (request: AttendanceExcuseRequest, decision: 'APPROVED' | 'REJECTED') => {
    setBusyId(request.id);
    try {
      await api.post(`/attendance/excuse-requests/${encodeURIComponent(request.id)}/review`, {
        decision,
        note: reviewNotes[request.id]?.trim() || null,
      });
      toast.show('ok', decision === 'APPROVED' ? 'Đã duyệt đơn xin phép' : 'Đã từ chối đơn xin phép');
      requests.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setBusyId(null);
    }
  };

  return <Section
    title={mode === 'review' ? 'Đơn xin nghỉ chờ duyệt' : 'Đơn xin nghỉ và đi muộn'}
    subtitle={mode === 'review' ? 'Duyệt đúng lớp và tiết được phân công' : 'Gửi lý do và theo dõi kết quả xử lý'}
    wide
  >
    {toast.node}
    {mode === 'request' && <div className="attendance-excuse-form">
      <select className="live-select" value={recordId} onChange={(event) => setRecordId(event.target.value)}>
        <option value="">Chọn lượt cần xin phép</option>
        {requestable.map((record) => <option key={record.id} value={record.id}>
          {fmtDate(record.date)} · Tiết {record.periodNo ?? '—'} · {record.subjectName || 'Môn học'} · {record.status === 'LATE' ? 'Đi muộn' : 'Vắng không phép'}
        </option>)}
      </select>
      <textarea className="live-input" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do xin phép *" />
      <button className="live-btn" disabled={!!busyId} onClick={submit}><Send size={15} /> Gửi đơn</button>
    </div>}
    <Async state={requests} empty={mode === 'review' ? 'Không có đơn đang chờ duyệt' : 'Chưa có đơn xin phép'}>
      {(items) => <div className="live-table-wrap"><table className="live-table">
        <thead><tr><th>{mode === 'review' ? 'Học sinh' : 'Ngày gửi'}</th><th>Lý do</th><th>Trạng thái</th><th>Phản hồi</th>{mode === 'review' && <th />}</tr></thead>
        <tbody>{items.map((request) => {
          const record = recordById.get(request.attendanceRecordId);
          return <tr key={request.id}>
            <td>{mode === 'review' ? request.studentId : fmtDate(request.requestedAt)}{record && <small className="assignment-description">{fmtDate(record.date)} · {record.subjectName}</small>}</td>
            <td>{request.reason}</td>
            <td><StatusPill value={request.status} /></td>
            <td>{request.reviewNote || '—'}</td>
            {mode === 'review' && <td><div className="attendance-excuse-review">
              <input className="live-input" value={reviewNotes[request.id] || ''} onChange={(event) => setReviewNotes({ ...reviewNotes, [request.id]: event.target.value })} placeholder="Ghi chú duyệt (không bắt buộc)" />
              <button className="live-btn" disabled={busyId === request.id} onClick={() => review(request, 'APPROVED')}><Check size={14} /> Duyệt</button>
              <button className="live-btn subtle" disabled={busyId === request.id} onClick={() => review(request, 'REJECTED')}><X size={14} /> Từ chối</button>
            </div></td>}
          </tr>;
        })}</tbody>
      </table></div>}
    </Async>
  </Section>;
}
