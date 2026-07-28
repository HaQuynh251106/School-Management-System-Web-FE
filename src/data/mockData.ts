import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  History,
  MessageSquareText,
  RefreshCcw,
  School,
  Settings,
  Upload,
  UserRoundCog,
  Users,
  WalletCards,
} from 'lucide-react';
import type { AttendanceStatus, Metric, ModuleItem, RoleDefinition, RoleId } from '../types';

export const roles: RoleDefinition[] = [
  {
    id: 'admin',
    label: 'Quản trị viên',
    title: 'Quản trị hệ thống',
    subtitle: 'Người dùng, cơ cấu đào tạo, TKB, khảo thí',
    sessionName: 'Lê Minh Admin',
    Icon: UserRoundCog,
    color: '#2563eb',
  },
  {
    id: 'teacher',
    label: 'Giáo viên',
    title: 'Không gian giảng dạy',
    subtitle: 'Lớp dạy, điểm danh, điểm số, bài tập',
    sessionName: 'Trần Quốc Huy',
    Icon: ClipboardCheck,
    color: '#0f766e',
  },
  {
    id: 'student',
    label: 'Học sinh',
    title: 'Cổng học sinh',
    subtitle: 'Hồ sơ, TKB, điểm, chuyên cần, bài tập',
    sessionName: 'Nguyễn An',
    Icon: GraduationCap,
    color: '#7c3aed',
  },
  {
    id: 'parent',
    label: 'Phụ huynh',
    title: 'Cổng phụ huynh',
    subtitle: 'Theo dõi học tập, cảnh báo và học phí của con',
    sessionName: 'Mai Lan',
    Icon: RefreshCcw,
    color: '#2563eb',
  },
];

