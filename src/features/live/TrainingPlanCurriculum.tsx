import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenText, CalendarRange, Layers3, Pencil, Plus, Save,
  Trash2, X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicCurriculumItem, AcademicPlanDetail,
  AcademicPlanSubjectDetail, AcademicTrainingPlan, Semester, Subject,
} from '../../api/types';
import { Async, fmtDate } from './common';
import { useConfirm } from '../../app/ConfirmDialog';

type Notify = (type: 'ok' | 'err', message: string) => void;

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message : 'Không thể hoàn thành thao tác.';
}

const blankStage = {
  id: '', code: '', name: '', sequence: 1, startDate: '',
  endDate: '', targetPeriods: 1, description: '',
};
const blankItem = {
  id: '', parentId: '', itemType: 'CHAPTER', code: '', title: '',
  sequence: 1, plannedPeriods: 0, description: '',
};
const blankWeek = {
  id: '', weekType: 'EXAM', weekNumber: 1,
  name: 'Tuần kiểm tra', description: '',
};

export function TrainingPlanCurriculum({
  plan, semesters, subjects, canManage, notify, onChanged,
}: {
  plan: AcademicTrainingPlan;
  semesters: Semester[];
  subjects: Subject[];
  canManage: boolean;
  notify: Notify;
  onChanged: () => void;
}) {
  const confirmAction = useConfirm();
  const detail = useApi<AcademicPlanDetail>(
    `/academic/training-plans/${plan.id}/details`,
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [view, setView] = useState<'stages' | 'curriculum' | 'weeks'>('stages');
  const [stageForm, setStageForm] = useState({ ...blankStage });
  const [itemForm, setItemForm] = useState({ ...blankItem });
  const [weekForm, setWeekForm] = useState({ ...blankWeek });
  const editable = canManage && ['DRAFT', 'REVISION_REQUIRED'].includes(plan.status);
  const currentSubjects = useMemo(() => detail.data?.plan.id === plan.id
    ? detail.data.subjects.filter((row) => subjects.find((subject) =>
      subject.id === row.subject.subjectId)?.subjectType !== 'EDUCATIONAL_ACTIVITY') : [],
  [detail.data, plan.id, subjects]);

  useEffect(() => {
    if (!currentSubjects.some((row) => row.subject.id === selectedSubjectId)) {
      setSelectedSubjectId(currentSubjects[0]?.subject.id || '');
    }
  }, [currentSubjects, selectedSubjectId]);

  const selected = currentSubjects.find(
    (row) => row.subject.id === selectedSubjectId,
  );
  const stagePeriods = selected?.stages.reduce((sum, item) => sum + item.targetPeriods, 0) || 0;
  const lessonPeriods = selected?.curriculum.filter((item) => item.itemType === 'LESSON')
    .reduce((sum, item) => sum + item.plannedPeriods, 0) || 0;
  const subjectName = (row?: AcademicPlanSubjectDetail) => subjects.find(
    (item) => item.id === row?.subject.subjectId,
  )?.name || row?.subject.subjectId || 'Môn học';
  const semesterCode = (row?: AcademicPlanSubjectDetail) => semesters.find(
    (item) => item.id === row?.subject.semesterId,
  )?.code || row?.subject.semesterId || 'Học kỳ';

  const refresh = () => {
    detail.reload();
    onChanged();
  };

  const saveStage = async () => {
    if (!selected || !stageForm.code || !stageForm.name
      || !stageForm.startDate || !stageForm.endDate) {
      return notify('err', 'Nhập đủ mã, tên, thời gian và số tiết giai đoạn.');
    }
    try {
      const payload = { ...stageForm, id: stageForm.id || null };
      if (stageForm.id) {
        await api.put(
          `/academic/training-plans/${plan.id}/stages/${stageForm.id}`,
          payload,
        );
      } else {
        await api.post(
          `/academic/training-plans/${plan.id}/subjects/${selected.subject.id}/stages`,
          payload,
        );
      }
      notify('ok', stageForm.id ? 'Đã cập nhật giai đoạn.' : 'Đã thêm giai đoạn.');
      setStageForm({ ...blankStage });
      refresh();
    } catch (error) {
      notify('err', errorMessage(error));
    }
  };

  const saveItem = async () => {
    if (!selected || !itemForm.code || !itemForm.title) {
      return notify('err', 'Nhập mã và tên nội dung chương trình.');
    }
    if (itemForm.itemType !== 'CHAPTER' && !itemForm.parentId) {
      return notify('err', itemForm.itemType === 'TOPIC'
        ? 'Chủ đề phải thuộc một chương.'
        : 'Bài học phải thuộc một chủ đề.');
    }
    try {
      const payload = {
        ...itemForm,
        id: itemForm.id || null,
        parentId: itemForm.parentId || null,
        plannedPeriods: itemForm.itemType === 'LESSON'
          ? itemForm.plannedPeriods : 0,
      };
      if (itemForm.id) {
        await api.put(
          `/academic/training-plans/${plan.id}/curriculum/${itemForm.id}`,
          payload,
        );
      } else {
        await api.post(
          `/academic/training-plans/${plan.id}/subjects/${selected.subject.id}/curriculum`,
          payload,
        );
      }
      notify('ok', itemForm.id
        ? 'Đã cập nhật nội dung chương trình.'
        : 'Đã thêm nội dung chương trình.');
      setItemForm({ ...blankItem });
      refresh();
    } catch (error) {
      notify('err', errorMessage(error));
    }
  };

  const saveWeek = async () => {
    if (!selected || !weekForm.name) {
      return notify('err', 'Nhập tên tuần kế hoạch.');
    }
    try {
      const payload = { ...weekForm, id: weekForm.id || null };
      if (weekForm.id) {
        await api.put(
          `/academic/training-plans/${plan.id}/special-weeks/${weekForm.id}`,
          payload,
        );
      } else {
        await api.post(
          `/academic/training-plans/${plan.id}/subjects/${selected.subject.id}/special-weeks`,
          payload,
        );
      }
      notify('ok', weekForm.id
        ? 'Đã cập nhật tuần kế hoạch.'
        : 'Đã thêm tuần kế hoạch.');
      setWeekForm({ ...blankWeek });
      refresh();
    } catch (error) {
      notify('err', errorMessage(error));
    }
  };

  const remove = async (kind: 'stages' | 'curriculum' | 'special-weeks', id: string) => {
    if (!(await confirmAction({ title: 'Xóa nội dung kế hoạch', message: 'Nội dung đã chọn sẽ bị xóa khỏi bản nháp và không thể khôi phục bằng thao tác hoàn tác.', confirmLabel: 'Xóa nội dung', tone: 'danger' }))) return;
    try {
      await api.del(`/academic/training-plans/${plan.id}/${kind}/${id}`);
      notify('ok', 'Đã xóa nội dung khỏi bản nháp.');
      refresh();
    } catch (error) {
      notify('err', errorMessage(error));
    }
  };

  const parentOptions = useMemo(() => {
    if (!selected || itemForm.itemType === 'CHAPTER') return [];
    const expected = itemForm.itemType === 'TOPIC' ? 'CHAPTER' : 'TOPIC';
    return selected.curriculum.filter((item) => item.itemType === expected);
  }, [itemForm.itemType, selected]);

  return (
    <div className="training-curriculum-workspace">
      <div className="training-curriculum-heading">
        <div>
          <h3>Nội dung chi tiết từng môn</h3>
          <p>Số tiết được kiểm soát theo giai đoạn và từng bài học.</p>
        </div>
        <select
          className="live-select"
          value={selectedSubjectId}
          onChange={(event) => {
            setSelectedSubjectId(event.target.value);
            setStageForm({ ...blankStage });
            setItemForm({ ...blankItem });
            setWeekForm({ ...blankWeek });
          }}
        >
          {currentSubjects.map((row) => (
            <option key={row.subject.id} value={row.subject.id}>
              {subjectName(row)} · {semesterCode(row)} · {row.subject.totalPeriods} tiết
            </option>
          ))}
        </select>
      </div>

      <Async state={detail} allowEmpty empty="Hãy thêm môn vào kế hoạch trước">
        {() => selected ? (
          <>
            <div className="training-subject-summary">
              <div><small>Môn học và học kỳ</small><strong>{subjectName(selected)} · {semesterCode(selected)}</strong></div>
              <div><small>Thời gian</small><strong>{fmtDate(selected.subject.startDate)} - {fmtDate(selected.subject.endDate)}</strong></div>
              <div><small>Nhịp học</small><strong>{selected.subject.weeklyPeriods} tiết/tuần</strong></div>
              <div><small>Tổng chương trình</small><strong>{selected.subject.totalPeriods} tiết</strong></div>
            </div>

            <div className="plan-flow-guide training-link-guide">
              <strong>Mối liên kết dữ liệu</strong>
              <span>Giai đoạn xác định thời gian và chỉ tiêu tiết</span>
              <span>Chương trình môn học chứa Chương → Chủ đề → Bài học</span>
              <span>Phân phối theo tuần chọn chính bài học đã khai báo</span>
              <span>Tuần đặc biệt đánh dấu tuần kiểm tra hoặc dự phòng</span>
            </div>

            <div className="training-detail-tabs" role="tablist">
              <button className={view === 'stages' ? 'active' : ''} onClick={() => setView('stages')}>
                <Layers3 size={16} /> Giai đoạn
              </button>
              <button className={view === 'curriculum' ? 'active' : ''} onClick={() => setView('curriculum')}>
                <BookOpenText size={16} /> Chương trình môn học
              </button>
              <button className={view === 'weeks' ? 'active' : ''} onClick={() => setView('weeks')}>
                <CalendarRange size={16} /> Tuần đặc biệt
              </button>
            </div>

            {view === 'stages' && (
              <div className="training-detail-panel">
                <div className={`allocation-summary ${stagePeriods === selected.subject.totalPeriods ? 'complete' : 'warning'}`}><span>Tổng chương trình: <strong>{selected.subject.totalPeriods} tiết</strong></span><span>Đã phân bổ theo giai đoạn: <strong>{stagePeriods} tiết</strong></span><span>Còn lại: <strong>{selected.subject.totalPeriods - stagePeriods} tiết</strong></span></div>
                {editable && (
                  <div className="training-editor-grid labeled-form-grid">
                    <label className="field-stack"><span>Mã giai đoạn</span><input value={stageForm.code} onChange={(event) => setStageForm({ ...stageForm, code: event.target.value })} /></label>
                    <label className="field-stack grow"><span>Tên giai đoạn</span><input value={stageForm.name} onChange={(event) => setStageForm({ ...stageForm, name: event.target.value })} /></label>
                    <label className="field-stack"><span>Thứ tự</span><input type="number" min={1} value={stageForm.sequence} onChange={(event) => setStageForm({ ...stageForm, sequence: Number(event.target.value) })} /></label>
                    <label className="field-stack"><span>Ngày bắt đầu</span><input type="date" value={stageForm.startDate} onChange={(event) => setStageForm({ ...stageForm, startDate: event.target.value })} /><small>{stageForm.startDate ? fmtDate(stageForm.startDate) : 'dd/MM/yyyy'}</small></label>
                    <label className="field-stack"><span>Ngày kết thúc</span><input type="date" value={stageForm.endDate} onChange={(event) => setStageForm({ ...stageForm, endDate: event.target.value })} /><small>{stageForm.endDate ? fmtDate(stageForm.endDate) : 'dd/MM/yyyy'}</small></label>
                    <label className="field-stack"><span>Chỉ tiêu số tiết</span><input type="number" min={1} value={stageForm.targetPeriods} onChange={(event) => setStageForm({ ...stageForm, targetPeriods: Number(event.target.value) })} /></label>
                    <label className="field-stack grow"><span>Mô tả</span><input value={stageForm.description} onChange={(event) => setStageForm({ ...stageForm, description: event.target.value })} /></label>
                    <button className="live-btn" onClick={saveStage}>{stageForm.id ? <Save size={15} /> : <Plus size={15} />}{stageForm.id ? 'Lưu' : 'Thêm'}</button>
                    {stageForm.id && <button className="icon-action" title="Hủy sửa" onClick={() => setStageForm({ ...blankStage })}><X size={16} /></button>}
                  </div>
                )}
                <table className="live-table">
                  <thead><tr><th>Giai đoạn</th><th>Thời gian</th><th>Chỉ tiêu</th><th /></tr></thead>
                  <tbody>{selected.stages.map((stage) => (
                    <tr key={stage.id}>
                      <td><strong>{stage.code} · {stage.name}</strong><small>Thứ tự {stage.sequence}</small></td>
                      <td>{fmtDate(stage.startDate)} - {fmtDate(stage.endDate)}</td>
                      <td><strong>{stage.targetPeriods} tiết</strong></td>
                      <td>{editable && <div className="row-actions">
                        <button className="icon-action" title="Sửa giai đoạn" onClick={() => setStageForm({ ...stage, description: stage.description || '' })}><Pencil size={15} /></button>
                        <button className="icon-action danger" title="Xóa giai đoạn" onClick={() => remove('stages', stage.id)}><Trash2 size={15} /></button>
                      </div>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {view === 'curriculum' && (
              <div className="training-detail-panel">
                <div className={`allocation-summary ${lessonPeriods === selected.subject.totalPeriods ? 'complete' : 'warning'}`}><span>Tổng chương trình: <strong>{selected.subject.totalPeriods} tiết</strong></span><span>Đã khai báo bài học: <strong>{lessonPeriods} tiết</strong></span><span>Còn lại: <strong>{selected.subject.totalPeriods - lessonPeriods} tiết</strong></span></div>
                {editable && (
                  <div className="training-editor-grid curriculum-editor labeled-form-grid">
                    <label className="field-stack"><span>Loại nội dung</span><select value={itemForm.itemType} onChange={(event) => setItemForm({ ...itemForm, itemType: event.target.value, parentId: '', plannedPeriods: 0 })}>
                      <option value="CHAPTER">Chương</option>
                      <option value="TOPIC">Chủ đề</option>
                      <option value="LESSON">Bài học</option>
                    </select></label>
                    {itemForm.itemType !== 'CHAPTER' && <label className="field-stack grow"><span>Nội dung cha</span><select value={itemForm.parentId} onChange={(event) => setItemForm({ ...itemForm, parentId: event.target.value })}>
                      <option value="">Chọn mục cha</option>
                      {parentOptions.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}
                    </select></label>}
                    <label className="field-stack"><span>Mã nội dung</span><input value={itemForm.code} onChange={(event) => setItemForm({ ...itemForm, code: event.target.value })} /></label>
                    <label className="field-stack grow"><span>Tên nội dung</span><input value={itemForm.title} onChange={(event) => setItemForm({ ...itemForm, title: event.target.value })} /></label>
                    <label className="field-stack"><span>Thứ tự</span><input type="number" min={1} value={itemForm.sequence} onChange={(event) => setItemForm({ ...itemForm, sequence: Number(event.target.value) })} /></label>
                    {itemForm.itemType === 'LESSON' && <label className="field-stack"><span>Số tiết dự kiến</span><input type="number" min={0} value={itemForm.plannedPeriods} onChange={(event) => setItemForm({ ...itemForm, plannedPeriods: Number(event.target.value) })} /></label>}
                    <label className="field-stack grow"><span>Yêu cầu cần đạt / ghi chú</span><input value={itemForm.description} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })} /></label>
                    <button className="live-btn" onClick={saveItem}>{itemForm.id ? <Save size={15} /> : <Plus size={15} />}{itemForm.id ? 'Lưu' : 'Thêm'}</button>
                    {itemForm.id && <button className="icon-action" title="Hủy sửa" onClick={() => setItemForm({ ...blankItem })}><X size={16} /></button>}
                  </div>
                )}
                <div className="curriculum-tree">
                  {!selected.curriculum.length && <div className="empty-state"><strong>Chưa có nội dung môn học</strong><span>Chọn “Thêm” để tạo Chương, sau đó tạo Chủ đề và Bài học.</span></div>}
                  {selected.curriculum.map((item) => (
                    <CurriculumRow
                      key={item.id}
                      item={item}
                      editable={editable}
                      onEdit={() => setItemForm({
                        ...item,
                        parentId: item.parentId || '',
                        description: item.description || '',
                      })}
                      onDelete={() => remove('curriculum', item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {view === 'weeks' && (
              <div className="training-detail-panel">
                {editable && (
                  <div className="training-editor-grid labeled-form-grid">
                    <label className="field-stack"><span>Loại tuần</span><select value={weekForm.weekType} onChange={(event) => {
                      const weekType = event.target.value;
                      setWeekForm({
                        ...weekForm,
                        weekType,
                        name: weekType === 'EXAM' ? 'Tuần kiểm tra' : 'Tuần dự phòng',
                      });
                    }}>
                      <option value="EXAM">Tuần kiểm tra</option>
                      <option value="BUFFER">Tuần dự phòng</option>
                    </select></label>
                    <label className="field-stack"><span>Tuần số</span><input type="number" min={1} max={30} value={weekForm.weekNumber} onChange={(event) => setWeekForm({ ...weekForm, weekNumber: Number(event.target.value) })} /></label>
                    <label className="field-stack grow"><span>Nội dung</span><input value={weekForm.name} onChange={(event) => setWeekForm({ ...weekForm, name: event.target.value })} /></label>
                    <label className="field-stack grow"><span>Ghi chú</span><input value={weekForm.description} onChange={(event) => setWeekForm({ ...weekForm, description: event.target.value })} /></label>
                    <button className="live-btn" onClick={saveWeek}>{weekForm.id ? <Save size={15} /> : <Plus size={15} />}{weekForm.id ? 'Lưu' : 'Thêm'}</button>
                    {weekForm.id && <button className="icon-action" title="Hủy sửa" onClick={() => setWeekForm({ ...blankWeek })}><X size={16} /></button>}
                  </div>
                )}
                <table className="live-table">
                  <thead><tr><th>Loại tuần</th><th>Tuần số</th><th>Nội dung</th><th>Ghi chú</th><th /></tr></thead>
                  <tbody>{selected.specialWeeks.map((week) => (
                    <tr key={week.id}>
                      <td><strong>{week.weekType === 'EXAM' ? 'Kiểm tra' : 'Dự phòng'}</strong></td>
                      <td>Tuần {week.weekNumber}</td>
                      <td>{week.name}</td><td>{week.description || '—'}</td>
                      <td>{editable && <div className="row-actions">
                        <button className="icon-action" title="Sửa tuần" onClick={() => setWeekForm({ ...week, description: week.description || '' })}><Pencil size={15} /></button>
                        <button className="icon-action danger" title="Xóa tuần" onClick={() => remove('special-weeks', week.id)}><Trash2 size={15} /></button>
                      </div>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </Async>
    </div>
  );
}

function CurriculumRow({
  item, editable, onEdit, onDelete,
}: {
  item: AcademicCurriculumItem;
  editable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const label = item.itemType === 'CHAPTER'
    ? 'Chương' : item.itemType === 'TOPIC' ? 'Chủ đề' : 'Bài học';
  return (
    <div className={`curriculum-row type-${item.itemType.toLowerCase()}`}>
      <span className="curriculum-kind">{label}</span>
      <div><strong>{item.code} · {item.title}</strong>{item.itemType === 'LESSON' && <small>{item.plannedPeriods} tiết</small>}</div>
      {editable && <div className="row-actions">
        <button className="icon-action" title={`Sửa ${label.toLowerCase()}`} onClick={onEdit}><Pencil size={15} /></button>
        <button className="icon-action danger" title={`Xóa ${label.toLowerCase()}`} onClick={onDelete}><Trash2 size={15} /></button>
      </div>}
    </div>
  );
}
