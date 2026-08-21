# Developer Integration Runbook — Priority Flows 04, 05, 06, 08, 09, 10, 11, 14, 17

**Ngày kiểm tra:** 20/08/2026
**Đối tượng:** Backend/Web developer; không phải checklist UAT cho tester
**Môi trường đã kiểm tra:** Backend QUANG-THAIs, Web FE local, PostgreSQL `sse_quangthai`
**Quy ước dữ liệu test:** `DEVFINAL-<YYYYMMDD>-<FLOW>-<RUN_ID>`

## 1. Kết quả lần chạy 20/08/2026

| Flow | Kết quả | Bằng chứng chính | Việc DEV phải xử lý |
|---|---|---|---|
| 04 — Cơ cấu và phân lớp | **FAIL** | API đều 200 nhưng `classes.student_count`, `users.class_id` và enrollment ACTIVE không khớp | Chốt một nguồn canonical; sửa dữ liệu và constraint phân lớp |
| 05 — Kế hoạch giáo dục | **BLOCKED** | K10 chưa có plan; K11/K12 chỉ DRAFT; K11 validation có 51 error/85 warning | Hoàn thiện và publish/lock plan trước khi test Flow 06 |
| 06 — TKB tự động | **BLOCKED đúng nghiệp vụ** | readiness 200, `ready=false`, 3 lỗi `SOURCE_PLAN_MISSING`; không sinh lịch rác | Sau khi Flow 05 pass, chạy lại generate → validate → publish → consumer |
| 08 — Điểm danh/xin phép | **FAIL một invariant P0** | Luồng GV→PH→GV→HS/PH pass; GV ngoài scope bị 403; nhưng ngày không đúng thứ của slot vẫn được lưu 200 | Backend phải từ chối ngày không khớp `slot.dayOfWeek` bằng 400/422 |
| 09 — Điểm | **FAIL optimistic concurrency P0** | Sửa điểm, HS/PH và change log đều cập nhật; GV ngoài scope 403; nhưng version cũ/giả vẫn trả 200 | Thêm `@Version`, `expectedVersion`, trả 409 và bắt consumer reload |
| 10 — Bài tập | **PASS** | Draft ẩn; publish hiện; HS upload/nộp; GV thấy/chấm 8.75; PH thấy; xin nộp lại mở submission | MinIO là dependency bắt buộc; giữ test file scope và RBAC |
| 11 — Chat/thông báo | **PASS** | PH→GVCN, unread=1, đọc về 0, GV reply; PH→Admin bị 403 | Bổ sung automation reconnect/duplicate SSE nếu sửa realtime |
| 14 — Tài chính | **PASS** | Target 1 HS; sinh invoice idempotent; thu CASH; Admin chính duyệt refund sau xác minh; PH thấy công nợ 90.000 | Giữ xác nhận, reference, audit và idempotency |
| 17 — Tổng kết/chuyển lớp | **PASS phần guard; BLOCKED phần execute** | Preview 10A1/11A1/12A1 trả 200 và blocker chính xác; promotion preview `canExecute=false` | Chỉ execute trên DB snapshot sau khi năm nguồn CLOSED, kết quả đã finalized/published và năm đích ACTIVE |

### Automation đã chạy

- Backend targeted suite: **162/162 pass**, 0 fail/error/skip.
- Web `npm run check`: ESLint pass, Vitest **9/9 pass**, TypeScript/Vite production build pass.
- Live API cross-role đã chạy cho 08, 09, 10, 11, 14; test data đã được xóa sau khi đối chiếu.
- Điểm test đã được khôi phục về `4.0`, note `Canonical demo score`.
- PostgreSQL không còn bản ghi có marker `DEVFINAL-20260820`.

## 2. Thứ tự chạy bắt buộc

```text
04 integrity
  └─> 05 plan published/locked
        └─> 06 timetable generated/published

08 attendance ─┐
09 grades ──────┼─> 17 year review/finalize/promotion
                ┘

10 assignments ─> 11 notification/chat verification
14 finance (độc lập, nhưng cần 2 Admin)
```

