# Cẩm nang vận hành Web cho người mới — Từ đầu năm học đến tổng kết

**Phiên bản:** 2026-08-21
**Đối tượng:** Quản trị viên, Giáo viên, Học sinh và Phụ huynh lần đầu sử dụng hệ thống
**Phạm vi trọng tâm:** WEB-FINAL-04, 05, 06, 08, 09, 10, 11, 14 và 17
**Mục đích:** giúp một người chưa biết hệ thống có thể hiểu đúng thứ tự nghiệp vụ, thao tác an toàn và biết kết quả phải xuất hiện ở đâu.

**Trạng thái đối chiếu:** đã rà lại với Web và Backend local ngày 21/08/2026. Hệ thống có đúng bốn vai trò `Admin`, `Giáo viên`, `Học sinh`, `Phụ huynh`; không có vai trò “Admin đối soát”. Toàn bộ đợt thu, duyệt biên lai, đối soát và hoàn tiền nằm trong tài khoản Admin chính.

> Đây là cẩm nang sử dụng, không phải tài liệu API hoặc checklist dành cho lập trình viên. Tên lớp, học sinh và số tiền trong các ví dụ chỉ dùng để minh họa; khi thao tác hãy chọn dữ liệu thật của trường.

Khi cần dữ liệu nhập cụ thể và tài khoản kiểm thử, dùng tài liệu [Bộ dữ liệu và kịch bản thao tác Web sẵn dùng — UAT31](./WEB_READY_TO_RUN_TEST_DATA_PLAYBOOK_2026-08-21.md). Đọc cẩm nang này trước, sau đó mới thực hiện UAT31.

---

## 1. Hãy bắt đầu từ câu chuyện của một năm học

Nhà trường không nên mở từng chức năng rồi nhập dữ liệu rời rạc. Hãy vận hành theo chuỗi sau:

```text
1. Chuẩn bị năm học, học kỳ, khối, lớp, môn và phòng
                         ↓
2. Tạo chương trình và kế hoạch giáo dục ở trạng thái nháp
                         ↓
3. Gán tổ hợp, phân công đủ giáo viên, công bố kế hoạch và phát hành thời khóa biểu
                         ↓
4. Giáo viên vận hành hằng ngày: điểm danh, điểm, bài tập
                         ↓
5. Học sinh và phụ huynh nhận dữ liệu, gửi phản hồi
                         ↓
6. Nhà trường thu học phí, đối soát và phát hành biên nhận
                         ↓
7. Rà soát, công bố kết quả năm và chuyển lớp
```

Một bước chỉ được coi là hoàn thành khi người tạo **và người nhận** đều nhìn thấy cùng dữ liệu.

Ví dụ:

- Admin phát hành thời khóa biểu nhưng Giáo viên/Học sinh/Phụ huynh chưa thấy: luồng chưa hoàn thành.
- Giáo viên lưu điểm nhưng Học sinh/Phụ huynh chưa thấy điểm mới: luồng chưa hoàn thành.
- Phụ huynh gửi biên lai nhưng Admin chưa thấy mục chờ đối soát: luồng chưa hoàn thành.

---

## 2. Bốn vai trò và cách phối hợp

| Vai trò | Làm gì trên Web? | Không nên làm gì? |
|---|---|---|
| **Quản trị viên** | Chuẩn bị cơ cấu, kế hoạch, phân công, TKB, khảo thí, tài chính và tổng kết | Không nhập điểm hoặc điểm danh thay Giáo viên nếu không có quy trình điều chỉnh chính thức |
| **Giáo viên** | Xem lớp/TKB, điểm danh, nhập điểm, giao bài, chấm bài, trao đổi | Không sửa dữ liệu lớp hoặc môn ngoài phạm vi được phân công |
| **Học sinh** | Xem lịch, điểm, chuyên cần, bài tập, thông báo và kết quả năm | Không dùng tài khoản của Phụ huynh hoặc bạn học |
| **Phụ huynh** | Chọn con, theo dõi học tập, giải trình chuyên cần, trao đổi và học phí | Không thao tác khi chưa kiểm tra đúng học sinh đang được chọn |

### Quy tắc chuyển giao giữa các vai trò

| Người thực hiện | Dữ liệu tạo ra | Người cần kiểm tra tiếp |
|---|---|---|
| Admin | Lớp, GVCN, phân lớp | Giáo viên, Học sinh, Phụ huynh |
| Admin | Kế hoạch giáo dục đã công bố | Giáo viên, Học sinh, Phụ huynh |
| Admin | TKB đã phát hành | Giáo viên, Học sinh, Phụ huynh |
| Giáo viên | Điểm danh | Học sinh, Phụ huynh, báo cáo |
| Giáo viên | Điểm | Học sinh, Phụ huynh, lịch sử sửa điểm |
| Giáo viên | Bài tập | Học sinh nộp, Phụ huynh theo dõi |
| Học sinh | Bài nộp | Đúng Giáo viên chấm |
| Phụ huynh | Biên lai chuyển khoản | Admin kiểm tra và xác nhận tại tab Biên lai |
| Admin | Kết quả năm đã công bố | Học sinh, Phụ huynh |

---

## 3. Trước khi thao tác: 7 điều phải kiểm tra

