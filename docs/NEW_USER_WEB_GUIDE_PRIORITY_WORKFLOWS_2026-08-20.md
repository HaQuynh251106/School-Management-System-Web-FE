# Hướng dẫn người dùng mới — Các chức năng Web trọng tâm

**Phiên bản:** 2026-08-20
**Phạm vi:** WEB-FINAL-04, 05, 06, 08, 09, 10, 11, 14 và 17
**Đối tượng:** Quản trị viên, Giáo viên, Học sinh và Phụ huynh lần đầu sử dụng hệ thống
**Mục đích:** hướng dẫn thao tác nghiệp vụ trên giao diện Web. Đây không phải tài liệu API hoặc checklist dành cho lập trình viên.

---

## 1. Đọc trước khi sử dụng

### 1.1. Bốn vai trò và phạm vi chính

| Vai trò | Công việc chính trong tài liệu |
|---|---|
| Quản trị viên | Cơ cấu đào tạo, chương trình, kế hoạch giáo dục, phân công, thời khóa biểu, tài chính, tổng kết năm |
| Giáo viên | Điểm danh, nhập điểm, giao và chấm bài, trao đổi, theo dõi kế hoạch, rà soát tổng kết |
| Học sinh | Xem lịch học, kế hoạch, chuyên cần, điểm, bài tập, thông báo và kết quả năm |
| Phụ huynh | Theo dõi từng con, gửi giải trình chuyên cần, xem điểm/bài tập, trao đổi, thanh toán và xem kết quả năm |

Người dùng chỉ nhìn thấy chức năng thuộc quyền của mình. Nếu một menu không xuất hiện, hãy kiểm tra tài khoản đang đăng nhập và phạm vi lớp/môn đã được phân công.

### 1.2. Thứ tự nghiệp vụ bắt buộc

```text
WEB-FINAL-04  Cơ cấu đào tạo và phân lớp
       ↓
WEB-FINAL-05  Chương trình và kế hoạch giáo dục đã công bố
       ↓
WEB-FINAL-06  Phân công giáo viên và thời khóa biểu đã phát hành

WEB-FINAL-08  Điểm danh ─┐
WEB-FINAL-09  Điểm ──────┼─→ WEB-FINAL-17 Tổng kết và chuyển lớp
                         ┘

WEB-FINAL-10  Bài tập
WEB-FINAL-11  Trao đổi và thông báo
WEB-FINAL-14  Tài chính
```

- Không xếp thời khóa biểu khi kế hoạch giáo dục chưa được công bố.
- Không chốt kết quả năm khi còn thiếu điểm, chuyên cần, hạnh kiểm hoặc nhận xét bắt buộc.
- Không bấm lại nhiều lần khi hệ thống đang hiển thị “Đang xử lý”. Hãy chờ thông báo kết quả rồi tải lại nếu cần.

### 1.3. Cách đọc giao diện

- **Bản nháp:** chỉ người lập hoặc người có quyền quản lý nhìn thấy; chưa truyền sang người dùng khác.
- **Đang áp dụng/Đã công bố/Đã phát hành:** dữ liệu chính thức mà Giáo viên, Học sinh và Phụ huynh được phép xem.
- **Đã khóa:** dữ liệu chỉ đọc; muốn sửa phải tạo phiên bản điều chỉnh hoặc mở lại theo đúng quyền.
- **Cảnh báo:** cần đọc và cân nhắc nhưng không phải lúc nào cũng chặn thao tác.
- **Lỗi bắt buộc:** phải xử lý trước khi công bố hoặc phát hành.
- Các danh sách dài có phân trang. Có thể chọn 5, 10, 20 hoặc 50 dòng mỗi trang.
- Khi đổi năm học, học kỳ, khối, lớp hoặc học sinh, hãy kiểm tra lại bộ lọc trước khi thao tác.

---

## 2. WEB-FINAL-04 — Cơ cấu đào tạo và phân lớp

### 2.1. Ai sử dụng?

- **Quản trị viên:** tạo và quản lý dữ liệu.
- **Giáo viên:** xem lớp được phân công.
- **Học sinh/Phụ huynh:** xem lớp hiện tại sau khi Admin phân lớp.

### 2.2. Đường dẫn

**Admin → Cơ cấu đào tạo** với các tab chính:

1. Năm học
2. Khối
3. Lớp & phân lớp
4. Môn học
5. Chương trình
6. Tổ hợp môn
7. Chuyên môn GV
8. Kế hoạch giáo dục năm học
9. Phòng học

### 2.3. Tạo và kích hoạt năm học

1. Mở tab **Năm học**.
2. Nhập mã, tên, ngày bắt đầu và ngày kết thúc.
3. Chọn **Tạo năm học**.
4. Hệ thống tự tạo Học kỳ 1 và Học kỳ 2 theo năm học mới.
5. Kiểm tra ngày của hai học kỳ:
   - không chồng lên nhau;
   - đều nằm trong khoảng thời gian của năm học.
6. Chọn **Kích hoạt** khi muốn dùng năm học này làm năm hiện hành.