export const modules: Record<RoleId, ModuleItem[]> = {
  admin: [
    { code: 'A1S', title: 'Học sinh', phase: 'GĐ1', priority: 1, summary: 'Hồ sơ, tài khoản, lớp học và trạng thái của học sinh.', Icon: GraduationCap },
    { code: 'A1T', title: 'Giáo viên', phase: 'GĐ1', priority: 1, summary: 'Hồ sơ, chuyên môn và trạng thái tài khoản giáo viên.', Icon: ClipboardCheck },
    { code: 'A1P', title: 'Phụ huynh', phase: 'GĐ1', priority: 1, summary: 'Tài khoản phụ huynh và liên kết với học sinh.', Icon: Users },
    { code: 'A2', title: 'Cơ cấu đào tạo', phase: 'GĐ1', priority: 1, summary: 'Năm học, học kỳ, khối, lớp, môn, GVCN, phân lớp.', Icon: School },
    { code: 'A3', title: 'Xếp thời khóa biểu', phase: 'GĐ1', priority: 2, summary: 'Kiểm tra xung đột giáo viên, phòng học và lớp học.', Icon: CalendarDays },
    { code: 'A4', title: 'Tạo Kỳ thi', phase: 'GĐ1', priority: 2, summary: 'Tổ chức kỳ thi, lịch thi, lớp dự thi, phòng và giám thị.', Icon: Settings },
    { code: 'A6', title: 'Lịch sử hệ thống', phase: 'GĐ2', priority: 2, summary: 'Theo dõi các thay đổi và hoạt động quan trọng.', Icon: History },
    { code: 'A7', title: 'Tài chính nội bộ', phase: 'GĐ2', priority: 1, summary: 'Đợt thu, hóa đơn, công nợ và thanh toán VietQR.', Icon: CircleDollarSign },
    { code: 'A8', title: 'Báo cáo & thống kê', phase: 'GĐ2', priority: 2, summary: 'Tổng hợp điểm, chuyên cần và doanh thu.', Icon: FileSpreadsheet },
    { code: 'A9', title: 'Trung tâm thông báo', phase: 'GĐ2', priority: 1, summary: 'Gửi thông báo toàn trường hoặc riêng theo từng vai trò.', Icon: Bell },
  ],
  teacher: [
    { code: 'B1', title: 'Lớp được phân công', phase: 'GĐ1', priority: 1, summary: 'Danh sách lớp, sĩ số, môn và học kỳ phụ trách.', Icon: School },
    { code: 'B2', title: 'TKB cá nhân', phase: 'GĐ1', priority: 1, summary: 'Lịch dạy theo ngày, phòng, tiết và lớp.', Icon: CalendarDays },
    { code: 'B3', title: 'Sổ điểm danh', phase: 'GĐ1', priority: 1, summary: 'Có mặt, trễ, vắng, ghi chú lý do theo tiết.', Icon: ClipboardCheck },
    { code: 'B4', title: 'Bảng điểm', phase: 'GĐ1', priority: 2, summary: 'Nhập/sửa điểm, ghi log thay đổi, phổ điểm lớp.', Icon: BarChart3 },
    { code: 'B5', title: 'Bài tập', phase: 'GĐ2', priority: 2, summary: 'Giao bài, đính kèm tệp và chấm bài.', Icon: BookOpenCheck },
    { code: 'B6', title: 'Trao đổi', phase: 'GĐ2', priority: 2, summary: 'Nhắn tin với học sinh và phụ huynh.', Icon: MessageSquareText },
    { code: 'B7', title: 'Thông báo', phase: 'GĐ2', priority: 1, summary: 'Nhận thông báo từ nhà trường và gửi cập nhật tình hình tới lớp phụ trách.', Icon: Bell },
    { code: 'B8', title: 'Công nợ lớp chủ nhiệm', phase: 'GĐ2', priority: 1, summary: 'Theo dõi tiến độ khoản thu và nhắc hạn phụ huynh trong lớp chủ nhiệm.', Icon: WalletCards },
    { code: 'B9', title: 'Duyệt đơn xin nghỉ', phase: 'GĐ2', priority: 1, summary: 'Duyệt đơn đã được phụ huynh xác nhận của lớp chủ nhiệm.', Icon: ClipboardCheck },
    { code: 'B10', title: 'Báo cáo giảng dạy', phase: 'GĐ2', priority: 2, summary: 'Thống kê học tập, chuyên cần và xuất dữ liệu lớp phụ trách.', Icon: FileSpreadsheet },
    { code: 'B11', title: 'Hồ sơ & cài đặt', phase: 'GĐ2', priority: 2, summary: 'Cập nhật thông tin liên hệ và cấu hình kênh thông báo.', Icon: Settings },
    { code: 'B12', title: 'Khảo thí giáo viên', phase: 'GĐ1', priority: 1, summary: 'Lịch coi thi, nhập điểm lớp phụ trách và xử lý phúc khảo.', Icon: CalendarClock },
    { code: 'B13', title: 'Hạnh kiểm & tổng kết', phase: 'GĐ1', priority: 1, summary: 'GVCN đánh giá hạnh kiểm và theo dõi điều kiện tổng kết của lớp.', Icon: GraduationCap },
  ],
  student: [
    { code: 'C1', title: 'Hồ sơ cá nhân', phase: 'GĐ1', priority: 2, summary: 'Thông tin học sinh, lớp hiện tại, người giám hộ.', Icon: GraduationCap },
    { code: 'C2', title: 'Theo dõi học thuật', phase: 'GĐ1', priority: 1, summary: 'TKB, môn học, điểm, trung bình học kỳ.', Icon: BookOpenCheck },
    { code: 'C3', title: 'Chuyên cần cá nhân', phase: 'GĐ1', priority: 3, summary: 'Lịch sử đi học, vắng, trễ, ghi chú giáo viên.', Icon: ClipboardCheck },
    { code: 'C4', title: 'Nộp bài tập', phase: 'GĐ2', priority: 1, summary: 'Xem đề, nộp bài và nhận kết quả chấm.', Icon: Upload },
    { code: 'C5', title: 'Thông báo', phase: 'GĐ2', priority: 2, summary: 'Theo dõi thông tin mới từ nhà trường.', Icon: Bell },
    { code: 'C6', title: 'Xin nghỉ học', phase: 'GĐ2', priority: 1, summary: 'Gửi đơn và theo dõi xác nhận của phụ huynh, giáo viên chủ nhiệm.', Icon: CalendarDays },
    { code: 'C7', title: 'Trao đổi giáo viên', phase: 'GĐ2', priority: 1, summary: 'Hỏi bài và trao đổi trực tiếp với giáo viên phụ trách.', Icon: MessageSquareText },
    { code: 'C8', title: 'Báo cáo cá nhân', phase: 'GĐ2', priority: 2, summary: 'Thống kê kết quả học tập, chuyên cần và xuất báo cáo.', Icon: FileSpreadsheet },
    { code: 'C9', title: 'Hồ sơ & cài đặt', phase: 'GĐ2', priority: 2, summary: 'Cập nhật thông tin liên hệ và cấu hình kênh thông báo.', Icon: Settings },
    { code: 'C10', title: 'Thi & phúc khảo', phase: 'GĐ1', priority: 1, summary: 'Lịch thi, số báo danh, kết quả và yêu cầu phúc khảo.', Icon: CalendarClock },
    { code: 'C11', title: 'Tổng kết năm học', phase: 'GĐ1', priority: 1, summary: 'Xem điểm hai học kỳ, hạnh kiểm và kết quả xét lên lớp.', Icon: GraduationCap },
  ],
  parent: [
    { code: 'D1', title: 'Chọn học sinh', phase: 'GĐ1', priority: 1, summary: 'Chọn con cần theo dõi.', Icon: RefreshCcw },
    { code: 'D2', title: 'Giám sát học tập', phase: 'GĐ1', priority: 1, summary: 'Điểm, chuyên cần, cảnh báo vắng tức thời.', Icon: BarChart3 },
    { code: 'D3', title: 'Liên lạc GVCN', phase: 'GĐ2', priority: 2, summary: 'Nhắn tin với giáo viên chủ nhiệm.', Icon: MessageSquareText },
    { code: 'D4', title: 'Học phí', phase: 'GĐ2', priority: 1, summary: 'Hóa đơn, thanh toán online, lịch sử thanh toán.', Icon: WalletCards },
    { code: 'D5', title: 'Thông báo', phase: 'GĐ2', priority: 1, summary: 'Nhận thông báo từ nhà trường, giáo viên và các cập nhật tự động của con.', Icon: Bell },
    { code: 'D6', title: 'Xác nhận nghỉ học', phase: 'GĐ2', priority: 1, summary: 'Xác nhận đơn xin nghỉ trước khi chuyển giáo viên chủ nhiệm duyệt.', Icon: ClipboardCheck },
    { code: 'D7', title: 'Báo cáo của con', phase: 'GĐ2', priority: 2, summary: 'Thống kê học tập, chuyên cần, học phí và xuất báo cáo.', Icon: FileSpreadsheet },
    { code: 'D8', title: 'Hồ sơ & cài đặt', phase: 'GĐ2', priority: 2, summary: 'Cập nhật thông tin liên hệ và cấu hình kênh thông báo.', Icon: Settings },
    { code: 'D9', title: 'Lịch thi của con', phase: 'GĐ1', priority: 1, summary: 'Theo dõi lịch thi, phòng thi và số báo danh của từng học sinh.', Icon: CalendarClock },
    { code: 'D10', title: 'Tổng kết năm học', phase: 'GĐ1', priority: 1, summary: 'Theo dõi điểm cả năm, hạnh kiểm và kết quả xét lên lớp của con.', Icon: GraduationCap },
  ],
};