Không chạy Flow 06 nếu 05 chưa pass. Không chạy `student-promotions/execute` nếu 17 preview còn blocker.

## 3. Chuẩn bị môi trường DEV

### 3.1. Dịch vụ

```bash
export BE_DIR="/Users/a1234/School Management System BE QUANG-THAIs"
export WEB_DIR="/Users/a1234/School Management System FE/School-Management-System-Web-FE"
export API_BASE="http://127.0.0.1:4000"
export WEB_BASE="http://127.0.0.1:5175"
export DB_NAME="sse_quangthai"
export RUN_ID="$(date +%H%M%S)"
export MARK="DEVFINAL-$(date +%Y%m%d)-$RUN_ID"

cd "$BE_DIR"
docker compose -f docker-compose.dev.yml up -d minio minio-init
SSE_DB_URL="jdbc:postgresql://127.0.0.1:5432/$DB_NAME" \
SSE_DB_USER="$(whoami)" \
mvn -pl services/app spring-boot:run

cd "$WEB_DIR"
npm ci
npm run dev -- --host 127.0.0.1 --port 5175
```

Không dùng mock server. Nếu dừng Backend hoặc MinIO, UI phải báo lỗi/empty state; không được tự hiển thị fixture.

### 3.2. Tài khoản local

| Biến | Username | Password | Phạm vi |
|---|---|---|---|
| `ADMIN_TOKEN` | `admin` | `admin@123` | Producer chính |
| `ADMIN_TOKEN` | `admin` | `admin@123` | Tạo, đối soát và xử lý refund |
| `MATH_TEACHER_TOKEN` | `demo.gv.math.02` | `teacher@123` | Toán 11A1 |
| `HOMEROOM_TOKEN` | `gv.gdcd` | `teacher@123` | GVCN 11A1 |
| `OUTSIDE_TEACHER_TOKEN` | `gv.toan` | `teacher@123` | RBAC âm |
| `STUDENT_TOKEN` | `hs.minh` | `student@123` | `u-s-minh`, 11A1 |
| `PARENT_TOKEN` | `ph.nguyen` | `parent@123` | PH của `u-s-minh` |

Chỉ dùng các mật khẩu này ở local/test. Không chép vào `.env`, commit hoặc production.

```bash
login() {
  curl -fsS -X POST "$API_BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"$2\"}" | jq -er .accessToken
}

export ADMIN_TOKEN="$(login admin admin@123)"
export APPROVER_TOKEN="$ADMIN_TOKEN"
export MATH_TEACHER_TOKEN="$(login demo.gv.math.02 teacher@123)"
export HOMEROOM_TOKEN="$(login gv.gdcd teacher@123)"
export OUTSIDE_TEACHER_TOKEN="$(login gv.toan teacher@123)"
export STUDENT_TOKEN="$(login hs.minh student@123)"
export PARENT_TOKEN="$(login ph.nguyen parent@123)"

api() {
  method="$1"; token="$2"; path="$3"; body="${4:-}"
  if [ -n "$body" ]; then
    curl -sS -w '\nHTTP=%{http_code}\n' -X "$method" "$API_BASE$path" \
      -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$body"
  else
    curl -sS -w '\nHTTP=%{http_code}\n' -X "$method" "$API_BASE$path" \
      -H "Authorization: Bearer $token"
  fi
}
```

## 4. Flow 04 — Cơ cấu đào tạo và phân lớp

### DEV-04.1 — API/catalog smoke

```bash
api GET "$ADMIN_TOKEN" /academicYears
api GET "$ADMIN_TOKEN" /semesters
api GET "$ADMIN_TOKEN" /grade-levels
api GET "$ADMIN_TOKEN" /classes
api GET "$ADMIN_TOKEN" /subjects
api GET "$ADMIN_TOKEN" /rooms
api GET "$ADMIN_TOKEN" /teaching-assignments
```

Mỗi request phải 200, JSON thật và không chứa fixture UI.