Sau khi kích hoạt, hệ thống chỉ được có một năm học đang hoạt động. Nếu trường đang vận hành năm cũ, hãy chắc chắn đã chuẩn bị dữ liệu cho năm mới trước khi chuyển.

### 2.4. Quản lý môn học và phòng học

#### Môn học

1. Mở tab **Môn học**.
2. Nhập mã và tên môn.
3. Chọn loại môn: Bắt buộc, Lựa chọn, Chuyên đề hoặc Hoạt động.
4. Chọn phương thức đánh giá và loại phòng cần thiết.
5. Chọn **Thêm môn**.
6. Có thể ngừng sử dụng một môn thay vì xóa dữ liệu đã được dùng trong kế hoạch.

#### Phòng học

1. Mở tab **Phòng học**.
2. Nhập mã phòng, tên phòng, sức chứa và loại phòng.
3. Chọn **Thêm phòng**.
4. Có thể sửa trực tiếp ô **Sức chứa phòng ...** trong danh sách.

Sức chứa không cố định ở 45. Phòng thường, phòng thí nghiệm, phòng máy tính và nhà thể chất có thể có sức chứa khác nhau. Không giảm sức chứa thấp hơn số học sinh đang được bố trí.

### 2.5. Tạo lớp và gán giáo viên chủ nhiệm

1. Mở **Lớp & phân lớp**.
2. Chọn đúng năm học và khối.
3. Nhập mã lớp, tên lớp và sĩ số tối đa.
4. Chọn phòng phù hợp nếu giao diện yêu cầu.
5. Chọn **Tạo lớp**.
6. Tại dòng lớp vừa tạo, mở danh sách **Giáo viên chủ nhiệm**.
7. Chọn giáo viên chưa chủ nhiệm lớp khác trong cùng năm.
8. Chờ thông báo thành công rồi tải lại để xác nhận.

Giáo viên đã chủ nhiệm lớp khác được ghi rõ tên lớp và không thể chọn. Khi cần đổi GVCN, chọn một giáo viên hợp lệ khác; dữ liệu cũ không được tự gán sang giáo viên mới ngoài thao tác này.

### 2.6. Phân học sinh vào lớp

1. Chọn lớp cần quản lý trong danh sách.
2. Kiểm tra sĩ số hiện tại và sĩ số tối đa.
3. Tìm học sinh chưa phân lớp bằng tên hoặc mã học sinh.
4. Chọn học sinh cần đưa vào lớp.
5. Nhập lý do phân lớp/chuyển lớp.
6. Chọn **Xem trước** nếu giao diện cung cấp bước xem trước.
7. Kiểm tra:
   - tổng số học sinh sau khi phân;
   - lớp không vượt sức chứa;
   - học sinh không đồng thời thuộc hai lớp trong cùng năm.
8. Chọn **Phân lớp/Áp dụng**.
9. Tải lại danh sách và kiểm tra học sinh đã xuất hiện.

### 2.7. Người nhận kiểm tra kết quả

- **Giáo viên → Lớp được phân công:** thấy đúng lớp và danh sách học sinh thuộc phạm vi.
- **Học sinh → Hồ sơ cá nhân:** thấy mã học sinh và lớp hiện tại từ dữ liệu hệ thống.
- **Phụ huynh → Chọn học sinh:** thấy đúng lớp của từng con.

Trường thông tin chưa được nhập phải hiển thị **Chưa cập nhật**, không dùng dữ liệu minh họa thay thế.

### 2.8. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Không kích hoạt được năm học | Kiểm tra ngày, mã năm học và trạng thái năm hiện hành; tải lại trước khi thử lại |
| Không chọn được GVCN | Giáo viên có thể đang chủ nhiệm lớp khác trong cùng năm |
| Không tìm thấy học sinh | Kiểm tra năm học, khối, bộ lọc và trạng thái tài khoản học sinh |
| Không phân lớp được | Kiểm tra sức chứa lớp/phòng và học sinh đã có lớp active hay chưa |

---

## 3. WEB-FINAL-05 — Chương trình và kế hoạch giáo dục năm học

### 3.1. Phân biệt hai khái niệm

| Khái niệm | Ý nghĩa |
|---|---|
| Chương trình giáo dục | Khung chuẩn: môn nào được học và số tiết HK1/HK2 của từng khối |
| Kế hoạch giáo dục năm học | Cách triển khai chương trình trong một năm cụ thể: nội dung, tuần học, đánh giá và phiên bản công bố |

**HK1** là số tiết của môn trong Học kỳ 1.
**HK2** là số tiết của môn trong Học kỳ 2.
**Cả năm = HK1 + HK2** của chính môn đó.

Ví dụ: Toán có 70 tiết HK1 và 70 tiết HK2 thì Cả năm là 140 tiết. Con số của Toán không bị trừ vào số tiết của Ngữ văn; mỗi môn có định mức riêng.

### 3.2. Chuẩn bị chương trình

