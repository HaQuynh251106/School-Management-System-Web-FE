# Bộ dữ liệu và kịch bản thao tác Web sẵn dùng — UAT31

Tài liệu này là phần thực hành đi kèm [Cẩm nang vận hành Web cho người mới](./WEB_BEGINNER_OPERATION_PLAYBOOK_2026-08-21.md). Người kiểm thử không cần tự nghĩ dữ liệu: hãy nhập đúng giá trị, đúng thứ tự và đối chiếu kết quả ở từng bước.

Phạm vi: WEB-FINAL-04, 05, 06, 08, 09, 10, 11, 14 và 17.

**Đã đối chiếu ngày 21/08/2026:** tài khoản, quan hệ Phụ huynh–Học sinh, GVCN 11A2, điểm Toán mẫu và tên tab được kiểm tra trên Backend/Web local. Hệ thống có đúng bốn vai trò; Admin chính thực hiện cả duyệt biên lai, đối soát và hoàn tiền.

## 1. Quy tắc an toàn trước khi bắt đầu

- Chỉ dùng bộ dữ liệu này trên môi trường local/UAT hoặc database có snapshot.
- Mọi dữ liệu mới đều dùng tiền tố `UAT31` để tìm và dọn dễ dàng.
- Không dùng lớp `10A1` và `10A2` để kiểm thử sức chứa. Dữ liệu hiện tại của hai lớp này đã vượt sức chứa do lần import trước.
- Không kích hoạt năm `2031-2032`, áp dụng chương trình `UAT31-GDPT` hoặc thực hiện chuyển lớp cuối năm trên database dùng chung nếu chưa có snapshot.
- Không chạy lại file import cũ 100 học sinh vì các mã/tài khoản đó đã được dùng.
- Sau mỗi thao tác tạo/sửa, tải lại trang và tìm theo `UAT31`. Chỉ ghi **Đạt** khi dữ liệu vẫn còn đúng sau khi tải lại.

### Chọn đúng chế độ kiểm thử

| Chế độ | Được làm | Không được làm |
|---|---|---|
| **SAFE — database dùng chung** | Đăng nhập, tạo dữ liệu nháp UAT31, kiểm tra CRUD, điểm/bài tập/tin nhắn giá trị nhỏ, xem trước tổng kết | Không kích hoạt 2031-2032, không áp dụng UAT31-GDPT, không phát hành TKB 2031, không chuyển lớp |
| **FULL — database UAT có snapshot** | Thực hiện toàn bộ chuỗi kích hoạt năm → công bố kế hoạch → TKB → tài chính → dọn dữ liệu | Không chạy nếu chưa biết cách khôi phục snapshot |

Các mục được ghi **FULL** phải bỏ qua khi đang ở chế độ SAFE. Không trộn năm 2031-2032 với vận hành hằng ngày của lớp 11A2 năm 2026-2027.

## 2. Tài khoản đã có để kiểm thử

Các tài khoản dưới đây đã được đối chiếu với backend local. Mật khẩu chỉ dùng cho môi trường kiểm thử, không dùng trên production.

| Vai trò | Tài khoản | Mật khẩu | Tên hiển thị | Dùng để kiểm thử |
|---|---|---|---|---|
| Admin | `admin` | `admin@123` | School Administrator | Tạo cơ cấu, kế hoạch, TKB, đợt thu, đối soát, hoàn tiền, tổng kết |
| Giáo viên Toán | `gv.toan` | `teacher@123` | Nguyen Thi Mai An | Phân công Toán, điểm danh, nhập điểm, bài tập |
| Giáo viên dự phòng | `demo.gv.math.02` | `teacher@123` | Demo Teacher MATH 2 | Thử đổi GVCN và phân công |
| Giáo viên GDCD | `gv.gdcd` | `teacher@123` | Mai Phuong Thao | Kiểm tra giới hạn phạm vi giáo viên |
| GVCN lớp 11A2 | `gv.gdqp` | `teacher@123` | Luong Thanh Binh | Duyệt đơn xin phép, nhận tin nhắn phụ huynh, rà soát cuối năm |
| Học sinh 11A1 | `hs.minh` | `student@123` | Nguyen Gia Minh — `HS2601101` | Kiểm tra hồ sơ, TKB và luồng học sinh |
| Học sinh 11A2 | `hs.thao` | `student@123` | Vu Phuong Thao — `HS2601106` | Kiểm tra điểm, bài tập, điểm danh |
| Phụ huynh của Minh | `ph.nguyen` | `parent@123` | Nguyen Van Duc | Có hai con `u-s-minh`, `u-s-mai` |
| Phụ huynh của Thảo | `ph.vu` | `parent@123` | Vu Thanh Van | Có hai con `u-s-thao`, `u-s-han` |

### Kiểm tra đăng nhập trước khi tạo dữ liệu

1. Đăng nhập `admin`, xác nhận vào được trang Tổng quan và không có lỗi 401/404.
2. Đăng xuất, đăng nhập `gv.toan`, xác nhận vào đúng giao diện Giáo viên.
3. Đăng xuất, đăng nhập `hs.thao`, xác nhận hồ sơ hiển thị tên thật; trường chưa có dữ liệu phải ghi **Chưa cập nhật** hoặc `—`, không được hiện dữ liệu minh họa.
4. Đăng xuất, đăng nhập `ph.vu`, chọn đúng con **Vu Phuong Thao**.
5. Đăng xuất, đăng nhập `gv.gdqp`, xác nhận thấy lớp chủ nhiệm 11A2.
6. Nếu một tài khoản sai vai trò, dừng kiểm thử và không tạo thêm dữ liệu để bù.

