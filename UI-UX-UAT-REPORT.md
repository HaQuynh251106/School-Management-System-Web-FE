# Báo cáo nâng cấp UI/UX và UAT Web

Ngày kiểm thử: 04/08/2026  
Phạm vi: Web FE, API Backend và PostgreSQL thật; không thay đổi Mobile V2.

## Kết quả trước và sau

| Hạng mục | Trước nâng cấp | Sau nâng cấp |
|---|---|---|
| Phạm vi học vụ | Nhãn học kỳ rời rạc, có nguy cơ trộn năm | Nhãn `Năm học · Học kỳ · Trạng thái`, tự chọn kỳ hiện hành, kỳ lịch sử chỉ xem |
| Hộp thoại | Có hành vi phụ thuộc dialog trình duyệt | Modal thống nhất, focus trap, Escape, trả focus và cảnh báo theo mức độ |
| Tải dữ liệu | Trạng thái tải/không dữ liệu/lỗi chưa đồng nhất | Skeleton, empty state có hướng dẫn, lỗi có thử lại, offline và toast có thể đóng |
| Giáo viên | Dashboard và sidebar dài, khó ưu tiên công việc | Ưu tiên việc hôm nay; sidebar theo Hôm nay, Giảng dạy, Lớp chủ nhiệm, Khảo thí/Báo cáo, Trao đổi/Cá nhân |
| Giáo vụ | Quy trình phân công nhiều nội dung cùng lúc | Bốn bước: Chuẩn bị → Tạo phương án → Kiểm tra → Xác nhận/phát hành |
| Kế toán | Nghiệp vụ và bộ lọc khó nhận biết | Sáu khu vực rõ ràng, bộ lọc nổi bật/sticky và đồng bộ URL |
| Học sinh/Phụ huynh | Thông tin hành động và ngữ cảnh con chưa nổi bật | Việc cần làm đặt trước; giữ rõ học sinh đang theo dõi; trạng thái thanh toán có hướng dẫn |
| Accessibility | Chưa có kiểm tra tự động WCAG/zoom | Axe WCAG A/AA, bàn phím, focus, dark mode và zoom 200% được kiểm thử |
| Hiệu năng học bạ | Mở lớp tính lại toàn bộ học sinh, tải lâu | Chỉ tạo snapshot còn thiếu; danh sách lớp dùng snapshot, chi tiết vẫn được làm mới |
| Kích thước tài nguyên | Ảnh PNG lớn, module nghiệp vụ gộp | Ảnh AVIF/WebP responsive; tài chính giáo viên và thông báo Admin có chunk riêng |

## Tiêu chí nghiệm thu

- [x] Không còn `alert`, `prompt`, `confirm` mặc định trong `src`.
- [x] Typography nghiệp vụ tối thiểu 14px; chữ phụ tối thiểu 12px.
- [x] Tương phản màn hình đăng nhập đạt Axe WCAG A/AA ở light và dark mode.
- [x] Responsive được kiểm tra tại 390px, 768px, 1366px và 1920px.
- [x] Zoom 200% vẫn thao tác đăng nhập được.
- [x] Visual regression light/dark có snapshot cho bốn kích thước.
- [x] Tìm kiếm/bộ lọc chính dùng URL; Global Search hỗ trợ mũi tên, Enter và Escape.
- [x] Bảng điểm giữ bản nháp qua reload, có hoàn tác và import xem trước.
- [x] Học bạ tải theo lớp rồi theo học sinh, không tải trộn toàn trường.
- [x] Sáu vai trò đăng nhập, phục hồi phiên và bị chặn URL trái quyền.
- [x] Không phát hiện HTTP 5xx hoặc lỗi giao diện nghiêm trọng khi duyệt menu sáu vai trò.
- [x] Production build, lint và unit test Web đạt.
- [x] Backend build và integration test đạt; Docker healthcheck `UP`.

## Bằng chứng kiểm thử

- Web: 19 test files, 58 unit tests đạt.
- Playwright: 39/39 E2E đạt.
- Responsive/accessibility/visual subset: 16/16 đạt.
- Backend: 87/87 test đạt trong Docker build.
- Production build: thành công, các module lớn được lazy-load thành chunk riêng.
- `npm audit`: 0 lỗ hổng đã biết tại thời điểm kiểm thử.

## Cấu hình UAT

Các mật khẩu E2E chỉ được truyền qua biến môi trường của tiến trình kiểm thử, không ghi vào mã nguồn. Cần cấu hình các biến `E2E_ADMIN_PASSWORD`, `E2E_ACADEMIC_STAFF_PASSWORD`, `E2E_ACCOUNTANT_PASSWORD`, `E2E_TEACHER_PASSWORD`, `E2E_STUDENT_PASSWORD`, `E2E_PARENT_PASSWORD` trong CI secret trước khi chạy bộ UAT.