1. Admin mở **Cơ cấu đào tạo → Chương trình**.
2. Chọn chương trình đang có hoặc chọn **Tạo chương trình**.
3. Chương trình mới xuất hiện với trạng thái **Bản nháp**.
4. Chọn Khối 10, 11 hoặc 12.
5. Chọn **Tự động cấu hình K...** để thêm cấu hình chuẩn còn thiếu, hoặc **Tự động cấu hình cả 3 khối**.
6. Kiểm tra từng môn:
   - loại môn;
   - số tiết HK1;
   - số tiết HK2;
   - số tiết Cả năm tự tính;
   - số tiết mỗi tuần;
   - có/không đánh giá định kỳ.
7. Chọn **Lưu số tiết** sau khi điều chỉnh.
8. Với chương trình nháp, có thể chọn **Xóa khỏi chương trình nháp** nếu thêm nhầm.
9. Khi chương trình đã đủ cả ba khối, chọn áp dụng chương trình để dùng làm nguồn cho kế hoạch năm học.

Không xóa trực tiếp môn khỏi chương trình đang áp dụng vì có thể ảnh hưởng kế hoạch đã công bố. Hãy tạo bản nháp/phiên bản mới để điều chỉnh.

### 3.3. Tổ hợp môn và chuyên môn giáo viên

#### Tổ hợp môn

1. Mở **Tổ hợp môn**.
2. Chọn khối.
3. Tạo tổ hợp, chọn các môn và lưu.
4. Gán tổ hợp cho các lớp tương ứng.

#### Chuyên môn GV

1. Mở **Chuyên môn GV**.
2. Kiểm tra môn chính và khả năng giảng dạy của từng giáo viên.
3. Dùng chức năng cấu hình tự động nếu trường mới khởi tạo dữ liệu.
4. Rà soát thủ công các giáo viên bị thiếu môn hoặc phân công chưa phù hợp.

### 3.4. Tạo kế hoạch giáo dục năm học

1. Mở **Kế hoạch giáo dục năm học**.
2. Chọn năm học và khối.
3. Chọn một chương trình **Đang áp dụng**.
4. Nhập tên và mô tả kế hoạch.
5. Chọn **Tạo kế hoạch**.
6. Thực hiện lần lượt năm bước trên màn hình.

#### Bước 1 — Tổng quan và môn học

1. Chọn **Đồng bộ từ chương trình** để lấy đủ môn và số tiết của cả hai học kỳ.
2. Kiểm tra môn, tiết/tuần, tổng tiết, ngày bắt đầu/kết thúc và yêu cầu đánh giá định kỳ.
3. Chỉ thêm/sửa/xóa thủ công khi có nghiệp vụ đặc biệt.
4. Tổng HK1 + HK2 phải khớp cấu hình chương trình.

#### Bước 2 — Nội dung môn học

1. Chọn môn cần khai báo.
2. Tạo giai đoạn/chủ đề.
3. Thêm bài học hoặc mốc kiến thức.
4. Nhập số tiết dự kiến cho từng nội dung.
5. Tổng số tiết nội dung phải khớp số tiết của môn.

#### Bước 3 — Phân phối theo tuần

1. Chọn môn và học kỳ.
2. Chọn tuần học, loại nội dung, bài học liên kết và số tiết.
3. Thêm tuần đặc biệt/ngày nghỉ nếu cần.
4. Kiểm tra số tiết đã phân phối so với tổng số tiết.

#### Bước 4 — Kiểm tra và đánh giá

1. Chọn học kỳ và môn.
2. Chọn loại đánh giá: thường xuyên, giữa kỳ hoặc cuối kỳ.
3. Nhập tên, hình thức, tuần dự kiến và thời lượng.
4. Chọn phạm vi toàn khối hoặc một lớp.
5. Liên kết chủ đề/bài học được đánh giá.

Đây là kế hoạch đánh giá dự kiến. Phòng thi, giám thị và lịch thi chính thức được quản lý tại **Khảo thí & lịch thi**.

#### Bước 5 — Duyệt và công bố

1. Chọn bộ lọc **Tất cả/Lỗi/Cảnh báo** để xem kết quả kiểm tra.
2. Mở từng nhóm lỗi và chọn **Đi tới bước ... để xử lý**.
3. Khi không còn lỗi bắt buộc, Admin chọn **Kiểm tra và công bố**.
4. Sau công bố, phiên bản chuyển sang chỉ đọc.
5. Muốn sửa kế hoạch đã công bố, chọn **Tạo phiên bản điều chỉnh**.

Admin là quyền quản trị cao nhất trong mô hình bốn vai trò nên có thể kiểm tra và công bố trực tiếp; không cần gửi cho một vai trò thứ năm duyệt.

### 3.5. Người nhận xem kế hoạch

- **Giáo viên → Kế hoạch giáo dục năm học:** xem kế hoạch và cập nhật tiến độ thuộc phạm vi.
- **Học sinh → Theo dõi học thuật → Kế hoạch giáo dục:** chỉ thấy phiên bản đã công bố.
- **Phụ huynh → Giám sát học tập → Kế hoạch giáo dục:** thấy kế hoạch của học sinh đang chọn.