### DEV-04.2 — Integrity query bắt buộc

```bash
psql -d "$DB_NAME" -P pager=off -c "
SELECT c.code,
       c.student_count AS cached_count,
       COUNT(DISTINCT u.id) FILTER (WHERE u.role='STUDENT' AND u.status='ACTIVE') AS user_count,
       COUNT(DISTINCT e.student_id) FILTER (WHERE e.status='ACTIVE') AS enrollment_count,
       c.max_students
FROM classes c
LEFT JOIN users u ON u.class_id=c.id
LEFT JOIN student_class_enrollments e
  ON e.class_id=c.id AND e.academic_year_id=c.academic_year_id
GROUP BY c.id,c.code,c.student_count,c.max_students
ORDER BY c.code;"
```

**PASS:** `cached_count = user_count = enrollment_count` và không vượt `max_students` cho mọi lớp.
**FAIL hiện tại:** 10A1 là 45/50/45; 10A2 là 2/32/2; nhiều lớp khối 11/12 có enrollment 0.

### DEV-04.3 — RBAC và persistence

1. Trên DB snapshot, Admin tạo lớp test bằng `POST /classes`, gán GVCN bằng `PUT /classes/{id}/homeroom-teacher`.
2. GET lại `/classes/{id}` và `/classes/{id}/students`; restart Backend rồi GET lại.
3. Gán cùng GVCN cho hai lớp trong cùng năm phải bị 409.
4. Giáo viên gọi POST/PUT trên phải 403.
5. Dọn đúng class ID vừa tạo; không xóa theo tên gần giống.

## 5. Flow 05 — Kế hoạch giáo dục năm học

### DEV-05.1 — Preflight hiện trạng

```bash
api GET "$ADMIN_TOKEN" '/academic-training-plans?academicYearId=ay-2026&gradeLevel=10'
api GET "$ADMIN_TOKEN" '/academic-training-plans?academicYearId=ay-2026&gradeLevel=11'
api GET "$ADMIN_TOKEN" '/academic-training-plans?academicYearId=ay-2026&gradeLevel=12'
api GET "$ADMIN_TOKEN" '/academic-training-plans/plan-d3ee7fe748/validation'
```

Không gọi publish khi validation `valid=false`.

### DEV-05.2 — Contract lifecycle trên DB snapshot

```text
POST /academic-training-plans
POST /academic-training-plans/{id}/initialize-from-program
POST/PUT các subject, stage, curriculum, distribution, assessment, exam
GET  /academic-training-plans/{id}/validation
POST /academic-training-plans/{id}/submit
POST /academic-training-plans/{id}/review
POST /academic-training-plans/{id}/approve
POST /academic-training-plans/{id}/publish
POST /academic-training-plans/{id}/lock
```

**Assert:** lifecycle chỉ đi theo chiều hợp lệ; tổng stage/lesson/distribution khớp số tiết môn; có MID/FINAL; lớp có tổ hợp; GV đủ capability; version/history được giữ. Publish lặp không sinh bản mới.

## 6. Flow 06 — Phân công và TKB tự động

### DEV-06.1 — Readiness phải chặn dữ liệu thiếu

```bash
api GET "$ADMIN_TOKEN" \
  '/timetable/schedules/generation-readiness?academicYearId=ay-2026&semesterId=sm-2026-1'
api GET "$ADMIN_TOKEN" '/timetable/schedules?semesterId=sm-2026-1'
```

Hiện tại đúng là `ready=false`, 3 lỗi `SOURCE_PLAN_MISSING`, danh sách schedule rỗng. Không được gọi generate bằng cách bỏ qua readiness.

### DEV-06.2 — Happy path sau khi Flow 05 pass

```text
GET  generation-readiness                 -> ready=true
POST /timetable/schedules/generate        -> DRAFT schedule
GET  /timetable/schedules/{id}/validation -> valid=true
GET  /timetable/schedules/{id}/slots      -> không conflict class/teacher/room
POST /timetable/schedules/{id}/publish    -> PUBLISHED
GET  /me/timetable                        -> GV/HS đúng scope thấy revision mới
GET  /students/{studentId}/timetable      -> PH đúng quan hệ thấy revision mới
```