1. Đang đăng nhập đúng vai trò và đúng tài khoản.
2. Đang chọn đúng năm học, học kỳ, khối, lớp và học sinh.
3. Danh sách đã tải xong; không bấm lại khi còn dòng **Đang xử lý**.
4. Nếu danh sách dài, dùng tìm kiếm, bộ lọc và phân trang thay vì cuộn toàn bộ.
5. **Bản nháp** chưa xuất hiện ở vai trò khác; **Đã công bố/Đã phát hành** mới là dữ liệu chính thức.
6. Sau khi lưu, tải lại trang để chắc chắn dữ liệu đã được ghi.
7. Không gửi mật khẩu, mã OTP, tệp `.env`, access token hoặc khóa dịch vụ cho người hỗ trợ.

> Admin không cần đăng xuất sang một tài khoản tài chính khác. Mọi thao tác tài chính đều ở **Tài chính nội bộ**, nhưng xác nhận biên lai và hoàn tiền vẫn là hai bước riêng, có kiểm tra chứng từ và audit log.

### Khi nào phải dừng lại?

Dừng thao tác và kiểm tra lại nếu gặp một trong các tình huống:

- danh sách lớp/phòng hiển thị sĩ số hoặc sức chứa mâu thuẫn;
- chương trình chưa áp dụng hoặc kế hoạch chưa công bố;
- readiness TKB báo thiếu giáo viên, thiếu phòng hoặc còn xung đột;
- Web và Mobile hiển thị khác nhau;
- hệ thống báo thành công nhưng tải lại không có dữ liệu;
- xuất hiện lỗi 401, 403, 404 hoặc 500 không đúng ngữ cảnh.

Không tạo thêm một bản ghi giống hệt để “thử lại”, vì có thể làm dữ liệu trùng hoặc khó đối soát.

---

## 4. Kịch bản mẫu dùng xuyên suốt tài liệu

Để dễ hình dung, tài liệu dùng câu chuyện sau:

- Năm học: **2026–2027**.
- Học kỳ: **Học kỳ 1**.
- Khối: **Khối 11**.
- Lớp: **11A2**.
- Môn: **Toán**.
- Giáo viên Toán: **Nguyễn Thị Mai An**.
- GVCN lớp 11A2 trong bộ dữ liệu local: **Lương Thanh Bình**.
- Học sinh: **Vũ Phương Thảo**.
- Phụ huynh: **Vũ Thanh Vân**.

Bạn có thể thay các giá trị trên bằng dữ liệu thật của trường, nhưng không đổi thứ tự nghiệp vụ.

---

## PHẦN A — CHUẨN BỊ ĐẦU NĂM HỌC

## 5. WEB-FINAL-04 — Cơ cấu đào tạo và phân lớp

### 5.1. Mục tiêu

Sau phần này, hệ thống phải biết:

- đang vận hành năm học và học kỳ nào;
- trường có những khối, lớp, môn và phòng nào;
- mỗi lớp chứa tối đa bao nhiêu học sinh;
- ai là GVCN;
- mỗi học sinh đang thuộc lớp nào.

### 5.2. Người thực hiện

**Admin → Cơ cấu đào tạo**.

### 5.3. Thứ tự thao tác đúng

#### Bước 1 — Kiểm tra hoặc tạo năm học

1. Mở tab **Năm học**.
2. Nhập mã theo dạng `YYYY-YYYY` và tên năm học. Hệ thống tự sinh ngày năm học cùng hai học kỳ từ mã này.
3. Chọn **Tạo năm học**.
4. Kiểm tra Học kỳ 1 và Học kỳ 2:
   - không chồng ngày;
   - đều nằm trong năm học;
   - Học kỳ 1 kết thúc trước Học kỳ 2.
5. Chỉ chọn **Kích hoạt** khi đã sẵn sàng chuyển năm hiện hành.

**Kết quả đúng:** chỉ có một năm học đang hoạt động và hai học kỳ có ngày hợp lệ.

#### Bước 2 — Chuẩn bị môn và phòng

1. Mở **Môn học**, kiểm tra mã, tên, loại môn, cách đánh giá và loại phòng.
2. Mở **Phòng học**, tạo hoặc sửa:
   - mã và tên phòng;
   - loại phòng;
   - sức chứa.
3. Đặt sức chứa theo điều kiện thật của từng phòng, không mặc định mọi phòng là 45.

**Ví dụ:** phòng thường 40 chỗ, phòng thí nghiệm 32 chỗ, phòng máy 36 chỗ, nhà thể chất 60 chỗ.

#### Bước 3 — Tạo lớp

1. Mở **Lớp & phân lớp**.
2. Chọn đúng năm học và khối.
3. Nhập mã lớp, tên lớp, sĩ số tối đa và phòng phù hợp.
4. Chọn **Tạo lớp**.
5. Tải lại và đối chiếu sĩ số tối đa với sức chứa phòng.

Không tạo lớp có sĩ số tối đa lớn hơn sức chứa phòng nếu lớp dùng phòng đó làm phòng cố định.

#### Bước 4 — Gán GVCN

1. Tại dòng lớp, mở danh sách GVCN.
2. Chọn giáo viên chưa chủ nhiệm lớp khác trong cùng năm.
3. Chờ thông báo thành công.
4. Tải lại và kiểm tra tên GVCN.

Nếu giáo viên đã chủ nhiệm lớp khác, hãy chọn người khác hoặc thực hiện quy trình đổi GVCN; không bấm lặp lại khi hệ thống đã từ chối.