export const dashboardMetrics: Metric[] = [
  { label: 'Tài khoản hoạt động', value: '2,438', hint: 'Admin, GV, HS, PH', Icon: Users, tone: 'blue' },
  { label: 'Chuyên cần hôm nay', value: '96.4%', hint: 'Toàn trường', Icon: ClipboardCheck, tone: 'green' },
  { label: 'Điểm TB học kỳ', value: '8.1', hint: '4 khối đang học', Icon: BarChart3, tone: 'violet' },
  { label: 'Cảnh báo mở', value: '18', hint: 'TKB, vắng, học phí', Icon: AlertTriangle, tone: 'orange' },
];

export const roleDistribution = [
  { label: 'Học sinh', value: 72 },
  { label: 'Phụ huynh', value: 18 },
  { label: 'Giáo viên', value: 8 },
  { label: 'Quản trị viên', value: 2 },
];

export const attendanceTrend = [
  { label: 'T2', value: 96 },
  { label: 'T3', value: 94 },
  { label: 'T4', value: 97 },
  { label: 'T5', value: 95 },
  { label: 'T6', value: 96 },
  { label: 'T7', value: 91 },
];

export const gradeBands = [
  { label: '0-4.9', value: 24 },
  { label: '5-6.4', value: 58 },
  { label: '6.5-7.9', value: 74 },
  { label: '8-10', value: 63 },
];

export const invoiceStatus = [
  { label: 'Đã thanh toán', value: 68 },
  { label: 'Còn nợ', value: 24 },
  { label: 'Quá hạn', value: 8 },
];

export const eventFlow = [
  { label: 'Attendance', value: 1284 },
  { label: 'Grade', value: 746 },
  { label: 'Invoice', value: 420 },
  { label: 'Chat', value: 318 },
];