**Negative:** draft không lộ cho consumer; GV/phòng/lớp trùng giờ bị 409/422; publish lặp idempotent; user ngoài scope 403.

## 7. Flow 08 — Điểm danh và xin phép

Fixture live đã dùng:

- slot `g0-slot-3af07f1f05f31b90e3d4b668`, THU, tiết 3, lớp `c-11a1`;
- học sinh `u-s-minh`;
- ngày hợp lệ `2026-09-03`.

### DEV-08.1 — Cross-role

```text
GV Toán POST /attendance/bulk status=LATE, lateMinutes=10
PH      POST /attendance/{recordId}/excuse-requests
GVCN    GET  /attendance/excuse-requests?status=PENDING
GVCN    POST /attendance/excuse-requests/{id}/review status=APPROVED
HS/PH   GET  /students/u-s-minh/attendance -> ABSENT_EXCUSED
```

### DEV-08.2 — Negative bắt buộc

| Case | Expected |
|---|---|
| `gv.toan` ghi slot 11A1 | 403 |
| Ngày ngoài học kỳ/ngày nghỉ | 400/422 |
| Ngày không đúng `slot.dayOfWeek` | **400/422**; hiện đang sai vì trả 200 |
| `lateMinutes <= 0` với LATE | 400 |
| Duyệt request đã terminal lần hai | 409 |

DB assert: một record duy nhất theo `(slot_id,date,student_id)`; approval cập nhật đúng record và không tạo thông báo trùng.

## 8. Flow 09 — Nhập/sửa/công bố điểm

Fixture live: grade `g0-grade-3e8ffe200aa1acc617470cd7`, HS `u-s-minh`, Toán, HK1, ORAL #1.

```text
GV đúng scope GET  /grades?...                        -> lấy id + version
GV đúng scope POST /grades/bulk                       -> score mới + reason
HS            GET  /students/u-s-minh/grades          -> score mới
PH            GET  /students/u-s-minh/grades          -> score mới
GV/Admin      GET  /grades/{id}/change-logs           -> before/after/reason
GV ngoài scope POST /grades/bulk                       -> 403
Client cũ     POST /grades/bulk expectedVersion cũ    -> 409
```

**P0 hiện tại:** response không có `version`; payload không bắt `expectedVersion`; `expectedVersion=999` vẫn 200. Chưa được chấm PASS cho đến khi optimistic concurrency hoạt động và UI reload sau 409.

Sau test phải khôi phục score/note ban đầu bằng API và lưu change log với reason `...-RESTORE`; sau đó xóa log/notification test trên DB snapshot.

## 9. Flow 10 — Bài tập và file riêng tư

MinIO phải `Up` trước khi chạy:

```bash
docker ps --format '{{.Names}} {{.Status}}' | grep sse-minio
```

```text
GV upload /files scope=ASSIGNMENT
GV POST /assignments                         -> DRAFT
HS GET /me/assignments                       -> không thấy draft
GV POST /assignments/{id}/publish
HS GET /me/assignments                       -> thấy assignment
HS upload /files scope=SUBMISSION
HS POST /assignments/{id}/submit
GV GET /assignments/{id}/submissions
GV POST /submissions/{id}/grade              -> 8.75 + feedback
PH GET /me/children/u-s-minh/submissions     -> thấy GRADED 8.75
GV POST /submissions/{id}/request-resubmission
GET /submissions/{id}/versions               -> giữ attempt cũ
```

**Negative:** HS khác tải file riêng tư 403; draft ẩn; nộp sau close 409; grade ngoài scope 403; retry submit không tạo hai attempt cùng version.

## 10. Flow 11 — Chat, unread và thông báo

