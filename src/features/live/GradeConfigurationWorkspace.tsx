import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { AcademicYear, ExamCategory, GradeConfiguration, Semester, Subject } from '../../api/types';
import { Section } from '../../components/ui';
import { Async, useToast } from './common';

export function GradeConfigurationWorkspace() {
  const toast = useToast();
  const categories = useApi<ExamCategory[]>('/exam-categories');
  const subjects = useApi<Subject[]>('/subjects');
  const semesters = useApi<Semester[]>('/semesters');
  const years = useApi<AcademicYear[]>('/academicYears');
  const [scope, setScope] = useState({ subjectId: '', semesterId: '' });
  const configs = useApi<GradeConfiguration[]>(scope.subjectId && scope.semesterId ? `/grade-configurations?subjectId=${encodeURIComponent(scope.subjectId)}&semesterId=${encodeURIComponent(scope.semesterId)}` : null);
  const [drafts, setDrafts] = useState<Record<string, { requiredCount: number; weight: number; active: boolean }>>({});
  const configured = new Map((configs.data || []).map((item) => [item.categoryCode, item]));
  const yearById = useMemo(() => new Map((years.data || []).map((item) => [item.id, item.code])), [years.data]);
  const gradableSubjects = (subjects.data || []).filter((item) => !['CHAOCO', 'SHL'].includes(item.code.toUpperCase()));

  const values = (category: ExamCategory) => {
    const saved = configured.get(category.code);
    return drafts[category.code] || { requiredCount: saved?.requiredCount || 1, weight: saved?.weight || category.weight || 1, active: saved?.active ?? true };
  };
  const update = (category: ExamCategory, patch: Partial<{ requiredCount: number; weight: number; active: boolean }>) => setDrafts((current) => ({ ...current, [category.code]: { ...values(category), ...patch } }));
  const save = async (category: ExamCategory) => {
    try {
      await api.put('/grade-configurations', { ...scope, categoryCode: category.code, categoryName: category.name, ...values(category) });
      toast.show('ok', `Đã lưu cấu hình ${category.name}`); configs.reload();
    } catch (error: any) { toast.show('err', error.message); }
  };

  return <Section title="Cấu hình điểm theo môn và học kỳ" subtitle="Số đầu điểm, hệ số và trạng thái áp dụng riêng cho từng phạm vi" wide>
    {toast.node}
    <div className="live-toolbar">
      <select className="live-select grow" value={scope.subjectId} onChange={(event) => { setScope({ ...scope, subjectId: event.target.value }); setDrafts({}); }}><option value="">— Chọn môn học —</option>{gradableSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className="live-select grow" value={scope.semesterId} onChange={(event) => { setScope({ ...scope, semesterId: event.target.value }); setDrafts({}); }}><option value="">— Chọn học kỳ —</option>{(semesters.data || []).map((item) => <option key={item.id} value={item.id}>{item.name} · {yearById.get(item.academicYearId) || item.academicYearId}</option>)}</select>
    </div>
    {!scope.subjectId || !scope.semesterId ? <div className="live-loading">Chọn môn và học kỳ để cấu hình đầu điểm.</div> : <Async state={categories} empty="Chưa có loại điểm gốc">{(items) => <table className="live-table"><thead><tr><th>Loại điểm</th><th>Số đầu điểm bắt buộc</th><th>Hệ số</th><th>Áp dụng</th><th /></tr></thead><tbody>{items.map((category) => { const draft = values(category); return <tr key={category.id}><td><strong>{category.name}</strong><small>{category.code}</small></td><td><input className="live-input" type="number" min="1" max="20" value={draft.requiredCount} onChange={(event) => update(category, { requiredCount: Number(event.target.value) })} /></td><td><input className="live-input" type="number" min="0.5" max="10" step="0.5" value={draft.weight} onChange={(event) => update(category, { weight: Number(event.target.value) })} /></td><td><label className="assignment-checkbox"><input type="checkbox" checked={draft.active} onChange={(event) => update(category, { active: event.target.checked })} /> Đang dùng</label></td><td><button className="live-btn subtle" onClick={() => save(category)}><Save size={14} /> Lưu</button></td></tr>; })}</tbody></table>}</Async>}
  </Section>;
}