export const classes = [
  { name: '10A1', grade: 'Khối 10', homeroom: 'Nguyễn Minh Trang', students: 42, status: 'Đang học' },
  { name: '10A2', grade: 'Khối 10', homeroom: 'Trần Quốc Huy', students: 40, status: 'Đang học' },
  { name: '11B1', grade: 'Khối 11', homeroom: 'Lê Thu Hà', students: 38, status: 'Cần gán GV' },
  { name: '12C1', grade: 'Khối 12', homeroom: 'Phạm Đức Long', students: 36, status: 'Đang học' },
];

export const users = [
  { name: 'Nguyễn An', role: 'STUDENT', username: 'hs.nguyenan', status: 'ACTIVE', lastLogin: '22/05 08:45' },
  { name: 'Mai Lan', role: 'PARENT', username: 'ph.mailan', status: 'ACTIVE', lastLogin: '22/05 07:10' },
  { name: 'Trần Quốc Huy', role: 'TEACHER', username: 'gv.tranhuy', status: 'ACTIVE', lastLogin: '21/05 16:32' },
  { name: 'Tài khoản import #23', role: 'STUDENT', username: 'pending.023', status: 'PENDING', lastLogin: '-' },
];

export const timetable = [
  ['Chào cờ', 'Toán - 10A1', 'Văn - 10A2', 'Anh - 11B1', 'Sinh - 12C1'],
  ['Toán - 10A1', 'Lý - 10A2', 'Hóa - 11B1', 'Phòng trùng', 'Tin - 12C1'],
  ['Sử - 10A1', 'Toán - 10A2', 'Địa - 11B1', 'Anh - 12C1', 'Thể dục'],
  ['Văn - 10A1', 'Sinh - 10A2', 'Toán - 11B1', 'Lý - 12C1', 'Tự học'],
  ['Hóa - 10A1', 'Tin - 10A2', 'Văn - 11B1', 'Toán - 12C1', 'CLB'],
];

export const teacherClasses = [
  { className: '10A1', subject: 'Toán', semester: 'HK1', students: 42, nextSlot: 'T2 tiết 2 - P201' },
  { className: '10A2', subject: 'Toán', semester: 'HK1', students: 40, nextSlot: 'T3 tiết 3 - P205' },
  { className: '11B1', subject: 'Toán', semester: 'HK1', students: 38, nextSlot: 'T5 tiết 4 - P302' },
];

export const roster = [
  { id: 'HS001', name: 'Nguyễn An', code: '10A1-01', note: 'Có phép nếu vắng' },
  { id: 'HS002', name: 'Đỗ Minh', code: '10A1-02', note: 'Theo dõi chuyên cần' },
  { id: 'HS003', name: 'Lê Ngọc', code: '10A1-03', note: 'Đội tuyển Toán' },
  { id: 'HS004', name: 'Phạm Vy', code: '10A1-04', note: 'Cần nhắc bài tập' },
  { id: 'HS005', name: 'Hoàng Nam', code: '10A1-05', note: 'Không ghi chú' },
];

export const initialAttendance: Record<string, AttendanceStatus> = {
  HS001: 'present',
  HS002: 'absent',
  HS003: 'present',
  HS004: 'late',
  HS005: 'present',
};

export const initialGrades: Record<string, number> = {
  HS001: 9.0,
  HS002: 7.5,
  HS003: 9.5,
  HS004: 8.0,
  HS005: 6.5,
};

export const scoreCategories = [
  { name: 'Miệng', weight: 1, count: 2 },
  { name: '15 phút', weight: 1, count: 3 },
  { name: 'Giữa kỳ', weight: 2, count: 1 },
  { name: 'Cuối kỳ', weight: 3, count: 1 },
];

export const subjectScores = [
  { subject: 'Toán', oral: 9.0, mid: 8.5, final: 8.8, avg: 8.7 },
  { subject: 'Vật lý', oral: 8.0, mid: 8.2, final: 7.9, avg: 8.0 },
  { subject: 'Ngữ văn', oral: 7.8, mid: 8.4, final: 8.1, avg: 8.1 },
  { subject: 'Tiếng Anh', oral: 8.5, mid: 8.8, final: 9.0, avg: 8.8 },
];

export const attendanceTimeline = [
  { date: '20/05', slot: 'Tiết 2', subject: 'Toán', status: 'Có mặt', note: 'Đúng giờ' },
  { date: '18/05', slot: 'Tiết 4', subject: 'Lý', status: 'Trễ', note: 'Trễ 5 phút' },
  { date: '15/05', slot: 'Tiết 1', subject: 'Văn', status: 'Vắng có phép', note: 'PH xác nhận' },
  { date: '14/05', slot: 'Tiết 3', subject: 'Anh', status: 'Có mặt', note: 'Đúng giờ' },
];