## 3. Bản đồ tab và thứ tự vận hành

| Thứ tự | Vai trò | Tab/chức năng | Kết quả bàn giao |
|---:|---|---|---|
| 1 | Admin | Cơ cấu đào tạo → Năm học | Có năm 2031-2032 và HK1/HK2 |
| 2 | Admin | Cơ cấu đào tạo → Phòng học, Môn học | Có phòng, môn và sức chứa đúng |
| 3 | Admin | Cơ cấu đào tạo → Lớp học | Có lớp UAT31, GVCN và học sinh |
| 4 | Admin | Chương trình | Có chương trình đang áp dụng hoặc dùng GDPT2018 |
| 5 | Admin | Kế hoạch giáo dục năm học | Có kế hoạch hợp lệ và được công bố |
| 6 | Admin | Xếp thời khóa biểu → Ngày nghỉ, Phân công bộ môn | Đủ đầu vào cho thuật toán |
| 7 | Admin | Xếp thời khóa biểu → Xếp lịch tự động | Có bản lịch đã phát hành |
| 8 | Giáo viên/Học sinh/Phụ huynh | TKB, điểm danh, điểm, bài tập | Ba vai trò thấy cùng dữ liệu |
| 9 | Phụ huynh/Giáo viên | Giải trình chuyên cần và trao đổi | Trạng thái chạy xuyên vai trò |
| 10 | Admin/Phụ huynh | Tài chính | Có đúng một hóa đơn thử nghiệm |
| 11 | Admin/Giáo viên | Tổng kết năm | Chỉ xem trước trên database dùng chung |

## 4. WEB-FINAL-04 — Cơ cấu đào tạo và phân lớp

### 4.1. Tạo năm học

Đăng nhập `admin` → **Cơ cấu đào tạo** → **Năm học** → **Tạo năm học**.

| Trường | Giá trị cần nhập |
|---|---|
| Mã năm học | `2031-2032` |
| Tên năm học | `Năm học UAT 2031-2032` |

Thao tác:

1. Bấm **Tạo năm học** một lần.
2. Tìm lại `2031-2032`.
3. Kỳ vọng trạng thái là **Dự kiến/PLANNED**.
4. Mở danh sách học kỳ. Kỳ vọng hệ thống tự tạo:
   - HK1: 01/09/2031–31/01/2032;
   - HK2: 01/02/2032–30/06/2032.
5. Tải lại trang. Năm và hai học kỳ vẫn phải tồn tại.

Kiểm thử sửa/xóa:

- Màn hiện tại không cho sửa mã/ngày và không có nút xóa cứng năm học.
- Chỉ thử **Kích hoạt** khi đang dùng database UAT có snapshot. Kích hoạt thành công phải làm `2031-2032` thành năm active duy nhất.
- Hoàn tác sau test kích hoạt: kích hoạt lại `2026-2027`, sau đó chọn **Đóng năm học** cho `2031-2032` nếu trạng thái cho phép.
- Không tạo năm thứ hai cùng mã để thử lỗi trùng; lỗi trùng không phải luồng nghiệp vụ chính.

### 4.2. Tạo và kiểm tra phòng học

Mở **Cơ cấu đào tạo → Phòng học**. Tạo lần lượt bốn phòng:

| Mã | Tên | Sức chứa | Loại phòng |
|---|---|---:|---|
| `UAT31-R101` | Phòng UAT 101 | 36 | Phòng thường |
| `UAT31-LAB1` | Phòng thí nghiệm UAT | 32 | Phòng thí nghiệm |
| `UAT31-IT1` | Phòng máy UAT | 36 | Phòng máy tính |
| `UAT31-GYM1` | Nhà thể chất UAT | 60 | Nhà thể chất |

Kiểm thử sửa:

1. Tìm `UAT31-R101`.
2. Đổi sức chứa `36` thành `38`, rời khỏi ô và chờ báo lưu thành công.
3. Tải lại trang, kỳ vọng vẫn là `38`.
4. Đổi lại `36` để chuẩn bị tạo lớp.

Kiểm thử xóa/hoàn tác:

- Phòng không có xóa cứng; dùng **Ngừng dùng**.
- Chỉ ngừng dùng sau khi đã gỡ phòng khỏi lớp/TKB liên quan.
- Có thể bấm **Kích hoạt** để hoàn tác.

### 4.3. Tạo môn thử nghiệm

Mở **Cơ cấu đào tạo → Môn học** → thêm môn:

| Trường | Giá trị |
|---|---|
| Mã môn | `UAT31-STEAM` |
| Tên môn | `Chuyên đề STEAM UAT` |
| Loại môn | Chuyên đề |
| Tổ chuyên môn | `Tổ UAT` |
| Đánh giá | Điểm số |
| Loại phòng | Phòng máy tính |

Kiểm thử sửa:

1. Đổi Tổ chuyên môn thành `Tổ Toán - Tin UAT`.
2. Đổi loại phòng sang **Phòng thường**, tải lại và xác nhận.
3. Đổi lại **Phòng máy tính**.

Kiểm thử xóa/hoàn tác:

- Môn dùng cơ chế **Ngừng dùng/Kích hoạt**, không xóa cứng.
- Không ngừng dùng khi môn còn nằm trong chương trình hoặc kế hoạch đang áp dụng.

### 4.4. Tạo lớp và xác nhận sức chứa theo phòng