```text
PH GET  /chat/contacts                         -> chỉ người có quan hệ
PH POST /chat/messages recipientId=u-t-civic   -> message unread
GV GET  /chat/threads                          -> unread tăng 1
GV GET  /chat/messages?withUserId=u-p-nguyen   -> message read=true
GV POST /chat/messages recipientId=u-p-nguyen  -> reply
PH GET  conversation                           -> thấy reply
PH POST message tới u-admin                    -> 403
```

Kiểm tra đồng thời `/notifications/unread-count`, mark-read và SSE reconnect. Một event ID chỉ được apply một lần sau reconnect; không duplicate message/badge.

## 11. Flow 14 — Đợt thu, hóa đơn, thanh toán, refund

### DEV-14.1 — Chuỗi API chuẩn

```text
Admin POST /fee-periods targetType=STUDENT,targetIds=[u-s-minh]
Admin POST /fee-periods/{id}/items amount=100000
Admin GET  /fee-periods/{id}/preview            -> targeted=1,newInvoice=1
Admin POST /fee-periods/{id}/open
Admin POST /fee-periods/{id}/generate-invoices  -> created=1
Admin POST generate-invoices lần hai             -> []
PH    GET  /invoices?studentId=u-s-minh          -> thấy invoice
PH    POST /payments method=CASH                 -> 403
Admin POST /payments method=CASH
Admin POST /payments/{id}/cash-confirm           -> payment SUCCESS, invoice PAID
Admin POST /payments/{id}/refunds amount=10000
Cùng Admin POST /payment-refunds/{id}/approve    -> 409
Admin chính POST approve method=CASH sau xác minh -> COMPLETED
PH GET invoices                                  -> paidAmount=90000,status=PARTIAL
```

DB assert:

```sql
SELECT i.id,i.status,i.total_amount,i.paid_amount,
       p.status AS payment_status,r.status AS refund_status,r.amount
FROM invoices i
JOIN payments p ON p.invoice_id=i.id
LEFT JOIN payment_refunds r ON r.payment_id=p.id
WHERE i.fee_period_id=:fee_period_id;
```

Không giả lập callback gateway từ client. IPN/callback chỉ gateway → Backend và phải idempotent.

## 12. Flow 17 — Tổng kết, công bố và chuyển lớp

### DEV-17.1 — Preview không ghi dữ liệu

```bash
api GET "$ADMIN_TOKEN" \
  '/academic-year-summaries/preview?academicYearId=ay-2026&classId=c-10a1'
api GET "$ADMIN_TOKEN" \
  '/academic-year-summaries/preview?academicYearId=ay-2026&classId=c-11a1'
api POST "$ADMIN_TOKEN" /student-promotions/preview \
  '{"sourceAcademicYearId":"ay-2026","targetAcademicYearId":"ay-aecee4b374","sourceClassId":"c-10a1","placements":[]}'
```

Hiện tại preview phải trả blocker, không phải 5xx:

- năm nguồn chưa đóng;
- lớp chưa có kết quả tổng kết;
- thiếu điểm/chuyên cần, hạnh kiểm, decision/final result;
- năm đích chưa ACTIVE.

Thiếu query param `classId` phải trả 400 rõ ràng; không chấp nhận generic 500.

### DEV-17.2 — Mutation chỉ chạy trên snapshot

```text
1. Hoàn tất điểm/chuyên cần và decision từng HS.
2. POST /academic-year-summaries/{year}/classes/{class}/finalize confirmed=true.
3. Publish year result; HS/PH thấy đúng bản công bố.
4. Đóng năm nguồn và kích hoạt năm đích.
5. POST /student-promotions/preview -> canExecute=true.
6. POST /student-promotions/execute confirmed=true.
7. GET /student-promotions/enrollments -> mỗi HS đúng một enrollment ACTIVE.
8. Retry execute -> không tạo enrollment trùng.
9. POST /student-promotions/undo với reason trên snapshot; kiểm tra khôi phục.
```

Không execute/undo trên database dùng để demo chung.

## 13. Cleanup dữ liệu test

### 13.1. Quy tắc