export const children = [
  {
    id: 'child-1',
    name: 'Nguyễn An',
    className: '10A1',
    avg: 8.7,
    attendance: 96,
    alert: 'Vắng có phép môn Văn ngày 15/05',
    homeroom: 'Nguyễn Minh Trang',
  },
  {
    id: 'child-2',
    name: 'Nguyễn Bình',
    className: '7C2',
    avg: 8.1,
    attendance: 98,
    alert: 'Không có cảnh báo mới',
    homeroom: 'Phạm Thu Hằng',
  },
];

export const invoices = [
  { code: 'INV-HK1-001', title: 'Học phí HK1', amount: 6200000, status: 'PENDING', due: '31/05/2026' },
  { code: 'INV-BH-002', title: 'Bảo hiểm học sinh', amount: 450000, status: 'PARTIAL', due: '05/06/2026' },
  { code: 'INV-MEAL-003', title: 'Dịch vụ bán trú', amount: 1800000, status: 'PAID', due: '20/05/2026' },
];

export const importRows = [
  { file: 'hoc-sinh-khoi-10.xlsx', rows: 90, valid: 86, warning: 4, owner: 'Lê Minh Admin' },
  { file: 'phu-huynh-10A1.xlsx', rows: 42, valid: 42, warning: 0, owner: 'Lê Minh Admin' },
  { file: 'giao-vien-2026.xlsx', rows: 18, valid: 17, warning: 1, owner: 'HR School' },
];

export const permissionRows = [
  { permission: 'USER_CREATE', admin: true, teacher: false, student: false, parent: false },
  { permission: 'GRADE_EDIT', admin: false, teacher: true, student: false, parent: false },
  { permission: 'ATTENDANCE_VIEW_CHILD', admin: false, teacher: false, student: false, parent: true },
  { permission: 'INVOICE_PAY', admin: false, teacher: false, student: false, parent: true },
];

export const academicYears = [
  { name: '2025-2026', semesters: 'HK1, HK2', status: 'ACTIVE', classes: 42 },
  { name: '2024-2025', semesters: 'HK1, HK2', status: 'CLOSED', classes: 40 },
  { name: '2026-2027', semesters: 'Draft', status: 'DRAFT', classes: 0 },
];

export const subjects = [
  { name: 'Toán', code: 'MATH', coefficient: 2, teachers: 8 },
  { name: 'Ngữ văn', code: 'LIT', coefficient: 2, teachers: 7 },
  { name: 'Tiếng Anh', code: 'ENG', coefficient: 2, teachers: 6 },
  { name: 'Vật lý', code: 'PHY', coefficient: 1, teachers: 4 },
];

export const rooms = [
  { name: 'P201', type: 'Lý thuyết', capacity: 45, status: 'ACTIVE' },
  { name: 'P302', type: 'Lý thuyết', capacity: 40, status: 'ACTIVE' },
  { name: 'Lab 2', type: 'Thực hành', capacity: 32, status: 'ACTIVE' },
  { name: 'Hội trường', type: 'Sự kiện', capacity: 220, status: 'MAINTENANCE' },
];

export const conflicts = [
  { slot: 'T5 tiết 2', reason: 'Phòng P204 đang dùng bởi 10A2', severity: 'HIGH' },
  { slot: 'T3 tiết 4', reason: 'GV Trần Quốc Huy đã có lớp 11B1', severity: 'HIGH' },
  { slot: 'T6 tiết 5', reason: 'Rơi vào lịch CLB toàn trường', severity: 'MEDIUM' },
];

export const feePeriods = [
  { name: 'Thu HK1 2025-2026', amount: 6450000, status: 'OPEN', invoices: 90 },
  { name: 'Bảo hiểm năm học', amount: 450000, status: 'OPEN', invoices: 90 },
  { name: 'Ngoại khóa Robotics', amount: 1200000, status: 'DRAFT', invoices: 24 },
];

export const payments = [
  { ref: 'VQR-8291', method: 'VIETQR', payer: 'Mai Lan', amount: 3000000, status: 'SUCCESS' },
  { ref: 'VQR-1772', method: 'VietQR', payer: 'Hoàng Dũng', amount: 6450000, status: 'SUCCESS' },
  { ref: 'VQR-8410', method: 'VIETQR', payer: 'Lê Hạnh', amount: 450000, status: 'FAILED' },
];