Mở **Cơ cấu đào tạo → Lớp học** → chọn năm `2031-2032`, khối `10` → **Tạo lớp**.

| Trường | Giá trị |
|---|---|
| Mã lớp | `UAT31-10A1` |
| Tên lớp | `Lớp UAT 10A1` |
| Sĩ số tối đa | `36` |
| Phòng chủ nhiệm | `UAT31-R101 — Phòng UAT 101` |
| Giáo viên chủ nhiệm | `Nguyen Thi Mai An` |

Kết quả đạt:

- Lớp thuộc đúng năm `2031-2032`, khối 10.
- Sĩ số tối đa là 36, không bị cố định 45.
- Chọn phòng `UAT31-R101` phải đồng bộ sức chứa lớp về 36.
- GVCN hiển thị đúng Nguyen Thi Mai An.

Kiểm thử sửa:

1. Đổi sĩ số tối đa `36 → 38`, tải lại và xác nhận.
2. Đổi lại `38 → 36`.
3. Đổi GVCN sang `Demo Teacher MATH 2`, tải lại và xác nhận.
4. Đổi GVCN lại `Nguyen Thi Mai An`.
5. Nếu giáo viên đang chủ nhiệm lớp khác cùng năm, hệ thống phải khóa lựa chọn hoặc báo xung đột rõ ràng, không được trả 500.

Kiểm thử xóa:

- Màn hiện tại không có xóa lớp.
- Cách dọn an toàn: gỡ toàn bộ học sinh, gỡ GVCN/phòng nếu giao diện cho phép và để lớp dưới năm UAT đã đóng.
- Không yêu cầu developer xóa trực tiếp database chỉ để làm đẹp danh sách.

### 4.5. Import sáu học sinh và ba phụ huynh

Thực hiện sau khi lớp `UAT31-10A1` đã tồn tại.

1. Mở **Người dùng & phân quyền**.
2. Dùng sheet **IMPORT READY** trong workbook đi kèm tài liệu này.
3. Xác nhận sheet này là sheet đầu tiên và vẫn có đúng 12 cột từ **Mã học sinh** đến **Mật khẩu phụ huynh**.
4. Kiểm tra trước bằng Excel: 6 mã học sinh duy nhất, mã lớp đều là `UAT31-10A1`, ba phụ huynh có điện thoại/email/tài khoản nhất quán.
5. Chọn **Nhập Excel** và tải file lên đúng một lần. Phiên bản Web hiện tại ghi dữ liệu ngay, không có màn Xem trước/Commit và không có lựa chọn `SKIP_ERRORS`.
6. Kỳ vọng kết quả: 6 dòng xử lý, 6 học sinh tạo mới, 3 phụ huynh tạo mới hoặc tái sử dụng, 6 liên kết, 0 lỗi.
7. Nếu có lỗi, ghi lại số dòng; không tải lại toàn bộ file. Tạo file mới chỉ chứa các dòng lỗi chưa được ghi.
8. Tải lại và tìm `UAT31HS001` đến `UAT31HS006` trong danh sách học sinh.
9. Đăng nhập `uat31.ph.01` bằng mật khẩu `Uat31Import@123`, đổi mật khẩu khi hệ thống yêu cầu, rồi đăng nhập lại; kỳ vọng thấy hai con `UAT31HS001`, `UAT31HS002`.

Lưu ý quan trọng:

- Tạo người dùng thủ công có thể để hệ thống sinh mã, nhưng importer hiện dùng **Mã học sinh** làm khóa bắt buộc của từng dòng Excel.
- Không nhập cùng một file hai lần. Nếu cần chạy lại từ đầu, khôi phục snapshot database hoặc đổi toàn bộ mã/tài khoản.

### 4.6. Phân lớp thủ công và hoàn tác

Để kiểm tra riêng chức năng phân lớp, dùng hai tài khoản có sẵn cho năm tương lai:

| Học sinh | Mã | Lớp hiện tại | Lớp thử nghiệm |
|---|---|---|---|
| Nguyen Gia Minh | `HS2601101` | 11A1 năm 2026-2027 | `UAT31-10A1` năm 2031-2032 |
| Vu Phuong Thao | `HS2601106` | 11A2 năm 2026-2027 | `UAT31-10A1` năm 2031-2032 |

1. Mở lớp `UAT31-10A1` → **Phân học sinh**.
2. Chọn hai học sinh trên.
3. Lý do: `UAT31 - phân lớp thử nghiệm đầu năm`.
4. Xem trước; sĩ số sau phân không được vượt 36.
5. Áp dụng và tải lại.
6. Hoàn tác: bấm biểu tượng thùng rác ở từng học sinh và nhập `UAT31 - hoàn tác phân lớp sau kiểm thử`.

## 5. WEB-FINAL-05 — Chương trình và kế hoạch giáo dục

### 5.1. Hiểu đúng số tiết

- HK1 là tổng số tiết của **một môn** trong học kỳ 1.
- HK2 là tổng số tiết của **chính môn đó** trong học kỳ 2.
- Cả năm được hệ thống tự tính: `HK1 + HK2`.
- Chương trình local đang dùng Toán 35 + 35 = 70 và Ngữ văn 35 + 35 = 70. Đây là hai quỹ thời lượng độc lập, không trừ lẫn nhau.

### 5.2. Tạo chương trình nháp để thử CRUD

Mở **Cơ cấu đào tạo → Chương trình** → **Tạo chương trình**.

