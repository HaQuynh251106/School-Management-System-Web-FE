import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Copy,
  Eye,
  History,
  Pencil,
  RefreshCcw,
  Rocket,
  RotateCcw,
  Sparkles,
  Send,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { api } from "../../api/client";
import { useApi } from "../../api/useApi";
import { updateHashQuery, useHashString } from "../../api/urlState";
import type {
  AcademicYear,
  AutoAssignmentPlan,
  AutoTimetablePlan,
  CurriculumReadiness,
  CurriculumRequirement,
  CurriculumRequirementHistory,
  Semester,
  Subject,
  TeacherLoadRegistration,
  TeacherWorkloadAdjustment,
  TeacherWorkloadPolicy,
  TeachingAssignment,
  TeachingAssignmentVersion,
  TeachingAssignmentVersionItem,
  TimetableVersion,
  TimetablePublicationPreview,
  TimetablePublicationStatus,
  TimetablePublishResult,
  TimetableVersionSlot,
} from "../../api/types";
import { Badge, Section } from "../../components/ui";
import { Async, useToast } from "./common";
import { confirmAction } from "../../components/confirmAction";
import { Field, Modal } from "./Modal";
import { AcademicScheduleRestrictionPanel } from "./ScheduleRestrictionLive";

const GRADES = ["K10", "K11", "K12"];
const DAYS = [
  ["MON", "Thứ 2"],
  ["TUE", "Thứ 3"],
  ["WED", "Thứ 4"],
  ["THU", "Thứ 5"],
  ["FRI", "Thứ 6"],
] as const;

export type AssignmentWorkflowStage =
  "prepare" | "teachers" | "preview" | "warnings" | "publish";

const WORKLOAD_STATUS_LABELS: Record<
  TeacherLoadRegistration["workloadStatus"],
  string
> = {
  UNDER_TARGET: "Chưa đủ chỉ tiêu",
  ON_TARGET: "Đủ chỉ tiêu",
  APPROVED_OVERTIME: "Đã duyệt dạy vượt",
  OVER_LIMIT: "Vượt giới hạn",
};

function useSelectedSemester() {
  const semesters = useApi<Semester[]>("/semesters");
  const years = useApi<AcademicYear[]>("/academicYears");
  const [semesterId, setSemesterId] = useHashString("hoc_ky", "");
  const operationalYearIds = useMemo(
    () =>
      new Set(
        (years.data || [])
          .filter(
            (year) => year.status === "ACTIVE" || year.status === "PLANNED",
          )
          .map((year) => year.id),
      ),
    [years.data],
  );
  const semesterOptions = useMemo(
    () =>
      (semesters.data || []).filter(
        (item) =>
          item.status !== "CLOSED" &&
          operationalYearIds.has(item.academicYearId),
      ),
    [operationalYearIds, semesters.data],
  );
  useEffect(() => {
    if (!semesterOptions.length) {
      if (semesterId) setSemesterId("");
      return;
    }
    const currentSemesterExists = semesterOptions.some(
      (item) => item.id === semesterId,
    );
    if (currentSemesterExists) return;
    const preferred =
      semesterOptions.find((item) => item.status === "ACTIVE") ??
      semesterOptions.find((item) => item.status === "PLANNED") ??
      semesterOptions[0];
    setSemesterId(preferred.id);
  }, [semesterId, semesterOptions, setSemesterId]);
  const semesterLabel = (semester: Semester) => {
    const year = years.data?.find(
      (item) => item.id === semester.academicYearId,
    );
    const status =
      semester.status === "ACTIVE"
        ? "Đang hoạt động"
        : semester.status === "PLANNED"
          ? "Sắp diễn ra"
          : semester.status === "COMPLETED"
            ? "Đã kết thúc"
            : semester.status;
    return `${year?.code || "Chưa rõ năm học"} · ${semester.name} · ${status}`;
  };
  return {
    semesters,
    semesterOptions,
    semesterId,
    setSemesterId,
    semesterLabel,
  };
}

