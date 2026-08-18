import { expect, request as requestFactory, test, type APIRequestContext } from '@playwright/test';

const apiUrl = process.env.E2E_API_URL ?? 'http://127.0.0.1:4000';

async function session(username: string, password: string) {
  expect(password, `Thiếu mật khẩu E2E cho ${username}`).not.toBe('');
  const bootstrap = await requestFactory.newContext({ baseURL: apiUrl });
  const response = await bootstrap.post('/auth/login', { data: { username, password } });
  expect(response.ok(), `Không đăng nhập được ${username}: ${response.status()}`).toBeTruthy();
  const body = await response.json() as { accessToken: string };
  await bootstrap.dispose();
  return requestFactory.newContext({ baseURL: apiUrl, extraHTTPHeaders: { Authorization: `Bearer ${body.accessToken}` } });
}

async function json<T>(context: APIRequestContext, path: string): Promise<T> {
  const response = await context.get(path);
  expect(response.ok(), `${path} trả ${response.status()}`).toBeTruthy();
  return response.json() as Promise<T>;
}

async function post<T>(context: APIRequestContext, path: string, data?: unknown): Promise<T> {
  const response = await context.post(path, data === undefined ? undefined : { data });
  const raw = await response.text();
  expect(response.ok(), `${path} trả ${response.status()}: ${raw}`).toBeTruthy();
  return raw ? JSON.parse(raw) as T : undefined as T;
}

test.describe.configure({ mode: 'serial' });

test('Admin phát hành TKB thì Giáo viên, Học sinh và đúng Phụ huynh đọc cùng version', async () => {
  const admin = await session('admin', process.env.E2E_ADMIN_PASSWORD ?? '');
  const teacher = await session('gv.nguyenminh', process.env.E2E_TEACHER_PASSWORD ?? '');
  const student = await session('hs.nguyenminhan', process.env.E2E_STUDENT_PASSWORD ?? '');
  const parent = await session('ph.nguyenvanhung', process.env.E2E_PARENT_PASSWORD ?? '');
  try {
    const plan = await post<{ draftVersion: { id: string } }>(admin, '/timetableSlots/auto-plan', {
      semesterId: 'sm-2026-1', apply: true, allowPartial: false,
      scopeGradeLevel: 'K10', draftName: `E2E ${Date.now()}`,
    });
    const published = await post<{ id: string; status: string }>(admin, `/timetable-versions/${plan.draftVersion.id}/publish`);
    expect(published.status).toBe('PUBLISHED');
    const teacherSlots = await json<Array<{ publishedPlanId: string; teacherId: string }>>(teacher, '/me/timetable');
    const studentSlots = await json<Array<{ publishedPlanId: string; classId: string }>>(student, '/me/timetable');
    const childSlots = await json<Array<{ publishedPlanId: string; classId: string }>>(parent, '/children/u-student-1/timetable');
    expect(teacherSlots.some((slot) => slot.publishedPlanId === published.id && slot.teacherId === 'u-teacher-1')).toBeTruthy();
    expect(studentSlots.length).toBeGreaterThan(0);
    expect(studentSlots.every((slot) => slot.publishedPlanId === published.id && slot.classId === 'c-10a1')).toBeTruthy();
    expect(childSlots).toEqual(studentSlots);
  } finally {
    await Promise.all([admin.dispose(), teacher.dispose(), student.dispose(), parent.dispose()]);
  }
});