1. Lưu toàn bộ ID từ response khi tạo dữ liệu.
2. Xóa child trước parent: versions/request → submissions → assignments; refund/receipt → payment → invoice → fee item → fee period.
3. Xóa object MinIO bằng đúng `file_key`, rồi mới xóa `stored_files`.
4. Không dùng `LIKE '%DEVFINAL%'` trên production. Cleanup theo ID trong DB snapshot.
5. Khôi phục entity gốc trước khi xóa change log test.

### 13.2. Post-clean verification

```bash
psql -d "$DB_NAME" -P pager=off -c "
SELECT 'attendance' kind,count(*) FROM attendance_records WHERE note LIKE '$MARK%'
UNION ALL SELECT 'grade_log',count(*) FROM grade_change_logs WHERE reason LIKE '$MARK%'
UNION ALL SELECT 'chat',count(*) FROM chat_messages WHERE body LIKE '$MARK%'
UNION ALL SELECT 'assignment',count(*) FROM assignments WHERE title LIKE '$MARK%'
UNION ALL SELECT 'file',count(*) FROM stored_files WHERE original_name LIKE '$MARK%'
UNION ALL SELECT 'fee',count(*) FROM fee_periods WHERE code LIKE '$MARK%';"
```

Tất cả count phải bằng 0. Chạy lại smoke GET cho 4 role để chắc cleanup không xóa fixture nền.

## 14. Release gate cho chín flow ưu tiên

Không ghi “DONE” nếu thiếu một trong các điều kiện sau:

- unit/integration test không skip;
- producer API ghi thành công và restart vẫn đọc được;
- consumer đúng role thấy cùng entity/version;
- user ngoài scope nhận 403;
- request lặp không tạo trùng;
- update cạnh tranh trả 409, không last-write-wins im lặng;
- Web không dùng mock/fallback;
- DB invariant pass;
- test artifacts được cleanup và fixture gốc được khôi phục.

### P0 cần sửa trước lượt test tiếp theo

1. Đồng bộ `classes.student_count`, `users.class_id`, `student_class_enrollments`; thêm constraint một ACTIVE enrollment/học sinh/năm. **Đã xử lý cho dữ liệu hiện tại; cần giữ case hồi quy DEV-P0-04.5 bên dưới.**
2. Hoàn thiện plan K10–K12, validation sạch, publish/lock để mở Flow 06. **Đã xử lý và đã sinh lịch thật cho K10; cần giữ case hồi quy DEV-P0-05/06 bên dưới.**
3. Attendance validate ngày thực tế với `slot.dayOfWeek`.
4. Grade thêm optimistic version và 409 conflict.
5. Missing required query param phải trả 400 có mã lỗi, không generic 500.

## 15. Retest P0 WEB-FINAL-04/05/06 — dành cho DEV

Mốc kiểm tra: 20/08/2026. Không dùng dữ liệu mock. Mỗi case phải quan sát đồng thời UI, HTTP status/response và trạng thái DB sau reload.

### DEV-P0-04.1 — Kích hoạt năm học mới không báo trùng giả

Tiền điều kiện: đang có đúng một năm `ACTIVE`, tạo thêm một năm `PLANNED` có mã khác.

1. Admin → **Cơ cấu đào tạo → Năm học**.
2. Tạo năm mới, kiểm tra hệ thống tự sinh đúng HK1/HK2.
3. Bấm **Kích hoạt** đúng một lần.
4. PASS khi request trả 200, năm mới thành `ACTIVE`, năm cũ không còn `ACTIVE`, không có thông báo “dữ liệu bị trùng”.
5. Reload trang và query DB: chỉ có đúng một năm `ACTIVE`.

```sql
SELECT status, count(*) FROM academic_years GROUP BY status;
SELECT id, code, status FROM academic_years ORDER BY start_date DESC;
```

Case cạnh tranh: gửi hai request kích hoạt gần đồng thời; chỉ một năm được `ACTIVE`, request còn lại trả conflict có nội dung rõ ràng, không 500.

### DEV-P0-04.2 — Sĩ số lớp và sức chứa phòng không cố định 45

