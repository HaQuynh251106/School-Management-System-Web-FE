# Kịch bản demo và nghiệm thu cuối — School Management System Web

**Phiên bản tài liệu:** 2026-08-20
**Phạm vi:** Web FE + Backend nhánh QUANG-THAIs + PostgreSQL `sse_quangthai`
**Mục tiêu:** chạy một câu chuyện nghiệp vụ liên tục từ đầu năm học đến tổng kết năm, kiểm tra dữ liệu do một vai trò tạo ra có xuất hiện đúng, đủ và đúng quyền ở các vai trò liên quan.

> Đây là kịch bản nghiệm thu, không phải danh sách thao tác rời rạc. Một chức năng chỉ được đánh dấu **PASS** khi cả bước tạo/cập nhật và bước kiểm tra ở người nhận dữ liệu đều đạt. Không dùng số liệu mẫu trên giao diện để thay cho dữ liệu API hoặc dữ liệu trong cơ sở dữ liệu.

---

## 1. Quy tắc chạy buổi final test

1. Chạy trên bản sao/snapshot của database, không chạy các bước phát hành hóa đơn, hoàn tiền, xét lên lớp hoặc xóa người dùng trên dữ liệu production thật.
2. Mở ít nhất 4 cửa sổ trình duyệt hoặc 4 profile độc lập: Admin, Giáo viên, Học sinh, Phụ huynh. Không dùng chung phiên đăng nhập.
3. Mỗi dữ liệu tạo mới dùng tiền tố `FINAL-2026`, ví dụ `FINAL-2026-BT-TOAN-01`, để dễ tìm và dọn sau test.
4. Sau mỗi thao tác ghi dữ liệu, kiểm tra đồng thời:
   - thông báo thành công rõ ràng;
   - tải lại trang vẫn còn dữ liệu;
   - người nhận đúng quyền nhìn thấy;
   - người ngoài phạm vi không nhìn thấy hoặc nhận 403;
   - không có 401, 404, 5xx hay lỗi JavaScript bất ngờ;
   - không sinh bản ghi trùng khi bấm hai lần hoặc tải lại.
5. Ghi bằng chứng cho từng case: ảnh màn hình, tài khoản thực hiện, mã dữ liệu, thời gian, kết quả thực tế và lỗi nếu có.
6. Trạng thái dùng trong biên bản:
   - **PASS:** đúng toàn bộ điều kiện mong đợi.
   - **FAIL:** sai dữ liệu, sai quyền, mất dữ liệu, trùng dữ liệu hoặc lỗi hệ thống.
   - **BLOCKED:** thiếu cấu hình bên ngoài hoặc thiếu dữ liệu tiền đề; phải ghi rõ điều kiện chặn.
   - **N/A:** chức năng không thuộc bản Web hiện tại; không được dùng N/A để che lỗi.

---

## 2. Dữ liệu nền thực tế trước khi demo

Số liệu dưới đây lấy từ PostgreSQL `sse_quangthai` trước khi tạo dữ liệu `FINAL-2026`. Dashboard và báo cáo Web phải khớp các số này hoặc giải thích được bộ lọc khác nhau.

### 2.1. Người dùng và liên kết gia đình

| Nhóm | Số lượng hoạt động | Điều kiện kiểm tra |
|---|---:|---|
| Quản trị viên | 2 | Cả hai đăng nhập được và có quyền Admin |
| Giáo viên | 40 | Đủ mã giáo viên, email/điện thoại và chuyên môn |
| Học sinh | 900 | Mỗi khối 300 học sinh |
| Phụ huynh | 450 | Có 900 liên kết phụ huynh–học sinh |
| Tổng tài khoản | 1.392 | Không lấy số mock cũ `2,438` |

- 450/450 phụ huynh có con được liên kết.
- 900/900 học sinh có phụ huynh liên kết.
- Mỗi lớp hiện có 30 học sinh, sức chứa 45.

### 2.2. Năm học, khối, lớp, môn và phòng

| Dữ liệu | Giá trị nền |
|---|---|
| Năm học đang hoạt động | 2026–2027, từ 01/09/2026 đến 30/06/2027 |
| Học kỳ 1 | 01/09/2026 đến 31/01/2027 |
| Học kỳ 2 | 01/02/2027 đến 30/06/2027 |
| Khối | 3 khối: K10, K11, K12 |
| Lớp | 30 lớp; mỗi khối 10 lớp |
| Học sinh | 300 học sinh/khối; 30 học sinh/lớp |
| Môn học | 14 môn hoạt động |
| Phòng | 46 phòng: 34 thường, 7 thí nghiệm, 3 máy tính, 2 thể chất |
| Ngày nghỉ | 1 ngày nghỉ cấp trường |
| GVCN | 30/30 lớp đã được gán; 12 giáo viên khác nhau |
| Phân công bộ môn | 840 phân công: 420/HK; đủ cả 40 giáo viên |

**14 môn:** Toán, Ngữ văn, Tiếng Anh, Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý, Tin học, GDKT & PL, GDQP-AN, Giáo dục thể chất, Chào cờ, Sinh hoạt lớp.

### 2.3. Danh sách lớp và giáo viên chủ nhiệm

| Khối 10 | GVCN | Khối 11 | GVCN | Khối 12 | GVCN |
|---|---|---|---|---|---|
| 10A1 | Nguyễn Thị Mai An | 11A1 | Mai Phương Thảo | 12A1 | Nguyễn Đức Long |
| 10A2 | Trần Văn Huy | 11A2 | Lương Thanh Bình | 12A2 | Đinh Ngọc Sơn |
| 10A3 | Lê Thu Trang | 11A3 | Nguyễn Thị Mai An | 12A3 | Mai Phương Thảo |
| 10A4 | Phạm Quang Minh | 11A4 | Trần Văn Huy | 12A4 | Lương Thanh Bình |
| 10A5 | Đỗ Khánh Linh | 11A5 | Lê Thu Trang | 12A5 | Nguyễn Thị Mai An |
| 10A6 | Vũ Hoài Nam | 11A6 | Phạm Quang Minh | 12A6 | Trần Văn Huy |
| 10A7 | Bùi Thanh Hà | 11A7 | Đỗ Khánh Linh | 12A7 | Lê Thu Trang |
| 10A8 | Hoàng Gia Bảo | 11A8 | Vũ Hoài Nam | 12A8 | Phạm Quang Minh |
| 10A9 | Nguyễn Đức Long | 11A9 | Bùi Thanh Hà | 12A9 | Đỗ Khánh Linh |
| 10A10 | Đinh Ngọc Sơn | 11A10 | Hoàng Gia Bảo | 12A10 | Vũ Hoài Nam |

### 2.4. Dữ liệu nghiệp vụ đang có