### 3.6. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Không thấy chương trình trong kế hoạch | Chương trình có thể vẫn là Bản nháp; hãy cấu hình đủ và áp dụng trước |
| Báo chưa cấu hình môn/số tiết | Quay lại Chương trình, chạy tự động cấu hình đúng khối rồi lưu |
| Không công bố được | Mở tab Lỗi, đi tới đúng bước và xử lý toàn bộ lỗi bắt buộc |
| Kế hoạch đã công bố không sửa được | Chọn Tạo phiên bản điều chỉnh, không sửa trực tiếp bản đang áp dụng |

---

## 4. WEB-FINAL-06 — Phân công giáo viên và xếp thời khóa biểu tự động

### 4.1. Ai sử dụng?

- **Admin:** chuẩn bị ngày nghỉ, phân công bộ môn, tạo/chỉnh/phát hành lịch.
- **Giáo viên:** xem lịch dạy và tiến độ.
- **Học sinh/Phụ huynh:** xem lịch học đã phát hành.

### 4.2. Đường dẫn

**Admin → Xếp thời khóa biểu** gồm:

1. Ngày nghỉ
2. Phân công bộ môn
3. Xếp lịch tự động
4. Chỉnh lịch thủ công
5. Tiến độ giảng dạy

### 4.3. Chuẩn bị trước khi xếp lịch

1. Chọn đúng năm học và học kỳ.
2. Tại **Ngày nghỉ**, khai báo ngày trường không tổ chức học.
3. Tại **Phân công bộ môn**, kiểm tra từng lớp/môn có giáo viên và số tiết/tuần.
4. Kiểm tra tải dạy của giáo viên.
5. Kiểm tra phòng chuyên dụng:
   - Lý/Hóa/Sinh: phòng thí nghiệm khi yêu cầu;
   - Tin học: phòng máy tính;
   - Thể chất: nhà thể chất/sân phù hợp.
6. Kế hoạch giáo dục của khối phải ở trạng thái đã công bố.

### 4.4. Tạo lịch tự động

1. Mở **Xếp lịch tự động**.
2. Chọn học kỳ và phạm vi khối.
3. Chọn **Kiểm tra lại**.
4. Đọc kết quả readiness:
   - nếu có lỗi chặn, quay lại kế hoạch, phân công, phòng hoặc ngày nghỉ;
   - cảnh báo định biên có thể chỉ là khuyến nghị nếu hệ thống vẫn ghi Sẵn sàng.
5. Nhập tên bản lịch và thời gian giải.
6. Chọn **Tạo lịch tự động**.
7. Chờ bản lịch trạng thái **DRAFT/Bản nháp** xuất hiện.
8. Kiểm tra:
   - đủ số tiết theo nhu cầu;
   - không trùng lớp, giáo viên hoặc phòng;
   - không xếp vào ngày nghỉ;
   - đúng loại phòng;
   - các lớp cùng khối không chênh tiến độ quá mức quy định.
9. Đọc phần **Xung đột và cảnh báo đã gom nhóm**.
10. Nếu cần, chuyển sang **Chỉnh lịch thủ công**, chọn tiết và đổi ngày/tiết/phòng.
11. Kiểm tra lại sau mỗi thay đổi lớn.
12. Khi không còn lỗi nghiêm trọng, chọn **Phát hành**.

### 4.5. Lịch dạy bù

1. Mở bản lịch đang áp dụng.
2. Chọn khoảng ngày cần rà soát.
3. Chọn **Rà soát ngày nghỉ**.
4. Xem ngày/tiết bị nghỉ và đề xuất dạy bù.
5. Duyệt đề xuất hợp lệ hoặc chọn **Yêu cầu điều chỉnh** và ghi lý do.
6. Chỉ lịch bù đã được đưa vào phiên bản phát hành mới xuất hiện cho người học.

### 4.6. Người nhận kiểm tra lịch

- **Giáo viên → TKB cá nhân:** ngày, tiết, lớp, môn và phòng dạy.
- **Học sinh → Theo dõi học thuật → Thời khóa biểu:** lịch của lớp hiện tại.
- **Phụ huynh → Giám sát học tập → Thời khóa biểu:** lịch của con đang chọn.

Bản nháp không xuất hiện ở ba vai trò trên. Sau khi Admin phát hành phiên bản mới, tải lại trang nếu dữ liệu chưa tự cập nhật.

### 4.7. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Readiness báo thiếu kế hoạch nguồn | Hoàn thành và công bố WEB-FINAL-05 cho đúng khối |
| Thiếu giáo viên/phân công | Quay lại Chuyên môn GV và Phân công bộ môn |
| Trùng phòng hoặc trùng giáo viên | Dùng bản cảnh báo để đi tới lớp/tiết gây xung đột rồi chỉnh |
| Không phát hành được | Bản lịch vẫn còn lỗi bắt buộc hoặc chưa validate sau lần sửa gần nhất |

---

## 5. WEB-FINAL-08 — Điểm danh và xin phép vắng