export const assignments = [
  { title: 'Bài tập Đại số tuần 4', className: '10A1', due: '26/05/2026', submitted: 34, total: 42, status: 'PUBLISHED', subject: 'Toán' },
  { title: 'Đề luyện giữa kỳ', className: '10A2', due: '29/05/2026', submitted: 19, total: 40, status: 'PUBLISHED', subject: 'Toán' },
  { title: 'Dự án nhóm xác suất', className: '11B1', due: '05/06/2026', submitted: 0, total: 38, status: 'DRAFT', subject: 'Toán' },
  { title: 'Bài 15 phút Hàm số', className: '10A1', due: '22/05/2026', submitted: 38, total: 42, status: 'CLOSED', subject: 'Toán' },
  { title: 'Bài kiểm tra GK', className: '11B1', due: '12/04/2026', submitted: 38, total: 38, status: 'CLOSED', subject: 'Toán' },
];

export const studentAssignments = [
  {
    title: 'Bài tập Hàm số bậc hai',
    subject: 'Toán',
    teacher: 'Trần Thị Hoa',
    due: '28/05 23:59',
    status: 'PENDING' as 'PENDING' | 'SUBMITTED' | 'LATE' | 'GRADED',
    score: null as number | null,
    feedback: null as string | null,
  },
  {
    title: 'Thí nghiệm con lắc đơn',
    subject: 'Vật lý',
    teacher: 'Lê Văn Minh',
    due: '30/05 23:59',
    status: 'PENDING' as const,
    score: null as number | null,
    feedback: null as string | null,
  },
  {
    title: 'Tập làm văn — Tả mẹ',
    subject: 'Ngữ văn',
    teacher: 'Nguyễn Thị Hồng',
    due: '25/05 23:59',
    status: 'SUBMITTED' as const,
    score: null as number | null,
    feedback: null as string | null,
  },
  {
    title: 'Bài luận — My favorite hobby',
    subject: 'Tiếng Anh',
    teacher: 'Phạm Quốc Bảo',
    due: '20/05 23:59',
    status: 'GRADED' as const,
    score: 8.5,
    feedback: 'Bài viết tốt, có ý sáng tạo. Cần lưu ý ngữ pháp ở đoạn 2.',
  },
  {
    title: 'Vẽ chu trình tế bào',
    subject: 'Sinh học',
    teacher: 'Trần Thị Bình',
    due: '18/05 23:59',
    status: 'GRADED' as const,
    score: 9.0,
    feedback: 'Hình vẽ chi tiết, chú thích đầy đủ. Rất tốt!',
  },
];

export const chatThreads = [
  { name: 'Mai Lan', context: 'PH Nguyễn An', last: 'Em xin phép xác nhận lý do vắng ngày 15/05.', unread: 2 },
  { name: '10A1', context: 'Broadcast lớp', last: 'Nhắc lịch kiểm tra 15 phút vào thứ 4.', unread: 0 },
  { name: 'Nguyễn An', context: 'Học sinh', last: 'Em đã nộp lại file bài tập.', unread: 1 },
];

export const extracurricularCourses = [
  { name: 'Robotics cơ bản', schedule: 'T7 08:00', seats: '18/24', fee: 1200000 },
  { name: 'Bóng rổ', schedule: 'T3, T5 16:30', seats: '22/30', fee: 800000 },
  { name: 'IELTS Foundation', schedule: 'T2, T4 17:30', seats: '15/18', fee: 2400000 },
];

export const notificationRows = [
  { channel: 'In-app', status: 'SENT', count: 1284 },
  { channel: 'Push FCM', status: 'RETRYING', count: 86 },
  { channel: 'Email', status: 'SENT', count: 412 },
];