| Trường | Giá trị |
|---|---|
| Mã chương trình | `UAT31-GDPT` |
| Tên chương trình | `Chương trình UAT 2031` |
| Năm bắt đầu | `2031` |

1. Bấm **Tạo bản nháp**.
2. Chọn **Tự động cấu hình cả 3 khối**.
3. Chọn khối 10; kiểm tra các môn bắt buộc đã có HK1/HK2.
4. Thêm `Chuyên đề STEAM UAT` với:
   - Loại môn: Chuyên đề;
   - HK1: `18`;
   - HK2: `17`;
   - Cả năm kỳ vọng: `35`;
   - Số tiết/tuần kỳ vọng: khoảng `1`;
   - Bắt buộc: Không.
5. Sửa HK1 `18 → 20`; cả năm phải tự đổi thành `37`.
6. Sửa lại `20 → 18`.
7. Khi chương trình còn **Bản nháp**, xóa `Chuyên đề STEAM UAT` khỏi chương trình rồi thêm lại để xác nhận CRUD.

### 5.3. Vì sao chương trình mới chưa xuất hiện khi tạo kế hoạch?

Danh sách ở màn tạo kế hoạch chỉ hiển thị chương trình **Đang áp dụng**. Vì vậy:

- Trên database dùng chung: không áp dụng UAT31; dùng chương trình active `GDPT2018` để tạo kế hoạch.
- Trên database UAT có snapshot: bấm **Áp dụng chương trình** cho `UAT31-GDPT`, tạo kế hoạch, rồi hoàn tác bằng cách áp dụng lại `GDPT2018`.

Chỉ một chương trình được active tại một thời điểm. Đây là hành vi đúng, không phải lỗi mất dữ liệu.

### 5.3A. Tạo tổ hợp và gán lớp — chỉ FULL

Vì `UAT31-STEAM` là môn Chuyên đề không bắt buộc, lớp phải có tổ hợp trước khi kế hoạch được công bố.

1. Mở **Cơ cấu đào tạo → Tổ hợp môn**, chọn năm `2031-2032`, khối 10.
2. Chọn **Tạo tổ hợp**:
   - Mã: `UAT31-TH-STEAM`;
   - Tên: `Tổ hợp STEAM UAT31`;
   - Môn: `Chuyên đề STEAM UAT`.
3. Lưu tổ hợp, chọn lớp `UAT31-10A1` và bấm **Lưu danh sách lớp**.
4. Tải lại; tổ hợp phải hiển thị `1 môn · 1 lớp`.

### 5.4. Tạo kế hoạch giáo dục năm học

Mở **Cơ cấu đào tạo → Kế hoạch giáo dục năm học**.

| Trường | Giá trị |
|---|---|
| Năm học | `2031-2032` |
| Khối | `10` |
| Chương trình | `GDPT2018` đang áp dụng; hoặc `UAT31-GDPT` nếu đang test trên snapshot |
| Tên kế hoạch | `Kế hoạch giáo dục UAT31 - Khối 10` |
| Mô tả | `Kế hoạch dùng kiểm thử xuyên luồng cơ cấu, TKB và đồng bộ ba vai trò.` |
| Chênh lệch tiến độ tối đa | `2` ngày |

1. Bấm **Tạo kế hoạch**.
2. Ở Bước 1, bấm **Đồng bộ từ chương trình**.
3. Kỳ vọng hệ thống tự tạo/cập nhật môn, số tiết, phân phối và kế hoạch đánh giá cơ bản.
4. Không tự nhập lại 35 tiết cho tất cả môn nếu đã đồng bộ.
5. Nếu báo môn/số tiết khối 10 chưa cấu hình, quay lại chương trình active, chạy tự động cấu hình K10 và lưu trước khi đồng bộ lại.

### 5.5. Dữ liệu mẫu Bước 2 — Chỉnh khung Toán HK1 đã sinh tự động

Sau bước **Đồng bộ từ chương trình**, Toán HK1 đã có giai đoạn `SEMESTER`, cây `C1 → T1 → L1` và phân phối tuần. Không tạo thêm một bộ 18 tiết bên cạnh khung 35 tiết vì sẽ làm sai tổng. Chọn **Toán · HK1** và chỉnh khung có sẵn:

Giai đoạn:

| Trường | Giá trị |
|---|---|
| Mã giai đoạn | Giữ `SEMESTER` |
| Tên giai đoạn | `Ôn tập và đại số nền tảng` |
| Thứ tự | `1` |
| Ngày bắt đầu | Giữ ngày đầu HK1 `2031-09-01` |
| Ngày kết thúc | Giữ ngày cuối HK1 `2032-01-31` |
| Chỉ tiêu số tiết | Giữ `35` |
| Mô tả | `UAT31 - khung Toán HK1 đã rà soát` |

Chương → Chủ đề → Bài học:

| Loại | Nội dung cha | Mã | Tên | Thứ tự | Số tiết | Ghi chú |
|---|---|---|---|---:|---:|---|
| Chương | — | Giữ `C1` | Mệnh đề và tập hợp | 1 | — | Nội dung mẫu UAT31 |
| Chủ đề | C1 | Giữ `T1` | Mệnh đề | 2 | — | Nắm khái niệm và phép toán logic |
| Bài học | T1 | Giữ `L1` | Mệnh đề toán học và nội dung HK1 | 3 | 35 | Tổng bài học phải giữ đúng 35 tiết |

Tuần đặc biệt:

| Loại tuần | Tuần | Nội dung | Ghi chú |
|---|---:|---|---|
| Tuần kiểm tra | 9 | `UAT31 - Tuần kiểm tra giữa kỳ` | Không xếp thêm bài mới |

Kiểm thử sửa/xóa an toàn:

- Sửa tên bài `L1`, tải lại và xác nhận; không đổi 35 tiết nếu chưa bù ở bài khác.
- Nếu cần kiểm tra nút xóa, tạo một mục tạm `UAT31-TEMP` rồi xóa ngay trước khi kiểm tra/công bố.
- Không xóa khung tự động đang dùng để đủ tổng; xóa con trước nếu dọn cây tạm.
- Không sửa/xóa nội dung sau khi kế hoạch đã công bố; hãy tạo phiên bản điều chỉnh.

### 5.6. Dữ liệu mẫu Bước 3 và Bước 4

Phân phối tuần:

| Trường | Giá trị |
|---|---|
| Môn/học kỳ | Toán · HK1 |
| Tuần học | `1` |
| Bài học liên kết | `L1 · Mệnh đề toán học và nội dung HK1` |
| Loại nội dung | Lý thuyết |
| Nội dung | `UAT31 - Mệnh đề và tập hợp` |
| Số tiết | Giữ số tiết dòng tuần 1 do hệ thống sinh, kỳ vọng `2` |
| Ghi chú | `Dùng kiểm tra phân phối tuần và TKB` |

Kế hoạch đánh giá:

| Trường | Giá trị |
|---|---|
| Học kỳ | HK1 |
| Môn học | Toán |
| Loại đánh giá | Giữa kỳ |
| Tên bài đánh giá | `UAT31 - Kiểm tra giữa kỳ Toán` |
| Hình thức | Viết |
| Tuần dự kiến | `9` |
| Thời lượng | `90` phút |
| Phạm vi | Toàn khối |
| Ghi nhận kết quả | Điểm |
| Người phụ trách | Nguyen Thi Mai An |
| Ghi chú | `UAT31 - dữ liệu mẫu kiểm thử` |

### 5.7. Kiểm tra điều kiện công bố — chỉ FULL

1. Mở Bước 5 **Kiểm tra và công bố**.
2. Lọc **Lỗi**; dùng nút **Đi tới bước ... để xử lý**.
3. Xử lý lỗi tổng tiết/nội dung/phân phối ngay tại kế hoạch; không thêm dữ liệu “cho đủ” mà không trừ ở dòng cũ.
4. Nếu chỉ còn lỗi `TEACHER_ASSIGNMENT`, chuyển sang mục 6.2 để phân công đủ giáo viên; chưa bấm công bố.
5. Sau khi hoàn thành 6.2, quay lại đây. Chỉ khi báo **Đủ điều kiện công bố**, bấm **Kiểm tra và công bố**.
6. Admin công bố trực tiếp; không cần gửi cho một role cao hơn.
7. Khi đã công bố, muốn sửa phải tạo phiên bản điều chỉnh. Không sửa trực tiếp dữ liệu đã phát hành.

## 6. WEB-FINAL-06 — Phân công và xếp TKB tự động

Toàn bộ mục 6 là **FULL**. Trước khi làm, kích hoạt năm `2031-2032` trên database UAT có snapshot. Khi kết thúc phải kích hoạt lại `2026-2027` và đóng năm UAT.

### 6.1. Tạo ngày nghỉ thử nghiệm

Mở **Xếp thời khóa biểu → Ngày nghỉ**.

| Trường | Giá trị |
|---|---|
| Từ ngày | `2031-11-20` |
| Đến ngày | `2031-11-20` |
| Lý do | `Ngày Nhà giáo Việt Nam UAT31` |
| Ghi chú | `UAT31 - thuật toán không được xếp tiết vào ngày này` |

Kiểm thử sửa: đổi ngày kết thúc thành `2031-11-21`, lưu, tải lại, sau đó đổi lại `2031-11-20`.

Kiểm thử xóa: bấm biểu tượng thùng rác và xác nhận. Ngày nghỉ có hỗ trợ xóa thật.

### 6.2. Phân công bộ môn

Mở **Xếp thời khóa biểu → Phân công bộ môn**, chọn năm `2031-2032`, HK1.

Sau khi đồng bộ chương trình, kế hoạch có 12 môn học bắt buộc; nếu giữ STEAM thì có thêm môn thứ 13. Tạo đủ phân công HK1 dưới đây, không chỉ tạo Toán/STEAM:

| Môn | Giáo viên/tài khoản | Tiết/tuần kỳ vọng | Phòng/loại phòng |
|---|---|---:|---|
| Toán | Nguyen Thi Mai An · `gv.toan` | 2 | UAT31-R101/Phòng thường |
| Ngữ văn | Tran Van Huy · `gv.van` | 2 | Phòng thường |
| Tiếng Anh | Le Thu Trang · `gv.anh` | 2 | Phòng thường |
| Vật lý | Pham Quang Minh · `gv.ly` | 2 | UAT31-LAB1 |
| Hóa học | Do Khanh Linh · `gv.hoa` | 2 | UAT31-LAB1 |
| Sinh học | Vu Hoai Nam · `gv.sinh` | 2 | UAT31-LAB1 |
| Lịch sử | Bui Thanh Ha · `gv.su` | 2 | Phòng thường |
| Địa lý | Hoang Gia Bao · `gv.dia` | 2 | Phòng thường |
| Tin học | Nguyen Duc Long · `gv.tin` | 2 | UAT31-IT1 |
| Giáo dục thể chất | Dinh Ngoc Son · `gv.theduc` | 2 | UAT31-GYM1 |
| GDKT và PL | Mai Phuong Thao · `gv.gdcd` | 2 | Phòng thường |
| GDQP-AN | Luong Thanh Binh · `gv.gdqp` | 2 | Phòng thường |
| Chuyên đề STEAM UAT | Demo Teacher MATH 2 · `demo.gv.math.02` | 1 | UAT31-IT1 |