### 5.1. Giáo viên điểm danh

1. Giáo viên mở **Sổ điểm danh**.
2. Chọn **Tiết học phụ trách**.
3. Chọn đúng ngày diễn ra tiết học.
4. Hệ thống tải danh sách lớp và mặc định trạng thái hiện có.
5. Có thể chọn **Tất cả có mặt** rồi sửa riêng các trường hợp khác.
6. Với từng học sinh, chọn:
   - Có mặt;
   - Đi muộn;
   - Vắng có phép;
   - Vắng không phép.
7. Nhập ghi chú cho trường hợp không Có mặt.
8. Kiểm tra thẻ tổng hợp sĩ số.
9. Chọn **Lưu điểm danh**.
10. Chỉ rời trang khi trạng thái hiển thị đã lưu.

Giáo viên chỉ được điểm danh tiết đúng môn và lớp được phân công. Nếu không có tiết phù hợp, liên hệ Admin kiểm tra chuyên môn, phân công và thời khóa biểu.

### 5.2. Học sinh/Phụ huynh gửi giải trình

1. Học sinh mở **Chuyên cần cá nhân**, hoặc Phụ huynh mở **Giám sát học tập → Chuyên cần**.
2. Tại **Đơn xin nghỉ và đi muộn**, chọn một lượt Đi muộn hoặc Vắng không phép đã có.
3. Nhập lý do rõ ràng.
4. Chọn **Gửi đơn**.
5. Theo dõi trạng thái và phản hồi trong danh sách bên dưới.

### 5.3. GVCN duyệt đơn

1. GVCN mở **Sổ điểm danh** và khu vực **Đơn xin nghỉ chờ duyệt**.
2. Kiểm tra học sinh, ngày, môn và lý do.
3. Nhập ghi chú duyệt nếu cần.
4. Chọn **Duyệt** hoặc **Từ chối**.
5. Học sinh/Phụ huynh tải lại để xem kết quả.

### 5.4. Phạm vi hiện tại cần biết

Web hiện hỗ trợ giải trình cho bản ghi **Đi muộn/Vắng không phép đã tồn tại**. Chức năng gửi đơn xin nghỉ trước khi buổi học diễn ra chưa phải một màn độc lập trong luồng này.

---

## 6. WEB-FINAL-09 — Cấu hình, thêm và sửa điểm

### 6.1. Admin cấu hình đầu điểm

1. Mở **Khảo thí & lịch thi**.
2. Chọn tab **Loại điểm** để quản lý tên và hệ số chung.
3. Chọn **Cấu hình theo môn**.
4. Chọn khối, học kỳ và môn.
5. Khai báo số cột cần có cho Miệng, 15 phút, Giữa kỳ và Cuối kỳ.
6. Kiểm tra trọng số rồi lưu.

Cấu hình này quyết định các cột xuất hiện trong sổ điểm Giáo viên và cách tổng hợp kết quả cho Học sinh/Phụ huynh.

### 6.2. Giáo viên nhập điểm

1. Mở **Bảng điểm**.
2. Chọn học kỳ và lớp giảng dạy.
3. Môn được xác định theo phân công/chuyên ngành; GVCN có thể xem môn khác ở chế độ chỉ đọc.
4. Nhập điểm từ 0 đến 10 vào đúng cột.
5. Nếu là điều chỉnh điểm đã có, nhập **Lý do điều chỉnh**.
6. Chọn **Lưu sổ điểm**.
7. Kiểm tra thông báo thành công và tải lại để xác nhận.

Mỗi đầu điểm có vị trí riêng như Miệng 1, Miệng 2 hoặc 15 phút 1, 15 phút 2. Không nhập một điểm mới vào cột cũ nếu mục đích là bổ sung đầu điểm khác.

### 6.3. Xem lịch sử sửa điểm

1. Trong Bảng điểm, mở phần lịch sử thay đổi nếu được hiển thị.
2. Chọn lớp/môn/học kỳ hoặc học sinh cần tra cứu.
3. Kiểm tra điểm trước, điểm sau, lý do, người sửa và thời gian.

Nếu nhiều giáo viên cùng mở một sổ điểm, nên tải lại trước khi sửa để tránh làm việc trên dữ liệu cũ.

### 6.4. Học sinh và Phụ huynh xem điểm

- **Học sinh → Theo dõi học thuật → Điểm:** xem theo môn và học kỳ.
- **Phụ huynh → Giám sát học tập → Điểm:** xem dữ liệu của con đang chọn.
- Trung bình chỉ hiển thị khi đủ các đầu điểm bắt buộc.
- Điểm được hiển thị ngay sau khi Giáo viên lưu; hệ thống hiện chưa có bước “công bố điểm” riêng sau nút Lưu.

---

## 7. WEB-FINAL-10 — Bài tập, nộp bài và chấm bài

### 7.1. Giáo viên tạo và phát hành bài tập