#### Bước 5 — Phân học sinh

1. Mở lớp cần quản lý.
2. Kiểm tra **sĩ số hiện tại / sĩ số tối đa**.
3. Tìm học sinh chưa có lớp bằng tên hoặc mã.
4. Chọn học sinh, nhập lý do và chọn **Xem trước**.
5. Kiểm tra:
   - lớp không vượt sức chứa;
   - học sinh không có hai lớp đang học trong cùng năm;
   - tổng số trước và sau khi phân là hợp lý.
6. Chọn **Áp dụng/Phân lớp**.
7. Tải lại danh sách lớp.

### 5.4. Bàn giao sang vai trò khác

- Giáo viên mở **Lớp được phân công** và thấy đúng lớp/danh sách học sinh.
- Học sinh mở **Hồ sơ cá nhân** và thấy lớp thật từ hệ thống.
- Phụ huynh mở **Chọn học sinh** và thấy đúng lớp của từng con.

Trường hồ sơ chưa nhập phải hiện **Chưa cập nhật**, không được thay bằng dữ liệu minh họa.

### 5.5. Sai lầm người mới thường gặp

| Hiện tượng | Nên làm gì? |
|---|---|
| Không kích hoạt được năm học | Tải lại, kiểm tra mã/ngày và năm học đang hoạt động |
| Không chọn được GVCN | Kiểm tra giáo viên đã chủ nhiệm lớp khác hay chưa |
| Không thấy học sinh | Kiểm tra năm học, trạng thái tài khoản và học sinh đã có lớp chưa |
| Lớp vượt sức chứa | Chuyển bớt học sinh hoặc chọn phòng/lớp có sức chứa phù hợp |
| Sĩ số ở hai màn khác nhau | Dừng phân lớp, tải lại và báo Admin kỹ thuật; không tiếp tục thêm học sinh |

### 5.6. Import Excel đúng cách

Trong phiên bản hiện tại, màn import Web được dùng tốt nhất cho **Học sinh + Phụ huynh + quan hệ PH–HS**.

1. Mở **Người dùng & phân quyền** và chuẩn bị lớp đích trước khi nhập.
2. Dùng đúng file mẫu đã được nhà trường/UAT cung cấp. Nếu nút **Tệp mẫu** báo lỗi, không tự chế cột; dùng sheet `IMPORT READY` trong bộ UAT và báo người phụ trách hệ thống.
3. Giữ nguyên các cột: mã/tên học sinh, thông tin liên hệ và tài khoản học sinh, mã lớp, thông tin liên hệ và tài khoản phụ huynh.
4. Mỗi dòng là một học sinh và phụ huynh liên quan. Hai anh/chị/em có thể dùng lại cùng điện thoại/email/tài khoản phụ huynh.
5. Bắt buộc có mã học sinh, tên học sinh, mã lớp, tên phụ huynh và ít nhất một trong hai trường điện thoại/email phụ huynh.
6. Kiểm tra ngoại tuyến toàn bộ mã lớp, mã học sinh, email và số điện thoại trước khi chọn **Nhập Excel**.
7. Chọn file đúng **một lần**. Web hiện ghi dữ liệu ngay và trả kết quả theo từng dòng; chưa có bước Xem trước/Commit riêng.
8. Đọc số dòng tạo mới, cập nhật, liên kết và lỗi; sau đó tải lại danh sách, tìm mã học sinh và đăng nhập thử một phụ huynh.
9. Tài khoản mới được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.

Không tải cùng một file lần hai để “thử lại”. Nếu có dòng lỗi, sửa thành một file mới chỉ chứa các dòng lỗi chưa được ghi. Admin và Giáo viên được tạo ở màn quản lý người dùng; importer này không dùng để tạo hai loại tài khoản đó.

---

## 6. WEB-FINAL-05 — Chương trình và kế hoạch giáo dục

### 6.1. Hiểu đúng trước khi nhập

| Thành phần | Ý nghĩa |
|---|---|
| **Chương trình giáo dục** | Khung chuẩn: khối học môn nào, số tiết HK1/HK2 là bao nhiêu |
| **Kế hoạch giáo dục năm học** | Cách trường triển khai chương trình trong năm cụ thể theo nội dung, tuần và đánh giá |

Các con số **HK1, HK2, Cả năm** là số tiết của **chính môn đang cấu hình**.

Ví dụ theo chương trình local hiện tại: Toán 35 tiết HK1 + 35 tiết HK2 = 70 tiết cả năm. Ngữ văn cũng có thể là 35 + 35 = 70; hai môn có quỹ thời lượng riêng, không trừ số tiết của nhau.

### 6.2. Chuẩn bị chương trình

1. Admin mở **Cơ cấu đào tạo → Chương trình**.
2. Chọn chương trình đang có hoặc tạo chương trình mới.
3. Với từng khối 10, 11, 12, dùng **Tự động cấu hình** để tạo bộ môn chuẩn ban đầu.
4. Rà soát từng môn:
   - bắt buộc, lựa chọn, chuyên đề hay hoạt động;
   - số tiết HK1, HK2;
   - số tiết/tuần;
   - yêu cầu đánh giá định kỳ.
5. Chọn **Lưu số tiết**.
6. Nếu thêm nhầm môn trong bản nháp, chọn **Xóa khỏi chương trình nháp**.
7. Khi đủ ba khối, chuyển chương trình sang trạng thái áp dụng.