| Phân hệ | Dữ liệu nền |
|---|---|
| Điểm danh | 80 bản ghi: 77 có mặt, 1 đi muộn, 1 vắng có phép, 1 vắng không phép |
| Điểm | 100.800 đầu điểm; 25.200 mỗi nhóm ORAL, 15M, MID, FINAL |
| Bài tập | Chưa có |
| CLB/đăng ký | Chưa có |
| Kỳ thi/lịch thi | Chưa có |
| Đợt thu/hóa đơn/thanh toán | Chưa có |
| Tin nhắn | 1 tin |
| Thông báo | 14 thông báo đã gửi |
| Audit quan trọng | 33 bản ghi |

### 2.5. Điều kiện chặn đang tồn tại

- Chưa có **kế hoạch giáo dục năm học đã công bố** trong `academic_training_plans`.
- Chưa có **thời khóa biểu canonical đã phát hành** trong `timetable_schedules`; dữ liệu `timetable_slots` cũ không thay thế được quy trình mới.
- Vì vậy, giáo viên mở TKB/tiến độ có thể nhận 409 “Khối chưa có kế hoạch giáo dục năm học đã công bố”. Đây là điều kiện tiền đề phải xử lý ở WEB-FINAL-05 trước khi chấm luồng TKB.
- Tổng số tiết phân công hiện tại là 1.020 tiết/tuần cho mỗi học kỳ. Khi sinh TKB phải đối chiếu với kết quả readiness/generation hiện tại; không dùng con số 790 của tài liệu cũ.

---

## 3. Tài khoản demo và trách nhiệm

> Các mật khẩu dưới đây chỉ dành cho môi trường local/test hiện tại. Không đưa vào production và không dùng lại cho tài khoản thật.

| Vai trò | Tài khoản | Mật khẩu | Dùng để demo |
|---|---|---|---|
| Admin chính | `admin` | `admin@123` | Cơ cấu, kế hoạch, TKB, khảo thí, người dùng, báo cáo |
| GV Toán lớp 11A1 | `demo.gv.math.02` | `teacher@123` | Điểm, bài tập, điểm danh môn Toán của `hs.minh` |
| GVCN 11A1 | `gv.gdcd` | `teacher@123` | GVCN của `hs.minh`, duyệt giải trình chuyên cần, nhận xét, liên lạc PH |
| GV kiểm tra độc lập | `gv.toan` | `teacher@123` | Dạy Toán 10A1 và các lớp khác; kiểm tra không được sửa dữ liệu 11A1 |
| Học sinh chính | `hs.minh` | `student@123` | Nguyễn Gia Minh, mã HS2601101, lớp 11A1 |
| Học sinh thứ hai | `hs.mai` | `student@123` | Nguyễn Thanh Mai, mã HS2601201, lớp 12A1 |
| Phụ huynh | `ph.nguyen` | `parent@123` | Nguyễn Văn Đức; con chính `hs.minh`, con thứ hai `hs.mai` |

**Lưu ý phân quyền:** không dùng `gv.toan` để sửa điểm/điểm danh của `hs.minh`, vì giáo viên này không được phân công lớp 11A1. Case đó chỉ dùng để kiểm tra hệ thống từ chối truy cập ngoài phạm vi.

---

## 4. Bản đồ vai trò: ai làm gì, ai kiểm tra kết quả

| Nghiệp vụ | Người tạo/cập nhật | Người nhận hoặc kiểm tra |
|---|---|---|
| Tài khoản, mã người dùng, khóa/mở, reset | Admin | Đúng người dùng đăng nhập/đổi mật khẩu |
| Năm học, khối, lớp, môn, phòng, phân lớp | Admin | Giáo viên, học sinh, phụ huynh thấy đúng phạm vi |
| Kế hoạch giáo dục | Admin tạo/duyệt/công bố; GV theo dõi tiến độ | GV, HS, PH xem bản đã công bố |
| Phân công bộ môn và TKB | Admin | GV thấy lịch dạy; HS/PH thấy lịch học |
| Tiến độ và lịch bù | GV đề xuất/cập nhật; Admin duyệt | GV, HS, PH thấy lịch đã phát hành |
| Điểm danh | GV bộ môn | HS và PH thấy trạng thái; GVCN duyệt giải trình |
| Điểm | GV đúng môn/lớp | HS, PH, báo cáo và audit cập nhật |
| Bài tập | GV | HS nộp; GV chấm; PH xem kết quả của con |
| Tin nhắn | GV/HS/PH trong quan hệ hợp lệ | Đúng người nhận, badge chưa đọc cập nhật |
| Thông báo | Admin toàn trường; GV theo lớp | Đúng vai trò/lớp nhận thông báo |
| Lịch thi | Admin lập và phát hành | GV thấy lịch coi thi; HS/PH thấy lịch thi |
| Điểm thi/phúc khảo | GV nhập/chấm; HS gửi yêu cầu; GV xử lý | HS/PH thấy kết quả cuối và lịch sử |
| CLB | Admin tạo; HS/PH đăng ký | Admin thấy đăng ký/sĩ số; tài chính nhận khoản thu nếu có |
| Đợt thu/hóa đơn | Admin | PH thanh toán; Admin tài chính đối soát |
| Hoàn tiền | Một Admin tạo yêu cầu | Admin còn lại duyệt; PH thấy trạng thái |
| Tổng kết/lên lớp | Admin và GVCN | HS/PH thấy kết quả đã công bố |

---

## 5. Chuẩn bị bằng chứng

Tạo bảng theo mẫu này trong biên bản final test:

| Case | Thời gian | Người thực hiện | Mã dữ liệu | Kết quả thực tế | Bằng chứng | Trạng thái |
|---|---|---|---|---|---|---|
| WEB-FINAL-01.1 |  |  |  |  |  | PASS/FAIL/BLOCKED |

Giữ tab Network mở khi chạy các luồng chính. Ghi request bị lỗi nhưng không đưa access token, refresh token, cookie, mật khẩu, file `.env` hoặc khóa dịch vụ vào ảnh/chứng cứ.

---

## 6. Kịch bản demo chi tiết

## WEB-FINAL-00 — Khởi động và kiểm tra môi trường

**Mục tiêu:** loại trừ lỗi môi trường trước khi kiểm tra nghiệp vụ.

1. Mở Web và gọi health của Backend.
2. Xác nhận Web đang trỏ đúng Backend QUANG-THAIs và đúng database `sse_quangthai`.
3. Đăng nhập `admin`, mở Tổng quan, Người dùng, Cơ cấu đào tạo, TKB, Tài chính.
4. Kiểm tra Network không còn endpoint 404; không có request nghiệp vụ dùng dữ liệu mock.
5. Tải lại trang bằng Ctrl/Cmd+R tại một route con; người dùng vẫn ở đúng màn hình, không mất phiên.