1. Admin → **Cơ cấu đào tạo → Phòng học**.
2. Tạo phòng test với sức chứa 38; reload phải vẫn là 38.
3. Sửa sức chứa lên 42 bằng ô **Sức chứa phòng ...**; reload phải vẫn là 42.
4. Sang **Lớp & phân lớp**, tạo lớp có sĩ số tối đa 40 và chọn phòng 42 chỗ.
5. Sửa sĩ số tối đa của lớp bằng ô **Sĩ số tối đa lớp ...**; reload phải giữ giá trị mới.
6. PASS khi hệ thống từ chối gán phòng nhỏ hơn sĩ số tối đa hoặc giảm sĩ số tối đa xuống dưới sĩ số hiện tại bằng 400/409 có thông báo rõ; không tự ép về 45.

### DEV-P0-04.3 — Đổi GVCN không còn 500

1. Chọn một lớp và một giáo viên chưa chủ nhiệm lớp khác trong cùng năm.
2. Gán giáo viên đó làm GVCN; request phải trả 200 và reload giữ đúng giáo viên.
3. Danh sách chọn phải vô hiệu hóa giáo viên đã chủ nhiệm lớp khác và ghi rõ tên lớp đang chủ nhiệm.
4. Cố tình gọi API với giáo viên đã có lớp: phải trả conflict nghiệp vụ, tuyệt đối không 500.
5. Query DB bảo đảm một giáo viên không chủ nhiệm hai lớp trong cùng năm.

```sql
SELECT academic_year_id, homeroom_teacher_id, count(*)
FROM classes
WHERE homeroom_teacher_id IS NOT NULL
GROUP BY academic_year_id, homeroom_teacher_id
HAVING count(*) > 1;
```

Kết quả PASS phải là 0 dòng.

### DEV-P0-04.4 — Hai học sinh mẫu và hồ sơ API thật

1. Tìm `HS2601101` và `HS2601201` trong Admin; PASS khi cả hai tồn tại.
2. `HS2601101` phải thuộc `11A1`, `HS2601201` phải thuộc `12A1` trong năm đang hoạt động.
3. Đăng nhập `hs.minh`, mở **Hồ sơ cá nhân**.
4. PASS khi mã HS/lớp/email/điện thoại lấy từ `/me`; trường chưa có dữ liệu hiển thị **Chưa cập nhật**, không hiện sample hardcode.
5. Admin cập nhật một trường hồ sơ, đăng nhập lại học sinh và xác nhận API/DB/UI cùng một giá trị.

### DEV-P0-04.5 — Xem trước tổng kết chọn được lớp

1. Admin → **Báo cáo & thống kê → Xem trước tổng kết học kỳ**.
2. Chọn năm đang hoạt động và HK1/HK2.
3. PASS khi combobox lớp có đủ 30 lớp `10A1...12A10`.
4. Chọn `11A1`; preview phải đọc được danh sách hiện tại, trong đó có `HS2601101`.
5. Sang **Xét và chốt kết quả năm học**; danh sách lớp cũng phải có đủ 30 lớp.
6. Preview không được ghi/khóa dữ liệu. Thiếu điều kiện chốt phải trả blocker rõ ràng, không 500.

### DEV-P0-05.1 — Hiểu đúng HK1/HK2/Cả năm

1. Admin → **Cơ cấu đào tạo → Chương trình**.
2. UI phải giải thích: HK1/HK2 là số tiết của từng môn trong từng học kỳ; `Cả năm = HK1 + HK2`.
3. Khi sửa HK1 hoặc HK2, Cả năm tự tính lại; không coi 35 là một “quỹ tiết chung” để trừ giữa Toán và Ngữ văn.
4. Tổng khối ở đầu trang phải bằng tổng toàn bộ môn và đổi theo dữ liệu vừa lưu.

### DEV-P0-05.2 — Chương trình nháp có thể sửa/xóa và tự cấu hình