### 6.3. Tạo kế hoạch năm học theo 5 bước

1. Mở **Kế hoạch giáo dục năm học**.
2. Chọn năm học, khối và chương trình **Đang áp dụng**.
3. Tạo kế hoạch rồi thực hiện lần lượt:

#### Bước 1 — Môn học và thời lượng

- Chọn **Đồng bộ từ chương trình**.
- Kiểm tra đủ môn, số tiết/tuần, tổng tiết và ngày học.
- Chỉ chỉnh tay khi có nghiệp vụ đặc biệt.

#### Bước 2 — Nội dung môn học

- Chọn môn.
- Sau **Đồng bộ từ chương trình**, hệ thống đã tạo khung giai đoạn, chương, chủ đề và bài học cơ bản. Hãy sửa tên/nội dung của khung này trước khi tạo thêm.
- Chỉ thêm giai đoạn/chủ đề/bài học mới khi đồng thời điều chỉnh số tiết của các mục khác để tổng không đổi.
- Tổng tiết nội dung phải bằng tổng tiết của môn.

#### Bước 3 — Phân phối theo tuần

- Chọn học kỳ và tuần.
- Rà soát các dòng phân phối được tạo tự động, sau đó gắn bài học/nội dung cụ thể vào từng tuần.
- Khai báo ngày nghỉ hoặc tuần đặc biệt.
- Kiểm tra số tiết đã phân phối và số tiết còn thiếu.

#### Bước 4 — Kiểm tra và đánh giá

- Rà soát kế hoạch giữa kỳ/cuối kỳ đã sinh tự động; chỉ tạo thêm loại đánh giá còn thiếu.
- Chọn phạm vi toàn khối hoặc lớp.
- Ghi tuần dự kiến, hình thức và thời lượng.

#### Bước 5 — Kiểm tra và công bố

- Mở bộ lọc **Lỗi** trước, xử lý toàn bộ lỗi bắt buộc.
- Đọc **Cảnh báo** và xác nhận chúng có chấp nhận được hay không.
- Nếu lỗi còn lại là **Lớp chưa được gán tổ hợp** hoặc **Môn chưa có giáo viên phụ trách**, giữ kế hoạch ở bản nháp, hoàn thành mục 7.2 rồi quay lại bước này.
- Khi tổ hợp, chuyên môn và phân công đã đủ, Admin chọn **Kiểm tra và công bố**.
- Sau công bố, kế hoạch chỉ đọc; muốn sửa phải tạo phiên bản điều chỉnh.

### 6.4. Kết quả phải chuyển sang đâu?

- Giáo viên thấy kế hoạch thuộc môn/lớp của mình.
- Học sinh chỉ thấy bản đã công bố.
- Phụ huynh thấy kế hoạch của đúng con đang chọn.
- Chức năng xếp TKB nhận kế hoạch này làm dữ liệu nguồn.

### 6.5. Khi hệ thống báo lệch số tiết

1. Quay lại chương trình và chọn đúng khối.
2. Kiểm tra môn đã được lưu, không chỉ mới nhập trên form.
3. Đồng bộ lại kế hoạch từ chương trình.
4. So sánh tổng tiết môn với tổng nội dung và tổng phân phối tuần.
5. Không tăng tùy ý mọi môn lên cùng một con số để hết cảnh báo.

---

## 7. WEB-FINAL-06 — Phân công giáo viên và thời khóa biểu

### 7.1. Điều kiện trước khi bắt đầu

- Kế hoạch của đúng khối đã đồng bộ đủ môn/nội dung và đang chờ hoàn tất phân công để công bố.
- Mỗi lớp/môn có giáo viên và số tiết/tuần.
- Giáo viên có chuyên môn phù hợp.
- Phòng chuyên dụng đã đủ sức chứa.
- Ngày nghỉ đã khai báo.

### 7.2. Phân công giáo viên

1. Mở **Admin → Xếp thời khóa biểu → Phân công bộ môn**.
2. Chọn năm học và học kỳ.
3. Rà soát từng lớp/môn, giáo viên và số tiết.
4. Mỗi môn áp dụng cho lớp trong kế hoạch đang chuẩn bị phải có một phân công tương ứng cho học kỳ đang xếp; không chỉ phân công môn dùng để demo.
5. Kiểm tra chuyên môn, tổng tải của giáo viên và loại phòng.
6. Bổ sung toàn bộ dòng readiness còn thiếu trước khi chạy thuật toán.
7. Quay lại **Cơ cấu đào tạo → Kế hoạch giáo dục năm học → Kiểm tra và công bố**; chỉ công bố khi không còn lỗi bắt buộc.

### 7.3. Tạo TKB tự động

1. Mở **Xếp lịch tự động**.
2. Chọn học kỳ và phạm vi khối/toàn trường.
3. Chọn **Kiểm tra lại**.
4. Đọc readiness:
   - lỗi chặn: phải sửa trước;
   - cảnh báo: cần hiểu nguyên nhân trước khi tiếp tục.
5. Nhập tên bản lịch và thời gian giải.
6. Chọn **Tạo lịch tự động** một lần và chờ hoàn tất.
7. Với bản nháp, kiểm tra:
   - đủ số tiết;
   - không trùng lớp, giáo viên, phòng;
   - không xếp vào ngày nghỉ;
   - đúng loại phòng;
   - tải giáo viên/ngày hợp lý;
   - các lớp cùng khối không lệch tiến độ quá mức.