**PASS khi:** health 200, đăng nhập thành công, route tải lại được, không 5xx/404/console error và số liệu dashboard đến từ API thật.

## WEB-FINAL-01 — Đăng nhập, phiên làm việc và phân quyền

### 01.1. Đăng nhập đúng 4 vai trò

1. Đăng nhập lần lượt Admin, Giáo viên, Học sinh, Phụ huynh bằng các profile riêng.
2. Đối chiếu tên, vai trò, menu và trang đầu sau đăng nhập.
3. Đăng xuất rồi dùng nút Back; không được quay lại dữ liệu bảo vệ.
4. Đăng nhập sai mật khẩu; giao diện báo sai thông tin, không lộ tài khoản có tồn tại hay không.

### 01.2. Quên và đặt lại mật khẩu

1. Tại trang đăng nhập chọn Quên mật khẩu.
2. Gửi email của một tài khoản LOCAL test.
3. Mở deep link đặt lại mật khẩu, nhập hai mật khẩu không khớp rồi mật khẩu hợp lệ.
4. Token đã dùng, token hết hạn và token giả phải bị từ chối.
5. Đăng nhập bằng mật khẩu mới; phiên cũ phải bị thu hồi nếu contract quy định.

**Điều kiện:** nếu SMTP chưa cấu hình thì đánh BLOCKED cho việc nhận email thật, nhưng vẫn phải test API/token ở môi trường kiểm thử. Không được báo “đã gửi email” sai sự thật nếu dịch vụ mail tắt.

### 01.3. RBAC âm

- Giáo viên không mở được quản lý người dùng/tài chính.
- Học sinh không mở được sổ điểm của lớp hoặc dữ liệu học sinh khác.
- Phụ huynh chỉ truy cập hai con đã liên kết.
- `gv.toan` không được nhập điểm/điểm danh lớp 11A1.
- Đổi URL thủ công không làm lộ dữ liệu; kết quả phải 403/route không có quyền, không phải 500.

## WEB-FINAL-02 — Dashboard và số liệu đầu năm

**Actor:** Admin.

1. Mở Tổng quan và Báo cáo & thống kê.
2. Đối chiếu 1.392 tài khoản: 2 Admin, 40 GV, 900 HS, 450 PH.
3. Đối chiếu 3 khối, 30 lớp, 14 môn; mỗi khối 10 lớp và 300 học sinh.
4. Nhấn từng shortcut/KPI; phải đi tới màn chi tiết tương ứng và giữ bộ lọc hợp lý.
5. Kiểm tra biểu đồ điểm/chuyên cần lấy số hiện tại, không hiện chuỗi mẫu cũ.

**PASS khi:** số tổng và danh sách chi tiết khớp; shortcut không chỉ là thẻ trang trí; không xuất hiện số mock `2,438`.

## WEB-FINAL-03 — Quản lý người dùng và import Excel

### 03.1. Tạo tài khoản thủ công

**Actor:** Admin → Người dùng & phân quyền.

1. Tạo một giáo viên test với email và số điện thoại hợp lệ.
2. Không nhập mã GV; chọn môn chính từ 14 môn do trường quản lý.
3. Xác nhận hệ thống tự sinh username/userCode/teacherCode duy nhất.
4. Tạo đồng thời hoặc liên tiếp hai người gần giống nhau; mã vẫn không trùng.
5. Tạo thiếu email, thiếu số điện thoại, email sai định dạng hoặc môn không tồn tại; form/API phải từ chối.
6. Sửa hồ sơ, khóa, mở khóa, soft delete, khôi phục và reset mật khẩu.
7. Sau reset, người dùng đăng nhập và thực hiện đổi mật khẩu lần đầu nếu được yêu cầu.

### 03.2. Import Excel

1. Tải đúng template từ hệ thống, không tự tạo cột ngoài contract.
2. Chuẩn bị file nhỏ gồm 2 GV, 4 HS, 2 PH và quan hệ PH–HS; dùng email/phone duy nhất.
3. Upload để **preview**: kiểm tra số dòng hợp lệ/lỗi; database chưa được ghi.
4. Sửa một dòng email trùng, một dòng thiếu phone và preview lại.
5. Test cả chiến lược tất cả-hoặc-không và bỏ qua dòng lỗi nếu UI hỗ trợ.
6. Commit file hợp lệ; kiểm tra mã hệ thống tự sinh, người dùng đăng nhập được và PH thấy đúng con.
7. Commit lại cùng token/file: không được sinh dữ liệu trùng hoặc phải báo token đã sử dụng.

**PASS khi:** preview không ghi DB; commit đúng số dòng; mã không trùng; quan hệ PH–HS đúng; dòng lỗi có vị trí và lý do rõ ràng.

## WEB-FINAL-04 — Cơ cấu đào tạo và phân lớp

**Actor:** Admin → Cơ cấu đào tạo.

1. Kiểm tra năm 2026–2027 và hai học kỳ không chồng ngày, nằm trong năm học.
2. Kiểm tra đủ K10/K11/K12, 30 lớp, 14 môn, 46 phòng và 1 ngày nghỉ.
3. Mở từng lớp; sĩ số phải là 30, sức chứa 45, GVCN đúng bảng mục 2.3.
4. Tạo lớp thử `FINAL-2026-10A11`, gán GVCN và thử gán cùng GVCN cho hai lớp trái quy tắc; hệ thống phải chặn nếu chính sách không cho phép.
5. Preview phân lớp một nhóm học sinh test; kiểm tra sức chứa và danh sách khóa vị trí.
6. Chỉ khi preview hợp lệ mới Apply; tải lại vẫn đúng lớp.
7. Kiểm tra một học sinh không thể có hai lớp active trong cùng năm.
8. Học sinh và phụ huynh đăng nhập, xem Hồ sơ/Chọn học sinh và xác nhận tên lớp/GVCN mới.

**PASS khi:** không vượt sĩ số; không trùng enrollment; dữ liệu lớp truyền đúng sang HS/PH; thao tác lặp không nhân đôi.

## WEB-FINAL-05 — Chương trình và kế hoạch giáo dục năm học

**Actor:** Admin tạo và duyệt; Giáo viên/HS/PH xem.

1. Vào Cơ cấu đào tạo → Chương trình, Tổ hợp môn, Chuyên môn GV.
2. Kiểm tra chương trình khối 10/11/12, môn bắt buộc/tự chọn và năng lực giáo viên.
3. Vào Kế hoạch giáo dục năm học, tạo kế hoạch `FINAL-2026-K11-HK1`.
4. Thực hiện đủ 5 bước:
   1. Tổng quan và danh sách môn.
   2. Nội dung môn học, giai đoạn/chủ đề/mốc kiến thức.
   3. Phân phối theo tuần, số tiết và tuần đặc biệt.
   4. Kiểm tra, đánh giá và cửa sổ thi.
   5. Validate → gửi duyệt → duyệt → công bố.