1. Mở **Bài tập**.
2. Trong **Tạo bài tập mới**, chọn lớp và môn được phân công.
3. Nhập tiêu đề, hạn nộp và yêu cầu chi tiết.
4. Chọn tệp đề nếu có.
5. Chọn **Lưu nháp** để chuẩn bị hoặc **Phát hành** để giao bài ngay.
6. Với bản nháp, chọn **Phát hành** khi đã kiểm tra xong.

Học sinh và Phụ huynh không nhìn thấy bản nháp.

### 7.2. Học sinh nộp bài

1. Mở **Nộp bài tập**.
2. Chọn bài cần làm.
3. Đọc yêu cầu và tải tệp đề.
4. Chọn **Nộp bài**.
5. Nhập nội dung hoặc chọn tệp bài làm.
6. Chọn **Nộp bài**; nếu đã có bài nộp thì nút hiển thị **Cập nhật bài nộp**.
7. Kiểm tra thời gian nộp và trạng thái.

Không tải tệp rỗng, sai định dạng hoặc vượt dung lượng cho phép. Nếu bài đã đóng, Học sinh không thể tạo lượt nộp mới cho tới khi Giáo viên mở lại/cho phép nộp lại.

### 7.3. Giáo viên chấm bài

1. Chọn bài tập và **Xem bài nộp**.
2. Mở bài của từng học sinh và tải tệp nếu có.
3. Nhập điểm từ 0 đến 10 và phản hồi.
4. Chọn **Lưu kết quả**; khi sửa bài đã chấm, nhập lý do rồi chọn **Lưu thay đổi**.
5. Nếu cần, cho phép/yêu cầu học sinh nộp lại.

Lượt nộp mới không xóa lịch sử lượt nộp cũ.

### 7.4. Phụ huynh theo dõi

1. Chọn đúng học sinh.
2. Mở **Giám sát học tập → Bài tập**.
3. Xem trạng thái bài, điểm và nhận xét của Giáo viên.

Nếu tải/nộp tệp không hoạt động, liên hệ quản trị hệ thống kiểm tra dịch vụ lưu trữ tệp; không tạo bài giả để thay thế.

---

## 8. WEB-FINAL-11 — Trao đổi, thông báo và cập nhật tức thời

### 8.1. Nhắn tin

#### Phụ huynh

1. Chọn đúng học sinh nếu tài khoản có nhiều con.
2. Mở **Liên lạc GVCN**.
3. Chọn giáo viên trong danh bạ được phép liên hệ.
4. Nhập nội dung và gửi.

#### Học sinh

1. Mở **Trao đổi giáo viên**.
2. Chọn giáo viên đang phụ trách lớp/môn.
3. Nhập nội dung và gửi.

#### Giáo viên

1. Mở **Trao đổi**.
2. Chọn cuộc hội thoại chưa đọc hoặc người liên hệ hợp lệ.
3. Đọc và trả lời.

Số chưa đọc giảm khi người nhận mở cuộc hội thoại. Danh bạ chỉ hiển thị các quan hệ lớp/môn/GVCN hợp lệ.

### 8.2. Admin gửi thông báo nhà trường

1. Mở **Trung tâm thông báo**.
2. Chọn mẫu/loại thông báo.
3. Chọn đối tượng: toàn trường, vai trò, khối hoặc lớp theo lựa chọn được cung cấp.
4. Nhập tiêu đề, nội dung và mức độ ưu tiên.
5. Kiểm tra **Dự kiến nhận** và phần xem trước.
6. Chọn **Gửi ngay**.
7. Kiểm tra **Lịch sử gửi thông báo**.
8. Tại **Vận hành Email và Push**, chỉ gửi lại mục đang lỗi; không gửi lại thông báo đã thành công.

### 8.3. Giáo viên gửi thông báo lớp

1. Mở **Thông báo tự động**.
2. Chọn lớp.
3. Chọn người nhận: Học sinh, Phụ huynh hoặc cả hai.
4. Chọn mẫu nội dung, chỉnh sửa thông tin cần thiết.
5. Kiểm tra số người nhận và gửi.

### 8.4. Người nhận xem thông báo

- Giáo viên mở **Thông báo**.
- Học sinh mở **Thông báo**.
- Phụ huynh mở **Thông báo**.
- Có thể mở từng thông báo, đánh dấu đã đọc hoặc đánh dấu tất cả đã đọc.

Nếu kết nối mạng gián đoạn, tải lại trang sau khi kết nối trở lại. Không bấm gửi lại liên tục vì có thể tạo nhiều nội dung giống nhau.

---

## 9. WEB-FINAL-14 — Đợt thu, hóa đơn, thanh toán và hoàn tiền

### 9.1. Hai vai trò cần phối hợp

- **Admin tạo:** lập đợt thu, phát hành hóa đơn, tạo yêu cầu hoàn tiền.
- **Admin duyệt độc lập:** kiểm tra và duyệt yêu cầu hoàn tiền do Admin khác tạo.
- **Phụ huynh:** xem hóa đơn, chuyển khoản, gửi biên lai và tải biên nhận.

Một Admin không được tự duyệt yêu cầu hoàn tiền do chính mình tạo.