8. Dùng **Chỉnh lịch thủ công** cho một số trường hợp đặc biệt.
9. Kiểm tra lại sau khi chỉnh.
10. Chỉ chọn **Phát hành** khi không còn lỗi nghiêm trọng.

### 7.4. Nếu thuật toán không xếp được

Không bấm Generate liên tục. Hãy đọc nhóm xung đột và xử lý theo thứ tự:

1. Giáo viên vượt số tiết tối đa/ngày → chia lại lớp hoặc bổ sung giáo viên.
2. Thiếu giáo viên chuyên môn → cập nhật chuyên môn và phân công.
3. Thiếu phòng chuyên dụng → thêm phòng hoặc điều chỉnh yêu cầu phòng.
4. Trùng ngày nghỉ/khung giờ → cập nhật lịch nghỉ hoặc ràng buộc.
5. Chỉ tăng thời gian giải sau khi dữ liệu đầu vào đã hợp lý.

### 7.5. Bàn giao sau phát hành

- Giáo viên mở **TKB cá nhân**.
- Học sinh mở **Theo dõi học thuật → Thời khóa biểu**.
- Phụ huynh chọn đúng con rồi mở **Giám sát học tập → Thời khóa biểu**.

Cả ba vai trò phải thấy cùng phiên bản. Bản nháp không được xuất hiện.

---

## PHẦN B — VẬN HÀNH HẰNG NGÀY

## 8. WEB-FINAL-08 — Điểm danh và giải trình chuyên cần

### 8.1. Giáo viên điểm danh

1. Mở **Sổ điểm danh**.
2. Chọn đúng tiết và ngày học theo TKB đã phát hành.
3. Chọn **Tất cả có mặt**, sau đó sửa từng trường hợp khác.
4. Chọn trạng thái: Có mặt, Đi muộn, Vắng có phép hoặc Vắng không phép.
5. Ghi chú cho trường hợp không Có mặt.
6. Kiểm tra tổng sĩ số rồi chọn **Lưu điểm danh**.
7. Tải lại để xác nhận.

Nếu màn hình không có tiết để chọn, quay lại kiểm tra TKB và phân công; không tự tạo một buổi học không thuộc lịch.

### 8.2. Học sinh/Phụ huynh gửi đơn xin phép cho bản ghi đã có

1. Mở **Chuyên cần**.
2. Chọn bản ghi Đi muộn hoặc Vắng không phép.
3. Nhập lý do rõ ràng và gửi.
4. Theo dõi trạng thái chờ duyệt/đã duyệt/từ chối.

Web hiện không tạo đơn nghỉ trước bằng cách tự chọn một ngày tương lai. Phải có bản ghi **Đi muộn** hoặc **Vắng không phép** do Giáo viên đã lưu thì Học sinh/Phụ huynh mới gửi đơn xin phép được.

### 8.3. GVCN xử lý

1. Mở **Sổ điểm danh → Đơn xin nghỉ chờ duyệt**.
2. Kiểm tra học sinh, ngày, môn và lý do.
3. Chọn **Duyệt** hoặc **Từ chối**, kèm ghi chú khi cần.
4. Người gửi tải lại để xem kết quả.

Nếu trường cần xin nghỉ trước ngày học, không dùng form giải trình hiện tại thay cho nghiệp vụ đó; hãy xác nhận chức năng xin nghỉ trước đã được triển khai trước khi đưa vào quy trình chính thức.

---

## 9. WEB-FINAL-09 — Thêm, sửa và xem điểm

### 9.1. Admin cấu hình đầu điểm

1. Mở **Khảo thí & lịch thi → Cấu hình theo môn**.
2. Chọn khối, học kỳ và môn.
3. Khai báo số cột Miệng, 15 phút, Giữa kỳ, Cuối kỳ và trọng số.
4. Lưu rồi kiểm tra sổ điểm Giáo viên có đúng số cột.

### 9.2. Giáo viên nhập điểm

1. Mở **Bảng điểm**.
2. Chọn đúng học kỳ và lớp giảng dạy.
3. Kiểm tra tên môn được lấy từ phân công.
4. Nhập điểm 0–10 vào đúng cột.
5. Nếu sửa điểm đã có, nhập **Lý do điều chỉnh**.
6. Chọn **Lưu sổ điểm**.
7. Tải lại và mở lịch sử sửa điểm.

### 9.3. Học sinh và Phụ huynh kiểm tra

- Học sinh: **Theo dõi học thuật → Điểm**, chọn đúng học kỳ.
- Phụ huynh: chọn đúng con → **Giám sát học tập → Điểm**.

Điểm mới phải xuất hiện đúng môn, đúng học kỳ và đúng loại điểm.

### 9.4. Lưu ý tránh trùng điểm

Nếu một màn báo thiếu điểm nhưng màn khác vẫn hiển thị điểm ở cùng loại:

1. không nhập lại ngay;
2. kiểm tra đúng học kỳ và học sinh;
3. tải lại cả hai màn;
4. ghi lại môn, loại điểm, giá trị và thời gian;
5. gửi cho Admin kỹ thuật đối chiếu trước khi tiếp tục.

Việc nhập lại có thể tạo một đầu điểm thứ hai ngoài ý muốn.

---

## 10. WEB-FINAL-10 — Bài tập, nộp bài và chấm bài

### 10.1. Giáo viên tạo bài