test('Giáo viên sửa điểm thì học sinh và đúng phụ huynh đọc được cùng phiên bản', async () => {
  const teacher = await session('gv.nguyenminh', process.env.E2E_TEACHER_PASSWORD ?? '');
  const student = await session('hs.nguyenminhan', process.env.E2E_STUDENT_PASSWORD ?? '');
  const parent = await session('ph.nguyenvanhung', process.env.E2E_PARENT_PASSWORD ?? '');
  try {
    const me = await json<{ id: string; classId: string }>(student, '/me');
    const children = await json<Array<{ id: string }>>(parent, '/me/children');
    expect(children.some((child) => child.id === me.id), 'Tài khoản phụ huynh E2E phải liên kết học sinh E2E').toBeTruthy();
    const assignments = await json<Array<{ classId: string; subjectId: string; semesterId: string }>>(teacher, '/me/teaching-assignments');
    const classAssignment = assignments.find((item) => item.classId === me.classId);
    expect(classAssignment, 'Giáo viên E2E phải được phân công dạy lớp của học sinh E2E').toBeTruthy();
    const context = await json<{
      subjectId: string;
      subjects: Array<{ subjectId: string; editable: boolean }>;
    }>(teacher, `/me/gradebook-context?classId=${encodeURIComponent(me.classId)}&semesterId=${encodeURIComponent(classAssignment!.semesterId)}`);
    const editableSubjectId = context.subjects.find((subject) => subject.editable)?.subjectId || context.subjectId;
    const assignment = assignments.find((item) => item.classId === me.classId
      && item.semesterId === classAssignment!.semesterId
      && item.subjectId === editableSubjectId);
    expect(assignment, 'Gradebook context phải trả môn giáo viên được phép sửa').toBeTruthy();
    const query = `studentId=${encodeURIComponent(me.id)}&classId=${encodeURIComponent(me.classId)}&subjectId=${encodeURIComponent(assignment!.subjectId)}&semesterId=${encodeURIComponent(assignment!.semesterId)}`;
    const grades = await json<Array<{ id: string; category: string; assessmentIndex?: number; score: number; version?: number; note?: string }>>(teacher, `/grades?${query}`);
    expect(grades.length, 'Cần ít nhất một điểm seed để kiểm tra cập nhật và khôi phục').toBeGreaterThan(0);
    const original = grades[0];
    expect(original.version).not.toBeUndefined();
    const changedScore = original.score >= 10 ? 9.9 : Math.round((original.score + 0.1) * 10) / 10;
    const payload = {
      classId: me.classId, subjectId: assignment!.subjectId, semesterId: assignment!.semesterId,
      category: original.category, assessmentIndex: original.assessmentIndex || 1,
      reason: 'E2E kiểm tra đồng bộ điểm xuyên vai trò',
      entries: [{ studentId: me.id, score: changedScore, note: original.note || null, expectedVersion: original.version }],
    };
    const updatedResponse = await teacher.post('/grades/bulk', { data: payload });
    expect(updatedResponse.ok(), `Cập nhật điểm trả ${updatedResponse.status()}`).toBeTruthy();
    const updated = (await updatedResponse.json() as Array<{ score: number; version: number }>)[0];
    const studentGrades = await json<Array<{ id: string; score: number; version: number }>>(student, `/grades?semesterId=${assignment!.semesterId}&subjectId=${assignment!.subjectId}`);
    const parentGrades = await json<Array<{ id: string; score: number; version: number }>>(parent, `/grades?studentId=${me.id}&semesterId=${assignment!.semesterId}&subjectId=${assignment!.subjectId}`);
    expect(studentGrades.find((item) => item.id === original.id)).toMatchObject({ score: changedScore, version: updated.version });
    expect(parentGrades.find((item) => item.id === original.id)).toMatchObject({ score: changedScore, version: updated.version });

    const restore = await teacher.post('/grades/bulk', { data: { ...payload, reason: 'Khôi phục dữ liệu sau E2E', entries: [{ studentId: me.id, score: original.score, note: original.note || null, expectedVersion: updated.version }] } });
    expect(restore.ok(), 'Phải khôi phục được điểm sau kiểm thử').toBeTruthy();
  } finally {
    await Promise.all([teacher.dispose(), student.dispose(), parent.dispose()]);
  }
});

