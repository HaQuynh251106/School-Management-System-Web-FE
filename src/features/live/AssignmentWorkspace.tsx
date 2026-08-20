import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Bell,
  Download,
  Eye,
  FileText,
  Save,
  Send,
  RotateCcw,
  Layers3,
  Upload,
  X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { Assignment, Submission, SubmissionResubmissionRequest, SubmissionVersion, TeachingAssignment } from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async, fmtDateTime, useToast } from './common';
import { useShortcutFilter } from '../../api/shortcutFilter';

type AssignmentActor = 'teacher' | 'student' | 'parent';
type PresignedUpload = { id: string; uploadUrl: string; method: string };

const FILE_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_ACCEPT = '.pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png';

function contentTypeOf(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const expected = FILE_TYPES[extension];
  if (!expected) throw new Error('Chỉ nhận file PDF, DOCX, JPG hoặc PNG');
  if (file.type && file.type.toLowerCase() !== expected) {
    throw new Error('Định dạng bên trong file không khớp với phần mở rộng');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('Mỗi file tối đa 5 MB');
  return expected;
}

function fileSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(size >= 1024 * 1024 ? 1 : 2)} MB`;
}

function openDownloadUrl(downloadUrl: string) {
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  link.click();
}

const emptyForm = {
  classId: '',
  subjectId: '',
  title: '',
  description: '',
  deadline: '',
  allowLate: false,
};

export function AssignmentsLive({ actor, childId }: { actor: AssignmentActor; childId?: string | null }) {
  const shortcut = useShortcutFilter(actor === 'teacher' ? 'B5' : actor === 'student' ? 'C4' : '');
  const statusFilter = shortcut.get('status') || '';
  const query = childId || '';
  const [currentTime, setCurrentTime] = useState(0);
  useEffect(() => setCurrentTime(Date.now()), []);
  const toast = useToast();
  const feedbackAnchorRef = useRef<HTMLDivElement>(null);
  const encodedChildId = childId ? encodeURIComponent(childId) : '';
  const assignmentPath = actor === 'teacher'
    ? shortcut.get('status') === 'SUBMITTED' ? '/assignments?status=NEEDS_GRADING' : '/assignments'
    : actor === 'student'
      ? '/me/assignments'
      : childId ? `/me/children/${encodedChildId}/assignments` : null;
  const submissionPath = actor === 'student'
    ? '/me/submissions'
    : actor === 'parent' && childId ? `/me/children/${encodedChildId}/submissions` : null;

  const assignments = useApi<Assignment[]>(assignmentPath);
  const mySubmissions = useApi<Submission[]>(submissionPath);
  const teachingScopes = useApi<TeachingAssignment[]>(actor === 'teacher' ? '/me/teacher-class-subjects' : null);
  const [selectedTeacherAssignmentId, setSelectedTeacherAssignmentId] = useState<string | null>(null);
  const teacherSubmissions = useApi<Submission[]>(
    actor === 'teacher' && selectedTeacherAssignmentId
      ? `/assignments/${selectedTeacherAssignmentId}/submissions`
      : null,
  );

  const [form, setForm] = useState(emptyForm);
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [detailAssignmentId, setDetailAssignmentId] = useState<string | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '', reason: '' });
  const [grading, setGrading] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [batchForm, setBatchForm] = useState({ score: '', feedback: '' });
  const [resubmitTarget, setResubmitTarget] = useState<Submission | null>(null);
  const [resubmitForm, setResubmitForm] = useState({ reason: '', allowedUntil: '' });

  const submissionsByAssignment = useMemo(
    () => new Map((mySubmissions.data || []).map((submission) => [submission.assignmentId, submission])),
    [mySubmissions.data],
  );
  const visibleAssignmentData = useMemo(() => {
    const rows = assignments.data || [];
    if (actor !== 'student' || shortcut.get('status') !== 'OVERDUE') return rows;
    return rows.filter((assignment) => assignment.deadline
      && new Date(assignment.deadline).getTime() < currentTime
      && !submissionsByAssignment.has(assignment.id));
  }, [actor, assignments.data, currentTime, shortcut, submissionsByAssignment]);
  const visibleAssignments = { ...assignments, data: visibleAssignmentData };
  const detailAssignment = (assignments.data || []).find((item) => item.id === detailAssignmentId) || null;
  const detailSubmission = detailAssignment ? submissionsByAssignment.get(detailAssignment.id) : undefined;
  const submissionHistoryBase = detailSubmission
    ? actor === 'parent' && childId
      ? `/me/children/${encodedChildId}/submissions/${encodeURIComponent(detailSubmission.id)}`
      : `/submissions/${encodeURIComponent(detailSubmission.id)}`
    : null;
  const submissionVersions = useApi<SubmissionVersion[]>(submissionHistoryBase ? `${submissionHistoryBase}/versions` : null);
  const resubmissionHistory = useApi<SubmissionResubmissionRequest[]>(submissionHistoryBase ? `${submissionHistoryBase}/resubmission-requests` : null);
  const detailHasSubmissionFile = Boolean(submissionFile || detailSubmission?.attachmentFileId);
  const selectedTeacherAssignment = (assignments.data || [])
    .find((item) => item.id === selectedTeacherAssignmentId) || null;

  const teacherClasses = useMemo(() => {
    const values = new Map<string, string>();
    (teachingScopes.data || []).forEach((scope) => values.set(scope.classId, scope.classCode || scope.classId));
    return [...values].map(([id, code]) => ({ id, code })).sort((a, b) => a.code.localeCompare(b.code, 'vi', { numeric: true }));
  }, [teachingScopes.data]);
  const teacherSubjects = useMemo(() => {
    const values = new Map<string, string>();
    (teachingScopes.data || [])
      .filter((scope) => scope.classId === form.classId)
      .forEach((scope) => values.set(scope.subjectId, scope.subjectName || scope.subjectId));
    return [...values].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [teachingScopes.data, form.classId]);
  const classNameById = useMemo(
    () => new Map(teacherClasses.map((item) => [item.id, item.code])),
    [teacherClasses],
  );
  const canCreateAssignment = Boolean(
    form.classId && form.subjectId && form.title.trim() && form.deadline && assignmentFile,
  );

  const showCompletion = (message: string) => {
    toast.show('ok', message);
    window.requestAnimationFrame(() => {
      feedbackAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      feedbackAnchorRef.current?.focus({ preventScroll: true });
    });
  };

  const uploadFile = async (file: File, scope: 'ASSIGNMENT' | 'SUBMISSION') => {
    const contentType = contentTypeOf(file);
    const upload = await api.post<PresignedUpload>('/files/presigned-upload', {
      scope,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    });
    const response = await fetch(upload.uploadUrl, {
      method: upload.method,
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!response.ok) throw new Error('Không thể tải file lên MinIO');
    await api.post(`/files/${upload.id}/complete`);
    return upload.id;
  };

  const createAssignment = async (publishNow: boolean) => {
    if (!form.title.trim()) return toast.show('err', 'Bắt buộc nhập tên đề bài');
    if (!assignmentFile) return toast.show('err', 'Bắt buộc chọn file đề bài');
    if (!form.classId || !form.subjectId || !form.deadline) return toast.show('err', 'Chọn lớp, môn và hạn nộp');
    setCreating(true);
    try {
      const attachmentFileId = assignmentFile ? await uploadFile(assignmentFile, 'ASSIGNMENT') : null;
      await api.post('/assignments', {
        ...form,
        title: form.title.trim(),
        description: form.description.trim() || null,
        deadline: new Date(form.deadline).toISOString(),
        attachmentFileId,
        publishNow,
      });
      showCompletion(publishNow
        ? 'Đã phát hành bài tập và gửi thông báo'
        : 'Đã lưu bài tập ở trạng thái nháp');
      setForm(emptyForm);
      setAssignmentFile(null);
      assignments.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setCreating(false);
    }
  };

  const publishAssignment = async (assignment: Assignment) => {
    try {
      await api.post(`/assignments/${assignment.id}/publish`);
      showCompletion('Đã phát hành bài tập và gửi thông báo');
      assignments.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    }
  };

  const openDetails = (assignment: Assignment, revealResult = false) => {
    const existing = submissionsByAssignment.get(assignment.id);
    setDetailAssignmentId(assignment.id);
    setSubmissionContent(existing?.content || '');
    setSubmissionFile(null);
    setShowResult(revealResult);
  };

  const submitAssignment = async () => {
    if (!detailAssignment || actor !== 'student') return;
    if (!detailHasSubmissionFile) {
      return toast.show('err', 'Bắt buộc chọn file bài làm trước khi nộp');
    }
    if (detailSubmission?.status === 'GRADED') {
      return toast.show('err', 'Bài đã được chấm nên không thể nộp lại');
    }
    setSubmitting(true);
    try {
      const attachmentFileId = submissionFile ? await uploadFile(submissionFile, 'SUBMISSION') : null;
      await api.post(`/assignments/${detailAssignment.id}/submit`, {
        content: submissionContent.trim() || null,
        attachmentFileId,
      });
      showCompletion(detailSubmission ? 'Đã cập nhật bài nộp' : 'Đã nộp bài thành công');
      setDetailAssignmentId(null);
      setSubmissionContent('');
      setSubmissionFile(null);
      mySubmissions.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestDownload = async (path: string) => {
    try {
      const result = await api.post<{ downloadUrl: string }>(path);
      openDownloadUrl(result.downloadUrl);
    } catch (error: any) {
      toast.show('err', error.message);
    }
  };

  const downloadAssignmentFile = (assignment: Assignment) => {
    if (!assignment.attachmentFileId) return;
    if (actor === 'teacher') {
      return requestDownload(`/files/${assignment.attachmentFileId}/presigned-download`);
    }
    if (actor === 'parent' && childId) {
      return requestDownload(`/me/children/${encodedChildId}/assignments/${assignment.id}/attachment/presigned-download`);
    }
    return requestDownload(`/assignments/${assignment.id}/attachment/presigned-download`);
  };

  const downloadOwnSubmission = (assignment: Assignment, submission: Submission) => {
    if (!submission.attachmentFileId) return;
    if (actor === 'parent' && childId) {
      return requestDownload(
        `/me/children/${encodedChildId}/assignments/${assignment.id}/submissions/${submission.id}/presigned-download`,
      );
    }
    return requestDownload(`/files/${submission.attachmentFileId}/presigned-download`);
  };

  const downloadStudentSubmission = (submission: Submission) => {
    if (!selectedTeacherAssignmentId) return;
    return requestDownload(
      `/assignments/${selectedTeacherAssignmentId}/submissions/${submission.id}/presigned-download`,
    );
  };

  const startGrading = (submission: Submission) => {
    setGradeTarget(submission);
    setGradeForm({
      score: submission.score == null ? '' : String(submission.score),
      feedback: submission.feedback || '',
      reason: '',
    });
  };

  const saveGrade = async () => {
    if (!gradeTarget) return;
    const score = Number(gradeForm.score);
    if (gradeForm.score.trim() === '' || !Number.isFinite(score) || score < 0 || score > 10) {
      return toast.show('err', 'Điểm phải nằm trong khoảng 0 đến 10');
    }
    if (Math.abs(score * 10 - Math.round(score * 10)) > 0.000001) {
      return toast.show('err', 'Điểm chỉ nhập tối đa một chữ số thập phân');
    }
    const isCorrection = gradeTarget.status === 'GRADED';
    if (isCorrection && !gradeForm.reason.trim()) {
      return toast.show('err', 'Vui lòng nhập lý do sửa kết quả');
    }
    setGrading(true);
    try {
      await api.post(`/submissions/${gradeTarget.id}/grade`, {
        score,
        feedback: gradeForm.feedback.trim() || null,
        reason: isCorrection ? gradeForm.reason.trim() : null,
      });
      toast.show('ok', 'Đã lưu điểm, nhận xét và gửi thông báo');
      setGradeTarget(null);
      teacherSubmissions.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setGrading(false);
    }
  };

  const batchGrade = async () => {
    const score = Number(batchForm.score);
    if (!selectedSubmissions.length) return toast.show('err', 'Chọn ít nhất một bài nộp');
    if (!Number.isFinite(score) || score < 0 || score > 10) return toast.show('err', 'Điểm phải từ 0 đến 10');
    setGrading(true);
    try {
      await api.post('/submissions/batch-grade', {
        entries: selectedSubmissions.map((submissionId) => ({
          submissionId,
          score,
          feedback: batchForm.feedback.trim() || null,
          reason: null,
        })),
      });
      toast.show('ok', `Đã chấm ${selectedSubmissions.length} bài và gửi thông báo`);
      setSelectedSubmissions([]);
      setBatchForm({ score: '', feedback: '' });
      teacherSubmissions.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setGrading(false);
    }
  };

  const requestResubmission = async () => {
    if (!resubmitTarget) return;
    if (!resubmitForm.reason.trim()) return toast.show('err', 'Nhập lý do yêu cầu nộp lại');
    try {
      await api.post(`/submissions/${encodeURIComponent(resubmitTarget.id)}/request-resubmission`, {
        reason: resubmitForm.reason.trim(),
        allowedUntil: resubmitForm.allowedUntil ? new Date(resubmitForm.allowedUntil).toISOString() : null,
      });
      toast.show('ok', 'Đã mở quyền nộp lại và thông báo cho học sinh');
      setResubmitTarget(null);
      setResubmitForm({ reason: '', allowedUntil: '' });
      teacherSubmissions.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    }
  };

  const remindDue = async () => {
    if (!selectedTeacherAssignment) return;
    try {
      const result = await api.post<{ recipientStudents: number }>(`/assignments/${selectedTeacherAssignment.id}/remind-due`);
      toast.show('ok', `Đã nhắc ${result.recipientStudents} học sinh chưa nộp`);
    } catch (error: any) {
      toast.show('err', error.message);
    }
  };

  const exportSubmissions = async () => {
    if (!selectedTeacherAssignment) return;
    try {
      const response = await api.download(`/assignments/${selectedTeacherAssignment.id}/submissions/export`);
      const url = URL.createObjectURL(response.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.filename || `bai-nop-${selectedTeacherAssignment.id}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.show('err', error.message);
    }
  };

  const title = actor === 'teacher'
    ? 'Quản lý bài tập (B5)'
    : actor === 'student' ? 'Bài tập của tôi (C4)' : 'Bài tập của con';

  return (
    <Section title={title} subtitle="Bài giao, file đề, bài nộp và kết quả" wide>
      <div ref={feedbackAnchorRef} className="assignment-feedback-anchor" tabIndex={-1}>{toast.node}</div>

      {actor === 'teacher' && (
        <div className="assignment-create-form">
          <div className="assignment-create-grid">
            <select
              className="live-select"
              value={form.classId}
              onChange={(event) => setForm({ ...form, classId: event.target.value, subjectId: '' })}
            >
              <option value="">Chọn lớp được phân công</option>
              {teacherClasses.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
            </select>
            <select
              className="live-select"
              value={form.subjectId}
              disabled={!form.classId}
              onChange={(event) => setForm({ ...form, subjectId: event.target.value })}
            >
              <option value="">Chọn môn được phân công</option>
              {teacherSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input
              className="live-input assignment-title-input"
              value={form.title}
              placeholder="Tên đề bài *"
              aria-required="true"
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <input
              className="live-input"
              type="datetime-local"
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
          </div>
          <textarea
            className="live-input assignment-description-input"
            value={form.description}
            placeholder="Mô tả và yêu cầu bài tập"
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <div className="assignment-create-actions">
            <label className="live-btn ghost assignment-file-picker">
              <Upload size={15} /> Chọn file đề *
              <input
                hidden
                type="file"
                aria-required="true"
                accept={FILE_ACCEPT}
                onClick={(event) => { event.currentTarget.value = ''; }}
                onChange={(event) => setAssignmentFile(event.target.files?.[0] || null)}
              />
            </label>
            {assignmentFile && (
              <span className="selected-file">
                <FileText size={15} /> {assignmentFile.name} ({fileSize(assignmentFile.size)})
                <button className="icon-inline-btn" title="Bỏ file" onClick={() => setAssignmentFile(null)}><X size={14} /></button>
              </span>
            )}
            <label className="assignment-checkbox">
              <input
                type="checkbox"
                checked={form.allowLate}
                onChange={(event) => setForm({ ...form, allowLate: event.target.checked })}
              />
              Cho phép nộp muộn
            </label>
            <span className="assignment-action-spacer" />
            <button className="live-btn subtle" disabled={creating || !canCreateAssignment} onClick={() => createAssignment(false)}>
              <Save size={15} /> Lưu nháp
            </button>
            <button className="live-btn" disabled={creating || !canCreateAssignment} onClick={() => createAssignment(true)}>
              <Send size={15} /> {creating ? 'Đang lưu...' : 'Phát hành'}
            </button>
          </div>
        </div>
      )}

      <Async paginate state={visibleAssignments} empty="Chưa có bài tập" itemLabel="bài tập" resetKey={`${actor}|${statusFilter}|${query}`}>
        {(items) => (
          <div className="live-table-wrap">
            <table className="live-table assignment-table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  {actor === 'teacher' && <th>Lớp</th>}
                  <th>Môn</th>
                  <th>Hạn nộp</th>
                  <th>File đề</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((assignment) => {
                  const ownSubmission = submissionsByAssignment.get(assignment.id);
                  const rowStatus = actor === 'teacher' ? assignment.status : ownSubmission?.status || 'PENDING';
                  return (
                    <tr key={assignment.id} className={
                      selectedTeacherAssignmentId === assignment.id || detailAssignmentId === assignment.id
                        ? 'assignment-row-selected' : ''
                    }>
                      <td>
                        <strong>{assignment.title}</strong>
                        {assignment.description && <small className="assignment-description">{assignment.description}</small>}
                      </td>
                      {actor === 'teacher' && <td>{classNameById.get(assignment.classId) || assignment.classId}</td>}
                      <td>{assignment.subjectName}</td>
                      <td>{fmtDateTime(assignment.deadline)}</td>
                      <td>
                        {assignment.attachmentFileId
                          ? <button className="live-btn subtle file-name-button" title={assignment.attachmentName || 'Tải file đề'} onClick={() => downloadAssignmentFile(assignment)}>
                              <Download size={14} /> {assignment.attachmentName || 'Tải đề'}
                            </button>
                          : assignment.attachmentName || '—'}
                      </td>
                      <td><StatusPill value={rowStatus} /></td>
                      <td className="assignment-row-actions">
                        {actor === 'teacher' ? (
                          <>
                            {assignment.status === 'DRAFT' && (
                              <button className="live-btn" onClick={() => publishAssignment(assignment)}><Send size={14} /> Phát hành</button>
                            )}
                            {assignment.status !== 'DRAFT' && (
                              <button className="live-btn subtle" onClick={() => {
                                setSelectedTeacherAssignmentId(assignment.id);
                                setGradeTarget(null);
                              }}><Eye size={14} /> Bài nộp</button>
                            )}
                          </>
                        ) : ownSubmission?.status === 'GRADED' ? (
                          <button className="live-btn" onClick={() => openDetails(assignment, true)}><Eye size={14} /> Xem kết quả</button>
                        ) : actor === 'student' ? (
                          <button className="live-btn" onClick={() => openDetails(assignment)}>
                            <Upload size={14} /> {ownSubmission ? 'Xem bài nộp' : 'Nộp bài'}
                          </button>
                        ) : (
                          <button className="live-btn subtle" onClick={() => openDetails(assignment)}><Eye size={14} /> Xem chi tiết</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Async>

      {actor !== 'teacher' && detailAssignment && (
        <div className="submission-workspace">
          <div className="submission-head">
            <div>
              <strong>{detailAssignment.title}</strong>
              <small>{detailAssignment.subjectName} · Hạn nộp: {fmtDateTime(detailAssignment.deadline)}</small>
            </div>
            <button className="live-btn ghost" onClick={() => setDetailAssignmentId(null)}><X size={14} /> Đóng</button>
          </div>
          {detailAssignment.description && <p className="assignment-detail-description">{detailAssignment.description}</p>}
          {detailAssignment.attachmentFileId && (
            <button className="live-btn subtle assignment-download-own" onClick={() => downloadAssignmentFile(detailAssignment)}>
              <Download size={14} /> Tải đề: {detailAssignment.attachmentName || 'File bài tập'}
            </button>
          )}
          {detailAssignment.deadline && new Date(detailAssignment.deadline) < new Date() && (
            <div className="submission-deadline">
              {detailAssignment.allowLate ? 'Đã quá hạn: bài nộp sẽ được đánh dấu nộp muộn.' : 'Đã quá hạn nộp bài.'}
            </div>
          )}

          {detailSubmission?.status === 'GRADED' ? (
            <>
              <div className="submission-file-summary">
                <span><strong>File đã nộp:</strong> {detailSubmission.attachmentName || 'Không có file'}</span>
                {detailSubmission.attachmentFileId && (
                  <button className="live-btn subtle" onClick={() => downloadOwnSubmission(detailAssignment, detailSubmission)}>
                    <Download size={14} /> Tải lại file đã nộp
                  </button>
                )}
              </div>
              {!showResult ? (
                <button className="live-btn assignment-result-button" onClick={() => setShowResult(true)}>
                  <Eye size={14} /> Xem kết quả
                </button>
              ) : (
                <div className="submission-result">
                  <div><span>Điểm</span><strong>{detailSubmission.score ?? '—'} / 10</strong></div>
                  <div><span>Nhận xét của giáo viên</span><p>{detailSubmission.feedback || 'Giáo viên không để lại nhận xét.'}</p></div>
                </div>
              )}
            </>
          ) : actor === 'student' ? (
            <>
              <label className="assignment-field-label" htmlFor="submission-note">Ghi chú gửi giáo viên (không bắt buộc)</label>
              <textarea
                id="submission-note"
                className="live-input submission-textarea"
                value={submissionContent}
                onChange={(event) => setSubmissionContent(event.target.value)}
                placeholder="Có thể để trống nếu chỉ nộp file"
              />
              {detailSubmission?.attachmentName && (
                <div className="submission-file-summary">
                  <span><strong>File đã nộp:</strong> {detailSubmission.attachmentName}</span>
                  {detailSubmission.attachmentFileId && (
                    <button className="live-btn subtle" onClick={() => downloadOwnSubmission(detailAssignment, detailSubmission)}>
                      <Download size={14} /> Tải lại file đã nộp
                    </button>
                  )}
                </div>
              )}
              <div className="assignment-create-actions">
                <label className="live-btn ghost assignment-file-picker">
                  <Upload size={14} /> {detailSubmission?.attachmentFileId ? 'Chọn file thay thế' : 'Chọn file bài làm *'}
                  <input
                    hidden
                    type="file"
                    aria-required={!detailSubmission?.attachmentFileId}
                    accept={FILE_ACCEPT}
                    onClick={(event) => { event.currentTarget.value = ''; }}
                    onChange={(event) => setSubmissionFile(event.target.files?.[0] || null)}
                  />
                </label>
                {submissionFile && <span className="selected-file"><FileText size={15} /> {submissionFile.name} ({fileSize(submissionFile.size)})</span>}
                <span className="assignment-action-spacer" />
                <button
                  className="live-btn"
                  disabled={submitting || !detailHasSubmissionFile || (!!detailAssignment.deadline && new Date(detailAssignment.deadline) < new Date() && !detailAssignment.allowLate)}
                  onClick={submitAssignment}
                >
                  <Upload size={14} /> {submitting ? 'Đang nộp...' : detailSubmission ? 'Cập nhật bài nộp' : 'Nộp bài'}
                </button>
              </div>
            </>
          ) : detailSubmission ? (
            <div className="submission-parent-summary">
              <p><strong>Trạng thái:</strong> <StatusPill value={detailSubmission.status} /></p>
              <p><strong>Ghi chú của học sinh:</strong> {detailSubmission.content || 'Không có'}</p>
              <div className="submission-file-summary">
                <span><strong>File đã nộp:</strong> {detailSubmission.attachmentName || 'Không có file'}</span>
                {detailSubmission.attachmentFileId && (
                  <button className="live-btn subtle" onClick={() => downloadOwnSubmission(detailAssignment, detailSubmission)}>
                    <Download size={14} /> Tải file
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="live-loading">Con chưa nộp bài tập này.</div>
          )}
          {detailSubmission && <div className="submission-history-grid">
            <div><strong><Layers3 size={15} /> Lịch sử nộp bài</strong>
              <Async paginate pageSize={5} state={submissionVersions} empty="Chưa có phiên bản lưu trữ" itemLabel="lần nộp">{(versions) => <ul>{versions.map((version) => <li key={version.id}>Lần {version.versionNo} · {fmtDateTime(version.submittedAt)} · {version.attachmentName || 'Không có file'}</li>)}</ul>}</Async>
            </div>
            <div><strong><RotateCcw size={15} /> Yêu cầu nộp lại</strong>
              <Async paginate pageSize={5} state={resubmissionHistory} empty="Không có yêu cầu nộp lại" itemLabel="yêu cầu nộp lại">{(requests) => <ul>{requests.map((request) => <li key={request.id}><StatusPill value={request.status} /> {request.reason}{request.allowedUntil ? ` · đến ${fmtDateTime(request.allowedUntil)}` : ''}</li>)}</ul>}</Async>
            </div>
          </div>}
        </div>
      )}

      {actor === 'teacher' && selectedTeacherAssignment && (
        <div className="teacher-submission-workspace">
          <div className="submission-head">
            <div>
              <strong>Bài nộp: {selectedTeacherAssignment.title}</strong>
              <small>{selectedTeacherAssignment.subjectName} · Hạn nộp: {fmtDateTime(selectedTeacherAssignment.deadline)}</small>
            </div>
            <button className="live-btn ghost" onClick={() => {
              setSelectedTeacherAssignmentId(null);
              setGradeTarget(null);
            }}><X size={14} /> Đóng</button>
          </div>
          <div className="assignment-advanced-toolbar">
            <button className="live-btn subtle" onClick={remindDue}><Bell size={14} /> Nhắc học sinh chưa nộp</button>
            <button className="live-btn subtle" onClick={exportSubmissions}><Download size={14} /> Xuất danh sách</button>
          </div>
          <Async paginate state={teacherSubmissions} empty="Chưa có học sinh nộp bài" itemLabel="bài nộp" resetKey={selectedTeacherAssignment.id}>
            {(items) => (
              <div className="live-table-wrap">
                <table className="live-table">
                  <thead><tr><th><input type="checkbox" aria-label="Chọn tất cả bài chưa chấm" checked={items.length > 0 && items.filter((item) => item.status !== 'GRADED').every((item) => selectedSubmissions.includes(item.id))} onChange={(event) => setSelectedSubmissions(event.target.checked ? items.filter((item) => item.status !== 'GRADED').map((item) => item.id) : [])} /></th><th>Học sinh</th><th>Trạng thái</th><th>Ghi chú</th><th>File bài nộp</th><th>Điểm</th><th /></tr></thead>
                  <tbody>
                    {items.map((submission) => (
                      <tr key={submission.id}>
                        <td><input type="checkbox" disabled={submission.status === 'GRADED'} checked={selectedSubmissions.includes(submission.id)} onChange={(event) => setSelectedSubmissions((current) => event.target.checked ? [...new Set([...current, submission.id])] : current.filter((id) => id !== submission.id))} /></td>
                        <td><strong>{submission.studentName}</strong></td>
                        <td><StatusPill value={submission.status} /></td>
                        <td>{submission.content || '—'}</td>
                        <td>
                          {submission.attachmentFileId
                            ? <button className="live-btn subtle file-name-button" title={submission.attachmentName || 'Tải bài nộp'} onClick={() => downloadStudentSubmission(submission)}>
                                <Download size={14} /> {submission.attachmentName || 'Tải file'}
                              </button>
                            : '—'}
                        </td>
                        <td>{submission.score ?? '—'}</td>
                        <td>
                          {submission.status === 'GRADED' && <button className="live-btn ghost" onClick={() => setResubmitTarget(submission)}><RotateCcw size={14} /> Nộp lại</button>}
                          <button className="live-btn subtle" onClick={() => startGrading(submission)}>
                            <CheckCircle2 size={14} /> {submission.status === 'GRADED' ? 'Sửa kết quả' : 'Chấm bài'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Async>

          {selectedSubmissions.length > 0 && <div className="batch-grading-panel">
            <strong>Chấm hàng loạt {selectedSubmissions.length} bài</strong>
            <input className="live-input" type="number" min="0" max="10" step="0.1" value={batchForm.score} onChange={(event) => setBatchForm({ ...batchForm, score: event.target.value })} placeholder="Điểm 0-10" />
            <input className="live-input" value={batchForm.feedback} onChange={(event) => setBatchForm({ ...batchForm, feedback: event.target.value })} placeholder="Nhận xét chung (không bắt buộc)" />
            <button className="live-btn" disabled={grading} onClick={batchGrade}><CheckCircle2 size={14} /> Lưu hàng loạt</button>
          </div>}

          {resubmitTarget && <div className="grading-panel">
            <div className="grading-panel-head"><div><strong>Yêu cầu {resubmitTarget.studentName} nộp lại</strong><small>Bài cũ vẫn được giữ trong lịch sử phiên bản</small></div><button className="icon-inline-btn" onClick={() => setResubmitTarget(null)}><X size={16} /></button></div>
            <div className="grading-fields"><label><span>Lý do *</span><textarea className="live-input" value={resubmitForm.reason} onChange={(event) => setResubmitForm({ ...resubmitForm, reason: event.target.value })} /></label><label><span>Cho phép nộp đến</span><input className="live-input" type="datetime-local" value={resubmitForm.allowedUntil} onChange={(event) => setResubmitForm({ ...resubmitForm, allowedUntil: event.target.value })} /></label></div>
            <div className="grading-actions"><button className="live-btn ghost" onClick={() => setResubmitTarget(null)}>Hủy</button><button className="live-btn" onClick={requestResubmission}><Send size={14} /> Gửi yêu cầu</button></div>
          </div>}

          {gradeTarget && (
            <div className="grading-panel">
              <div className="grading-panel-head">
                <div><strong>{gradeTarget.status === 'GRADED' ? 'Sửa kết quả' : 'Chấm bài'} cho {gradeTarget.studentName}</strong><small>{gradeTarget.attachmentName || 'Bài nộp không có file'}</small></div>
                <button className="icon-inline-btn" title="Đóng" onClick={() => setGradeTarget(null)}><X size={16} /></button>
              </div>
              <div className="grading-fields">
                <label>
                  <span>Điểm (0-10)</span>
                  <input
                    className="live-input"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={gradeForm.score}
                    onChange={(event) => setGradeForm({ ...gradeForm, score: event.target.value })}
                  />
                </label>
                <label>
                  <span>Nhận xét cho học sinh</span>
                  <textarea
                    className="live-input"
                    value={gradeForm.feedback}
                    onChange={(event) => setGradeForm({ ...gradeForm, feedback: event.target.value })}
                    placeholder="Nhận xét không bắt buộc"
                  />
                </label>
                {gradeTarget.status === 'GRADED' && (
                  <label className="grading-reason">
                    <span>Lý do sửa kết quả</span>
                    <textarea
                      className="live-input"
                      maxLength={500}
                      required
                      value={gradeForm.reason}
                      onChange={(event) => setGradeForm({ ...gradeForm, reason: event.target.value })}
                      placeholder="Nhập lý do bắt buộc"
                    />
                  </label>
                )}
              </div>
              <div className="grading-actions">
                <button className="live-btn ghost" onClick={() => setGradeTarget(null)}>Hủy</button>
                <button className="live-btn" disabled={grading} onClick={saveGrade}>
                  <Save size={14} /> {grading ? 'Đang lưu...' : gradeTarget.status === 'GRADED' ? 'Lưu thay đổi' : 'Lưu kết quả'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