5. Test thiếu một môn, tổng tiết sai, ngày ngoài học kỳ hoặc thiếu phân phối; Validate phải chặn và nêu đúng nguyên nhân.
6. Trước công bố, HS/PH không thấy bản nháp; sau công bố, GV/HS/PH thấy cùng phiên bản.
7. Sửa kế hoạch đã công bố phải qua revision/reopen đúng quy trình, không âm thầm thay dữ liệu đã dùng.

**PASS khi:** kế hoạch được công bố, có phiên bản/trạng thái rõ ràng và trở thành tiền đề hợp lệ cho xếp TKB. Case 409 ở TKB phải biến mất.

## WEB-FINAL-06 — Phân công giáo viên và xếp thời khóa biểu tự động

**Actor:** Admin → Xếp thời khóa biểu; GV/HS/PH kiểm tra.

### 06.1. Readiness và phân công

1. Chọn năm 2026–2027, HK1.
2. Kiểm tra 420 phân công học kỳ; tổng 1.020 tiết/tuần.
3. Kiểm tra phòng chuyên dụng phù hợp: Lý/Hóa/Sinh dùng LAB, Tin dùng COMPUTER, Thể chất dùng GYM khi được yêu cầu.
4. Thử phân cùng giáo viên cho hai lớp cùng thời điểm, phòng cho hai lớp, hoặc vượt tải; preview phải phát hiện xung đột.

### 06.2. Sinh lịch tự động

1. Mở Xếp lịch tự động → kiểm tra readiness.
2. Nếu còn lỗi kế hoạch/phân công/phòng/ngày nghỉ, không được Generate.
3. Generate bản nháp; ghi `scheduleId`, số slot và danh sách cảnh báo.
4. Kết quả dự kiến phải bằng nhu cầu readiness hiện tại; không hardcode 790. Với dữ liệu nền hiện tại, nhu cầu đầu vào là 1.020 tiết/tuần/HK.
5. Kiểm tra không trùng lớp, giáo viên, phòng; không xếp ngày nghỉ; đúng tiết/phòng chuyên dụng.
6. Kiểm tra cân bằng các lớp cùng khối/môn: số tiết bằng nhau và tiến độ không lệch quá ngưỡng quy định.
7. Chỉnh thủ công một slot, lưu lý do; validate lại.
8. Khi còn conflict nghiêm trọng, nút Publish phải bị khóa.
9. Publish revision hợp lệ.

### 06.3. Kiểm tra xuyên vai trò

1. GV `demo.gv.math.02` đang mở TKB phải thấy lịch dạy mới mà không đăng nhập lại; nếu realtime không đến thì refresh/resume phải cập nhật.
2. `hs.minh` thấy lịch học lớp 11A1, đúng môn/phòng/tiết.
3. `ph.nguyen` chọn `hs.minh`, thấy cùng lịch; đổi sang `hs.mai` phải ra lịch 12A1.
4. Bản draft không được lộ cho GV/HS/PH; revision cũ không còn được coi là hiện hành.

**PASS khi:** producer–consumer dùng cùng revision; lịch hợp lệ, không xung đột; dữ liệu mới hiển thị đúng scope ở ba vai trò.

## WEB-FINAL-07 — Tiến độ giảng dạy, cân bằng lớp và lịch bù

**Actor:** Giáo viên cập nhật; Admin duyệt; HS/PH kiểm tra lịch.

1. GV mở Kế hoạch giáo dục/Tiến độ, chọn slot đã dạy của 11A1, ghi số tiết và nội dung hoàn thành.
2. Ngày dạy phải đúng lịch/chu kỳ của slot, nằm trong học kỳ; không được ghi một slot thứ Hai vào thứ Ba tùy ý.
3. Admin mở Tiến độ giảng dạy, so các lớp cùng khối/môn.
4. Tạo tình huống một lớp chậm hơn >2 ngày hoặc >ngưỡng tiết; hệ thống phải cảnh báo rõ lớp/môn/mốc.
5. GV tạo đề xuất lịch bù; Admin duyệt.
6. Duyệt phải tạo slot/revision lịch bù thực, kiểm tra xung đột và phát hành; chỉ đổi trạng thái đề xuất là chưa đủ.
7. GV, HS và PH thấy slot bù; thông báo tới đúng đối tượng.

**PASS khi:** tiến độ có nguồn từ lịch đã phát hành, cân bằng được tính thống nhất và lịch bù đi trọn đến lịch người dùng.

## WEB-FINAL-08 — Điểm danh và xin phép vắng

**Actor:** GV Toán hoặc GVCN → HS/PH → GVCN duyệt.

### 08.1. Điểm danh buổi học

1. GV `demo.gv.math.02` mở Sổ điểm danh, chọn đúng slot Toán 11A1 và ngày hợp lệ.
2. Đặt `hs.minh` PRESENT, một HS khác LATE, một HS ABSENT_UNEXCUSED; thêm ghi chú phù hợp.
3. Lưu và tải lại; không tạo hai bản ghi cùng học sinh/slot/ngày.
4. Sửa sau thời hạn phải yêu cầu mở khóa và lý do; không cho sửa im lặng.
5. HS và PH đang mở Chuyên cần phải nhận dữ liệu mới; thống kê LATE không được tính sai thành vắng cả buổi.

### 08.2. Xin phép/giải trình vắng hiện có

1. Để `hs.minh` có một bản ghi LATE hoặc ABSENT_UNEXCUSED.
2. Đăng nhập HS hoặc PH, mở Chuyên cần → gửi lý do và minh chứng nếu UI cho phép.
3. GVCN `gv.gdcd` mở danh sách chờ duyệt, chỉ thấy yêu cầu của lớp chủ nhiệm.
4. Duyệt: trạng thái chuyển sang ABSENT_EXCUSED hoặc trạng thái tương ứng; HS/PH nhận kết quả.
5. Tạo yêu cầu khác rồi Reject; lý do từ chối hiển thị cho người gửi.
6. Người không phải GVCN không được duyệt.

**Khoảng trống cần ghi nhận:** Web hiện hỗ trợ **giải trình/xin phép trên một bản ghi LATE hoặc ABSENT_UNEXCUSED đã tồn tại**. Luồng phụ huynh gửi đơn xin nghỉ trước ngày học, rồi GVCN xác nhận trước khi điểm danh, chưa có màn Web độc lập; nếu yêu cầu nghiệp vụ là “xin nghỉ trước”, đánh FAIL/GAP chứ không mô tả nhầm là đã có.