1. Mở **Bài tập**.
2. Chọn lớp và môn được phân công.
3. Nhập tiêu đề, hạn nộp và yêu cầu.
4. Chọn tệp đề đúng định dạng được hỗ trợ.
5. Chọn **Lưu nháp** nếu cần rà soát.
6. Mở lại bản nháp và chọn **Phát hành**.

Trước khi phát hành, kiểm tra kỹ lớp, môn, hạn và tệp vì học sinh/phụ huynh sẽ nhận dữ liệu chính thức.

### 10.2. Học sinh nộp bài

1. Mở **Nộp bài tập**.
2. Chọn bài, đọc yêu cầu và tải tệp đề.
3. Nhập nội dung hoặc chọn tệp bài làm.
4. Chọn **Nộp bài**.
5. Kiểm tra trạng thái và thời gian nộp.

### 10.3. Giáo viên chấm

1. Mở bài tập → **Xem bài nộp**.
2. Chọn học sinh và mở tệp thật.
3. Nhập điểm, nhận xét rồi lưu.
4. Nếu cho nộp lại, ghi lý do và thời hạn mới.

### 10.4. Phụ huynh theo dõi

Chọn đúng con → **Giám sát học tập → Bài tập**, kiểm tra trạng thái nộp, điểm và nhận xét.

Luồng hoàn chỉnh là:

```text
GV lưu nháp → GV phát hành → HS nộp → GV chấm → HS/PH thấy kết quả
```

---

## 11. WEB-FINAL-11 — Trao đổi và thông báo

### 11.1. Tin nhắn cá nhân

- Phụ huynh chọn đúng con rồi mở **Liên lạc GVCN**.
- Học sinh mở **Trao đổi giáo viên**.
- Giáo viên mở **Trao đổi** để đọc và trả lời.

Danh bạ chỉ hiển thị người liên quan theo lớp, môn hoặc GVCN. Trong bộ dữ liệu local, GVCN của 11A2 là **Lương Thanh Bình (`gv.gdqp`)**, không phải Giáo viên Toán. Không chia sẻ mật khẩu, thông tin thanh toán hoặc hồ sơ nhạy cảm trong chat.

### 11.2. Thông báo lớp

1. Giáo viên mở **Thông báo tự động**.
2. Chọn lớp và nhóm nhận: Học sinh, Phụ huynh hoặc cả hai.
3. Kiểm tra số người nhận.
4. Soát lại tiêu đề/nội dung rồi gửi.

### 11.3. Thông báo nhà trường

1. Admin mở **Trung tâm thông báo**.
2. Chọn toàn trường, vai trò, khối hoặc lớp.
3. Kiểm tra số người dự kiến nhận và xem trước.
4. Gửi một lần.
5. Kiểm tra lịch sử gửi; chỉ retry bản lỗi.

Không bấm gửi liên tục khi mạng chậm vì có thể tạo nhiều thông báo giống nhau.

---

## PHẦN C — TÀI CHÍNH VÀ CUỐI NĂM

## 12. WEB-FINAL-14 — Đợt thu, hóa đơn và thanh toán

### 12.1. Admin tạo đợt thu

1. Mở **Tài chính nội bộ → Đợt thu**.
2. Tạo đợt thu với mã, tên, loại khoản, năm/học kỳ và hạn nộp.
3. Chọn phạm vi: toàn trường, khối, lớp hoặc học sinh.
4. Thêm từng khoản thu và số tiền.
5. Lưu bản nháp, kiểm tra rồi chọn **Mở**.
6. Chọn **Xem trước**.
7. Đối chiếu số học sinh, số hóa đơn và tổng tiền.
8. Chỉ chọn **Phát hành** khi số liệu đúng.

### 12.2. Phụ huynh thanh toán

1. Chọn đúng con rồi mở **Học phí**.
2. Chọn hóa đơn chưa đóng.
3. Kiểm tra số tiền, tài khoản nhận và nội dung chuyển khoản.
4. Chọn **Chuyển khoản MB**, quét VietQR hoặc dùng thông tin ngân hàng được hiển thị.
5. Chọn ảnh biên lai JPG/PNG/PDF hợp lệ và **Gửi biên lai cho Admin**.
6. Chờ nhà trường đối soát.

Gửi biên lai không đồng nghĩa hóa đơn đã thanh toán. Chỉ sau khi Admin xác nhận, trạng thái mới chuyển sang Đã thanh toán hoặc Thanh toán một phần.

### 12.3. Admin xác nhận biên lai chuyển khoản

1. Mở **Tài chính nội bộ → Biên lai**.
2. Mở biên lai, kiểm tra học sinh, hóa đơn, số tiền, nội dung và chứng từ.
3. Chỉ tích **Đã đối chiếu trên tài khoản MB** khi tiền thực sự đã vào đúng số tiền/nội dung.
4. Chọn **Xác nhận đã thu**, hoặc nhập lý do rồi **Yêu cầu thanh toán lại**.
5. Kiểm tra **Lịch sử giao dịch** và phát hành biên nhận nếu cần.

Tab **Đối soát & hoàn tiền** không thay cho bước duyệt biên lai. Tab này dùng để chạy tổng hợp sổ thu theo khoảng ngày/phương thức và xử lý các yêu cầu hoàn tiền.

### 12.4. Hoàn tiền