Trước dòng STEAM, mở **Cơ cấu đào tạo → Chuyên môn GV**, gán thêm môn `UAT31-STEAM` cho `demo.gv.math.02`. Không tự nhập số tiết khác kế hoạch. Nếu readiness báo thiếu môn, quay về đúng dòng kế hoạch/phân công thay vì chạy thuật toán.

Sau khi đủ 13 phân công, quay lại **Cơ cấu đào tạo → Kế hoạch giáo dục năm học → Bước 5**. Kỳ vọng không còn `TEACHER_ASSIGNMENT`; bấm **Kiểm tra và công bố** rồi mới chuyển sang xếp lịch tự động.

Kiểm thử sửa/xóa:

- Trước khi có TKB, đổi giáo viên Toán sang Demo Teacher MATH 2 rồi đổi lại Nguyen Thi Mai An.
- Có thể xóa phân công chưa dùng trong TKB.
- Khi phân công đã có tiết được xếp, chỉ sửa trong giới hạn giao diện cho phép; không được giảm dưới số tiết đã xếp.

### 6.3. Chạy thuật toán

Mở **Xếp thời khóa biểu → Xếp lịch tự động**.

| Trường | Giá trị |
|---|---|
| Năm học | `2031-2032` |
| Học kỳ | HK1 |
| Phạm vi | Khối 10 |
| Tên bản lịch | `TKB UAT31 - HK1 - Lần 1` |
| Thời gian giải | `120` giây; giao diện hiện cho phép tối đa 120 giây |

1. Chờ **Kiểm tra điều kiện** hoàn tất.
2. Lỗi chặn phải bằng 0. Cảnh báo phải được đọc trước khi tiếp tục.
3. Bấm **Tạo lịch tự động** đúng một lần và chờ.
4. Ở bản nháp, kiểm tra không trùng lớp/GV/phòng, đủ số tiết và không có tiết ngày 20/11/2031.
5. Nếu cần, chỉnh một tiết thủ công rồi chạy kiểm tra lại.
6. Bấm **Phát hành**.
7. Đăng nhập `gv.toan`, `uat31.hs.001` và `uat31.ph.01`; cả ba phải thấy cùng phiên bản. Bản nháp không được lộ.
8. Sau khi xác minh xong luồng UAT31, kích hoạt lại `2026-2027` và đóng `2031-2032` trước khi chuyển sang mục 7–12 dùng dữ liệu lớp 11A2.

Không bấm tạo lịch liên tục khi thuật toán báo lỗi. Sửa dữ liệu readiness trước.

## 7. WEB-FINAL-08 — Điểm danh và giải trình chuyên cần

### 7.1. Điểm danh

Điều kiện: có TKB đã phát hành. Đăng nhập `gv.toan` → **Điểm danh**.

1. Chọn đúng lớp/môn/tiết và ngày được hiển thị từ TKB.
2. Không tự chọn một ngày không trùng thứ của tiết học.
3. Dùng dữ liệu:
   - Nguyen Gia Minh: Có mặt;
   - Vu Phuong Thao: Đi muộn;
   - Ghi chú cho Thảo: `UAT31 - đến muộn 10 phút`.
4. Lưu một lần, tải lại và xác nhận.
5. Đăng nhập `hs.thao` và `ph.vu`, kỳ vọng bản ghi mới xuất hiện mà không cần đăng nhập lại.

### 7.2. Gửi đơn cho bản ghi đã có và duyệt

Web hiện không cho nhập trước một ngày nghỉ tùy ý. Trước tiên Giáo viên phải lưu Vũ Phương Thảo là **Đi muộn** hoặc **Vắng không phép** ở bước 7.1.

1. Đăng nhập `ph.vu`, chọn Vu Phuong Thao → **Giám sát học tập → Chuyên cần**.
2. Trong **Đơn xin nghỉ và đi muộn**, chọn đúng bản ghi vừa lưu.
3. Nhập: `UAT31 - xe gặp sự cố, phụ huynh xin phép cho con đi muộn` và gửi.
4. Trạng thái chuyển sang chờ duyệt.
5. Đăng nhập GVCN thật của 11A2 là `gv.gdqp`, mở **Sổ điểm danh → Đơn xin nghỉ chờ duyệt** và duyệt.
6. Phụ huynh/học sinh thấy **Đã duyệt**; bản ghi chuyên cần được cập nhật theo quyết định mà không tạo bản ghi trùng.

## 8. WEB-FINAL-09 — Thêm và sửa điểm

Đây là case đồng bộ an toàn trên dữ liệu hiện có.

| Trường | Giá trị |
|---|---|
| Giáo viên | `gv.toan` |
| Năm/Học kỳ | 2026-2027 / HK1 |
| Lớp | 11A2 |
| Môn | Toán |
| Học sinh | Vu Phuong Thao — `HS2601106` |
| Đầu điểm | Miệng, lần 1 |
| Điểm cũ | `4.8` |
| Điểm mới | `4.9` |
| Lý do sửa | `UAT31 - kiểm tra đồng bộ Web-Mobile` |