## WEB-FINAL-09 — Cấu hình, thêm, sửa và công bố điểm

**Actor:** Admin cấu hình; GV nhập; HS/PH xem.

### 09.1. Cấu hình đầu điểm

1. Admin → Khảo thí & lịch thi → Cấu hình theo môn.
2. Tạo cấu hình Toán K11/HK1 gồm đúng số cột ORAL, 15M, MID, FINAL và trọng số.
3. Test tổng trọng số/số cột không hợp lệ; phải bị chặn.
4. Bản cấu hình áp dụng thống nhất cho bảng điểm GV, HS, PH và báo cáo.

### 09.2. Thêm điểm mới

1. Nếu muốn thêm cột 15 phút thứ hai, cấu hình assessmentIndex mới trước.
2. GV `demo.gv.math.02` mở Bảng điểm → 11A1 → Toán → HK1.
3. Nhập điểm mới cho `hs.minh`, ví dụ 8,25; điểm trong [0,10], cho phép số thập phân đúng quy tắc.
4. Tải lại; điểm nằm đúng cột/index, không ghi đè cột 15M trước đó.
5. HS và PH thấy điểm mới cùng môn/học kỳ; trung bình dùng công thức backend thống nhất.

### 09.3. Sửa điểm và audit

1. Sửa một điểm đang có, ví dụ 7,2 → 8,0.
2. Bắt buộc nhập lý do `FINAL-2026 - chỉnh theo biên bản chấm lại`.
3. Giao diện không được gửi thiếu `expectedVersion`; stale version phải trả 409 và yêu cầu tải lại.
4. Mở hai phiên GV: phiên A sửa thành công; phiên B lưu bản cũ phải bị chặn, không ghi đè.
5. Kiểm tra Lịch sử sửa điểm có before/after, lý do, người sửa, thời gian và version.
6. HS/PH đang mở tab thấy giá trị mới; chỉ gửi một thông báo cho một thay đổi thật.

### 09.4. Phạm vi và hiển thị

- `gv.toan` không sửa được điểm 11A1.
- `hs.minh` không xem được điểm học sinh khác.
- `ph.nguyen` xem đúng điểm theo con đang chọn; đổi con không trộn hai hồ sơ.
- Không ghi “đã công bố” nếu backend chưa có trạng thái publish điểm. Nếu điểm hiển thị ngay sau Save thì tài liệu/nhãn phải nói đúng là cập nhật tức thời.

**PASS khi:** giữ đúng assessmentIndex/version, không mất đầu điểm, lịch sử đầy đủ và dữ liệu đồng bộ GV–HS–PH–báo cáo.

## WEB-FINAL-10 — Bài tập, tệp riêng tư, nộp và chấm

**Actor:** GV Toán → HS → GV → PH.

1. GV tạo draft `FINAL-2026-BT-TOAN-01`, lớp 11A1, môn Toán, hạn nộp tương lai, mô tả và tệp đề.
2. Khi draft, HS/PH không thấy.
3. Publish: `hs.minh` thấy bài, nhận thông báo; PH thấy bài của đúng con.
4. HS mở chi tiết, tải tệp đề, upload JPG/PDF/DOCX hợp lệ và nộp.
5. Tệp rỗng, quá dung lượng hoặc sai loại phải bị chặn; người ngoài scope tải URL tệp phải 403.
6. GV thấy submission thật, tệp và thời điểm nộp; chấm 8,75 kèm nhận xét.
7. HS/PH thấy `GRADED`, điểm và nhận xét.
8. GV cho nộp lại; HS tạo attempt mới; lịch sử attempt cũ vẫn còn.
9. Close bài; nộp mới sau close phải bị chặn. Extend/Reopen nếu UI có phải cập nhật đúng hạn/trạng thái.
10. Nhắc hạn nộp chỉ gửi tới người chưa nộp, không gửi trùng cho người đã hoàn thành.

**PASS khi:** toàn bộ danh sách, chi tiết, tệp, submission, điểm và attempt đến từ API thật; không còn snackbar thành công giả.

## WEB-FINAL-11 — Trao đổi, thông báo và realtime

### 11.1. Chat đúng quan hệ

1. `ph.nguyen` nhắn GVCN `gv.gdcd`: `FINAL-2026 - Trao đổi tình hình Minh`.
2. GV đang mở Trao đổi thấy tin mới/badge, trả lời.
3. PH nhận trả lời; trạng thái đã đọc và unread count giảm đúng.
4. HS nhắn GV môn được phân công; ngoài quan hệ lớp/môn phải 403 hoặc không xuất hiện trong danh bạ.
5. Tải lịch sử nhiều trang không mất, trùng hoặc đảo thứ tự tin.
6. Ngắt mạng rồi kết nối lại; không nhân đôi sự kiện realtime.

### 11.2. Thông báo nhà trường/lớp

1. Admin gửi draft/preview thông báo `FINAL-2026 - Họp phụ huynh` tới PARENT hoặc lớp 11A1.
2. Kiểm tra số người nhận trước khi phát hành.
3. Publish; đúng phụ huynh nhận, GV/HS ngoài scope không nhận.
4. GV gửi thông báo tình hình lớp tới HS & PH lớp 11A1.
5. Người nhận mở chi tiết, đánh dấu đã đọc/đọc tất cả; badge cập nhật.
6. Admin kiểm tra Nhật ký gửi, retry thông báo FAILED và provider status; không retry trùng bản đã SENT.

## WEB-FINAL-12 — Khảo thí, lịch thi, điểm thi và phúc khảo

**Actor:** Admin → GV → HS/PH.

1. Admin tạo đợt thi `FINAL-2026-HK1`, ngày bắt đầu/kết thúc nằm trong cửa sổ kế hoạch.
2. Tạo version, đồng bộ môn thi từ kế hoạch; không nhập tùy ý môn ngoài chương trình.
3. Ghi lịch bận của một GV; tạo lịch tự động.
4. Kiểm tra ngày nghỉ, trùng môn/lớp/phòng/GV, sức chứa phòng và thời gian nghỉ giữa ca.
5. Mở tab Lịch thi, GV bận/nghỉ, Lịch sử phiên bản; sửa thủ công một ca rồi validate.
6. Generate lại với cùng idempotency key không tạo bản sao.
7. Publish version; bản nháp không lộ trước publish.
8. GV thấy ngày/giờ/phòng/nhiệm vụ coi thi; HS và PH thấy lịch thi đúng lớp/con.
9. GV nhập điểm thi kèm version; trước công bố kết quả HS/PH không được thấy nếu backend có lifecycle publish.
10. HS gửi yêu cầu phúc khảo; đúng GV xử lý, ghi kết quả và lý do; PH thấy điểm cuối/lịch sử.
11. Lock kỳ thi phải chặn chỉnh sửa thiếu điểm; recall/revision phải giữ lịch sử.