1. Admin mở **Lịch sử giao dịch**, tìm giao dịch `SUCCESS` còn số tiền có thể hoàn và chọn **Yêu cầu hoàn**.
2. Nhập hoàn toàn bộ/một phần và lý do; yêu cầu mới chỉ giữ chỗ số tiền, chưa đổi hóa đơn.
3. Mở **Đối soát & hoàn tiền**, chọn yêu cầu đang chờ và kiểm tra lại hóa đơn, giao dịch, chứng từ.
4. Khi duyệt, chọn phương thức, nhập mã tham chiếu nếu không hoàn tiền mặt và tích xác nhận đã hoàn tiền thực tế; hoặc từ chối/hủy kèm lý do.
5. Audit log lưu riêng thao tác tạo và xử lý; Phụ huynh xem trạng thái và lịch sử hoàn.

Không hoàn vượt số tiền đã thu. Không coi callback giả lập từ trình duyệt là thanh toán thật.

---

## 13. WEB-FINAL-17 — Tổng kết năm và chuyển lớp

### 13.1. Điều kiện bắt buộc

- đủ điểm theo cấu hình;
- chuyên cần đầy đủ;
- có nhận xét/hạnh kiểm bắt buộc;
- có kết quả dự kiến của từng học sinh;
- năm và lớp đích đã chuẩn bị;
- dữ liệu nguồn đã được rà soát.

### 13.2. GVCN rà soát

1. Mở lớp chủ nhiệm.
2. Kiểm tra điểm, chuyên cần, nhận xét và hồ sơ.
3. Bổ sung dữ liệu còn thiếu theo quyền.

### 13.3. Admin xem trước và công bố

1. Mở **Báo cáo & thống kê**.
2. Chọn **Xem trước tổng kết học kỳ** hoặc **Xét và chốt kết quả năm học**.
3. Chọn đúng năm, học kỳ và lớp.
4. Chạy xem trước.
5. Xử lý từng blocker; xem trước không tự chuyển lớp.
6. Chạy lại đến khi đủ điều kiện.
7. Kiểm tra kết quả dự kiến rồi công bố.

### 13.4. Chuyển lớp

1. Chuẩn bị năm/lớp đích.
2. Chọn lớp nguồn.
3. Kiểm tra lớp đích đề xuất cho từng học sinh.
4. Chỉnh khi cần rồi xem trước.
5. Chỉ thực hiện khi màn hình báo **Sẵn sàng**.
6. Sau khi chạy, kiểm tra mỗi học sinh chỉ có một lớp đang học trong năm mới.

Không dùng chức năng hoàn tác để thử nghiệm trên dữ liệu thật. Hoàn tác chỉ dành cho sai sót đã xác minh và bắt buộc ghi lý do.

---

## 14. Một buổi thực hành hoàn chỉnh cho người mới

Thực hiện trên dữ liệu test hoặc bản sao database.

### Chặng 1 — Admin chuẩn bị

1. Kiểm tra năm 2026–2027 và hai học kỳ.
2. Kiểm tra Khối 11, lớp 11A2, phòng và sức chứa.
3. Kiểm tra Lương Thanh Bình là GVCN và Vũ Phương Thảo thuộc đúng lớp.
4. Kiểm tra chương trình Khối 11.
5. Đồng bộ và công bố kế hoạch giáo dục.
6. Phân công Nguyễn Thị Mai An dạy Toán 11A2.
7. Sinh, kiểm tra và phát hành TKB.

### Chặng 2 — Các vai trò nhận dữ liệu

1. Giáo viên thấy lớp 11A2 và TKB dạy Toán.
2. Học sinh thấy lớp và TKB học.
3. Phụ huynh chọn Vũ Phương Thảo và thấy cùng TKB.

### Chặng 3 — Vận hành một buổi học

1. Giáo viên mở đúng tiết Toán và điểm danh.
2. Giáo viên nhập/sửa một điểm, có lý do khi sửa.
3. Học sinh và Phụ huynh kiểm tra điểm/chuyên cần.
4. Giáo viên tạo bản nháp bài tập rồi phát hành.
5. Học sinh nộp bài.
6. Giáo viên chấm và phản hồi.
7. Phụ huynh thấy trạng thái và kết quả.

### Chặng 4 — Trao đổi

1. Phụ huynh nhắn GVCN Lương Thanh Bình về tình hình học tập.
2. Giáo viên trả lời.
3. Giáo viên gửi thông báo lớp.
4. Học sinh/Phụ huynh mở thông báo và kiểm tra badge chưa đọc giảm.

### Chặng 5 — Tài chính

1. Admin tạo đợt thu phạm vi riêng cho Vũ Phương Thảo.
2. Xem trước rồi phát hành đúng một hóa đơn.
3. Phụ huynh kiểm tra hóa đơn và gửi biên lai.
4. Admin vào **Biên lai**, đối chiếu MB và xác nhận đã thu.
5. Phụ huynh thấy trạng thái/biên nhận mới.

### Chặng 6 — Cuối năm

1. GVCN hoàn thành nhận xét.
2. Admin chạy xem trước tổng kết.
3. Xử lý blocker.
4. Công bố kết quả.
5. Học sinh/Phụ huynh xem kết quả.
6. Admin xem trước và thực hiện chuyển lớp khi đủ điều kiện.

---

## 15. Lịch sử dụng khuyến nghị

### Admin đầu năm