1. Tạo chương trình mới; chương trình phải xuất hiện ngay trong selector với nhãn **Bản nháp**.
2. Chọn K10/K11/K12 và bấm **Tự động cấu hình K...** hoặc **Tự động cấu hình cả 3 khối**.
3. PASS khi hệ thống thêm cấu hình chuẩn còn thiếu nhưng không nhân đôi môn đã có.
4. Ở chương trình nháp, mỗi môn có nút **Xóa khỏi chương trình nháp**; xóa nhầm rồi tự cấu hình lại phải khôi phục đúng một dòng.
5. Ở chương trình đang áp dụng, không cho xóa trực tiếp để tránh phá kế hoạch đã công bố.

### DEV-P0-05.3 — Đồng bộ chương trình sang kế hoạch và Admin công bố trực tiếp

1. Mở **Kế hoạch giáo dục năm học**; selector phải thấy cả chương trình nháp và đang áp dụng. Chương trình nháp ghi rõ **cần áp dụng trước**.
2. Áp dụng chương trình đã đủ cấu hình K10/K11/K12.
3. Tạo/điều chỉnh kế hoạch cho từng khối và đồng bộ từ chương trình.
4. PASS khi không còn lỗi “chưa cấu hình môn và số tiết cho khối 11”; số tiết HK1/HK2/Cả năm khớp nguồn chương trình.
5. Bước 5 với Admin phải ghi **Kiểm tra và công bố**. Kế hoạch hợp lệ được công bố trực tiếp, không tạo yêu cầu để một role khác duyệt.
6. Cảnh báo tư vấn được hiển thị riêng; chỉ lỗi validation mới chặn công bố.

### DEV-P0-06.1 — Tự chuẩn hóa nguồn lực trước khi xếp lịch

1. Admin → **Cơ cấu đào tạo → Chuyên môn GV**.
2. Chạy cấu hình tự động; kiểm tra capability theo môn, GVCN bị trùng và phân công bộ môn được cân lại.
3. Admin → **Xếp thời khóa biểu → Phân công bộ môn**.
4. PASS khi có đủ danh sách lớp/môn/giáo viên, giáo viên không bị trùng GVCN và tải dạy hiển thị từ API thật.
5. Cảnh báo thiếu định biên chỉ là khuyến nghị nếu readiness vẫn `ready=true`; UI phải ghi **Cảnh báo định biên cần cân đối**, không ghi rằng bộ giải bị chặn.

### DEV-P0-06.2 — Sinh lịch tự động thật

1. Mở **Xếp lịch tự động**, chọn HK1 và **Khối 10** để smoke test nhanh.
2. Bấm **Kiểm tra lại**; PASS khi status ghi sẵn sàng và không có lỗi blocking.
3. Đặt tên có marker DEV, chọn thời gian giải 30 giây, bấm **Tạo lịch tự động**.
4. PASS khi tạo được bản `DRAFT`, `hard score = 0`, validation `valid=true`, đủ `260/260` tiết K10.
5. Kiểm tra không trùng lớp, giáo viên, phòng; số tiết/ngày không vượt cấu hình; lịch ngoài khối đang xếp không bị thay đổi.
6. Các cảnh báo phân bố môn/khoảng trống giáo viên là soft constraint, không được báo thành lỗi blocking.
7. Xóa bản nháp DEV sau khi đối chiếu; không publish lên dữ liệu demo chung.

### Bằng chứng tự động tại mốc này

- Backend: `mvn test` — **212 pass, 0 fail, 0 error, 0 skip**; 9 module build thành công.
- Web: `npm run check` — ESLint sạch, **9/9 test pass**, TypeScript và Vite production build thành công.
- Browser smoke: năm học/lớp/phòng/GVCN; chương trình nháp/tự cấu hình/xóa; kế hoạch có 30 lớp; hồ sơ `HS2601101`; readiness TKB đều đã quan sát từ API thật.
- Backend live generation: K10 tạo đủ **260/260 tiết**, `0hard`, validation hợp lệ; bản nháp kiểm thử đã được xóa.
