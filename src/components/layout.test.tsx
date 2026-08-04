import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roles } from '../data/navigation';
import type { TeacherWorkspaceContext } from '../api/types';
import { SidebarMenu } from './layout';

const adminRole = roles.find((role) => role.id === 'admin')!;
const academicStaffRole = roles.find((role) => role.id === 'academic_staff')!;
const teacherRole = roles.find((role) => role.id === 'teacher')!;
const studentRole = roles.find((role) => role.id === 'student')!;
const parentRole = roles.find((role) => role.id === 'parent')!;

const subjectTeacherContext: TeacherWorkspaceContext = {
  homeroomTeacher: false,
  homeroomClasses: [],
  teachingClassCount: 4,
  examResponsibilities: false,
  invigilationDutyCount: 0,
  gradingDutyCount: 0,
  pendingReviewCount: 0,
  semesterId: 'sm-1',
  semesterName: 'Học kỳ 1',
  loadRegistrationVisible: true,
  loadRegistrationOpen: true,
  loadRegistrationEditable: true,
  loadRegistrationStatus: 'DRAFT',
};

describe('SidebarMenu quản trị viên', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('gom bốn loại người dùng vào một nhóm có thể đóng mở', () => {
    render(<SidebarMenu role={adminRole} activePage="dashboard" onSelect={vi.fn()} />);

    const group = screen.getByRole('button', { name: /2\. Người dùng/i });
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Học sinh' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Giáo viên' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Phụ huynh' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Nhân sự vận hành' })).toBeVisible();

    fireEvent.click(group);
    expect(group).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Học sinh' })).not.toBeInTheDocument();
    expect(localStorage.getItem('school.sidebar.group.admin-users.open')).toBe('false');
  });

  it('tự mở nhóm khi trang người dùng đang hoạt động', () => {
    localStorage.setItem('school.sidebar.group.admin-users.open', 'false');
    render(<SidebarMenu role={adminRole} activePage="A1T" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /2\. Người dùng/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Giáo viên' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('SidebarMenu giáo vụ', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('chia chức năng thành bốn giai đoạn nghiệp vụ rõ ràng', () => {
    render(<SidebarMenu role={academicStaffRole} activePage="dashboard" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /2\. Chuẩn bị năm học/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /3\. Vận hành năm học/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /4\. Tổng kết & học bạ/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /5\. Kho lưu trữ niên khóa/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Chuẩn bị năm học' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Phân công & xếp lịch' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tổ chức kỳ thi' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tổng kết & chuyển năm' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Kho lưu trữ niên khóa' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Học bạ điện tử' })).toBeVisible();
  });

  it('ghi nhớ trạng thái đóng mở độc lập của từng nhóm', () => {
    render(<SidebarMenu role={academicStaffRole} activePage="dashboard" onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /3\. Vận hành năm học/i }));
    expect(localStorage.getItem('school.sidebar.group.academic-operations.open')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Phân công & xếp lịch' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chuẩn bị năm học' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Học bạ điện tử' })).toBeVisible();
  });
});

describe('SidebarMenu học sinh và phụ huynh', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('gom chức năng học sinh theo học tập, hỗ trợ và cá nhân', () => {
    render(<SidebarMenu role={studentRole} activePage="dashboard" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^Học tập/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Kết nối & hỗ trợ/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Cá nhân/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Học bạ điện tử' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Thông báo' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Hồ sơ cá nhân' })).toHaveLength(1);
  });

  it('gom chức năng phụ huynh theo theo dõi, phối hợp và dịch vụ', () => {
    render(<SidebarMenu role={parentRole} activePage="dashboard" onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^Theo dõi con/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Phối hợp nhà trường/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Tài chính & cá nhân/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Học bạ của con' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Chọn học sinh' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thông báo' })).not.toBeInTheDocument();
  });
});

describe('SidebarMenu giáo viên theo phạm vi được giao', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('giáo viên bộ môn chỉ thấy nghiệp vụ giảng dạy phù hợp', () => {
    render(<SidebarMenu role={teacherRole} activePage="dashboard" onSelect={vi.fn()} teacherContext={subjectTeacherContext} />);

    expect(screen.getByText('Giáo viên bộ môn')).toBeVisible();
    expect(screen.getByRole('button', { name: /^Dạy học hôm nay/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Quản lý giảng dạy/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hỗ trợ học sinh. Theo dõi và phối hợp các trường hợp cần quan tâm' })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Kỳ thi & báo cáo/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đăng ký tải dạy' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sổ đầu bài & đổi lịch' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hỗ trợ học sinh' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Trao đổi' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Công nợ lớp chủ nhiệm' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Khảo thí giáo viên' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hồ sơ & cài đặt' })).not.toBeInTheDocument();
  });

  it('chỉ mở nhóm chủ nhiệm và khảo thí khi backend xác nhận nhiệm vụ', () => {
    const homeroomContext: TeacherWorkspaceContext = {
      ...subjectTeacherContext,
      homeroomTeacher: true,
      homeroomClasses: [{ id: 'c-10a1', code: '10A1', name: 'Lớp 10A1', studentCount: 40 }],
      examResponsibilities: true,
      invigilationDutyCount: 1,
    };
    render(<SidebarMenu role={teacherRole} activePage="dashboard" onSelect={vi.fn()} teacherContext={homeroomContext} />);

    expect(screen.getByText('GVCN 10A1')).toBeVisible();
    expect(screen.getByRole('button', { name: /^Học sinh & chủ nhiệm/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Công nợ lớp chủ nhiệm' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Duyệt đơn xin nghỉ' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Học bạ lớp chủ nhiệm' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Khảo thí giáo viên' })).toBeVisible();
  });
});