export function AdminWorkloadPlanningLive({
  workflowStage,
  onWorkflowStageChange,
}: {
  workflowStage?: AssignmentWorkflowStage;
  onWorkflowStageChange?: (stage: AssignmentWorkflowStage) => void;
} = {}) {
  const { semesterOptions, semesterId, setSemesterId, semesterLabel } =
    useSelectedSemester();
  const subjects = useApi<Subject[]>("/subjects");
  const requirements = useApi<CurriculumRequirement[]>(
    semesterId
      ? `/curriculum-requirements?semesterId=${encodeURIComponent(semesterId)}`
      : null,
  );
  const readiness = useApi<CurriculumReadiness>(
    semesterId
      ? `/curriculum-requirements/readiness?semesterId=${encodeURIComponent(semesterId)}`
      : null,
  );
  const history = useApi<CurriculumRequirementHistory[]>(
    semesterId
      ? `/curriculum-requirements/history?semesterId=${encodeURIComponent(semesterId)}`
      : null,
  );
  const registrations = useApi<TeacherLoadRegistration[]>(
    semesterId
      ? `/teacher-load-registrations?semesterId=${encodeURIComponent(semesterId)}`
      : null,
  );
  const assignmentVersions = useApi<TeachingAssignmentVersion[]>(
    semesterId
      ? `/teaching-assignment-versions?semesterId=${encodeURIComponent(semesterId)}`
      : null,
  );
  const selectedAcademicYearId =
    semesterOptions.find((item) => item.id === semesterId)?.academicYearId ||
    "";
  const workloadPolicy = useApi<TeacherWorkloadPolicy>(
    selectedAcademicYearId
      ? `/teacher-workload-policy?academicYearId=${encodeURIComponent(selectedAcademicYearId)}`
      : null,
  );
  const workloadAdjustments = useApi<TeacherWorkloadAdjustment[]>(
    selectedAcademicYearId
      ? `/teacher-workload-adjustments?academicYearId=${encodeURIComponent(selectedAcademicYearId)}`
      : null,
  );
  const toast = useToast();
  const [grade, setGrade] = useHashString("dinh_muc_khoi", "K10");
  const [subjectId, setSubjectId] = useState("");
  const [periods, setPeriods] = useState(2);
  const [plan, setPlan] = useState<AutoAssignmentPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignmentVersionDetail, setAssignmentVersionDetail] = useState<{
    version: TeachingAssignmentVersion;
    items: TeachingAssignmentVersionItem[];
  } | null>(null);
  const [assignmentVersionDetailLoading, setAssignmentVersionDetailLoading] =
    useState(false);
  const [assignmentVersionClassId, setAssignmentVersionClassId] = useState("");
  const assignmentVersionClasses = useMemo(() => {
    const values = new Map<string, string>();
    assignmentVersionDetail?.items.forEach((item) =>
      values.set(item.classId, item.classCode),
    );
    return [...values.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], "vi", { numeric: true }),
    );
  }, [assignmentVersionDetail]);
  const visibleAssignmentVersionItems = useMemo(
    () =>
      (assignmentVersionDetail?.items || []).filter(
        (item) =>
          !assignmentVersionClassId ||
          item.classId === assignmentVersionClassId,
      ),
    [assignmentVersionClassId, assignmentVersionDetail],
  );
  const [internalStage, setInternalStage] =
    useState<AssignmentWorkflowStage>("prepare");
  const stage = workflowStage ?? internalStage;
  const setStage = (next: AssignmentWorkflowStage) => {
    setInternalStage(next);
    onWorkflowStageChange?.(next);
  };
  const [teacherQuery, setTeacherQuery] = useHashString("giao_vien_q", "");
  const [workloadFilter, setWorkloadFilter] = useHashString("tai_day", "ALL");
  const [lastDeleted, setLastDeleted] = useState<CurriculumRequirement | null>(
    null,
  );
  const [copySourceSemesterId, setCopySourceSemesterId] = useState("");
  const [copySourceGrade, setCopySourceGrade] = useState("K10");
  const [showHistory, setShowHistory] = useState(false);
  const [specializationTarget, setSpecializationTarget] =
    useState<TeacherLoadRegistration | null>(null);
  const [specializationValue, setSpecializationValue] = useState("");
  const [adjustmentTarget, setAdjustmentTarget] =
    useState<TeacherLoadRegistration | null>(null);
  const [adjustmentCategory, setAdjustmentCategory] = useState<
    "REDUCTION" | "CONVERSION" | "OVERTIME"
  >("REDUCTION");
  const [adjustmentPeriods, setAdjustmentPeriods] = useState(1);
  const [adjustmentTitle, setAdjustmentTitle] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [policyWeeks, setPolicyWeeks] = useState(35);
  const [policyEffectiveFrom, setPolicyEffectiveFrom] = useState("");
  const [policyEffectiveTo, setPolicyEffectiveTo] = useState("");
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const availableTeachers = registrations.data?.length || 0;
  const assignmentComplete = Boolean(
    plan &&
    plan.unassignedCount === 0 &&
    (plan.applied || (plan.proposedCount === 0 && plan.existingCount > 0)),
  );
  const curriculumComplete = readiness.data?.complete === true;

  useEffect(() => {
    if (!workloadPolicy.data) return;
    setPolicyWeeks(workloadPolicy.data.teachingWeeks);
    setPolicyEffectiveFrom(workloadPolicy.data.effectiveFrom || "");
    setPolicyEffectiveTo(workloadPolicy.data.effectiveTo || "");
  }, [workloadPolicy.data]);

  const savePolicy = async () => {
    if (!selectedAcademicYearId || !policyEffectiveFrom || !policyEffectiveTo)
      return;
    try {
      setBusy(true);
      await api.put("/teacher-workload-policy", {
        academicYearId: selectedAcademicYearId,
        teachingWeeks: policyWeeks,
        effectiveFrom: policyEffectiveFrom,
        effectiveTo: policyEffectiveTo,
      });
      await Promise.all([workloadPolicy.reload(), registrations.reload()]);
      toast.show("ok", "Đã cập nhật thời gian áp dụng chính sách tải dạy");
      setShowPolicyEditor(false);
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể cập nhật chính sách",
      );
    } finally {
      setBusy(false);
    }
  };

  const reloadCurriculum = async () => {
    await Promise.all([
      requirements.reload(),
      readiness.reload(),
      history.reload(),
    ]);
  };

  const saveRequirement = async () => {
    if (!semesterId || !subjectId) return;
    try {
      await api.put("/curriculum-requirements", {
        semesterId,
        gradeLevel: grade,
        subjectId,
        weeklyPeriods: periods,
      });
      toast.show("ok", "Đã cập nhật định mức môn học");
      await reloadCurriculum();
      setSubjectId("");
      setLastDeleted(null);
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error ? error.message : "Không thể lưu định mức",
      );
    }
  };

  const openAdjustment = (item: TeacherLoadRegistration) => {
    setAdjustmentTarget(item);
    setAdjustmentCategory("REDUCTION");
    setAdjustmentPeriods(1);
    setAdjustmentTitle("");
    setAdjustmentReason("");
  };

  const submitAdjustment = async () => {
    if (
      !adjustmentTarget ||
      !selectedAcademicYearId ||
      !adjustmentTitle.trim() ||
      !adjustmentReason.trim()
    )
      return;
    try {
      setBusy(true);
      await api.post("/teacher-workload-adjustments", {
        teacherId: adjustmentTarget.teacherId,
        academicYearId: selectedAcademicYearId,
        category: adjustmentCategory,
        dutyType:
          adjustmentCategory === "OVERTIME"
            ? "APPROVED_OVERTIME"
            : "OTHER_DUTY",
        title: adjustmentTitle.trim(),
        weeklyPeriods: adjustmentPeriods,
        effectiveFrom: null,
        effectiveTo: null,
        reason: adjustmentReason.trim(),
      });
      toast.show("ok", "Đã phê duyệt điều chỉnh định mức và tính lại chỉ tiêu");
      await Promise.all([registrations.reload(), workloadAdjustments.reload()]);
      setAdjustmentTarget(null);
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể điều chỉnh định mức",
      );
    } finally {
      setBusy(false);
    }
  };

  const revokeAdjustment = async (item: TeacherWorkloadAdjustment) => {
    if (
      !(await confirmAction({
        title: `Thu hồi điều chỉnh “${item.title}”?`,
        description:
          "Chỉ tiêu của giáo viên sẽ được tính lại ngay. Lịch sử phê duyệt và thu hồi vẫn được giữ để kiểm tra.",
        confirmLabel: "Thu hồi điều chỉnh",
        tone: "warning",
      }))
    )
      return;
    try {
      setBusy(true);
      await api.post(`/teacher-workload-adjustments/${item.id}/revoke`, {
        reason: "Giáo vụ thu hồi sau khi rà soát lại phân công",
      });
      await Promise.all([workloadAdjustments.reload(), registrations.reload()]);
      toast.show("ok", "Đã thu hồi điều chỉnh và tính lại chỉ tiêu");
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error ? error.message : "Không thể thu hồi điều chỉnh",
      );
    } finally {
      setBusy(false);
    }
  };

  const editRequirement = (item: CurriculumRequirement) => {
    setGrade(item.gradeLevel);
    setSubjectId(item.subjectId);
    setPeriods(item.weeklyPeriods);
  };

  const deleteRequirement = async (item: CurriculumRequirement) => {
    if (
      !(await confirmAction({
        title: `Xóa định mức ${item.subjectName}?`,
        description: `Định mức của ${item.gradeLevel.replace("K", "Khối ")} sẽ bị xóa và ảnh hưởng đến lần phân công, xếp lịch tiếp theo.`,
        confirmLabel: "Xóa định mức",
        tone: "danger",
      }))
    )
      return;
    try {
      await api.del(`/curriculum-requirements/${item.id}`);
      setLastDeleted(item);
      await reloadCurriculum();
      toast.show(
        "ok",
        `Đã xóa ${item.subjectName}. Bạn có thể hoàn tác ngay bên dưới.`,
      );
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error ? error.message : "Không thể xóa định mức",
      );
    }
  };

  const undoDelete = async () => {
    if (!lastDeleted) return;
    try {
      await api.put("/curriculum-requirements", {
        semesterId: lastDeleted.semesterId,
        gradeLevel: lastDeleted.gradeLevel,
        subjectId: lastDeleted.subjectId,
        weeklyPeriods: lastDeleted.weeklyPeriods,
      });
      toast.show("ok", `Đã khôi phục định mức ${lastDeleted.subjectName}`);
      setLastDeleted(null);
      await reloadCurriculum();
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error ? error.message : "Không thể hoàn tác",
      );
    }
  };

  const copyRequirements = async () => {
    if (!copySourceSemesterId)
      return toast.show("err", "Hãy chọn học kỳ nguồn");
    try {
      await api.post("/curriculum-requirements/copy", {
        sourceSemesterId: copySourceSemesterId,
        sourceGradeLevel: copySourceGrade,
        targetSemesterId: semesterId,
        targetGradeLevel: grade,
        overwrite: true,
      });
      toast.show("ok", `Đã sao chép định mức ${copySourceGrade} vào ${grade}`);
      await reloadCurriculum();
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error ? error.message : "Không thể sao chép định mức",
      );
    }
  };

  const updateSpecialization = async (item: TeacherLoadRegistration) => {
    setSpecializationTarget(item);
    setSpecializationValue(item.mainSubject || "");
  };

  const submitSpecialization = async () => {
    if (!specializationTarget || !specializationValue.trim()) return;
    try {
      setBusy(true);
      await api.put(`/users/${specializationTarget.teacherId}/specialization`, {
        mainSubject: specializationValue.trim(),
      });
      toast.show(
        "ok",
        `Đã chuẩn hóa chuyên môn của ${specializationTarget.teacherName}`,
      );
      await registrations.reload();
      setSpecializationTarget(null);
      setSpecializationValue("");
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể cập nhật chuyên môn",
      );
    } finally {
      setBusy(false);
    }
  };

  const generatePlan = async (
    apply: boolean,
  ): Promise<AutoAssignmentPlan | null> => {
    setBusy(true);
    try {
      const result = await api.post<AutoAssignmentPlan>(
        "/teaching-assignments/auto-plan",
        {
          semesterId,
          apply,
          allowPartial: false,
        },
      );
      setPlan(result);
      toast.show(
        "ok",
        apply
          ? result.proposedCount > 0
            ? `Đã lưu ${result.proposedCount} phân công giáo viên`
            : "Các phân công này đã được lưu trước đó"
          : "Đã tạo phương án xem trước",
      );
      if (apply) {
        await Promise.all([
          registrations.reload(),
          assignmentVersions.reload(),
        ]);
        window.dispatchEvent(new Event("sse:academic-scheduling-updated"));
        updateHashQuery({ buoc: "tao-thoi-khoa-bieu", tab: null }, "push");
      }
      return result;
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error ? error.message : "Không thể tạo phương án",
      );
      return null;
    } finally {
      setBusy(false);
    }
  };

  const createPreviewAndContinue = async () => {
    const result = await generatePlan(false);
    if (result) setStage("preview");
  };

  const restoreAssignmentVersion = async (item: TeachingAssignmentVersion) => {
    try {
      setBusy(true);
      await api.post(`/teaching-assignment-versions/${item.id}/restore`, {
        name: `Khôi phục từ phiên bản ${item.versionNo}`,
      });
      await assignmentVersions.reload();
      toast.show(
        "ok",
        "Đã tạo bản nháp khôi phục; phân công hiện hành chưa thay đổi.",
      );
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error ? error.message : "Không thể tạo bản khôi phục",
      );
    } finally {
      setBusy(false);
    }
  };

  const publishAssignmentVersion = async (item: TeachingAssignmentVersion) => {
    if (
      !(await confirmAction({
        title: `Phát hành phiên bản phân công v${item.versionNo}?`,
        description:
          "Phân công hiện hành sẽ được thay bằng nội dung của bản nháp. Nếu học kỳ đã có thời khóa biểu chính thức, hệ thống sẽ chặn để tránh sai lệch.",
        confirmLabel: "Phát hành phiên bản",
        tone: "warning",
      }))
    )
      return;
    try {
      setBusy(true);
      await api.post(`/teaching-assignment-versions/${item.id}/publish`);
      await Promise.all([assignmentVersions.reload(), registrations.reload()]);
      window.dispatchEvent(new Event("sse:academic-scheduling-updated"));
      toast.show("ok", `Đã phát hành phiên bản phân công v${item.versionNo}`);
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể phát hành phiên bản",
      );
    } finally {
      setBusy(false);
    }
  };

  const viewAssignmentVersion = async (version: TeachingAssignmentVersion) => {
    setAssignmentVersionDetailLoading(true);
    try {
      const items = await api.get<TeachingAssignmentVersionItem[]>(
        `/teaching-assignment-versions/${version.id}/items`,
      );
      setAssignmentVersionDetail({ version, items });
      setAssignmentVersionClassId(items[0]?.classId || "");
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể tải chi tiết phiên bản phân công",
      );
    } finally {
      setAssignmentVersionDetailLoading(false);
    }
  };

  const groupedRequirements = useMemo(
    () =>
      GRADES.map((item) => ({
        grade: item,
        rows: (requirements.data || []).filter(
          (row) => row.gradeLevel === item,
        ),
      })),
    [requirements.data],
  );
  const activeRequirementGroup =
    groupedRequirements.find((item) => item.grade === grade) ??
    groupedRequirements[0];
  const activeReadiness = readiness.data?.grades.find(
    (item) => item.gradeLevel === grade,
  );
  const expectedSubjectCount =
    readiness.data?.expectedSubjectCount || subjects.data?.length || 0;
  const missingSubjects = activeReadiness?.missingSubjects || [];
  const selectedGradePeriods =
    activeRequirementGroup?.rows.reduce(
      (sum, item) => sum + item.weeklyPeriods,
      0,
    ) || 0;
  const unusualRequirements = (activeRequirementGroup?.rows || []).filter(
    (item) => item.weeklyPeriods > 10,
  );
  const unusualTotal = selectedGradePeriods > 0 && selectedGradePeriods !== 25;
  const registrationByTeacher = useMemo(
    () =>
      new Map((registrations.data || []).map((item) => [item.teacherId, item])),
    [registrations.data],
  );
  const finalProjectedLoad = useMemo(() => {
    const values = new Map<string, number>();
    (plan?.items || []).forEach((item) => {
      if (!item.teacherId) return;
      values.set(
        item.teacherId,
        Math.max(values.get(item.teacherId) || 0, item.projectedTeacherPeriods),
      );
    });
    return values;
  }, [plan]);
  const filteredRegistrations = useMemo(() => {
    const normalized = teacherQuery.trim().toLocaleLowerCase("vi");
    return (registrations.data || []).filter((item) => {
      const matchesStatus =
        workloadFilter === "ALL" ||
        item.workloadStatus === workloadFilter ||
        (workloadFilter === "RESTRICTION_PENDING" &&
          (item.pendingRestrictionCount || 0) > 0) ||
        (workloadFilter === "RESTRICTION_APPROVED" &&
          (item.approvedRestrictionCount || 0) > 0);
      if (!matchesStatus) return false;
      if (!normalized) return true;
      return [
        item.teacherName,
        item.teacherCode,
        item.mainSubject,
        ...(item.assignedClasses || []),
        ...(item.assignedSubjects || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(normalized);
    });
  }, [registrations.data, teacherQuery, workloadFilter]);

  return (
    <div className="workload-planning-page">
      <div className="planning-control-shell">
        <div className="planning-control-heading">
          <div>
            <span>PHÂN CÔNG TỰ ĐỘNG</span>
            <strong>Chuẩn bị dữ liệu theo học kỳ</strong>
            <small>
              Chỉ lưu vào hệ thống sau khi bạn kiểm tra và xác nhận phương án.
            </small>
          </div>
          <label className="semester-focus">
            <span>Học kỳ đang lập kế hoạch</span>
            <select
              aria-label="Học kỳ đang lập kế hoạch"
              value={semesterId}
              onChange={(event) => {
                setSemesterId(event.target.value);
                setPlan(null);
                setStage("prepare");
              }}
            >
              {semesterOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {semesterLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details className="workflow-help-drawer">
          <summary>Xem cách thực hiện</summary>
          <ol>
            <li>Hoàn thiện định mức môn học theo từng khối.</li>
            <li>Xử lý các đề nghị hạn chế lịch dạy có căn cứ.</li>
            <li>
              Tạo phương án và kiểm tra tải giáo viên, môn–lớp chưa được phân
              công.
            </li>
            <li>
              Xác nhận để lưu phương án và chuyển sang tạo thời khóa biểu.
            </li>
          </ol>
        </details>
      </div>

      {stage === "prepare" && (
        <Section
          title="Định mức môn học theo khối"
          subtitle="Hoàn thiện đủ danh mục môn và số tiết mỗi tuần trước khi phân công giáo viên"
          wide
        >
          <div
            className={`curriculum-readiness-banner ${curriculumComplete ? "is-complete" : "is-incomplete"}`}
          >
            {curriculumComplete ? (
              <CheckCircle2 size={22} />
            ) : (
              <AlertTriangle size={22} />
            )}
            <div>
              <strong>
                {curriculumComplete
                  ? "Định mức đã sẵn sàng để phân công"
                  : "Định mức chưa đầy đủ — bước tiếp theo đang được khóa"}
              </strong>
              <span>
                {curriculumComplete
                  ? `Đã kiểm tra đủ ${expectedSubjectCount} môn cho tất cả các khối.`
                  : "Chọn từng khối bên dưới và bổ sung các môn còn thiếu."}
              </span>
            </div>
            <b>
              {readiness.data?.configuredRequirementCount || 0}/
              {(readiness.data?.grades.length || GRADES.length) *
                expectedSubjectCount}{" "}
              môn–khối
            </b>
          </div>

          <div
            className="requirement-grade-tabs"
            role="tablist"
            aria-label="Chọn khối cần khai báo"
          >
            {groupedRequirements.map((group) => {
              const status = readiness.data?.grades.find(
                (item) => item.gradeLevel === group.grade,
              );
              const complete = status?.complete === true;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={grade === group.grade}
                  className={`${grade === group.grade ? "active" : ""} ${complete ? "complete" : "incomplete"}`}
                  key={group.grade}
                  onClick={() => setGrade(group.grade)}
                >
                  <span>{group.grade.replace("K", "Khối ")}</span>
                  <small>
                    {group.rows.length}/{expectedSubjectCount} môn ·{" "}
                    {status?.totalWeeklyPeriods || 0} tiết/tuần
                  </small>
                  <em>
                    {complete
                      ? "Đã hoàn thiện"
                      : status?.missingSubjects.length
                        ? `Thiếu ${status.missingSubjects.length} môn`
                        : `Cần đúng 25 tiết/tuần`}
                  </em>
                </button>
              );
            })}
          </div>

          <div className="curriculum-grade-summary">
            <div>
              <span>Khối đang thiết lập</span>
              <strong>{grade.replace("K", "Khối ")}</strong>
            </div>
            <div>
              <span>Số môn</span>
              <strong>
                {activeRequirementGroup?.rows.length || 0}/
                {expectedSubjectCount}
              </strong>
            </div>
            <div>
              <span>Tổng tải học</span>
              <strong>{selectedGradePeriods} tiết/tuần</strong>
            </div>
            <div>
              <span>Trạng thái</span>
              <strong
                className={
                  activeReadiness?.complete ? "text-success" : "text-warning"
                }
              >
                {activeReadiness?.complete ? "Sẵn sàng" : "Cần bổ sung"}
              </strong>
            </div>
          </div>

          {missingSubjects.length > 0 && (
            <div className="curriculum-missing-panel">
              <div>
                <AlertTriangle size={18} />
                <span>
                  <strong>Còn thiếu {missingSubjects.length} môn</strong>
                  <small>Chọn một môn để điền nhanh vào biểu mẫu.</small>
                </span>
              </div>
              <div>
                {missingSubjects.map((item) => (
                  <button
                    type="button"
                    key={item.subjectId}
                    onClick={() => {
                      setSubjectId(item.subjectId);
                      setPeriods(2);
                    }}
                  >
                    {item.subjectName}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(unusualTotal || unusualRequirements.length > 0) && (
            <div className="inline-warning">
              <AlertTriangle size={17} /> Định mức có dấu hiệu bất thường:
              {unusualTotal
                ? ` tổng hiện tại ${selectedGradePeriods} tiết/tuần; hệ thống yêu cầu đúng 25 tiết (5 ngày × 5 tiết)`
                : ""}
              {unusualRequirements.length
                ? `; ${unusualRequirements.map((item) => item.subjectName).join(", ")} vượt 10 tiết/tuần`
                : ""}
              .
            </div>
          )}

          <div className="requirement-form requirement-form-compact">
            <select
              aria-label="Môn học cần khai báo"
              value={subjectId}
              onChange={(event) => {
                const nextId = event.target.value;
                setSubjectId(nextId);
                const existing = activeRequirementGroup?.rows.find(
                  (item) => item.subjectId === nextId,
                );
                if (existing) setPeriods(existing.weeklyPeriods);
              }}
            >
              <option value="">Chọn môn học</option>
              {(subjects.data || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <label>
              <span>Số tiết/tuần</span>
              <input
                type="number"
                min={1}
                max={20}
                value={periods}
                onChange={(event) => setPeriods(Number(event.target.value))}
              />
            </label>
            <button
              className="live-btn primary"
              disabled={!subjectId || periods < 1 || periods > 20}
              onClick={saveRequirement}
            >
              <BookOpenCheck size={16} />{" "}
              {activeRequirementGroup?.rows.some(
                (item) => item.subjectId === subjectId,
              )
                ? "Cập nhật định mức"
                : "Thêm định mức"}
            </button>
          </div>

          <div className="requirement-columns requirement-single-column">
            <article>
              <header>
                <strong>Danh sách môn {grade.replace("K", "Khối ")}</strong>
                <span>
                  {activeRequirementGroup?.rows.length || 0} môn ·{" "}
                  {selectedGradePeriods} tiết/tuần
                </span>
              </header>
              {activeRequirementGroup?.rows.length ? (
                activeRequirementGroup.rows.map((item) => (
                  <div key={item.id}>
                    <span>{item.subjectName}</span>
                    <b>{item.weeklyPeriods} tiết/tuần</b>
                    <span className="requirement-row-actions">
                      <button
                        aria-label={`Sửa định mức ${item.subjectName}`}
                        title="Sửa"
                        onClick={() => editRequirement(item)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        aria-label={`Xóa định mức ${item.subjectName}`}
                        title="Xóa"
                        onClick={() => deleteRequirement(item)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                ))
              ) : (
                <p>Chưa có định mức cho khối này</p>
              )}
            </article>
          </div>

          {lastDeleted && (
            <div className="curriculum-undo">
              <RotateCcw size={18} />
              <span>
                Đã xóa <strong>{lastDeleted.subjectName}</strong> của{" "}
                {lastDeleted.gradeLevel.replace("K", "Khối ")}.
              </span>
              <button className="live-btn subtle" onClick={undoDelete}>
                Hoàn tác
              </button>
            </div>
          )}

          <details className="curriculum-copy-panel">
            <summary>
              <Copy size={17} /> Sao chép định mức từ học kỳ hoặc khối khác
            </summary>
            <div>
              <label>
                <span>Học kỳ nguồn</span>
                <select
                  value={copySourceSemesterId}
                  onChange={(event) =>
                    setCopySourceSemesterId(event.target.value)
                  }
                >
                  <option value="">Chọn học kỳ nguồn</option>
                  {semesterOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {semesterLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Khối nguồn</span>
                <select
                  value={copySourceGrade}
                  onChange={(event) => setCopySourceGrade(event.target.value)}
                >
                  {GRADES.map((item) => (
                    <option key={item} value={item}>
                      {item.replace("K", "Khối ")}
                    </option>
                  ))}
                </select>
              </label>
              <div className="copy-target">
                <span>Sao chép vào</span>
                <strong>{grade.replace("K", "Khối ")} · học kỳ hiện tại</strong>
              </div>
              <button
                className="live-btn subtle"
                disabled={
                  !copySourceSemesterId ||
                  (copySourceSemesterId === semesterId &&
                    copySourceGrade === grade)
                }
                onClick={copyRequirements}
              >
                <Copy size={16} /> Sao chép và ghi đè
              </button>
            </div>
          </details>

          <div className="curriculum-history-toggle">
            <button
              type="button"
              className="link-button"
              onClick={() => setShowHistory((value) => !value)}
            >
              <History size={16} />{" "}
              {showHistory ? "Ẩn lịch sử thay đổi" : "Xem lịch sử thay đổi"}
            </button>
          </div>
          {showHistory && (
            <div className="curriculum-history-list">
              {(history.data || []).length ? (
                (history.data || []).slice(0, 20).map((item) => (
                  <div key={item.id}>
                    <span>
                      <strong>{item.subjectName}</strong>
                      <small>
                        {item.gradeLevel.replace("K", "Khối ")} ·{" "}
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </small>
                    </span>
                    <b>
                      {item.action === "CREATED"
                        ? "Đã thêm"
                        : item.action === "UPDATED"
                          ? `Đổi ${item.previousWeeklyPeriods} → ${item.newWeeklyPeriods}`
                          : item.action === "DELETED"
                            ? "Đã xóa"
                            : "Đã sao chép"}
                    </b>
                  </div>
                ))
              ) : (
                <p>Chưa có lịch sử thay đổi trong học kỳ này.</p>
              )}
            </div>
          )}

          <div className="wizard-footer">
            <span>
              {curriculumComplete
                ? "Dữ liệu đầu vào đã hợp lệ"
                : "Hoàn thiện đủ môn cho tất cả các khối để mở bước 2"}
            </span>
            <button
              className="live-btn primary"
              disabled={!curriculumComplete}
              onClick={() => setStage("teachers")}
            >
              Tiếp theo: Kiểm tra giáo viên
            </button>
          </div>
        </Section>
      )}

      {stage === "teachers" && (
        <Section
          title="Chỉ tiêu tải dạy và ngoại lệ lịch"
          subtitle="Định mức do hệ thống tính; Giáo vụ chỉ xử lý ngoại lệ có căn cứ và các quyết định điều chỉnh"
          wide
        >
          {workloadPolicy.data && (
            <div className="workload-policy-banner">
              <div>
                <strong>
                  {workloadPolicy.data.baseWeeklyPeriods} tiết/tuần
                </strong>
                <span>Định mức giáo viên THPT</span>
              </div>
              <div>
                <strong>
                  {workloadPolicy.data.homeroomReductionPeriods} tiết
                </strong>
                <span>Tự động giảm cho GVCN</span>
              </div>
              <div>
                <strong>{workloadPolicy.data.teachingWeeks} tuần</strong>
                <span>Dùng tính chỉ tiêu năm học</span>
              </div>
              <div>
                <strong>{workloadPolicy.data.maxOvertimePercent}%</strong>
                <span>Giới hạn dạy vượt</span>
              </div>
              <small>Nguồn áp dụng: {workloadPolicy.data.sourceDocument}</small>
              <button
                type="button"
                className="live-btn subtle"
                onClick={() => setShowPolicyEditor((value) => !value)}
              >
                <Pencil size={15} />{" "}
                {showPolicyEditor
                  ? "Đóng cấu hình"
                  : "Cấu hình thời gian áp dụng"}
              </button>
            </div>
          )}
          {showPolicyEditor && workloadPolicy.data && (
            <div className="workload-policy-editor">
              <div>
                <strong>Chính sách theo năm học</strong>
                <small>
                  Định mức 17 tiết, giảm chủ nhiệm 4 tiết và trần vượt 50% được
                  khóa theo quy định; Giáo vụ chỉ cấu hình thời gian áp dụng.
                </small>
              </div>
              <label>
                <span>Số tuần giảng dạy</span>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={policyWeeks}
                  onChange={(event) =>
                    setPolicyWeeks(Number(event.target.value))
                  }
                />
              </label>
              <label>
                <span>Hiệu lực từ</span>
                <input
                  type="date"
                  value={policyEffectiveFrom}
                  onChange={(event) =>
                    setPolicyEffectiveFrom(event.target.value)
                  }
                />
              </label>
              <label>
                <span>Hiệu lực đến</span>
                <input
                  type="date"
                  value={policyEffectiveTo}
                  onChange={(event) => setPolicyEffectiveTo(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="live-btn primary"
                disabled={busy || !policyEffectiveFrom || !policyEffectiveTo}
                onClick={savePolicy}
              >
                <ClipboardCheck size={16} /> Lưu chính sách
              </button>
            </div>
          )}
          <div className="plain-language-help">
            <UserRoundCheck size={20} />
            <div>
              <strong>
                Giáo viên không đăng ký tổng số tiết hoặc ngày nghỉ theo sở
                thích
              </strong>
              <span>
                Hệ thống tính chỉ tiêu từ định mức 17 tiết, nhiệm vụ chủ nhiệm,
                tiết giảm/quy đổi và quyết định dạy vượt. Chỉ ngoại lệ lịch đã
                duyệt mới ràng buộc thuật toán.
              </span>
            </div>
          </div>
          <div
            className="teacher-workload-toolbar"
            aria-label="Tìm kiếm và lọc tải giáo viên"
          >
            <label>
              <span>Tìm giáo viên</span>
              <input
                value={teacherQuery}
                onChange={(event) => setTeacherQuery(event.target.value)}
                placeholder="Tên, mã, chuyên môn hoặc lớp phụ trách"
              />
            </label>
            <label>
              <span>Trạng thái</span>
              <select
                value={workloadFilter}
                onChange={(event) => setWorkloadFilter(event.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="UNDER_TARGET">Chưa đủ chỉ tiêu</option>
                <option value="ON_TARGET">Đủ chỉ tiêu</option>
                <option value="APPROVED_OVERTIME">Đã duyệt dạy vượt</option>
                <option value="OVER_LIMIT">Vượt giới hạn</option>
                <option value="RESTRICTION_PENDING">
                  Có ngoại lệ chờ xử lý
                </option>
                <option value="RESTRICTION_APPROVED">
                  Có ngoại lệ đã duyệt
                </option>
              </select>
            </label>
            <button
              type="button"
              className="live-btn ghost"
              disabled={!teacherQuery && workloadFilter === "ALL"}
              onClick={() => {
                setTeacherQuery("");
                setWorkloadFilter("ALL");
              }}
            >
              Xóa bộ lọc
            </button>
            <strong>
              {filteredRegistrations.length}/{registrations.data?.length || 0}{" "}
              giáo viên
            </strong>
          </div>
          <Async
            state={{ ...registrations, data: filteredRegistrations }}
            empty="Không có giáo viên phù hợp với bộ lọc"
            paginate
            pageSize={10}
            itemLabel="giáo viên"
            urlStateKey="teacher-load-review"
          >
            {(rows) => (
              <div className="teacher-load-table">
                <table className="live-table">
                  <thead>
                    <tr>
                      <th>Giáo viên</th>
                      <th>Chuyên môn</th>
                      <th>Định mức</th>
                      <th>Chỉ tiêu đứng lớp</th>
                      <th>Đã phân công &amp; thực dạy</th>
                      <th>Cân đối</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          item.workloadStatus === "OVER_LIMIT"
                            ? "workload-over-limit"
                            : ""
                        }
                      >
                        <td>
                          <strong>{item.teacherName}</strong>
                          <small>
                            {item.teacherCode || "—"}
                            {item.homeroomTeacher ? " · GVCN" : ""}
                          </small>
                          <small>
                            {item.assignedClasses?.length
                              ? `Lớp: ${item.assignedClasses.join(", ")}`
                              : "Chưa phụ trách lớp"}
                          </small>
                        </td>
                        <td>
                          <div className="proposed-teacher">
                            <strong>
                              {item.mainSubject || "Chưa cập nhật"}
                            </strong>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => updateSpecialization(item)}
                            >
                              Chuẩn hóa
                            </button>
                          </div>
                          <small>
                            {item.assignedSubjects?.length
                              ? item.assignedSubjects.join(", ")
                              : "Chưa có môn phân công"}
                          </small>
                        </td>
                        <td>
                          <strong>{item.baseWeeklyPeriods} tiết</strong>
                          <small>
                            Giảm {item.reductionWeeklyPeriods} · Quy đổi{" "}
                            {item.convertedWeeklyPeriods}
                          </small>
                        </td>
                        <td>
                          <strong>
                            {item.targetDirectWeeklyPeriods} tiết/tuần
                          </strong>
                          <small>
                            {item.annualTargetPeriods} tiết/{item.teachingWeeks}{" "}
                            tuần
                          </small>
                        </td>
                        <td>
                          <strong>
                            {item.assignedWeeklyPeriods}/{item.maxWeeklyPeriods}{" "}
                            tiết/tuần
                          </strong>
                          <small>
                            Thực dạy: {item.actualTaughtPeriods} tiết HK ·{" "}
                            {item.actualTaughtAnnualPeriods} tiết năm
                          </small>
                          <small>
                            {item.approvedRestrictionCount || 0} ngoại lệ đã
                            duyệt
                            {item.pendingRestrictionCount
                              ? ` · ${item.pendingRestrictionCount} chờ xử lý`
                              : ""}
                          </small>
                        </td>
                        <td>
                          <Badge
                            tone={
                              item.workloadStatus === "OVER_LIMIT"
                                ? "red"
                                : item.workloadStatus === "ON_TARGET"
                                  ? "green"
                                  : "blue"
                            }
                          >
                            {WORKLOAD_STATUS_LABELS[item.workloadStatus]}
                          </Badge>
                          <small>
                            {item.targetBalancePeriods < 0
                              ? `Thiếu ${Math.abs(item.targetBalancePeriods)} tiết`
                              : item.targetBalancePeriods === 0
                                ? "Đủ chỉ tiêu"
                                : `Cao hơn ${item.targetBalancePeriods} tiết`}
                          </small>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              title="Phê duyệt tiết giảm, quy đổi hoặc dạy vượt"
                              onClick={() => openAdjustment(item)}
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Async>
          <details className="workload-adjustment-history">
            <summary>
              <span>
                <History size={17} /> Lịch sử tiết giảm, quy đổi và dạy vượt
              </span>
              <b>{workloadAdjustments.data?.length || 0} thay đổi</b>
            </summary>
            <Async
              state={workloadAdjustments}
              empty="Chưa có điều chỉnh chỉ tiêu trong năm học này"
            >
              {(rows) => (
                <div className="curriculum-history-list">
                  {rows.map((item) => (
                    <div key={item.id}>
                      <span>
                        <strong>
                          {registrationByTeacher.get(item.teacherId)
                            ?.teacherName || item.teacherId}{" "}
                          · {item.title}
                        </strong>
                        <small>
                          {item.category === "REDUCTION"
                            ? "Tiết giảm"
                            : item.category === "CONVERSION"
                              ? "Tiết quy đổi"
                              : "Dạy vượt"}{" "}
                          · {item.weeklyPeriods} tiết/tuần ·{" "}
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </small>
                        <small>{item.reason}</small>
                      </span>
                      <b>
                        {item.status === "APPROVED"
                          ? "Đang áp dụng"
                          : "Đã thu hồi"}
                      </b>
                      {item.status === "APPROVED" && (
                        <button
                          type="button"
                          className="live-btn subtle"
                          disabled={busy}
                          onClick={() => revokeAdjustment(item)}
                        >
                          Thu hồi
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Async>
          </details>
          <AcademicScheduleRestrictionPanel semesterId={semesterId} />
          <div className="wizard-footer">
            <button
              className="live-btn subtle"
              onClick={() => setStage("prepare")}
            >
              Quay lại dữ liệu
            </button>
            <span>{availableTeachers} giáo viên có chỉ tiêu hệ thống</span>
            <button
              className="live-btn primary"
              disabled={busy || !availableTeachers}
              onClick={createPreviewAndContinue}
            >
              <Sparkles size={16} />{" "}
              {busy ? "Đang tạo…" : "Tạo bản xem trước phân công"}
            </button>
          </div>
        </Section>
      )}

      {(stage === "preview" || stage === "warnings" || stage === "publish") && (
        <Section
          title={
            stage === "preview"
              ? "Bản xem trước phân công tự động"
              : stage === "warnings"
                ? "Kiểm tra và xử lý cảnh báo"
                : "Xác nhận và phát hành phân công"
          }
          subtitle={
            stage === "preview"
              ? "So sánh giáo viên được đề xuất và tải dự kiến trước khi xử lý cảnh báo"
              : stage === "warnings"
                ? "Rà soát môn–lớp chưa có giáo viên, chuyên môn và chỉ tiêu trước khi xác nhận"
                : "Kiểm tra tóm tắt lần cuối; thao tác phát hành sẽ lưu các phân công vào hệ thống"
          }
          wide
          action={
            stage !== "publish" ? (
              <button
                className="live-btn subtle"
                disabled={busy || !semesterId || !curriculumComplete}
                onClick={() => generatePlan(false)}
              >
                <Sparkles size={16} /> Làm mới kết quả
              </button>
            ) : undefined
          }
        >
          {!plan ? (
            <div className="planning-empty">
              <Sparkles size={30} />
              <strong>Chưa tạo phương án</strong>
              <span>
                Hoàn tất định mức, xử lý ngoại lệ lịch cần thiết rồi chọn “Tạo
                bản xem trước”.
              </span>
            </div>
          ) : (
            <>
              {assignmentComplete && (
                <div className="assignment-applied-confirmation">
                  <CheckCircle2 size={26} />
                  <div>
                    <strong>Phân công giáo viên đã hoàn tất</strong>
                    <span>
                      {plan.existingCount || plan.proposedCount} môn–lớp đã được
                      lưu. Không cần áp dụng lại; hãy chuyển sang tạo thời khóa
                      biểu.
                    </span>
                  </div>
                </div>
              )}
              {!assignmentComplete && (
                <div className="assignment-preview-guide">
                  <div>
                    <Sparkles size={20} />
                    <span>
                      <strong>Đây là bản xem trước</strong>
                      <small>
                        Chưa lưu vào hệ thống cho đến khi bạn chọn “Áp dụng
                        phương án”.
                      </small>
                    </span>
                  </div>
                  <div>
                    <UserRoundCheck size={20} />
                    <span>
                      <strong>{plan.proposedCount} phân công môn–lớp</strong>
                      <small>
                        Mỗi dòng là một môn của một lớp, không phải số lượng
                        giáo viên.
                      </small>
                    </span>
                  </div>
                  <div>
                    <Clock3 size={20} />
                    <span>
                      <strong>Tải hiển thị dạng đã dùng / giới hạn</strong>
                      <small>
                        Ví dụ 24/28 nghĩa là giáo viên còn nhận được 4 tiết mỗi
                        tuần.
                      </small>
                    </span>
                  </div>
                </div>
              )}
              <div className="plan-summary">
                <Badge tone="blue">
                  {plan.existingCount} phân công được giữ nguyên
                </Badge>
                <Badge tone="green">
                  {plan.proposedCount} phân công mới được đề xuất
                </Badge>
                {plan.unassignedCount > 0 ? (
                  <Badge tone="red">
                    {plan.unassignedCount} môn–lớp chưa có giáo viên
                  </Badge>
                ) : (
                  <Badge tone="green">Tất cả đều trong giới hạn tải</Badge>
                )}
              </div>
              {stage === "warnings" && plan.warnings.length > 0 && (
                <div className="schedule-global-issues">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>Cảnh báo cần xử lý</strong>
                    {plan.warnings.map((warning) => (
                      <span key={warning}>{warning}</span>
                    ))}
                  </div>
                </div>
              )}
              <details
                className="assignment-plan-details"
                open={
                  stage === "preview" || stage === "warnings" ? true : undefined
                }
              >
                <summary>
                  <span>Chi tiết phương án theo môn–lớp</span>
                  <b>{plan.items.length} dòng</b>
                </summary>
                <div
                  className={`teacher-load-table ${stage === "publish" ? "publish-review-table" : ""}`}
                >
                  <table className="live-table assignment-preview-table">
                    <thead>
                      <tr>
                        <th>Lớp</th>
                        <th>Môn học</th>
                        <th>Số tiết/tuần</th>
                        <th>Giáo viên được đề xuất</th>
                        <th>Tổng tải của giáo viên sau phương án</th>
                        <th>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.items.map((item) => {
                        const registration = item.teacherId
                          ? registrationByTeacher.get(item.teacherId)
                          : undefined;
                        const projected = item.teacherId
                          ? finalProjectedLoad.get(item.teacherId) ||
                            item.projectedTeacherPeriods
                          : 0;
                        const limit = registration?.maxWeeklyPeriods || 0;
                        const percent = limit
                          ? Math.min(100, Math.round((projected / limit) * 100))
                          : 0;
                        const remaining = Math.max(0, limit - projected);
                        return (
                          <tr key={`${item.classId}-${item.subjectId}`}>
                            <td>
                              <strong>{item.classCode}</strong>
                            </td>
                            <td>{item.subjectName}</td>
                            <td>
                              <strong>{item.weeklyPeriods}</strong> tiết
                            </td>
                            <td>
                              {item.teacherName ? (
                                <div className="proposed-teacher">
                                  <strong>{item.teacherName}</strong>
                                  <small>
                                    {registration?.mainSubject ||
                                      item.subjectName}
                                  </small>
                                </div>
                              ) : (
                                <span className="missing-teacher">
                                  Chưa có giáo viên phù hợp
                                </span>
                              )}
                            </td>
                            <td>
                              {item.teacherName && limit ? (
                                <div className="projected-load">
                                  <div>
                                    <strong>
                                      {projected}/{limit} tiết
                                    </strong>
                                    <span>Còn {remaining} tiết</span>
                                  </div>
                                  <span className="projected-load-track">
                                    <i style={{ width: `${percent}%` }} />
                                  </span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              {item.status === "PROPOSED" ? (
                                <Badge tone="green">Có thể phân công</Badge>
                              ) : item.status === "EXISTING" ? (
                                <Badge tone="blue">Đang phụ trách</Badge>
                              ) : (
                                <Badge tone="red">Cần xử lý</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
          {stage === "preview" ? (
            <div className="wizard-footer">
              <button
                className="live-btn subtle"
                onClick={() => setStage("teachers")}
              >
                Quay lại giáo viên
              </button>
              <span>
                {plan
                  ? `${plan.proposedCount} đề xuất · ${plan.unassignedCount} cảnh báo`
                  : "Chưa có phương án"}
              </span>
              <button
                className="live-btn primary"
                disabled={!plan}
                onClick={() => setStage("warnings")}
              >
                <AlertTriangle size={16} /> Kiểm tra cảnh báo
              </button>
            </div>
          ) : stage === "warnings" ? (
            <div className="wizard-footer">
              <button
                className="live-btn subtle"
                onClick={() => setStage("preview")}
              >
                Quay lại bản xem trước
              </button>
              <span>
                {plan?.unassignedCount
                  ? `Còn ${plan.unassignedCount} môn–lớp cần xử lý`
                  : "Không còn cảnh báo chặn phát hành"}
              </span>
              <button
                className="live-btn primary"
                disabled={!plan || plan.unassignedCount > 0}
                onClick={() => setStage("publish")}
              >
                <CheckCircle2 size={16} /> Tiếp theo: Xác nhận
              </button>
            </div>
          ) : (
            <>
              <div className="assignment-version-panel">
                <header>
                  <div>
                    <History size={20} />
                    <span>
                      <strong>Phiên bản phân công</strong>
                      <small>
                        Mỗi lần xác nhận tạo một phiên bản độc lập; khôi phục
                        luôn tạo bản nháp trước.
                      </small>
                    </span>
                  </div>
                  <Badge
                    tone={
                      assignmentVersions.data?.some(
                        (item) => item.status === "PUBLISHED",
                      )
                        ? "green"
                        : "red"
                    }
                  >
                    {assignmentVersions.data?.some(
                      (item) => item.status === "PUBLISHED",
                    )
                      ? "Đã có bản chính thức"
                      : "Chưa phát hành"}
                  </Badge>
                </header>
                <Async
                  state={assignmentVersions}
                  empty="Chưa có phiên bản phân công."
                >
                  {(items) => (
                    <div className="timetable-version-list">
                      {items.map((item) => (
                        <article
                          key={item.id}
                          className={`timetable-version-card ${item.status.toLowerCase()}`}
                        >
                          <div className="version-number">
                            <span>v{item.versionNo}</span>
                            <Badge
                              tone={
                                item.status === "PUBLISHED"
                                  ? "green"
                                  : item.status === "DRAFT"
                                    ? "blue"
                                    : "violet"
                              }
                            >
                              {item.status === "PUBLISHED"
                                ? "Đang dùng"
                                : item.status === "DRAFT"
                                  ? "Bản nháp"
                                  : "Đã thay thế"}
                            </Badge>
                          </div>
                          <div className="version-main">
                            <strong>{item.name}</strong>
                            <span>
                              {item.assignmentCount} phân công ·{" "}
                              {new Date(item.createdAt).toLocaleString("vi-VN")}
                            </span>
                            {item.warningSummary && (
                              <small className="version-conflict">
                                {item.warningSummary}
                              </small>
                            )}
                          </div>
                          <div className="row-actions">
                            <button
                              className="live-btn subtle"
                              type="button"
                              disabled={assignmentVersionDetailLoading}
                              onClick={() => viewAssignmentVersion(item)}
                            >
                              <Eye size={15} /> Xem nội dung
                            </button>
                            {item.status === "DRAFT" && (
                              <button
                                className="live-btn primary"
                                type="button"
                                disabled={busy}
                                onClick={() => publishAssignmentVersion(item)}
                              >
                                <Rocket size={15} /> Phát hành
                              </button>
                            )}
                            {["PUBLISHED", "SUPERSEDED"].includes(
                              item.status,
                            ) && (
                              <button
                                className="live-btn subtle"
                                type="button"
                                disabled={busy}
                                onClick={() => restoreAssignmentVersion(item)}
                              >
                                <RotateCcw size={15} /> Tạo bản khôi phục
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </Async>
              </div>
              <div className="wizard-footer">
                <button
                  className="live-btn subtle"
                  onClick={() => setStage("warnings")}
                >
                  Quay lại cảnh báo
                </button>
                <span>
                  {assignmentComplete
                    ? `Phương án đã phát hành${plan?.versionNo ? ` · v${plan.versionNo}` : ""}`
                    : `${plan?.proposedCount || 0} phân công mới sẽ được lưu`}
                </span>
                {assignmentComplete ? (
                  <button
                    className="live-btn primary"
                    onClick={() =>
                      updateHashQuery(
                        { buoc: "tao-thoi-khoa-bieu", tab: null },
                        "push",
                      )
                    }
                  >
                    <CalendarCheck2 size={16} /> Tạo thời khóa biểu
                  </button>
                ) : (
                  <button
                    className="live-btn primary"
                    disabled={
                      busy ||
                      !plan ||
                      plan.unassignedCount > 0 ||
                      plan.proposedCount === 0 ||
                      !curriculumComplete
                    }
                    onClick={() => generatePlan(true)}
                  >
                    <UserRoundCheck size={16} />{" "}
                    {busy ? "Đang phát hành…" : "Xác nhận và phát hành"}
                  </button>
                )}
              </div>
            </>
          )}
        </Section>
      )}
      {assignmentVersionDetail && (
        <Modal
          title={`Nội dung phân công v${assignmentVersionDetail.version.versionNo}`}
          onClose={() => setAssignmentVersionDetail(null)}
          footer={
            <button
              className="live-btn primary"
              type="button"
              onClick={() => setAssignmentVersionDetail(null)}
            >
              Đóng
            </button>
          }
        >
          <div className="version-detail-summary">
            <strong>{assignmentVersionDetail.version.name}</strong>
            <span>
              {assignmentVersionDetail.items.length} phân công · chọn lớp để xem
              nhanh nội dung
            </span>
            <label>
              <span>Lớp cần xem</span>
              <select
                value={assignmentVersionClassId}
                onChange={(event) =>
                  setAssignmentVersionClassId(event.target.value)
                }
              >
                {assignmentVersionClasses.map(([id, code]) => (
                  <option key={id} value={id}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="teacher-load-table version-detail-table">
            <table className="live-table">
              <thead>
                <tr>
                  <th>Lớp</th>
                  <th>Môn học</th>
                  <th>Giáo viên</th>
                  <th>Số tiết/tuần</th>
                </tr>
              </thead>
              <tbody>
                {visibleAssignmentVersionItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.classCode}</strong>
                    </td>
                    <td>{item.subjectName}</td>
                    <td>{item.teacherName}</td>
                    <td>{item.weeklyPeriods} tiết</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
      {adjustmentTarget && (
        <Modal
          title="Điều chỉnh chỉ tiêu theo nhiệm vụ"
          onClose={() => !busy && setAdjustmentTarget(null)}
          footer={
            <>
              <button
                className="live-btn ghost"
                type="button"
                disabled={busy}
                onClick={() => setAdjustmentTarget(null)}
              >
                Hủy
              </button>
              <button
                className="live-btn"
                type="button"
                disabled={
                  busy ||
                  !adjustmentTitle.trim() ||
                  adjustmentReason.trim().length < 5
                }
                onClick={submitAdjustment}
              >
                <CheckCircle2 size={15} />{" "}
                {busy ? "Đang lưu…" : "Phê duyệt điều chỉnh"}
              </button>
            </>
          }
        >
          <div className="workflow-decision-modal">
            <div className="workflow-decision-context">
              <UserRoundCheck size={20} />
              <div>
                <strong>{adjustmentTarget.teacherName}</strong>
                <span>
                  Định mức {adjustmentTarget.baseWeeklyPeriods} · chỉ tiêu hiện
                  tại {adjustmentTarget.targetDirectWeeklyPeriods} tiết/tuần
                </span>
              </div>
            </div>
            <Field label="Loại điều chỉnh">
              <select
                value={adjustmentCategory}
                onChange={(event) =>
                  setAdjustmentCategory(
                    event.target.value as typeof adjustmentCategory,
                  )
                }
              >
                <option value="REDUCTION">Giảm định mức</option>
                <option value="CONVERSION">Quy đổi nhiệm vụ ra tiết</option>
                <option value="OVERTIME">Phê duyệt dạy vượt</option>
              </select>
            </Field>
            <Field label="Tên nhiệm vụ/quyết định *">
              <input
                value={adjustmentTitle}
                onChange={(event) => setAdjustmentTitle(event.target.value)}
                placeholder="Ví dụ: Tổ trưởng chuyên môn"
              />
            </Field>
            <Field label="Số tiết mỗi tuần *">
              <input
                type="number"
                min={1}
                max={adjustmentCategory === "OVERTIME" ? 8 : 17}
                value={adjustmentPeriods}
                onChange={(event) =>
                  setAdjustmentPeriods(Number(event.target.value))
                }
              />
            </Field>
            <Field label="Căn cứ và lý do *">
              <textarea
                minLength={5}
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                placeholder="Ghi rõ quyết định, nhiệm vụ hoặc lý do phê duyệt…"
              />
            </Field>
            <small className="field-help">
              Điều chỉnh được lưu lịch sử và áp dụng cho cả năm học. Dạy vượt
              không được quá 50% định mức 17 tiết.
            </small>
          </div>
        </Modal>
      )}
      {specializationTarget && (
        <Modal
          title="Chuẩn hóa chuyên môn giáo viên"
          onClose={() => !busy && setSpecializationTarget(null)}
          footer={
            <>
              <button
                className="live-btn ghost"
                type="button"
                disabled={busy}
                onClick={() => setSpecializationTarget(null)}
              >
                Hủy
              </button>
              <button
                className="live-btn"
                type="button"
                disabled={busy || !specializationValue.trim()}
                onClick={submitSpecialization}
              >
                <CheckCircle2 size={15} />{" "}
                {busy ? "Đang lưu…" : "Lưu chuyên môn"}
              </button>
            </>
          }
        >
          <div className="workflow-decision-modal">
            <div className="workflow-decision-context">
              <BookOpenCheck size={20} />
              <div>
                <strong>{specializationTarget.teacherName}</strong>
                <span>
                  {specializationTarget.teacherCode || "Chưa có mã giáo viên"}
                </span>
              </div>
            </div>
            <Field label="Chuyên môn chính *">
              <input
                autoFocus
                required
                value={specializationValue}
                onChange={(event) => setSpecializationValue(event.target.value)}
                placeholder="Ví dụ: Toán"
              />
            </Field>
            <small className="field-help">
              Giáo vụ chịu trách nhiệm chuẩn hóa chuyên môn. Giá trị này được
              dùng để kiểm tra phân công đúng bộ môn.
            </small>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function AdminAutoTimetableLive({
  workflowStage = "build",
}: {
  workflowStage?: "build" | "publish";
} = {}) {
  const { semesterOptions, semesterId, setSemesterId, semesterLabel } =
    useSelectedSemester();
  const assignments = useApi<TeachingAssignment[]>(
    semesterId
      ? `/teaching-assignments?semesterId=${encodeURIComponent(semesterId)}`
      : null,
  );
  const versions = useApi<TimetableVersion[]>(
    semesterId
      ? `/timetable-versions?semesterId=${encodeURIComponent(semesterId)}`
      : null,
  );
  const toast = useToast();
  const [plan, setPlan] = useState<AutoTimetablePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [versionBusy, setVersionBusy] = useState("");
  const [publicationReview, setPublicationReview] = useState<{
    version: TimetableVersion;
    preview: TimetablePublicationPreview;
  } | null>(null);
  const [publicationName, setPublicationName] = useState("");
  const [publicationReason, setPublicationReason] = useState("");
  const [publicationResult, setPublicationResult] =
    useState<TimetablePublicationStatus | null>(null);
  const [timetableVersionDetail, setTimetableVersionDetail] = useState<{
    version: TimetableVersion;
    slots: TimetableVersionSlot[];
  } | null>(null);
  const [timetableVersionClassId, setTimetableVersionClassId] = useState("");
  const timetableVersionClasses = useMemo(() => {
    const values = new Map<string, string>();
    timetableVersionDetail?.slots.forEach((slot) =>
      values.set(slot.classId, slot.classCode),
    );
    return [...values.entries()].sort((a, b) =>
      a[1].localeCompare(b[1], "vi", { numeric: true }),
    );
  }, [timetableVersionDetail]);
  const visibleTimetableVersionSlots = useMemo(
    () =>
      (timetableVersionDetail?.slots || []).filter(
        (slot) =>
          !timetableVersionClassId || slot.classId === timetableVersionClassId,
      ),
    [timetableVersionClassId, timetableVersionDetail],
  );
  const [selectedPreviewClass, setSelectedPreviewClass] = useState("");
  const [rebuildExisting, setRebuildExisting] = useState(false);
  const [compareThree, setCompareThree] = useState(false);
  const [optionPlans, setOptionPlans] = useState<AutoTimetablePlan[]>([]);

  const classPreviews = useMemo(() => {
    const grouped = new Map<string, AutoTimetablePlan["items"]>();
    (plan?.items || []).forEach((item) =>
      grouped.set(item.classId, [...(grouped.get(item.classId) || []), item]),
    );
    return [...grouped.entries()]
      .map(([classId, items]) => ({
        classId,
        classCode: items[0]?.classCode || classId,
        shift: items[0]?.studyShift === "AFTERNOON" ? "Ca chiều" : "Ca sáng",
        roomCode: items[0]?.roomCode || "Chưa có phòng",
        items,
        scheduled: items.filter((item) => item.status === "PROPOSED").length,
        issues: items.filter((item) => item.status === "UNSCHEDULED").length,
      }))
      .sort((a, b) => a.classCode.localeCompare(b.classCode, "vi"));
  }, [plan]);
  const activeClassPreview =
    classPreviews.find((item) => item.classId === selectedPreviewClass) ||
    classPreviews[0];

  const generate = async (apply: boolean) => {
    setBusy(true);
    try {
      const strategies: AutoTimetablePlan["strategy"][] =
        compareThree && !apply
          ? ["BALANCED", "TEACHER_COMFORT", "EARLY_WEEK"]
          : [plan?.strategy || "BALANCED"];
      const results = await Promise.all(
        strategies.map((strategy) =>
          api.post<AutoTimetablePlan>("/timetableSlots/auto-plan", {
            semesterId,
            apply,
            allowPartial: false,
            rebuildExisting,
            strategy,
          }),
        ),
      );
      const ranked = [...results].sort(
        (a, b) =>
          b.qualityScore - a.qualityScore ||
          a.unscheduledSlots - b.unscheduledSlots ||
          b.proposedSlots - a.proposedSlots,
      );
      const result = ranked[0];
      setOptionPlans(ranked);
      setPlan(result);
      setSelectedPreviewClass(
        result.items.find((item) => item.status === "UNSCHEDULED")?.classId ||
          result.items[0]?.classId ||
          "",
      );
      toast.show(
        "ok",
        apply
          ? "Đã lưu phương án thành bản nháp"
          : compareThree
            ? "Đã tạo và xếp hạng 3 phương án thời khóa biểu"
            : "Đã tạo bản xem trước thời khóa biểu",
      );
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error ? error.message : "Không thể xếp thời khóa biểu",
      );
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!semesterId || !plan || plan.unscheduledSlots > 0) return;
    setBusy(true);
    try {
      const applied = await api.post<AutoTimetablePlan>(
        "/timetableSlots/auto-plan",
        {
          semesterId,
          apply: true,
          allowPartial: false,
          rebuildExisting,
          strategy: plan.strategy,
        },
      );
      setPlan(applied);
      await versions.reload();
      toast.show(
        "ok",
        "Đã lưu bản nháp. Hãy kiểm tra và phát hành để giáo viên, học sinh, phụ huynh nhìn thấy.",
      );
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể lưu phiên bản thời khóa biểu",
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (
      !publicationResult ||
      ["COMPLETED", "FAILED"].includes(publicationResult.status) &&
      publicationResult.channelPendingCount === 0
    )
      return;
    const timer = window.setTimeout(async () => {
      try {
        const current = await api.get<TimetablePublicationStatus>(
          `/timetable-versions/${publicationResult.planId}/publication-status`,
        );
        setPublicationResult(current);
      } catch {
        // Giữ kết quả gần nhất; người dùng vẫn có thể làm mới danh sách phiên bản.
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [publicationResult]);

  const openPublicationReview = async (item: TimetableVersion) => {
    setVersionBusy(item.id);
    try {
      const preview = await api.get<TimetablePublicationPreview>(
        `/timetable-versions/${item.id}/publication-preview`,
      );
      setPublicationName(item.name);
      setPublicationReason("");
      setPublicationReview({ version: item, preview });
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra phạm vi phát hành",
      );
    } finally {
      setVersionBusy("");
    }
  };

  const publishVersion = async () => {
    if (!publicationReview) return;
    const item = publicationReview.version;
    setVersionBusy(item.id);
    try {
      const result = await api.post<TimetablePublishResult>(
        `/timetable-versions/${item.id}/publish`,
        {
          versionName: publicationName.trim(),
          reason: publicationReason.trim(),
        },
      );
      setPublicationResult(result.publication);
      setPublicationReview(null);
      await versions.reload();
      toast.show(
        "ok",
        `Đã phát hành phiên bản ${item.versionNo}; hệ thống đang chuyển thông báo tới ${result.publication.totalRecipientCount} lượt nhận`,
      );
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể phát hành phiên bản",
      );
    } finally {
      setVersionBusy("");
    }
  };

  const retryPublication = async () => {
    if (!publicationResult) return;
    setVersionBusy(publicationResult.planId);
    try {
      const result = await api.post<TimetablePublicationStatus>(
        `/timetable-versions/${publicationResult.planId}/publication-retry`,
        { reason: "Giáo vụ gửi lại các thông báo chuyển phát thất bại" },
      );
      setPublicationResult(result);
      toast.show("ok", "Đã đưa các lượt gửi thất bại trở lại hàng đợi");
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error ? error.message : "Không thể gửi lại thông báo",
      );
    } finally {
      setVersionBusy("");
    }
  };

  const restoreVersion = async (item: TimetableVersion) => {
    setVersionBusy(item.id);
    try {
      await api.post(`/timetable-versions/${item.id}/restore`, {
        name: `Khôi phục từ phiên bản ${item.versionNo}`,
      });
      await versions.reload();
      toast.show(
        "ok",
        "Đã tạo bản nháp khôi phục. Lịch đang phát hành chưa bị thay đổi.",
      );
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể khôi phục phiên bản",
      );
    } finally {
      setVersionBusy("");
    }
  };

  const viewTimetableVersion = async (version: TimetableVersion) => {
    setVersionBusy(version.id);
    try {
      const slots = await api.get<TimetableVersionSlot[]>(
        `/timetable-versions/${version.id}/slots`,
      );
      setTimetableVersionDetail({ version, slots });
      setTimetableVersionClassId(slots[0]?.classId || "");
    } catch (error) {
      toast.show(
        "err",
        error instanceof Error
          ? error.message
          : "Không thể tải nội dung phiên bản thời khóa biểu",
      );
    } finally {
      setVersionBusy("");
    }
  };

  return (
    <Section
      title={
        workflowStage === "build"
          ? "Tạo thời khóa biểu tự động"
          : "Kiểm tra và phát hành thời khóa biểu"
      }
      subtitle={
        workflowStage === "build"
          ? "Hệ thống chọn thứ, tiết và phòng học phù hợp từ phân công đã xác nhận"
          : "Chọn đúng bản nháp đã kiểm tra trước khi phát hành cho toàn trường"
      }
      wide
      action={
        workflowStage === "build" ? (
          <div className="row-actions">
            <button
              className="live-btn subtle"
              disabled={busy || !semesterId || !assignments.data?.length}
              onClick={() => generate(false)}
            >
              <Sparkles size={16} />{" "}
              {busy
                ? "Đang xử lý…"
                : plan
                  ? "Tính lại lịch dự kiến"
                  : "Xem lịch dự kiến"}
            </button>
            <button
              className="live-btn primary"
              disabled={busy || !plan || plan.unscheduledSlots > 0}
              onClick={saveDraft}
            >
              <CalendarCheck2 size={16} /> Lưu bản nháp
            </button>
          </div>
        ) : undefined
      }
    >
      {workflowStage === "build" && (
        <>
          <div className="auto-timetable-toolbar">
            <label>
              <span>Chọn học kỳ cần tạo thời khóa biểu</span>
              <select
                value={semesterId}
                onChange={(event) => {
                  setSemesterId(event.target.value);
                  setPlan(null);
                  setOptionPlans([]);
                  setSelectedPreviewClass("");
                }}
              >
                {semesterOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {semesterLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <div className="automation-rules">
              <CheckCircle2 size={18} />
              <span>
                <strong>Hệ thống tự kiểm tra trước khi lưu</strong>Không trùng
                lớp · Không trùng giáo viên · Không trùng phòng · Tôn trọng ca
                học và tiết bận
              </span>
            </div>
          </div>
          <label
            className={`rebuild-schedule-option ${rebuildExisting ? "active" : ""}`}
          >
            <input
              type="checkbox"
              checked={rebuildExisting}
              onChange={(event) => {
                setRebuildExisting(event.target.checked);
                setPlan(null);
                setSelectedPreviewClass("");
              }}
            />
            <RotateCcw size={18} />
            <span>
              <strong>Tạo lại toàn bộ thời khóa biểu</strong>
              <small>
                Dùng khi lịch hiện tại vi phạm quy tắc hoặc cần xếp lại từ đầu.
                Lịch đang phát hành chỉ thay đổi sau khi bạn lưu bản nháp và bấm
                Phát hành.
              </small>
            </span>
          </label>
          <label
            className={`compare-schedule-option ${compareThree ? "active" : ""}`}
          >
            <input
              type="checkbox"
              checked={compareThree}
              onChange={(event) => {
                setCompareThree(event.target.checked);
                setPlan(null);
                setOptionPlans([]);
              }}
            />
            <Sparkles size={18} />
            <span>
              <strong>So sánh 3 phương án</strong>
              <small>
                Hệ thống tạo phương án cân bằng, ưu tiên lịch giáo viên và ưu
                tiên đầu tuần; sau đó tự đề xuất phương án có điểm chất lượng
                cao nhất.
              </small>
            </span>
          </label>
          {!assignments.loading && !assignments.data?.length ? (
            <div className="workflow-blocker">
              <AlertTriangle size={24} />
              <div>
                <strong>Chưa thể xếp thời khóa biểu</strong>
                <span>
                  Học kỳ này chưa có giáo viên phụ trách các môn. Hãy hoàn tất
                  tab “Phân công giáo viên tự động” trước.
                </span>
              </div>
            </div>
          ) : !plan ? (
            <div className="planning-empty">
              <CalendarCheck2 size={32} />
              <strong>Đã đủ điều kiện để tạo lịch</strong>
              <span>
                Chọn “1. Xem lịch dự kiến”. Hệ thống chưa lưu hay thay đổi thời
                khóa biểu ở bước này.
              </span>
            </div>
          ) : plan.proposedSlots === 0 && plan.unscheduledSlots === 0 ? (
            <div className="workflow-complete">
              <CheckCircle2 size={26} />
              <div>
                <strong>Thời khóa biểu đã đầy đủ</strong>
                <span>
                  {plan.existingSlots} tiết hiện có được giữ nguyên; không còn
                  tiết nào cần xếp thêm.
                </span>
              </div>
            </div>
          ) : (
            <>
              {optionPlans.length > 1 && (
                <div
                  className="schedule-option-comparison"
                  aria-label="So sánh phương án thời khóa biểu"
                >
                  {optionPlans.map((option, index) => (
                    <button
                      type="button"
                      key={option.strategy}
                      className={
                        plan.strategy === option.strategy ? "active" : ""
                      }
                      onClick={() => {
                        setPlan(option);
                        setSelectedPreviewClass(
                          option.items.find(
                            (item) => item.status === "UNSCHEDULED",
                          )?.classId ||
                            option.items[0]?.classId ||
                            "",
                        );
                      }}
                    >
                      <span>
                        {index === 0
                          ? "Đề xuất tốt nhất"
                          : `Lựa chọn ${index + 1}`}
                      </span>
                      <strong>
                        {option.strategy === "BALANCED"
                          ? "Cân bằng"
                          : option.strategy === "TEACHER_COMFORT"
                            ? "Thuận tiện giáo viên"
                            : "Ưu tiên đầu tuần"}
                      </strong>
                      <small>{option.strategySummary}</small>
                      <b>
                        {option.qualityScore}/100 điểm ·{" "}
                        {option.unscheduledSlots} cảnh báo
                      </b>
                    </button>
                  ))}
                </div>
              )}
              <div
                className={`schedule-result-hero ${plan.unscheduledSlots ? "warning" : "success"}`}
              >
                {plan.unscheduledSlots ? (
                  <AlertTriangle size={24} />
                ) : (
                  <CheckCircle2 size={24} />
                )}
                <div>
                  <strong>
                    {plan.unscheduledSlots
                      ? `Còn ${plan.unscheduledSlots} tiết cần xử lý`
                      : `Đã xếp đủ ${plan.proposedSlots} tiết`}
                  </strong>
                  <span>
                    {plan.unscheduledSlots
                      ? "Chọn lớp có cảnh báo để xem nguyên nhân và điều chỉnh."
                      : "Không trùng lớp, giáo viên, phòng học hoặc ca học. Bạn có thể kiểm tra theo từng lớp trước khi lưu."}
                  </span>
                </div>
                <div className="schedule-result-metrics">
                  <span>
                    <b>{classPreviews.length}</b> lớp
                  </span>
                  <span>
                    <b>{plan.proposedSlots}</b> tiết hợp lệ
                  </span>
                  {plan.existingSlots > 0 && (
                    <span>
                      <b>{plan.existingSlots}</b> tiết giữ nguyên
                    </span>
                  )}
                  {plan.unscheduledSlots > 0 && (
                    <button
                      type="button"
                      className="live-btn primary"
                      disabled={busy}
                      onClick={() => generate(false)}
                    >
                      <Sparkles size={15} /> Tự động xếp lại
                    </button>
                  )}
                </div>
              </div>
              {plan.warnings.length > 0 && (
                <div className="schedule-global-issues">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>Các quy tắc cần xử lý trước khi lưu</strong>
                    {plan.warnings.map((warning) => (
                      <span key={warning}>{warning}</span>
                    ))}
                  </div>
                </div>
              )}

              <div
                className="class-preview-picker"
                aria-label="Chọn lớp để xem lịch dự kiến"
              >
                <div>
                  <strong>Kiểm tra theo từng lớp</strong>
                  <span>Chọn một lớp để xem lịch dạng lưới</span>
                </div>
                <div className="class-preview-buttons">
                  {classPreviews.map((item) => (
                    <button
                      type="button"
                      key={item.classId}
                      className={
                        activeClassPreview?.classId === item.classId
                          ? "active"
                          : ""
                      }
                      onClick={() => setSelectedPreviewClass(item.classId)}
                    >
                      <span>{item.classCode}</span>
                      <small>
                        {item.shift} · {item.roomCode}
                      </small>
                      {item.issues > 0 ? (
                        <b className="has-issue">{item.issues} lỗi</b>
                      ) : (
                        <b>{item.scheduled} tiết</b>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {activeClassPreview && (
                <div className="class-timetable-preview">
                  <header>
                    <div>
                      <strong>
                        Thời khóa biểu dự kiến lớp{" "}
                        {activeClassPreview.classCode}
                      </strong>
                      <span>
                        {activeClassPreview.shift} · Phòng{" "}
                        {activeClassPreview.roomCode} ·{" "}
                        {activeClassPreview.scheduled} tiết đã xếp
                      </span>
                    </div>
                    {activeClassPreview.issues ? (
                      <Badge tone="red">
                        {activeClassPreview.issues} tiết cần xử lý
                      </Badge>
                    ) : (
                      <Badge tone="green">Không có xung đột</Badge>
                    )}
                  </header>
                  {activeClassPreview.issues > 0 && (
                    <div className="class-preview-issues">
                      {activeClassPreview.items
                        .filter((item) => item.status === "UNSCHEDULED")
                        .map((item, index) => (
                          <div key={`${item.subjectId}-${index}`}>
                            <AlertTriangle size={16} />
                            <span>
                              <strong>
                                {item.subjectName} · {item.teacherName}
                              </strong>
                              <small>{item.message}</small>
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                  <div className="compact-timetable-grid">
                    <div className="grid-corner">Tiết</div>
                    {DAYS.map(([day, label]) => (
                      <div className="grid-day" key={day}>
                        {label}
                      </div>
                    ))}
                    {[1, 2, 3, 4, 5].flatMap((period) => [
                      <div className="grid-period" key={`period-${period}`}>
                        {period}
                      </div>,
                      ...DAYS.map(([day]) => {
                        const lesson = activeClassPreview.items.find(
                          (item) =>
                            item.status === "PROPOSED" &&
                            item.dayOfWeek === day &&
                            item.periodNo === period,
                        );
                        return (
                          <div
                            className={`grid-lesson ${lesson ? "filled" : ""}`}
                            key={`${day}-${period}`}
                          >
                            {lesson ? (
                              <>
                                <strong>{lesson.subjectName}</strong>
                                <span>{lesson.teacherName}</span>
                              </>
                            ) : (
                              <span>Trống</span>
                            )}
                          </div>
                        );
                      }),
                    ])}
                  </div>
                </div>
              )}

              <details className="technical-schedule-details">
                <summary>
                  <span>
                    <strong>Xem danh sách kỹ thuật</strong>
                    <small>
                      Dành cho kiểm tra chi tiết từng tiết và nguyên nhân thuật
                      toán
                    </small>
                  </span>
                  <b>{plan.items.length} dòng</b>
                </summary>
                <div className="teacher-load-table">
                  <table className="live-table auto-timetable-preview-table">
                    <thead>
                      <tr>
                        <th>Lớp</th>
                        <th>Ca</th>
                        <th>Môn</th>
                        <th>Giáo viên</th>
                        <th>Thứ</th>
                        <th>Tiết</th>
                        <th>Phòng</th>
                        <th>Kết quả</th>
                        <th>Giải thích</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.items.map((item, index) => (
                        <tr key={`${item.classId}-${item.subjectId}-${index}`}>
                          <td>
                            <strong>{item.classCode}</strong>
                          </td>
                          <td>
                            {item.studyShift === "AFTERNOON" ? "Chiều" : "Sáng"}
                          </td>
                          <td>{item.subjectName}</td>
                          <td>{item.teacherName}</td>
                          <td>
                            {item.dayOfWeek
                              ? (
                                  {
                                    MON: "Thứ 2",
                                    TUE: "Thứ 3",
                                    WED: "Thứ 4",
                                    THU: "Thứ 5",
                                    FRI: "Thứ 6",
                                  } as Record<string, string>
                                )[item.dayOfWeek]
                              : "—"}
                          </td>
                          <td>{item.periodNo || "—"}</td>
                          <td>{item.roomCode || "—"}</td>
                          <td>
                            {item.status === "PROPOSED" ? (
                              <Badge tone="green">Có thể xếp</Badge>
                            ) : (
                              <Badge tone="red">Cần xử lý</Badge>
                            )}
                          </td>
                          <td
                            className={
                              item.status === "UNSCHEDULED"
                                ? "schedule-reason error"
                                : "schedule-reason"
                            }
                          >
                            {item.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}

          <div className="wizard-footer">
            <span>
              {versions.data?.some((item) =>
                ["DRAFT", "VALIDATED"].includes(item.status),
              )
                ? "Đã có bản nháp sẵn sàng để kiểm tra"
                : "Hãy lưu một bản nháp hợp lệ trước khi phát hành"}
            </span>
            <button
              type="button"
              className="live-btn primary"
              disabled={
                !versions.data?.some((item) =>
                  ["DRAFT", "VALIDATED"].includes(item.status),
                )
              }
              onClick={() =>
                updateHashQuery(
                  { buoc: "phat-hanh-thoi-khoa-bieu", tab: null },
                  "push",
                )
              }
            >
              <Rocket size={15} /> Tiếp theo: Kiểm tra &amp; phát hành
            </button>
          </div>
        </>
      )}

      {workflowStage === "publish" && (
        <div className="timetable-version-panel">
          <div className="timetable-version-heading">
            <div>
              <History size={20} />
              <span>
                <strong>Phiên bản và lịch sử phát hành</strong>
                <small>
                  Mỗi lần lưu tạo một bản độc lập; khôi phục không ghi đè lịch
                  đang dùng.
                </small>
              </span>
            </div>
            <Badge
              tone={
                versions.data?.some((item) => item.status === "PUBLISHED")
                  ? "green"
                  : "red"
              }
            >
              {versions.data?.some((item) => item.status === "PUBLISHED")
                ? "Đã có lịch chính thức"
                : "Chưa phát hành"}
            </Badge>
          </div>
          {publicationResult && (
            <div
              className={`timetable-publication-result status-${publicationResult.status.toLowerCase()}`}
              role="status"
            >
              <span className="publication-result-icon">
                <Bell size={20} />
              </span>
              <div>
                <strong>
                  {publicationResult.status === "COMPLETED"
                    ? "Đã chuyển thông báo tới đúng người nhận"
                    : publicationResult.status === "FAILED"
                      ? "Có thông báo chưa gửi được"
                      : "Đang chuyển thông báo sau khi phát hành"}
                </strong>
                <small>
                  {publicationResult.deliveredRecipientCount}/
                  {publicationResult.totalRecipientCount} đã nhận trong ứng dụng
                  {publicationResult.failedRecipientCount
                    ? ` · ${publicationResult.failedRecipientCount} thất bại`
                    : ""}
                  {publicationResult.channelPendingCount
                    ? ` · ${publicationResult.channelPendingCount} email/push đang gửi`
                    : ""}
                  {publicationResult.channelFailedCount
                    ? ` · ${publicationResult.channelFailedCount} email/push thất bại`
                    : ""}
                </small>
              </div>
              {(publicationResult.failedRecipientCount > 0 ||
                publicationResult.channelFailedCount > 0) && (
                <button
                  type="button"
                  className="live-btn subtle"
                  disabled={Boolean(versionBusy)}
                  onClick={retryPublication}
                >
                  <RefreshCcw size={15} /> Gửi lại phần thất bại
                </button>
              )}
            </div>
          )}
          <Async
            state={versions}
            empty="Chưa có phiên bản. Hãy xem lịch dự kiến rồi lưu bản nháp."
          >
            {(items) => (
              <div className="timetable-version-list">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className={`timetable-version-card ${item.status.toLowerCase()}`}
                  >
                    <div className="version-number">
                      <span>v{item.versionNo}</span>
                      <Badge
                        tone={
                          item.status === "PUBLISHED"
                            ? "green"
                            : item.status === "SUPERSEDED"
                              ? "violet"
                              : "blue"
                        }
                      >
                        {item.status === "PUBLISHED"
                          ? "Đang dùng"
                          : item.status === "SUPERSEDED"
                            ? "Đã thay thế"
                            : item.status === "VALIDATED"
                              ? "Đã kiểm tra"
                              : "Bản nháp"}
                      </Badge>
                    </div>
                    <div className="version-main">
                      <strong>{item.name}</strong>
                      <span>
                        {item.totalPeriods} tiết · chất lượng{" "}
                        {item.qualityScore}% ·{" "}
                        {new Date(item.createdAt).toLocaleString("vi-VN")}
                      </span>
                      {item.sourcePlanId && (
                        <small>Được khôi phục từ một phiên bản trước</small>
                      )}
                      {item.conflictSummary && (
                        <small className="version-conflict">
                          {item.conflictSummary}
                        </small>
                      )}
                    </div>
                    <div className="row-actions">
                      <button
                        className="live-btn subtle"
                        disabled={Boolean(versionBusy)}
                        onClick={() => viewTimetableVersion(item)}
                      >
                        <Eye size={15} /> Xem lịch
                      </button>
                      {["DRAFT", "VALIDATED"].includes(item.status) && (
                        <button
                          className="live-btn primary"
                          disabled={Boolean(versionBusy)}
                          onClick={() => openPublicationReview(item)}
                        >
                          <Rocket size={15} />{" "}
                          {versionBusy === item.id
                            ? "Đang phát hành…"
                            : "Phát hành"}
                        </button>
                      )}
                      {["PUBLISHED", "SUPERSEDED"].includes(item.status) && (
                        <button
                          className="live-btn subtle"
                          disabled={Boolean(versionBusy)}
                          onClick={() => restoreVersion(item)}
                        >
                          <RotateCcw size={15} /> Tạo bản khôi phục
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Async>
        </div>
      )}
      {publicationReview && (
        <Modal
          title={
            publicationReview.preview.firstPublication
              ? "Phát hành thời khóa biểu chính thức"
              : "Xác nhận thay thế thời khóa biểu"
          }
          size="wide"
          onClose={() => !versionBusy && setPublicationReview(null)}
          footer={
            <>
              <button
                type="button"
                className="live-btn ghost"
                disabled={Boolean(versionBusy)}
                onClick={() => setPublicationReview(null)}
              >
                Quay lại kiểm tra
              </button>
              <button
                type="button"
                className="live-btn primary"
                disabled={
                  Boolean(versionBusy) ||
                  publicationName.trim().length < 3 ||
                  publicationReason.trim().length < 10
                }
                onClick={publishVersion}
              >
                <Send size={15} />
                {versionBusy ? "Đang phát hành…" : "Xác nhận phát hành"}
              </button>
            </>
          }
        >
          <div className="timetable-publication-review">
            <div className="publication-review-notice">
              <Bell size={21} />
              <div>
                <strong>
                  Chỉ bước xác nhận này mới gửi thông báo tới người dùng
                </strong>
                <p>
                  Bản nháp và bản xem trước không tạo thông báo. Sau khi xác
                  nhận, lịch mới trở thành lịch chính thức.
                </p>
              </div>
            </div>
            <div className="publication-review-fields">
              <Field label="Tên phiên bản chính thức *">
                <input
                  autoFocus
                  value={publicationName}
                  maxLength={255}
                  onChange={(event) => setPublicationName(event.target.value)}
                  placeholder="Ví dụ: TKB học kỳ 1 · lần phát hành 02"
                />
              </Field>
              <Field label="Lý do phát hành hoặc thay thế *">
                <textarea
                  value={publicationReason}
                  maxLength={1000}
                  onChange={(event) => setPublicationReason(event.target.value)}
                  placeholder="Ghi rõ căn cứ áp dụng để lưu trong lịch sử kiểm tra…"
                />
              </Field>
              <small>
                Lý do cần tối thiểu 10 ký tự và được lưu trong lịch sử hệ thống.
              </small>
            </div>
            <div className="publication-recipient-summary">
              <article>
                <strong>{publicationReview.preview.affectedClassCount}</strong>
                <span>Lớp bị ảnh hưởng</span>
              </article>
              <article>
                <strong>{publicationReview.preview.teacherRecipientCount}</strong>
                <span>Giáo viên</span>
              </article>
              <article>
                <strong>{publicationReview.preview.studentRecipientCount}</strong>
                <span>Học sinh</span>
              </article>
              <article>
                <strong>{publicationReview.preview.parentRecipientCount}</strong>
                <span>Phụ huynh / con</span>
              </article>
            </div>
            {!publicationReview.preview.firstPublication && (
              <div className="publication-change-preview">
                <header>
                  <div>
                    <strong>
                      {publicationReview.preview.changeCount} thay đổi sẽ được
                      thông báo
                    </strong>
                    <small>
                      Chỉ người liên quan tới các lớp và tiết dưới đây mới nhận
                      thông báo.
                    </small>
                  </div>
                </header>
                {publicationReview.preview.changes.length ? (
                  <ul>
                    {publicationReview.preview.changes
                      .slice(0, 10)
                      .map((change, index) => (
                        <li key={`${change.classId}-${change.subjectId}-${index}`}>
                          {change.summary}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="publication-no-change">
                    Hai phiên bản không có khác biệt về tiết học. Sẽ không có
                    người dùng nào bị làm phiền bởi thông báo thay đổi.
                  </p>
                )}
                {publicationReview.preview.changes.length > 10 && (
                  <small>
                    Và {publicationReview.preview.changes.length - 10} thay đổi
                    khác trong bản đối chiếu đầy đủ.
                  </small>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
      {timetableVersionDetail && (
        <Modal
          title={`Thời khóa biểu v${timetableVersionDetail.version.versionNo}`}
          onClose={() => setTimetableVersionDetail(null)}
          footer={
            <button
              className="live-btn primary"
              type="button"
              onClick={() => setTimetableVersionDetail(null)}
            >
              Đóng
            </button>
          }
        >
          <div className="version-detail-summary">
            <strong>{timetableVersionDetail.version.name}</strong>
            <span>
              {timetableVersionDetail.slots.length} tiết · chọn lớp để đối
              chiếu, không thay đổi lịch đang phát hành
            </span>
            <label>
              <span>Lớp cần xem</span>
              <select
                value={timetableVersionClassId}
                onChange={(event) =>
                  setTimetableVersionClassId(event.target.value)
                }
              >
                {timetableVersionClasses.map(([id, code]) => (
                  <option key={id} value={id}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="teacher-load-table version-detail-table">
            <table className="live-table">
              <thead>
                <tr>
                  <th>Lớp</th>
                  <th>Thứ</th>
                  <th>Tiết</th>
                  <th>Môn học</th>
                  <th>Giáo viên</th>
                  <th>Phòng</th>
                </tr>
              </thead>
              <tbody>
                {visibleTimetableVersionSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td>
                      <strong>{slot.classCode}</strong>
                    </td>
                    <td>
                      {(
                        {
                          MON: "Thứ 2",
                          TUE: "Thứ 3",
                          WED: "Thứ 4",
                          THU: "Thứ 5",
                          FRI: "Thứ 6",
                        } as Record<string, string>
                      )[slot.dayOfWeek] || slot.dayOfWeek}
                    </td>
                    <td>{slot.periodNo}</td>
                    <td>{slot.subjectName}</td>
                    <td>{slot.teacherName}</td>
                    <td>{slot.roomCode || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </Section>
  );
}