### 9.2. Tạo đợt thu

1. Admin mở **Tài chính nội bộ → Đợt thu**.
2. Chọn **Tạo đợt thu**.
3. Nhập mã, tên, loại khoản thu, năm/học kỳ và hạn nộp.
4. Chọn phạm vi: toàn trường, khối, lớp hoặc học sinh cụ thể.
5. Lưu đợt thu ở trạng thái Bản nháp.
6. Chọn đợt thu vừa tạo và thêm từng khoản thu.
7. Kiểm tra tên khoản, số tiền và phạm vi.
8. Chọn **Mở** để khóa cấu hình cơ bản và cho phép xem trước.
9. Chọn **Xem trước**.
10. Kiểm tra số học sinh, hóa đơn mới, hóa đơn đã có và tổng tiền.
11. Chọn **Phát hành** để sinh hóa đơn.

Không bấm Phát hành khi số học sinh hoặc tổng tiền xem trước chưa đúng. Chạy lại cùng đợt thu không được tạo hóa đơn trùng.

### 9.3. Phụ huynh thanh toán chuyển khoản

1. Mở **Học phí**.
2. Chọn đúng học sinh.
3. Chọn hóa đơn Chưa đóng/Quá hạn/Thanh toán một phần.
4. Chọn **Thanh toán**.
5. Kiểm tra số tiền, tài khoản nhận và nội dung chuyển khoản bắt buộc.
6. Quét VietQR hoặc chuyển khoản theo thông tin hiển thị.
7. Tải ảnh biên lai đúng định dạng/dung lượng.
8. Gửi xác nhận.
9. Chờ Admin đối soát; giao diện chỉ chuyển Đã thanh toán sau khi nhà trường xác nhận.

Nếu Admin yêu cầu thanh toán lại, Phụ huynh đọc lý do, thực hiện lại và gửi biên lai mới.

### 9.4. Admin kiểm tra biên lai và thu tiền

1. Mở **Tài chính nội bộ → Biên lai**.
2. Chọn biên lai chờ duyệt.
3. Đối chiếu học sinh, hóa đơn, số tiền, nội dung và giao dịch ngân hàng.
4. Xác nhận đã đối chiếu rồi duyệt, hoặc chọn yêu cầu thanh toán lại và ghi lý do.
5. Với tiền mặt, mở **Hóa đơn & thu tiền**, chọn hóa đơn và **Thu tiền mặt**.

### 9.5. Đối soát

1. Mở **Đối soát & hoàn tiền**.
2. Chọn khoảng ngày, phương thức và giới hạn tiền nếu cần.
3. Chạy đối soát.
4. So sánh thực thu, hoàn tiền, thực thu ròng và số sai lệch.
5. Mở từng sai lệch để kiểm tra đối tượng liên quan.

### 9.6. Hoàn tiền

1. Admin tạo mở giao dịch đủ điều kiện hoàn.
2. Chọn **Tạo yêu cầu hoàn tiền**.
3. Chọn hoàn một phần/toàn phần, nhập số tiền và lý do.
4. Admin thứ hai đăng nhập và mở **Đối soát & hoàn tiền**.
5. Kiểm tra yêu cầu, nhập thông tin tham chiếu chuyển tiền và duyệt hoặc từ chối.
6. Phụ huynh mở Học phí để xem trạng thái và lịch sử hoàn.

Không hoàn vượt số tiền đã thanh toán. Hóa đơn đã Hủy hoặc Hoàn toàn bộ là trạng thái kết thúc và không tiếp tục thu/hoàn theo luồng thông thường.

### 9.7. Biên nhận và lịch sử

- Admin xem toàn bộ tại **Lịch sử giao dịch**.
- Phụ huynh xem **Lịch sử giao dịch/Lịch sử hoàn tiền** trong Học phí.
- Nút tải PDF chỉ xuất hiện khi biên nhận đã được phát hành.

Cổng VNPAY/MoMo chỉ hoạt động khi nhà trường đã cấu hình tài khoản merchant và callback hợp lệ. Không coi thao tác giả lập từ trình duyệt là một thanh toán thật.

---

## 10. WEB-FINAL-17 — Tổng kết năm, công bố kết quả và chuyển lớp

### 10.1. Điều kiện bắt buộc

Trước khi chốt kết quả, phải có:

- đủ điểm theo cấu hình;
- chuyên cần đầy đủ;
- hạnh kiểm/nhận xét bắt buộc;
- quyết định kết quả của từng học sinh;
- năm học nguồn đúng trạng thái;
- năm học đích và lớp đích đã chuẩn bị.

### 10.2. GVCN rà soát

1. Mở **Lớp được phân công** và chọn lớp chủ nhiệm.
2. Kiểm tra hồ sơ, điểm, chuyên cần và nhận xét của từng học sinh.
3. Mở khu vực tổng kết/nhận xét năm học được cung cấp trong không gian Giáo viên.
4. Bổ sung nhận xét hoặc thông tin còn thiếu theo quyền.

### 10.3. Admin xem trước tổng kết