1. Đăng nhập Giáo viên, sửa `4.8 → 4.9`, nhập lý do và lưu.
2. Tải lại bảng điểm Giáo viên; điểm vẫn là 4.9.
3. Khi Học sinh/Phụ huynh đang mở màn kết quả, dữ liệu phải tự làm mới hoặc cập nhật sau thao tác làm mới; không cần đăng nhập lại.
4. Mở lịch sử sửa điểm; phải có trước/sau, người sửa, thời gian và lý do.
5. Hoàn tác `4.9 → 4.8`, lý do `UAT31 - hoàn tác sau kiểm thử`.

Chỉ sửa đúng đầu điểm **Miệng, lần 1** của case này; không thay đổi các đầu điểm khác để tránh làm sai dữ liệu nền.

## 9. WEB-FINAL-10 — Bài tập, nộp bài và chấm

Đăng nhập `gv.toan` → **Bài tập** → **Tạo bài tập**.

| Trường | Giá trị |
|---|---|
| Lớp | 11A2 |
| Môn | Toán |
| Tiêu đề | `UAT31 - Bài tập đồng bộ Web Mobile` |
| Mô tả | `Giải bài toán mẫu và trình bày rõ từng bước. Dữ liệu dùng cho UAT31.` |
| Hạn nộp | `10/09/2026 20:00` |
| Tệp đề | `UAT31_DE_BAI_TOAN.pdf` nếu có |

1. Lưu nháp. `hs.thao` không được thấy bài.
2. Phát hành. `hs.thao` phải thấy bài và nhận đúng một thông báo.
3. Học sinh nộp nội dung `UAT31 - Bài làm của Vũ Phương Thảo` và một tệp nhỏ hợp lệ nếu có.
4. Giáo viên mở danh sách bài nộp, kỳ vọng thấy đúng học sinh và attempt.
5. Chấm `8.5`; phản hồi `UAT31 - trình bày đúng, cần bổ sung bước kết luận`.
6. Học sinh và `ph.vu` phải thấy điểm 8.5 cùng phản hồi.
7. Thử **Cho nộp lại**; lần nộp mới phải tạo attempt mới, không ghi đè lịch sử cũ.
8. Dọn dữ liệu bằng **Đóng bài tập**. Không cần xóa lịch sử bài nộp/chấm.

## 10. WEB-FINAL-11 — Tin nhắn và thông báo

Tin nhắn:

1. Đăng nhập `ph.vu`, chọn con Vu Phuong Thao, mở **Liên lạc GVCN** và chọn Luong Thanh Binh (`gv.gdqp`).
2. Gửi: `UAT31 - Phụ huynh xin trao đổi về tiến độ học tập của Vũ Phương Thảo.`
3. Đăng nhập `gv.gdqp`; tin chưa đọc phải tăng đúng một.
4. Trả lời: `UAT31 - Tôi đã nhận thông tin và sẽ phản hồi sau tiết học.`
5. Phụ huynh phải thấy trả lời đúng cuộc hội thoại; không được thấy danh bạ ngoài phạm vi.

Thông báo lớp:

| Trường | Giá trị |
|---|---|
| Tiêu đề | `UAT31 - Nhắc lịch học Toán 11A2` |
| Nội dung | `Lớp mang theo tài liệu và máy tính cầm tay trong tiết Toán tiếp theo.` |
| Đối tượng | Lớp 11A2 |

Chỉ phát hành một lần. Học sinh 11A2 và phụ huynh liên kết phải thấy; người ngoài lớp không được thấy.

## 11. WEB-FINAL-14 — Đợt thu, hóa đơn và thanh toán

Đăng nhập `admin` → **Tài chính nội bộ → Đợt thu**.

| Trường | Giá trị |
|---|---|
| Mã đợt thu | `UAT31-HP-11A2-01` |
| Tên đợt thu | `UAT31 - Học phí kiểm thử lớp 11A2` |
| Loại khoản thu | Học phí |
| Năm/Học kỳ | 2026-2027 / HK1 |
| Phạm vi | Một học sinh |
| Học sinh | Vu Phuong Thao — HS2601106 |
| Hạn thanh toán | `30/09/2026` |
| Khoản thu | `Học phí kiểm thử UAT31` |
| Số tiền | `1.000` VND |
| Ghi chú | `UAT31 - hóa đơn giá trị nhỏ để kiểm tra đối soát` |

1. Lưu nháp và mở **Xem trước**.
2. Kỳ vọng: 1 học sinh, 1 hóa đơn, tổng 1.000 VND.
3. Mở đợt thu và sinh hóa đơn một lần.
4. Đăng nhập `ph.vu`, chọn Vu Phuong Thao; hóa đơn 1.000 VND phải xuất hiện.
5. Chọn **Chuyển khoản MB**, tạo VietQR, chọn ảnh JPG/PNG/PDF dưới 5 MB và bấm **Gửi biên lai cho Admin**. Client không được tự chuyển hóa đơn sang PAID.
6. Trở lại `admin` → **Tài chính nội bộ → Biên lai**; mở đúng hóa đơn, đối chiếu số tiền/nội dung trên tài khoản MB, tích xác nhận rồi chọn **Xác nhận đã thu**.
7. Mở **Lịch sử giao dịch**, xác nhận giao dịch `SUCCESS`; tạo/tải biên nhận nếu cần.
8. Mở **Đối soát & hoàn tiền**, chạy đối soát theo ngày/phương thức và xác nhận sổ thu khớp.
9. Tải lại Phụ huynh; trạng thái, lịch sử giao dịch và biên nhận phải đồng nhất.

