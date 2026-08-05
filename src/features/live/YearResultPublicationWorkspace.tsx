import { useEffect, useState } from 'react';
import {
  AlertTriangle, BellRing, CheckCircle2, RotateCcw, Send, Undo2, UsersRound,
} from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { AcademicYear, SchoolClass, YearResultPublicationStatus } from '../../api/types';
import { Badge, Section } from '../../components/ui';
import { useToast } from './common';
import { Modal } from './Modal';

export function YearResultPublicationWorkspace() {
  const years = useApi<AcademicYear[]>('/academicYears');
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [confirmMode, setConfirmMode] = useState<'PUBLISH' | 'WITHDRAW' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  const [publishing, setPublishing] = useState(false);
  const toast = useToast();
  const classes = useApi<SchoolClass[]>(academicYearId
    ? `/classes?academicYearId=${encodeURIComponent(academicYearId)}` : null);
  const publication = useApi<YearResultPublicationStatus>(
    academicYearId && classId
      ? `/year-results/publication?academicYearId=${encodeURIComponent(academicYearId)}&classId=${encodeURIComponent(classId)}`
      : null,
  );

  useEffect(() => {
    if (academicYearId || !years.data?.length) return;
    const closed = years.data.find((year) => year.status === 'CLOSED');
    setAcademicYearId((closed || years.data[0]).id);
  }, [academicYearId, years.data]);

  useEffect(() => {
    setClassId('');
  }, [academicYearId]);

  const publish = async () => {
    if (!academicYearId || !classId || !confirmed) return;
    if ((publication.data?.publicationVersion || 0) > 0 && reason.trim().length < 10) {
      toast.show('err', 'Lý do công bố lại phải có ít nhất 10 ký tự.');
      return;
    }
    setPublishing(true);
    try {
      const response = await api.post<{
        notificationsQueued: number; newlyPublished: boolean;
      }>(`/year-results/${encodeURIComponent(academicYearId)}/classes/${encodeURIComponent(classId)}/publish`, {
        confirmed: true, reason: reason.trim() || null,
      });
      await publication.reload();
      closeConfirm();
      setConfirmed(false);
      toast.show('ok', response.newlyPublished
        ? `Đã ${publication.data?.publicationVersion ? 'công bố lại' : 'công bố'} và đưa ${response.notificationsQueued} thông báo vào RabbitMQ.`
        : 'Lớp này đã được công bố trước đó, không gửi thông báo trùng.');
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setPublishing(false);
    }
  };

  const withdraw = async () => {
    if (!academicYearId || !classId || !confirmed) return;
    if (reason.trim().length < 10) {
      toast.show('err', 'Lý do thu hồi phải có ít nhất 10 ký tự.');
      return;
    }
    setPublishing(true);
    try {
      const response = await api.post<{
        notificationsQueued: number; newlyWithdrawn: boolean;
      }>(`/year-results/${encodeURIComponent(academicYearId)}/classes/${encodeURIComponent(classId)}/withdraw`, {
        confirmed: true, reason: reason.trim(),
      });
      await publication.reload();
      closeConfirm();
      toast.show('ok', response.newlyWithdrawn
        ? `Đã thu hồi kết quả và gửi ${response.notificationsQueued} thông báo rà soát.`
        : 'Kết quả lớp này đã được thu hồi trước đó.');
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setPublishing(false);
    }
  };

  const openConfirm = (mode: 'PUBLISH' | 'WITHDRAW') => {
    setReason('');
    setConfirmed(false);
    setConfirmMode(mode);
  };
  const closeConfirm = () => {
    setConfirmMode(null);
    setReason('');
    setConfirmed(false);
  };

  const status = publication.data;
  const republishing = Boolean(status && status.publicationVersion > 0 && !status.published);
  return (
    <Section
      title="Công bố kết quả cuối năm"
      subtitle="Chỉ kết quả đã chốt mới hiển thị cho học sinh và phụ huynh"
      wide
    >
      {toast.node}
      <div className="year-publication-filters">
        <label><span>Năm học</span><select className="live-select" value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)}>
          <option value="">Chọn năm học</option>
          {(years.data || []).map((year) => <option key={year.id} value={year.id}>{year.name || year.code} · {year.status}</option>)}
        </select></label>
        <label><span>Lớp đã chốt</span><select className="live-select" value={classId} disabled={!academicYearId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">Chọn lớp</option>
          {(classes.data || []).map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code}</option>)}
        </select></label>
      </div>

      {!classId && (
        <div className="year-publication-empty">
          <BellRing size={25} />
          <div><strong>Chọn lớp cần công bố</strong><span>Hệ thống kiểm tra trạng thái chốt trước khi gửi thông báo.</span></div>
        </div>
      )}

      {status && (
        <div className="year-publication-status">
          <div className="year-publication-summary">
            <span><UsersRound size={20} /><small>Tổng học sinh</small><strong>{status.totalStudents}</strong></span>
            <span><CheckCircle2 size={20} /><small>Đã chốt</small><strong>{status.finalizedStudents}</strong></span>
            <div>
              <small>Trạng thái</small>
              <Badge tone={status.published ? 'green' : status.publicationState === 'WITHDRAWN' ? 'red' : status.readyToPublish ? 'blue' : 'orange'}>
                {publicationStateLabel(status)}
              </Badge>
            </div>
          </div>
          {status.published ? (
            <div className="year-publication-action-stack">
              <div className="year-publication-success">
                <CheckCircle2 size={19} />
                <div><strong>Kết quả đã được công bố · Phiên bản {status.publicationVersion}</strong><span>{status.publishedByName || 'Admin'} · {formatDateTime(status.publishedAt)}</span></div>
              </div>
              <button className="live-btn danger year-publication-button" type="button" onClick={() => openConfirm('WITHDRAW')}>
                <Undo2 size={16} /> Thu hồi kết quả
              </button>
            </div>
          ) : status.publicationState === 'WITHDRAWN' ? (
            <div className="year-publication-action-stack">
              <div className="year-publication-warning">
                <AlertTriangle size={19} />
                <div><strong>Kết quả đã được thu hồi</strong><span>{status.withdrawnByName || 'Admin'} · {formatDateTime(status.withdrawnAt)} · {status.withdrawalReason}</span></div>
              </div>
              <button className="live-btn primary year-publication-button" type="button" disabled={!status.readyToPublish} onClick={() => openConfirm('PUBLISH')}>
                <RotateCcw size={16} /> Công bố lại kết quả
              </button>
            </div>
          ) : !status.readyToPublish ? (
            <div className="year-publication-warning">
              <AlertTriangle size={19} />
              <div><strong>Chưa thể công bố</strong><span>Còn {Math.max(0, status.totalStudents - status.finalizedStudents)} học sinh chưa có kết quả đã chốt.</span></div>
            </div>
          ) : (
            <button className="live-btn primary year-publication-button" type="button" onClick={() => openConfirm('PUBLISH')}>
              {republishing ? <RotateCcw size={16} /> : <Send size={16} />}
              {republishing ? 'Công bố lại kết quả' : 'Công bố cho học sinh và phụ huynh'}
            </button>
          )}
        </div>
      )}

      {confirmMode && status && (
        <Modal
          title={confirmMode === 'WITHDRAW'
            ? `Thu hồi kết quả lớp ${status.classCode}`
            : `${republishing ? 'Công bố lại' : 'Công bố'} kết quả lớp ${status.classCode}`}
          onClose={closeConfirm}
          footer={<>
            <button className="live-btn subtle" type="button" onClick={closeConfirm}>Hủy</button>
            <button
              className={`live-btn ${confirmMode === 'WITHDRAW' ? 'danger' : 'primary'}`}
              type="button"
              disabled={!confirmed || publishing || (confirmMode === 'WITHDRAW' || republishing ? reason.trim().length < 10 : false)}
              onClick={confirmMode === 'WITHDRAW' ? withdraw : publish}
            >
              {confirmMode === 'WITHDRAW' ? <Undo2 size={15} /> : republishing ? <RotateCcw size={15} /> : <Send size={15} />}
              {confirmMode === 'WITHDRAW' ? 'Xác nhận thu hồi' : republishing ? 'Xác nhận công bố lại' : 'Xác nhận công bố'}
            </button>
          </>}
        >
          <div className="year-publication-confirm">
            {confirmMode === 'WITHDRAW' ? <AlertTriangle size={21} /> : <BellRing size={21} />}
            <div>
              <strong>{confirmMode === 'WITHDRAW' ? 'Kết quả sẽ tạm ẩn với tất cả người xem' : `${status.totalStudents} học sinh sẽ nhận kết quả`}</strong>
              <span>{confirmMode === 'WITHDRAW'
                ? 'Học sinh và phụ huynh sẽ nhận thông báo nhà trường đang rà soát. Sau khi sửa dữ liệu, Admin có thể công bố lại phiên bản mới.'
                : 'Hệ thống gửi thông báo cho từng học sinh và tất cả phụ huynh đang liên kết.'}</span>
            </div>
          </div>
          {(confirmMode === 'WITHDRAW' || republishing) && (
            <label className="year-publication-reason">
              <span>{confirmMode === 'WITHDRAW' ? 'Lý do thu hồi' : 'Lý do công bố lại'} <small>(bắt buộc, ít nhất 10 ký tự)</small></span>
              <textarea className="live-input year-review-reason-input" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ghi rõ nguyên nhân và nội dung cần điều chỉnh" />
            </label>
          )}
          <label className="year-review-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>{confirmMode === 'WITHDRAW' ? 'Tôi hiểu kết quả sẽ tạm ẩn và xác nhận thu hồi.' : 'Tôi đã kiểm tra kết quả đã chốt và xác nhận công bố.'}</span></label>
        </Modal>
      )}
    </Section>
  );
}

function publicationStateLabel(status: YearResultPublicationStatus) {
  if (status.publicationState === 'PUBLISHED') return `Đã công bố · v${status.publicationVersion}`;
  if (status.publicationState === 'WITHDRAWN') return 'Đã thu hồi';
  if (status.publicationState === 'OUTDATED') return 'Cần công bố lại';
  return status.readyToPublish ? 'Sẵn sàng công bố' : 'Chưa đủ điều kiện';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Chưa có thời gian';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}
