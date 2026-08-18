import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessageSquareText, Save } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { HomeroomRemark, Semester } from '../../api/types';
import { Badge, Section } from '../../components/ui';
import { Async, fmtDateTime, useToast } from './common';

export function HomeroomRemarksPanel({ studentId, canEdit = false }: { studentId: string; canEdit?: boolean }) {
  const remarks = useApi<HomeroomRemark[]>(studentId ? `/students/${encodeURIComponent(studentId)}/homeroom-remarks` : null);
  const semesters = useApi<Semester[]>(canEdit ? '/semesters' : null);
  const [semesterId, setSemesterId] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const semesterRows = useMemo(() => (semesters.data || []).slice().sort((a, b) =>
    `${b.academicYearId}-${b.sequence}`.localeCompare(`${a.academicYearId}-${a.sequence}`)), [semesters.data]);
  const selectedSemesterId = semesterId || semesterRows[0]?.id || '';
  const current = (remarks.data || []).find((item) => item.semesterId === selectedSemesterId);

  useEffect(() => { setBody(current?.body || ''); }, [current?.id, current?.body, selectedSemesterId]);

  const save = async (publish: boolean) => {
    if (!selectedSemesterId) return toast.show('err', 'Chưa có học kỳ để ghi nhận xét.');
    if (!body.trim()) return toast.show('err', 'Hãy nhập nội dung nhận xét.');
    try {
      setSaving(true);
      await api.put(`/students/${encodeURIComponent(studentId)}/homeroom-remarks`, {
        semesterId: selectedSemesterId,
        body: body.trim(),
        publish,
      });
      toast.show('ok', publish ? 'Đã công bố nhận xét tới học sinh và phụ huynh.' : 'Đã lưu bản nháp nhận xét.');
      remarks.reload();
      window.dispatchEvent(new Event('sse:notifications-changed'));
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setSaving(false);
    }
  };

  return <div className="homeroom-remarks-panel">
    {toast.node}
    {canEdit && <div className="homeroom-remark-editor">
      <div className="homeroom-remark-heading"><span><MessageSquareText size={18} /></span><div><strong>Nhận xét của giáo viên chủ nhiệm</strong><small>Lưu nháp để chỉnh tiếp hoặc công bố cho học sinh và phụ huynh.</small></div></div>
      <label><span>Học kỳ</span><select className="live-select" value={selectedSemesterId} onChange={(event) => setSemesterId(event.target.value)}>{semesterRows.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></label>
      <label><span>Nội dung nhận xét</span><textarea className="live-input" rows={5} maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Nhận xét về học tập, chuyên cần, ý thức và định hướng cải thiện…" /><small>{body.length}/4000 ký tự</small></label>
      <div className="homeroom-remark-actions"><button className="live-btn subtle" disabled={saving} onClick={() => void save(false)}><Save size={14} /> Lưu nháp</button><button className="live-btn" disabled={saving} onClick={() => void save(true)}><CheckCircle2 size={14} /> Công bố</button></div>
    </div>}
    <Section title="Nhận xét GVCN" subtitle="Nhận xét được công bố theo từng học kỳ" wide>
      <Async state={remarks} empty="Chưa có nhận xét được công bố">
        {(items) => <div className="homeroom-remark-list">{items.map((item) => <article key={item.id}>
          <header><div><strong>{item.semesterName}</strong><small>{item.teacherName} · {fmtDateTime(item.updatedAt)}</small></div><Badge tone={item.status === 'PUBLISHED' ? 'green' : 'orange'}>{item.status === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}</Badge></header>
          <p>{item.body}</p>
        </article>)}</div>}
      </Async>
    </Section>
  </div>;
}