**PASS khi:** auto-plan tôn trọng lịch bận, publish đúng scope, kết quả/phúc khảo có version và audit.

## WEB-FINAL-13 — Câu lạc bộ/ngoại khóa

**Actor:** Admin tạo; HS/PH đăng ký.

1. Admin tạo `FINAL-2026-CLB-ROBOT`, lịch chiều thứ Tư, sức chứa 2, học phí 500.000đ.
2. `hs.minh` đăng ký; tải lại không tạo đăng ký trùng.
3. `ph.nguyen` chọn `hs.mai`, đăng ký cho con thứ hai; xác nhận đúng studentId.
4. Thử đăng ký người thứ ba; hệ thống đưa WAITLIST hoặc chặn hết chỗ theo contract, không vượt capacity.
5. Admin xem danh sách đăng ký, sĩ số và trạng thái.
6. Hủy đăng ký; chỗ trống và trạng thái người chờ cập nhật nếu có cơ chế waitlist.
7. Nếu đăng ký CLB có phí tự sinh invoice, kiểm tra đúng một invoice và chuyển sang luồng tài chính.

**Khoảng trống UI cần ghi nhận:** màn Admin Web hiện chủ yếu tạo CLB và xem danh sách đăng ký; nếu nghiệp vụ cần nút duyệt/từ chối/waitlist thủ công mà giao diện không có thì ghi GAP, không tự coi là PASS vì backend có endpoint.

## WEB-FINAL-14 — Đợt thu, hóa đơn, học phí, biên nhận và hoàn tiền

**Actor:** `admin` tạo và đối soát; `ph.nguyen` thanh toán; Admin xử lý hoàn tiền sau khi kiểm tra chứng từ.

### 14.1. Tạo đợt thu và hóa đơn

1. Admin → Tài chính nội bộ → Đợt thu.
2. Tạo `FINAL-2026-HK1-HOCPHI`, hạn nộp tương lai.
3. Thêm khoản học phí 1.000.000đ và khoản dịch vụ 200.000đ.
4. Chọn phạm vi lớp 11A1 hoặc riêng `hs.minh`; Preview trước khi Open.
5. Kiểm tra số học sinh, tổng tiền, miễn/giảm/điều chỉnh.
6. Open và Generate invoices; thao tác lặp không sinh hai hóa đơn cùng học sinh/khoản.
7. PH thấy hóa đơn của `hs.minh`; đổi sang `hs.mai` không được thấy hóa đơn 11A1.

### 14.2. Chuyển khoản MB/VietQR và biên lai

1. PH chọn Thanh toán → Chuyển khoản MB.
2. Kiểm tra VietQR, số tiền, tài khoản và nội dung có mã HS/hóa đơn.
3. Upload ảnh biên lai JPG/PNG ≤5MB, gửi xác nhận.
4. Hóa đơn ở trạng thái chờ đối soát, không tự chuyển PAID từ client.
5. Admin mở Biên lai, xem file; thiếu checkbox đối chiếu không được duyệt.
6. Test nhánh “Yêu cầu thanh toán lại” với lý do, PH thấy lý do và gửi lại.
7. Sau khi tiền thật/fixture hợp lệ, Admin xác nhận; PH tải lại thấy PAID/PARTIAL đúng số tiền.

### 14.3. Tiền mặt và cổng thanh toán

1. Admin test Thu tiền mặt cho một hóa đơn khác; xác nhận trạng thái và lịch sử.
2. VNPAY/MoMo chỉ đánh PASS nếu có merchant key, callback/IPN HTTPS và chữ ký được cấu hình thật.
3. Callback/IPN lặp phải idempotent; client không được tự gọi callback để giả lập thanh toán.

### 14.4. Biên nhận, đối soát và hoàn tiền

1. Mở Lịch sử giao dịch, tạo biên nhận; tải lại vẫn thấy receipt và đúng số tiền.
2. Chạy Đối soát theo ngày/phương thức/trạng thái; tổng gross, refund, net phải khớp chi tiết.
3. `admin` tạo yêu cầu hoàn một phần 100.000đ với lý do.
4. `admin` mở lại yêu cầu, kiểm tra hóa đơn, giao dịch và chứng từ hoàn tiền.
5. `admin` duyệt, nhập reference chuyển khoản, tích xác nhận tiền đã hoàn thực tế và kiểm tra audit.
6. PH thấy PARTIALLY_REFUNDED và lịch sử hoàn; hoàn phần còn lại chuyển REFUNDED.
7. Test Reject/Cancel với lý do; không hoàn vượt số đã thanh toán; trạng thái CANCELLED/REFUNDED là terminal.

**PASS khi:** invoice state machine đúng, không cộng tiền hai lần, proof/IPN idempotent, hoàn tiền có xác nhận + reference + audit và báo cáo doanh thu cập nhật.

## WEB-FINAL-15 — Báo cáo, bộ lọc và xuất tệp

**Actor:** Admin → Báo cáo & thống kê.

1. Kiểm tra Tổng quan hệ thống, Phổ điểm, Chuyên cần, Kết quả lên lớp, Báo cáo học thuật, Tài chính.
2. Dùng filter năm học, học kỳ, khối, lớp, môn, loại kho ản thu, trạng thái đã/chưa đóng và khoảng ngày.
3. Shortcut số liệu phải mở đúng danh sách đã lọc.
4. Đối chiếu mẫu:
   - điểm vừa sửa xuất hiện trong phổ điểm/summary;
   - điểm danh vừa tạo làm thay đổi đúng trạng thái;
   - hóa đơn vừa thanh toán/hoàn tiền cập nhật doanh thu, công nợ và net revenue.
5. Reset filter trở về trạng thái mặc định rõ ràng.
6. Xuất CSV/XLSX/PDF; mở file, kiểm tra tiêu đề, dấu tiếng Việt, filter, số dòng, tổng tiền và ngày.
7. Tài khoản không có quyền gọi export phải 403.

**PASS khi:** UI, export và database có cùng phạm vi/công thức; không có số liệu cứng hoặc tự tính khác nhau giữa màn.

## WEB-FINAL-16 — Audit log quan trọng

**Actor:** Admin → Lịch sử hệ thống.

1. Lọc theo phân hệ/hành động.
2. Xác nhận có log cho các thay đổi quan trọng vừa chạy:
   - tạo/sửa/khóa/khôi phục người dùng;
   - công bố kế hoạch/TKB/lịch thi;
   - sửa điểm và lý do;
   - điều chỉnh điểm danh/duyệt giải trình;
   - tạo/phát hành hóa đơn, xác nhận thanh toán;
   - yêu cầu/duyệt/từ chối hoàn tiền;
   - xét và công bố kết quả năm.