test('Giáo viên điểm danh thì Học sinh và Phụ huynh đọc đúng trạng thái và version', async () => {
  const teacher = await session('gv.nguyenminh', process.env.E2E_TEACHER_PASSWORD ?? '');
  const student = await session('hs.nguyenminhan', process.env.E2E_STUDENT_PASSWORD ?? '');
  const parent = await session('ph.nguyenvanhung', process.env.E2E_PARENT_PASSWORD ?? '');
  try {
    const slots = await json<Array<{ id: string; dayOfWeek: string }>>(teacher, '/me/timetable');
    const slot = slots.find((item) => item.dayOfWeek === 'MON');
    expect(slot, 'Cần một tiết thứ Hai đã phát hành để test ngày hiện tại').toBeTruthy();
    const date = '2026-08-17';
    await post(teacher, '/attendance/unlock', {
      slotId: slot!.id, date, reason: 'E2E mở sổ muộn để kiểm tra đồng bộ xuyên vai trò',
    });
    const before = await json<Array<{ studentId: string; status: string; note?: string; version?: number }>>(
      teacher, `/attendance?slotId=${encodeURIComponent(slot!.id)}&date=${date}`,
    );
    const original = before.find((item) => item.studentId === 'u-student-1');
    const marks = [{
      studentId: 'u-student-1', status: 'LATE', note: 'E2E đi muộn 5 phút',
      ...(original?.version === undefined ? {} : { expectedVersion: original.version }),
    }];
    const saved = await post<Array<{ studentId: string; status: string; version: number }>>(
      teacher, '/attendance/bulk', { slotId: slot!.id, date, marks },
    );
    const changed = saved.find((item) => item.studentId === 'u-student-1')!;
    const studentRows = await json<Array<{ studentId: string; slotId: string; date: string; status: string; version: number }>>(student, '/attendance');
    const parentRows = await json<Array<{ studentId: string; slotId: string; date: string; status: string; version: number }>>(parent, '/attendance?studentId=u-student-1');
    const match = (item: { studentId: string; slotId: string; date: string }) => item.studentId === 'u-student-1' && item.slotId === slot!.id && item.date === date;
    expect(studentRows.find(match)).toMatchObject({ status: 'LATE', version: changed.version });
    expect(parentRows.find(match)).toMatchObject({ status: 'LATE', version: changed.version });
    if (original) {
      await post(teacher, '/attendance/bulk', {
        slotId: slot!.id, date, marks: [{ studentId: 'u-student-1', status: original.status,
          note: original.note || null, expectedVersion: changed.version }],
      });
    }
  } finally {
    await Promise.all([teacher.dispose(), student.dispose(), parent.dispose()]);
  }
});

test('Bài tập đi đủ draft → publish → submit → grade → resubmit xuyên ba vai trò', async () => {
  const teacher = await session('gv.nguyenminh', process.env.E2E_TEACHER_PASSWORD ?? '');
  const student = await session('hs.nguyenminhan', process.env.E2E_STUDENT_PASSWORD ?? '');
  const parent = await session('ph.nguyenvanhung', process.env.E2E_PARENT_PASSWORD ?? '');
  try {
    const assignment = await post<{ id: string; status: string }>(teacher, '/assignments', {
      classId: 'c-10a1', subjectId: 'sj-math', title: `E2E bài tập ${Date.now()}`,
      description: 'Bài tập kiểm tra luồng thật', allowLate: true, publishNow: false,
    });
    expect(assignment.status).toBe('DRAFT');
    const beforePublish = await json<Array<{ id: string }>>(student, '/me/assignments');
    expect(beforePublish.some((item) => item.id === assignment.id)).toBeFalsy();
    await post(teacher, `/assignments/${assignment.id}/publish`);
    const visible = await json<Array<{ id: string }>>(student, '/me/assignments');
    expect(visible.some((item) => item.id === assignment.id)).toBeTruthy();
    const submission = await post<{ id: string; status: string; attemptNumber: number }>(
      student, `/assignments/${assignment.id}/submit`, { content: 'Bài nộp E2E lần một' },
    );
    expect(submission).toMatchObject({ status: 'SUBMITTED', attemptNumber: 1 });
    const teacherSubmissions = await json<Array<{ id: string }>>(teacher, `/assignments/${assignment.id}/submissions`);
    expect(teacherSubmissions.some((item) => item.id === submission.id)).toBeTruthy();
    await post(teacher, `/submissions/${submission.id}/grade`, { score: 8.75, feedback: 'Đã chấm E2E' });
    const childSubmissions = await json<Array<{ id: string; score: number; status: string }>>(parent, '/children/u-student-1/submissions');
    expect(childSubmissions.find((item) => item.id === submission.id)).toMatchObject({ score: 8.75, status: 'GRADED' });
    await post(teacher, `/submissions/${submission.id}/allow-resubmit`);
    const resubmitted = await post<{ attemptNumber: number; status: string }>(
      student, `/assignments/${assignment.id}/submit`, { content: 'Bài nộp E2E lần hai' },
    );
    expect(resubmitted).toMatchObject({ attemptNumber: 2, status: 'SUBMITTED' });
    const attempts = await json<Array<{ attemptNumber: number }>>(student, `/submissions/${submission.id}/attempts`);
    expect(attempts.map((item) => item.attemptNumber)).toEqual([2, 1]);
  } finally {
    await Promise.all([teacher.dispose(), student.dispose(), parent.dispose()]);
  }
});