Nếu môi trường không có tài khoản MB/test statement để đối chiếu, dừng ở bước 5 và đánh dấu **Bị chặn**. Không tích xác nhận đã thu chỉ để làm case pass. Có thể kiểm thử riêng luồng thu tiền mặt bằng nút **Thu tiền mặt** trên hóa đơn UAT.

Nếu test hoàn tiền trên dữ liệu UAT đã thanh toán:

- Số tiền: `500` VND.
- Lý do: `UAT31 - hoàn một phần để kiểm tra state machine`.
- Tại **Lịch sử giao dịch**, chọn **Yêu cầu hoàn** và nhập 500 VND.
- Tại **Đối soát & hoàn tiền**, mở yêu cầu, chọn phương thức, nhập mã tham chiếu `UAT31-REFUND-0001`, tích xác nhận đã hoàn thực tế rồi duyệt.
- Kỳ vọng hóa đơn chuyển PARTIALLY_REFUNDED; tạo yêu cầu và duyệt nốt 500 thì REFUNDED.
- Không xác nhận cùng một giao dịch hai lần và không xóa lịch sử tài chính.

## 12. WEB-FINAL-17 — Tổng kết và chuyển lớp

Đây là thao tác có ảnh hưởng lớn. Trên database dùng chung chỉ kiểm thử **Xem trước**.

1. Đăng nhập `admin` → **Báo cáo & thống kê → Xét và chốt kết quả năm học**.
2. Chọn năm `2026-2027`, lớp `11A2`.
3. Bấm **Xem trước tổng kết**.
4. Ghi lại blocker: thiếu điểm, chuyên cần, bài chưa chấm hoặc hồ sơ chưa đủ.
5. Nút chốt/chuyển lớp phải bị khóa khi còn blocker.
6. Đăng nhập GVCN 11A2 `gv.gdqp` để rà soát các mục được hệ thống chỉ ra; không sửa điểm/chuyên cần ngoài luồng chính thức.
7. Chỉ trên snapshot UAT: hoàn tất điều kiện, công bố kết quả và chạy chuyển lớp với idempotency key do hệ thống quản lý.
8. Chạy lại cùng thao tác không được tạo enrollment hoặc summary trùng.

Không dùng năm `2031-2032` cho tổng kết vì đây là dữ liệu đầu năm chưa có đủ điểm và chuyên cần.

## 13. Bảng dọn dữ liệu sau kiểm thử

| Dữ liệu | Cách dọn đúng | Có hoàn tác được? |
|---|---|---|
| Năm 2031-2032 | Kích hoạt lại 2026-2027, đóng năm UAT | Có thể mở lại tùy trạng thái |
| Phòng UAT31 | Gỡ khỏi lớp/TKB rồi Ngừng dùng | Có, Kích hoạt lại |
| Môn UAT31-STEAM | Gỡ khỏi chương trình/kế hoạch nháp rồi Ngừng dùng | Có, Kích hoạt lại |
| Lớp UAT31-10A1 | Gỡ học sinh; để trong năm UAT đã đóng | Không có xóa cứng trên UI |
| Học sinh phân thủ công | Bấm thùng rác, nhập lý do hoàn tác | Có thể phân lại |
| Học sinh import | Khôi phục snapshot hoặc khóa/xóa mềm tài khoản theo quyền | Không nhập cùng file lần hai |
| Chương trình nháp | Xóa các dòng môn thử; để nháp | Có thể sửa tiếp |
| Chương trình đã áp dụng | Áp dụng lại GDPT2018 | Có, nhưng phải kiểm tra kế hoạch phụ thuộc |
| Kế hoạch nháp | Xóa nội dung con hoặc để nháp | Có thể chỉnh sửa |
| Kế hoạch đã công bố | Tạo phiên bản điều chỉnh; không sửa trực tiếp | Có phiên bản/lịch sử |
| Ngày nghỉ | Dùng nút Xóa | Không, phải tạo lại |
| Phân công chưa dùng | Dùng nút Xóa | Phải tạo lại |
| TKB đã phát hành | Phát hành phiên bản thay thế | Không xóa lịch sử |
| Điểm 4.9 | Sửa lại 4.8 với lý do hoàn tác | Có audit log |
| Bài tập | Đóng bài tập | Không xóa bài nộp/chấm |
| Tin nhắn/thông báo | Giữ làm bằng chứng UAT | Không xóa audit |
| Hóa đơn/thanh toán | Dùng state machine đóng/hủy/hoàn; không xóa DB | Có lịch sử bắt buộc |
| Tổng kết/chuyển lớp | Khôi phục snapshot nếu đã chạy | Không chạy thử trên DB dùng chung |

## 14. Điều kiện kết thúc buổi test

Buổi test chỉ được coi là hoàn tất khi:

1. Mỗi mục trong workbook được đánh dấu **Đạt**, **Không đạt** hoặc **Bị chặn**; không để “đã bấm” thay cho kết quả.
2. Dữ liệu sau tải lại vẫn đúng.
3. Dữ liệu do Admin/Giáo viên tạo xuất hiện đúng ở Học sinh/Phụ huynh.
4. Người ngoài phạm vi không đọc được dữ liệu.
5. Tất cả thay đổi điểm, thanh toán, tổng kết đều có lịch sử nghiệp vụ.
6. Đã chạy bảng dọn dữ liệu và kích hoạt lại năm/chương trình chính nếu trước đó đã thay đổi.