export const notificationFeed = [
  {
    id: 'n-001',
    title: 'Học sinh vắng mặt',
    body: 'Phạm Hoài An vắng tiết 1 ngày 22/05 — Tiếng Anh',
    category: 'ATTENDANCE_ALERT',
    channel: 'PUSH',
    time: '5 phút trước',
    read: false,
  },
  {
    id: 'n-002',
    title: 'Điểm mới',
    body: 'Bạn vừa nhận điểm GK môn Toán: 8.8',
    category: 'GRADE_PUBLISHED',
    channel: 'PUSH',
    time: '2 giờ trước',
    read: false,
  },
  {
    id: 'n-003',
    title: 'Bài tập mới',
    body: 'GV Trần Thị Hoa giao bài "Hàm số bậc hai" — hạn 28/05 23:59',
    category: 'ASSIGNMENT',
    channel: 'PUSH',
    time: '5 giờ trước',
    read: false,
  },
  {
    id: 'n-004',
    title: 'Hóa đơn HK2 đã phát hành',
    body: 'HD-2025-HK2-0042 — Tổng 4.500.000 ₫ — Hạn 15/06',
    category: 'INVOICE',
    channel: 'EMAIL',
    time: 'Hôm qua',
    read: true,
  },
  {
    id: 'n-005',
    title: 'Thanh toán thành công',
    body: 'VietQR: HD-2025-HK1-0042 — 4.500.000 ₫',
    category: 'PAYMENT',
    channel: 'EMAIL',
    time: '12/12/2025',
    read: true,
  },
  {
    id: 'n-006',
    title: 'Khóa ngoại khóa mở đăng ký',
    body: 'STEM — Lập trình Python — Còn 5/15 chỗ',
    category: 'EXTRACURRICULAR',
    channel: 'IN_APP',
    time: '2 ngày trước',
    read: true,
  },
  {
    id: 'n-007',
    title: 'Thông báo chung',
    body: 'Lịch thi GK đã được cập nhật — kiểm tra TKB mới',
    category: 'ANNOUNCEMENT',
    channel: 'IN_APP',
    time: '3 ngày trước',
    read: true,
  },
];

export const gradeChangeLogs = [
  { student: 'Nguyễn An', from: 9.5, to: 9.0, reason: 'Điều chỉnh sau rà soát bài', by: 'Trần Quốc Huy' },
  { student: 'Phạm Vy', from: 7.5, to: 8.0, reason: 'Bổ sung điểm trình bày', by: 'Trần Quốc Huy' },
];

export const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

// =========== Audit log (A6) ===========

export const auditEvents = [
  {
    id: 'evt-001',
    time: '22/05 09:15',
    actor: 'admin',
    role: 'ADMIN',
    action: 'LOGIN',
    module: 'identity',
    entity: '—',
    note: 'Đăng nhập thành công từ Chrome macOS',
  },
  {
    id: 'evt-002',
    time: '22/05 08:50',
    actor: 'admin',
    role: 'ADMIN',
    action: 'CREATE',
    module: 'identity',
    entity: 'user/gv.tuyet',
    note: 'Tạo user gv.tuyet (TEACHER)',
  },
  {
    id: 'evt-003',
    time: '21/05 14:32',
    actor: 'gv.tranhuy',
    role: 'TEACHER',
    action: 'UPDATE',
    module: 'academic',
    entity: 'grade/u-student-3',
    note: 'Sửa điểm GK Toán 8.5 → 9.0',
  },
  {
    id: 'evt-004',
    time: '21/05 10:05',
    actor: 'admin',
    role: 'ADMIN',
    action: 'EXPORT',
    module: 'reports',
    entity: 'phổ điểm HK1',
    note: 'Xuất báo cáo PDF',
  },
  {
    id: 'evt-005',
    time: '20/05 16:18',
    actor: 'gv.minh',
    role: 'TEACHER',
    action: 'DELETE',
    module: 'academic',
    entity: 'assignment/a-77',
    note: 'Xóa Assignment a-77',
  },
  {
    id: 'evt-006',
    time: '20/05 09:30',
    actor: 'system',
    role: 'SYSTEM',
    action: 'PAYMENT',
    module: 'finance',
    entity: 'invoice/HD-HK2-0042',
    note: 'VietQR đã đối soát',
  },
  {
    id: 'evt-007',
    time: '19/05 22:11',
    actor: '—',
    role: 'GUEST',
    action: 'LOGIN_FAILED',
    module: 'identity',
    entity: 'IP 113.161.x.x',
    note: 'Đăng nhập sai mật khẩu',
  },
];

export const auditModuleStats = [
  { label: 'identity', value: 128 },
  { label: 'academic', value: 86 },
  { label: 'finance', value: 64 },
  { label: 'notification', value: 320 },
];

export const auditActionStats = [
  { label: 'CREATE', value: 56 },
  { label: 'UPDATE', value: 142 },
  { label: 'DELETE', value: 18 },
  { label: 'LOGIN', value: 380 },
  { label: 'PAYMENT', value: 318 },
];

// =========== Templates (A9 / E2) ===========