- Chuẩn bị năm/học kỳ, lớp, môn, phòng và sĩ số.
- Import/phân lớp học sinh và gán GVCN.
- Áp dụng chương trình và công bố kế hoạch.
- Phân công giáo viên, sinh và phát hành TKB.

### Giáo viên mỗi ngày

- Kiểm tra TKB.
- Điểm danh đúng tiết.
- Cập nhật điểm đúng cột.
- Theo dõi bài nộp, tin nhắn và thông báo.

### Giáo viên mỗi tuần

- Cập nhật tiến độ giảng dạy.
- Rà soát học sinh thiếu điểm/bài tập.
- Kiểm tra các giải trình chuyên cần nếu là GVCN.

### Phụ huynh mỗi tuần

- Chọn đúng con.
- Kiểm tra lịch, chuyên cần, điểm, bài tập và thông báo.
- Chỉ liên hệ GVCN/Giáo viên khi đã ghi rõ học sinh và vấn đề.

### Admin cuối tháng/học kỳ

- Rà soát báo cáo điểm, chuyên cần và công nợ.
- Kiểm tra audit của các thay đổi quan trọng.
- Đối soát thanh toán/hoàn tiền.
- Chạy xem trước tổng kết, chưa chốt khi còn blocker.

---

## 16. Cách tự xác nhận một thao tác đã thành công

Sau mỗi thao tác quan trọng, dùng quy tắc **5 kiểm tra**:

1. **Thông báo:** giao diện báo thành công rõ ràng.
2. **Tải lại:** dữ liệu vẫn còn sau refresh.
3. **Đúng phạm vi:** đúng lớp, môn, học kỳ, học sinh.
4. **Đúng người nhận:** vai trò liên quan nhìn thấy dữ liệu.
5. **Không trùng:** danh sách/audit chỉ có số bản ghi mong đợi.

Nếu thiếu một trong năm điều trên, chưa nên chuyển sang bước tiếp theo.

---

## 17. Bảng xử lý nhanh khi có lỗi

| Triệu chứng | Việc người dùng nên làm |
|---|---|
| 401 | Đăng nhập lại; nếu lặp lại, báo Admin kiểm tra phiên |
| 403 | Kiểm tra tài khoản có đúng lớp/môn/con được liên kết không |
| 404 | Ghi lại màn hình và thao tác; có thể Web và Backend chưa cùng phiên bản |
| 500 | Không bấm lặp; ghi thời gian, màn hình và dữ liệu vừa chọn rồi báo hỗ trợ |
| Danh sách trống | Kiểm tra bộ lọc, năm/học kỳ và dữ liệu tiền đề |
| Web/Mobile khác nhau | Tải lại cả hai; không nhập lại dữ liệu trước khi đối chiếu |
| TKB không sinh được | Đọc readiness, sửa tải GV/phòng/ràng buộc trước khi chạy lại |
| Điểm không đúng cột | Dừng nhập, ghi môn/học kỳ/loại điểm và báo Admin kỹ thuật |
| Thanh toán chưa đổi trạng thái | Kiểm tra biên lai đã được Admin nhà trường đối soát chưa |
| Không chọn được lớp khi tổng kết | Kiểm tra lớp thuộc đúng năm và đã có dữ liệu bắt buộc |

Khi gửi yêu cầu hỗ trợ, cung cấp:

- tên tài khoản, vai trò;
- thời gian xảy ra;
- màn hình và bộ lọc đã chọn;
- mã lớp/học sinh/hóa đơn liên quan;
- ảnh chụp thông báo lỗi.

Không gửi mật khẩu, token, cookie, `.env` hoặc khóa dịch vụ.

---

## 18. Những điều tuyệt đối không nên làm

- Không kích hoạt năm mới khi chưa chuẩn bị lớp và dữ liệu kế tiếp.
- Không sửa trực tiếp kế hoạch/TKB đã công bố nếu hệ thống yêu cầu phiên bản mới.
- Không bấm phát hành khi readiness còn lỗi nghiêm trọng.
- Không nhập lại điểm chỉ vì một màn chưa hiển thị.
- Không tạo hóa đơn trước khi xem trước đúng số học sinh và tổng tiền.
- Không xác nhận thanh toán khi chưa đối chiếu giao dịch.
- Không duyệt hoàn tiền khi chưa kiểm tra chứng từ, xác nhận thực tế và nhập mã tham chiếu bắt buộc.
- Không chốt/chuyển lớp khi còn blocker.
- Không dùng dữ liệu production để thực hành lần đầu.

---

## 19. Khi nào có thể nói “tôi đã dùng đúng luồng”?

Bạn đã vận hành đúng khi:

- dữ liệu đầu năm được tạo một lần, có quan hệ rõ ràng;
- kế hoạch được công bố trước khi xếp TKB;
- TKB chỉ đến người dùng sau khi phát hành;
- Giáo viên chỉ sửa dữ liệu thuộc phạm vi;
- Học sinh và Phụ huynh nhìn thấy cùng điểm/chuyên cần/bài tập;
- thanh toán chỉ hoàn tất sau đối soát;
- tổng kết chỉ công bố khi hết blocker;
- mọi thay đổi quan trọng có lịch sử và không sinh dữ liệu trùng.

Nếu chưa chắc nên làm gì tiếp theo, hãy quay về sơ đồ ở mục 1 và xác nhận bước trước đã hoàn thành ở cả người tạo lẫn người nhận.