3. Mỗi log có actor, role, action, module, entity, thời gian và chi tiết đủ hiểu; dữ liệu nhạy cảm như mật khẩu/token không xuất hiện.
4. Đăng nhập/đăng xuất thông thường **không xuất hiện trong Audit nghiệp vụ** theo yêu cầu hiện tại. Nếu cần điều tra bảo mật, login history phải ở kênh security riêng, không làm nhiễu màn này.

**PASS khi:** audit tập trung vào mutation quan trọng, không chứa mật khẩu/token, không bị ngập bởi lịch sử login.

## WEB-FINAL-17 — Tổng kết năm, công bố kết quả và chuyển lớp

> Chạy cuối cùng và chỉ trên database snapshot vì có thể thay đổi hàng loạt hồ sơ.

**Actor:** GVCN rà soát; Admin tổng hợp/công bố/xét lên lớp.

1. GVCN 11A1 mở Tổng kết/Nhận xét, kiểm tra đủ điểm, chuyên cần và nhận xét cho `hs.minh`.
2. Admin chạy Year Summary Preview; thiếu điểm/nhận xét phải hiện blocker cụ thể, không tự chốt.
3. Hoàn thành blocker, chạy review; kiểm tra PROMOTED/RETAINED/GRADUATED/INCOMPLETE theo quy tắc.
4. Công bố kết quả năm; trước publish HS/PH không thấy kết quả nháp, sau publish thấy cùng kết quả.
5. Execute promotion cho nhóm test; học sinh chỉ có một enrollment ở năm mới.
6. Kiểm tra lớp mới/cũ, lịch sử chuyển lớp và số lượng mỗi nhóm.
7. Test Undo với lý do; dữ liệu quay lại đúng, không xóa lịch sử audit.

**PASS khi:** không chuyển lớp khi còn blocker; thao tác idempotent; HS/PH chỉ thấy bản đã công bố; undo an toàn và có audit.

## WEB-FINAL-18 — Kiểm tra giao diện, lỗi, phiên và realtime toàn hệ thống

Chạy sau các luồng trên cho cả 4 vai trò:

1. Desktop 1366×768 và mobile viewport 390×844: không tràn ngang, nút không bị che, chữ đủ tương phản.
2. Loading, empty, error và retry đều có nội dung người dùng hiểu; không hiện `DioException`, stack trace, endpoint, `expectedVersion` hay thông tin developer.
3. Dừng Backend: màn hình phải báo lỗi/empty đúng, tuyệt đối không chuyển sang dữ liệu mẫu.
4. Khởi động lại Backend: Retry/refresh phục hồi, không cần xóa local storage thủ công.
5. Đổi tài khoản A → logout → tài khoản B: không còn badge/SSE/dữ liệu của A.
6. Token hết hạn: refresh một lần; refresh thất bại thì về login, không tạo vòng lặp 401.
7. Double-click các nút Create/Publish/Pay/Submit: nút bị disable hoặc backend idempotent.
8. Các danh sách dài có pagination/filter, không mất/trùng bản ghi khi chuyển trang.
9. Mọi ngày/tiền/trạng thái hiển thị tiếng Việt nhất quán.

---

## 7. Ma trận liên thông bắt buộc

| ID | Producer | Hành động | Consumer phải thấy | Thời gian chấp nhận |
|---|---|---|---|---|
| LINK-01 | Admin | Cập nhật lớp/GVCN | HS, PH, đúng GVCN | Sau refresh hoặc realtime ≤5 giây |
| LINK-02 | Admin | Publish kế hoạch | GV, HS, PH | ≤5 giây/refresh |
| LINK-03 | Admin | Publish TKB | GV, HS, PH cùng revision | ≤5 giây/refresh |
| LINK-04 | GV | Duyệt lịch bù | Admin, GV, HS, PH có slot thật | Sau publish revision |
| LINK-05 | GV | Lưu điểm danh | HS, PH; báo cáo chuyên cần | ≤5 giây/refresh |
| LINK-06 | HS/PH | Gửi giải trình vắng | Đúng GVCN | ≤5 giây/refresh |
| LINK-07 | GV | Thêm/sửa điểm | HS, PH, summary, audit | ≤5 giây/refresh |
| LINK-08 | GV | Publish bài tập | HS, PH, notification | ≤5 giây/refresh |
| LINK-09 | HS | Nộp bài | Đúng GV thấy submission | ≤5 giây/refresh |
| LINK-10 | GV | Chấm bài | HS, PH thấy điểm/feedback | ≤5 giây/refresh |
| LINK-11 | Admin | Publish lịch thi | GV coi thi, HS/PH dự thi | ≤5 giây/refresh |
| LINK-12 | PH | Gửi biên lai | Admin thấy hàng chờ đối soát | ≤5 giây/refresh |
| LINK-13 | Admin | Xác nhận thanh toán | PH, invoice, report, receipt | ≤5 giây/refresh |
| LINK-14 | Admin | Tạo, kiểm tra và duyệt hoàn | PH, report, reconciliation | ≤5 giây/refresh |
| LINK-15 | Admin | Publish kết quả năm | HS, PH | ≤5 giây/refresh |

Không case nào trong LINK-01…15 được PASS nếu chỉ kiểm tra response thành công ở producer mà chưa đăng nhập consumer để xác nhận.

---

## 8. Các trường hợp âm bắt buộc

| Case | Kết quả mong đợi |
|---|---|
| Username/email/phone/mã hệ thống trùng | 400/409 rõ ràng; không tạo bản ghi nửa chừng |
| Học sinh vượt sức chứa lớp | Không apply phân lớp |
| GV/lớp/phòng trùng TKB | Không publish |
| Kế hoạch chưa công bố | Không generate/publish TKB; nêu đúng tiền đề thiếu |
| Ngày nghỉ | Không xếp tiết/thi/lịch bù |
| GV ngoài phân công sửa điểm/điểm danh | 403 |
| Sửa điểm thiếu lý do/version | 400; stale version 409 và reload |
| Nộp bài sau hạn/đã close | Bị chặn theo contract |
| Tệp ngoài scope | 403, kể cả có URL/fileId |
| PH truy cập học sinh không liên kết | 403 |
| Hóa đơn không thuộc con | 403 |
| Payment callback sai chữ ký/lặp | Từ chối hoặc idempotent, không cộng tiền |
| Hoàn quá số tiền đã thu | Bị chặn |
| Duyệt hoàn thiếu xác nhận hoặc reference bắt buộc | Bị chặn |
| Role không hợp lệ | Không fallback sang Admin |
| Backend dừng | Hiện lỗi thật, không dữ liệu mock |