1. Mở **Báo cáo & thống kê**.
2. Chọn **Xem trước tổng kết học kỳ** hoặc **Xét và chốt kết quả năm học**.
3. Chọn năm học, học kỳ/lớp.
4. Chọn lớp cần tổng kết.
5. Chạy xem trước.
6. Đọc các blocker cụ thể của từng học sinh hoặc toàn lớp.

Xem trước không khóa điểm, không chuyển lớp và không ghi danh năm mới.

### 10.4. Xét và công bố kết quả

1. Xử lý toàn bộ blocker.
2. Chạy lại xem trước tới khi dữ liệu đủ điều kiện.
3. Kiểm tra kết quả dự kiến:
   - Được lên lớp;
   - Ở lại lớp;
   - Hoàn thành THPT;
   - Chưa hoàn tất.
4. Xác nhận chốt lớp theo hướng dẫn trên màn hình.
5. Công bố kết quả năm học.
6. Học sinh/Phụ huynh tải lại và kiểm tra kết quả đã công bố.

Trước khi công bố, Học sinh và Phụ huynh không nhìn thấy kết quả nháp.

### 10.5. Chuyển lớp sang năm học mới

1. Chuẩn bị năm học đích và các lớp đích.
2. Đóng năm học nguồn và kích hoạt năm đích theo quy trình của trường.
3. Mở chức năng chuyển lớp/ghi danh năm học mới.
4. Chọn lớp nguồn.
5. Kiểm tra lớp đích đề xuất cho từng học sinh.
6. Điều chỉnh lớp đích khi cần.
7. Chọn xem trước; nút thực hiện chỉ khả dụng khi **Sẵn sàng**.
8. Xác nhận chuyển lớp.
9. Kiểm tra số học sinh đã xử lý và danh sách ghi danh năm mới.

Mỗi học sinh chỉ có một lớp đang học trong một năm học. Không thực hiện chuyển lớp khi màn hình còn báo **Cần bổ sung/Chưa thể thực hiện**.

### 10.6. Hoàn tác

Chỉ người có quyền được hoàn tác và phải nhập lý do. Hoàn tác dùng khi phát hiện sai phạm vi/lớp đích sau khi chuyển; không dùng để thử nghiệm trên dữ liệu đang vận hành.

---

## 11. Bảng kiểm nhanh theo vai trò

### Admin đầu năm học

- [ ] Tạo/kích hoạt năm học và kiểm tra hai học kỳ.
- [ ] Chuẩn bị khối, lớp, môn, phòng và ngày nghỉ.
- [ ] Gán GVCN và phân lớp học sinh.
- [ ] Cấu hình chương trình đủ K10/K11/K12.
- [ ] Tạo và công bố kế hoạch giáo dục từng khối.
- [ ] Rà soát chuyên môn và phân công bộ môn.
- [ ] Sinh, kiểm tra và phát hành thời khóa biểu.

### Giáo viên hằng ngày

- [ ] Xem TKB cá nhân.
- [ ] Điểm danh đúng tiết/ngày.
- [ ] Nhập điểm đúng cột và ghi lý do khi sửa.
- [ ] Tạo/chấm bài tập.
- [ ] Duyệt giải trình nếu là GVCN.
- [ ] Trả lời trao đổi và đọc thông báo.

### Học sinh

- [ ] Kiểm tra lịch học và kế hoạch giáo dục.
- [ ] Theo dõi điểm/chuyên cần.
- [ ] Gửi giải trình cho lượt vắng/đi muộn nếu cần.
- [ ] Nộp bài trước hạn.
- [ ] Đọc thông báo và trao đổi đúng giáo viên.

### Phụ huynh

- [ ] Chọn đúng học sinh trước khi xem dữ liệu.
- [ ] Theo dõi lịch, điểm, chuyên cần và bài tập.
- [ ] Gửi giải trình và liên hệ GVCN khi cần.
- [ ] Kiểm tra hóa đơn, chuyển khoản đúng nội dung và gửi biên lai.
- [ ] Theo dõi kết quả đối soát, hoàn tiền và tổng kết năm.

---

## 12. Khi nào cần liên hệ hỗ trợ?

Liên hệ quản trị hệ thống và cung cấp tên tài khoản, màn hình, thời gian và nội dung lỗi khi:

- dữ liệu đã lưu nhưng tải lại bị mất;
- đúng quyền nhưng menu hoặc lớp/môn không xuất hiện;
- dữ liệu Học sinh và Phụ huynh không đồng nhất với Giáo viên/Admin;
- xuất hiện lỗi 401, 403, 404 hoặc 500 ngoài trường hợp bị từ chối đúng quyền;
- thông báo thành công nhưng không có thay đổi thực tế;
- một thao tác tạo ra bản ghi trùng;
- tệp không tải lên/tải xuống được;
- thanh toán đã được xác nhận nhưng hóa đơn không cập nhật.

Không gửi mật khẩu, mã OTP, access token, cookie, tệp `.env` hoặc khóa dịch vụ trong ảnh chụp hỗ trợ.