test('Đơn nghỉ đi đúng Học sinh → Phụ huynh → GVCN', async () => {
  const teacher = await session('gv.nguyenminh', process.env.E2E_TEACHER_PASSWORD ?? '');
  const student = await session('hs.nguyenminhan', process.env.E2E_STUDENT_PASSWORD ?? '');
  const parent = await session('ph.nguyenvanhung', process.env.E2E_PARENT_PASSWORD ?? '');
  try {
    const offset = Math.floor(Math.random() * 20) + 30;
    const start = new Date(Date.UTC(2026, 7, 17 + offset));
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    const iso = (date: Date) => date.toISOString().slice(0, 10);
    const leave = await post<{ id: string; status: string }>(student, '/leave-requests', {
      startDate: iso(start), endDate: iso(end), reason: 'Khám sức khỏe theo lịch E2E',
    });
    expect(leave.status).toBe('PENDING_PARENT');
    const parentList = await json<Array<{ id: string; status: string }>>(parent, '/leave-requests');
    expect(parentList.find((item) => item.id === leave.id)?.status).toBe('PENDING_PARENT');
    const confirmed = await post<{ status: string }>(parent, `/leave-requests/${leave.id}/parent-confirm`, { note: 'Phụ huynh xác nhận E2E' });
    expect(confirmed.status).toBe('PENDING_HOMEROOM');
    const teacherList = await json<Array<{ id: string; status: string }>>(teacher, '/leave-requests');
    expect(teacherList.find((item) => item.id === leave.id)?.status).toBe('PENDING_HOMEROOM');
    const approved = await post<{ status: string }>(teacher, `/leave-requests/${leave.id}/approve`, { note: 'GVCN duyệt E2E' });
    expect(approved.status).toBe('APPROVED');
    const finalParentList = await json<Array<{ id: string; status: string }>>(parent, '/leave-requests');
    expect(finalParentList.find((item) => item.id === leave.id)?.status).toBe('APPROVED');
  } finally {
    await Promise.all([teacher.dispose(), student.dispose(), parent.dispose()]);
  }
});

test('VietQR submitted → Admin đối soát → Phụ huynh thấy hóa đơn PAID và biên nhận', async () => {
  const admin = await session('admin', process.env.E2E_ADMIN_PASSWORD ?? '');
  const parent = await session('ph.nguyenvanhung', process.env.E2E_PARENT_PASSWORD ?? '');
  try {
    const suffix = `${Date.now()}`.slice(-10);
    const period = await post<{ id: string }>(admin, '/fee-periods', {
      code: `E2E-${suffix}`, name: 'Đợt thu E2E', applyToGrades: 'K10', dueDate: '2026-12-20',
    });
    await post(admin, `/fee-periods/${period.id}/items`, { name: 'Khoản thu E2E', amount: 125000, gradeLevel: 'K10' });
    await post(admin, `/fee-periods/${period.id}/open`);
    const invoices = await post<Array<{ id: string; studentId: string; status: string }>>(admin, `/fee-periods/${period.id}/generate-invoices`);
    const invoice = invoices.find((item) => item.studentId === 'u-student-1');
    expect(invoice, 'Phải sinh hóa đơn cho học sinh liên kết với phụ huynh E2E').toBeTruthy();
    const initiated = await post<{ payment: { id: string; status: string } }>(parent, '/payments', {
      invoiceId: invoice!.id, method: 'VIETQR',
    });
    expect(initiated.payment.status).toBe('PENDING');
    await post(parent, `/payments/${initiated.payment.id}/submitted`);
    const confirmed = await post<{ payment: { status: string; receiptCode: string }; invoice: { status: string } }>(
      admin, `/payments/${initiated.payment.id}/confirm-vietqr`, { bankTransactionRef: `BANK-${suffix}` },
    );
    expect(confirmed.invoice.status).toBe('PAID');
    expect(confirmed.payment.status).toBe('SUCCESS');
    expect(confirmed.payment.receiptCode).toMatch(/^REC-/);
    const detail = await json<{ invoice: { status: string }; payments: Array<{ id: string; receiptCode: string }> }>(parent, `/invoices/${invoice!.id}`);
    expect(detail.invoice.status).toBe('PAID');
    expect(detail.payments.find((item) => item.id === initiated.payment.id)?.receiptCode).toBe(confirmed.payment.receiptCode);
  } finally {
    await Promise.all([admin.dispose(), parent.dispose()]);
  }
});