---

## 9. Các phần còn thiếu hoặc phụ thuộc cấu hình

Những mục này phải được ghi riêng trong báo cáo final, không gộp thành lỗi ngẫu nhiên:

1. **Đơn xin nghỉ trước ngày học:** Web hiện chỉ có giải trình cho bản ghi vắng/đi muộn đã tồn tại. Cần bổ sung luồng tạo đơn trước ngày, PH xác nhận, GVCN duyệt và liên kết với điểm danh nếu đây là yêu cầu chính thức.
2. **SMTP/forgot password:** nhận email thật phụ thuộc SMTP, sender domain và deep-link production.
3. **SSO:** chưa coi là PASS nếu chưa có provider, callback và tài khoản tổ chức thật.
4. **VNPAY/MoMo production:** phụ thuộc merchant secret, HTTPS callback/IPN và cấu hình nhà cung cấp. Trong local nên demo MB/VietQR + biên lai hoặc tiền mặt.
5. **Kế hoạch giáo dục:** database hiện chưa có plan đã công bố, nên phải hoàn thành WEB-FINAL-05 trước TKB/tiến độ.
6. **CLB:** màn Admin chưa thể hiện đầy đủ thao tác duyệt/từ chối nếu nghiệp vụ yêu cầu approval thủ công.
7. **Publish điểm:** cần chốt rõ điểm hiển thị tức thời hay có draft/publish. Nhãn giao diện phải đúng contract, không ghi “đã công bố” nếu không có lifecycle.
8. **Lịch bù:** phải chứng minh duyệt proposal tạo slot/revision lịch thật; chỉ đổi trạng thái đề xuất là chưa hoàn chỉnh.
9. **Dữ liệu trống:** assignment, club, exam và finance ban đầu chưa có; buổi demo phải tạo theo thứ tự tài liệu này thay vì coi empty state là lỗi.

---

## 10. Thứ tự demo đề xuất trong 60–90 phút

| Thời lượng | Nội dung | Case |
|---:|---|---|
| 5 phút | Đăng nhập 4 role, dashboard và số liệu đầu năm | 00–02 |
| 10 phút | Người dùng, import, cơ cấu, lớp/GVCN | 03–04 |
| 15 phút | Kế hoạch giáo dục → auto TKB → 3 role nhận lịch | 05–07 |
| 10 phút | Điểm danh → giải trình → duyệt | 08 |
| 10 phút | Thêm/sửa điểm → HS/PH → audit/concurrency | 09 |
| 10 phút | Bài tập → nộp → chấm → PH xem | 10 |
| 5 phút | Chat và thông báo | 11 |
| 10 phút | Lịch thi tự động → coi thi → phúc khảo | 12 |
| 10 phút | CLB + đợt thu + VietQR/biên lai + đối soát | 13–14 |
| 5 phút | Báo cáo/export/audit/tổng kết | 15–17 |

Nếu chỉ có 60 phút, giữ nguyên các chuỗi LINK-03, LINK-05, LINK-07, LINK-08/09/10, LINK-11 và LINK-12/13; không bỏ bước kiểm tra consumer.

---

## 11. Checklist ký nghiệm thu

### P0 — Phải đạt trước khi cho người dùng dùng

- [ ] 4 vai trò đăng nhập/đăng xuất/refresh đúng; không còn 401/404 bất thường.
- [ ] Dashboard dùng dữ liệu thật và khớp danh sách.
- [ ] Admin hoàn thành, duyệt và công bố kế hoạch giáo dục.
- [ ] Auto TKB không conflict; publish tới GV/HS/PH cùng revision.
- [ ] Điểm danh đồng bộ tới HS/PH, có optimistic concurrency.
- [ ] Thêm/sửa điểm giữ đúng cột/index/version, có lý do và audit.
- [ ] Bài tập đi trọn draft → publish → submit → grade → resubmit.
- [ ] Phân quyền dữ liệu lớp/con/tệp/hóa đơn không rò rỉ.
- [ ] Đợt thu → invoice → thanh toán → đối soát không xử lý trùng.
- [ ] Không có mock API/fake success ở đường chạy production.

### P1 — Phải đạt để vận hành trơn tru

- [ ] Import preview/commit/idempotency và rollback đúng.
- [ ] Tiến độ/cân bằng/lịch bù đi đến calendar thật.
- [ ] Chat/notification/realtime reconnect không mất hoặc trùng sự kiện.
- [ ] Lịch thi tự động tôn trọng lịch bận/ngày nghỉ/phòng.
- [ ] Phúc khảo cập nhật điểm và lịch sử đúng.
- [ ] Báo cáo/filter/export khớp dữ liệu nghiệp vụ.
- [ ] Audit chỉ ghi thay đổi quan trọng, không ghi login thường xuyên.
- [ ] Error/empty/loading/copy thân thiện và responsive.

### P2 — Hoàn thiện trước bàn giao dài hạn

- [ ] Forgot-password email thật, SSO và payment gateway production được cấu hình/giám sát.
- [ ] CLB có đủ duyệt/từ chối/waitlist nếu PRD yêu cầu.
- [ ] Luồng xin nghỉ trước ngày học được bổ sung nếu nhà trường sử dụng.
- [ ] Tổng kết/công bố/lên lớp/undo được chạy trên bản sao dữ liệu và có backup.
- [ ] Runbook reset dữ liệu `FINAL-2026` và kế hoạch rollback được bàn giao.

---

## 12. Điều kiện kết luận Final Test

Dự án chỉ được kết luận **sẵn sàng demo/nghiệm thu** khi:

1. Toàn bộ P0 PASS, không có P0 BLOCKED.
2. Không có lỗi 5xx, mất dữ liệu, ghi đè phiên bản mới, xử lý thanh toán trùng hoặc rò rỉ dữ liệu chéo vai trò.
3. Mỗi luồng xuyên vai trò có bằng chứng ở cả producer và consumer.
4. Số liệu Dashboard/Báo cáo/Export khớp dữ liệu thật sau khi chạy scenario.
5. Các phụ thuộc SMTP/SSO/VNPAY/MoMo và các GAP còn lại được ghi rõ chủ sở hữu, mức ưu tiên và thời hạn; không mô tả là chức năng đã hoàn thành.
6. Database được snapshot trước test và có phương án dọn toàn bộ dữ liệu tiền tố `FINAL-2026` sau nghiệm thu.

**Kết luận buổi test:** `PASS / FAIL / PASS CÓ ĐIỀU KIỆN`
**Người chạy:**
**Người xác nhận:**
**Ngày giờ:**
**Danh sách lỗi còn mở:**