export const notificationTemplates = [
  {
    code: 'ATTENDANCE_ABSENT_PUSH',
    name: 'Cảnh báo vắng - Push',
    category: 'ATTENDANCE_ALERT',
    channel: 'PUSH',
    subject: 'Học sinh vắng mặt',
    body: 'Học sinh {{studentName}} vắng tiết {{period}} ngày {{date}}.',
    active: true,
  },
  {
    code: 'ATTENDANCE_ABSENT_EMAIL',
    name: 'Cảnh báo vắng - Email',
    category: 'ATTENDANCE_ALERT',
    channel: 'EMAIL',
    subject: '[Smart School] Thông báo vắng mặt',
    body:
      'Kính gửi PH {{parentName}}, học sinh {{studentName}} đã vắng tiết {{period}} ngày {{date}}. Lý do: {{reason}}.',
    active: true,
  },
  {
    code: 'INVOICE_ISSUED_EMAIL',
    name: 'Hóa đơn mới - Email',
    category: 'INVOICE',
    channel: 'EMAIL',
    subject: '[Smart School] Hóa đơn học phí {{invoiceCode}}',
    body: 'Hóa đơn {{invoiceCode}} trị giá {{totalAmount}} VNĐ, hạn {{dueDate}}.',
    active: true,
  },
  {
    code: 'GRADE_PUBLISHED_PUSH',
    name: 'Có điểm mới',
    category: 'GRADE_PUBLISHED',
    channel: 'PUSH',
    subject: 'Điểm mới',
    body: 'Bạn vừa nhận điểm môn {{subject}}: {{score}}.',
    active: true,
  },
  {
    code: 'ASSIGNMENT_PUBLISHED_PUSH',
    name: 'Bài tập mới',
    category: 'ASSIGNMENT',
    channel: 'PUSH',
    subject: 'Bài tập mới',
    body: 'GV {{teacherName}} giao bài "{{title}}" — hạn {{deadline}}.',
    active: true,
  },
  {
    code: 'PAYMENT_SUCCESS_EMAIL',
    name: 'Thanh toán thành công',
    category: 'PAYMENT',
    channel: 'EMAIL',
    subject: '[Smart School] Biên nhận thanh toán {{invoiceCode}}',
    body:
      'Cảm ơn anh chị đã thanh toán hóa đơn {{invoiceCode}}. Số tiền: {{amount}} VNĐ qua {{method}}.',
    active: false,
  },
];

// =========== Admin extracurricular (A5) ===========

export const adminCourses = [
  {
    code: 'EXT-RBT-2025',
    name: 'Robotics — Trình độ cơ bản',
    instructor: 'Lê Văn Minh',
    fee: 600000,
    enrolled: 12,
    capacity: 20,
    status: 'OPEN',
  },
  {
    code: 'EXT-ART-2025',
    name: 'Vẽ truyện tranh',
    instructor: 'Nguyễn Thị Hồng',
    fee: 450000,
    enrolled: 18,
    capacity: 25,
    status: 'OPEN',
  },
  {
    code: 'EXT-STEM-2025',
    name: 'STEM — Lập trình Python',
    instructor: 'Phạm Quốc Bảo',
    fee: 750000,
    enrolled: 5,
    capacity: 15,
    status: 'OPEN',
  },
  {
    code: 'EXT-BB-2025',
    name: 'Bóng rổ trường',
    instructor: 'Trần Văn Hùng',
    fee: 350000,
    enrolled: 22,
    capacity: 25,
    status: 'OPEN',
  },
  {
    code: 'EXT-EN-2024',
    name: 'CLB Tiếng Anh',
    instructor: 'Native Speaker',
    fee: 500000,
    enrolled: 15,
    capacity: 20,
    status: 'CLOSED',
  },
];

// =========== Parent invoice list (D4) ===========

export const parentInvoices = [
  {
    code: 'HD-2025-HK2-0042',
    title: 'Học phí HK2 — 2025/2026',
    dueDate: '15/06/2026',
    total: 4500000,
    status: 'PENDING',
    paidAt: null as string | null,
  },
  {
    code: 'HD-2025-XHK-0017',
    title: 'Bảo hiểm + Ngoại khóa Robotics',
    dueDate: '30/05/2026',
    total: 1250000,
    status: 'OVERDUE',
    paidAt: null as string | null,
  },
  {
    code: 'HD-2025-HK1-0042',
    title: 'Học phí HK1 — 2025/2026',
    dueDate: '15/12/2025',
    total: 4500000,
    status: 'PAID',
    paidAt: '12/12/2025',
  },
  {
    code: 'HD-2025-DN-0042',
    title: 'Đồng phục đầu năm',
    dueDate: '15/09/2025',
    total: 850000,
    status: 'PAID',
    paidAt: '08/09/2025',
  },
];
