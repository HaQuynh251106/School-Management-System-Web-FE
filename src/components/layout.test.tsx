import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roles } from '../data/mockData';
import type { TeacherWorkspaceContext } from '../api/types';
import { SidebarMenu } from './layout';

const adminRole = roles.find((role) => role.id === 'admin')!;
const academicStaffRole = roles.find((role) => role.id === 'academic_staff')!;
const teacherRole = roles.find((role) => role.id === 'teacher')!;

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

  it('chia chức năng thành hai nhóm theo quy trình nghiệp vụ', () => {
    render(<SidebarMenu role={academicStaffRole} activePage="dashboard" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /2\. Vận hành học vụ/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /3\. Tổng kết & học bạ/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Chuẩn bị năm học' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Phân công & xếp lịch' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tổ chức kỳ thi' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Kết thúc niên khóa' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Học bạ điện tử' })).toBeVisible();
  });

  it('ghi nhớ trạng thái đóng mở độc lập của từng nhóm', () => {
    render(<SidebarMenu role={academicStaffRole} activePage="dashboard" onSelect={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /2\. Vận hành học vụ/i }));
    expect(localStorage.getItem('school.sidebar.group.academic-operations.open')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Chuẩn bị năm học' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Học bạ điện tử' })).toBeVisible();
  });
});

describe('SidebarMenu giáo viên theo phạm vi được giao', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it('giáo viên bộ môn chỉ thấy nghiệp vụ giảng dạy phù hợp', () => {
    render(<SidebarMenu role={teacherRole} activePage="dashboard" onSelect={vi.fn()} teacherContext={subjectTeacherContext} />);

    expect(screen.getByText('Giáo viên bộ môn')).toBeVisible();
    expect(screen.getByRole('button', { name: /^Giảng dạy/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đăng ký tải dạy' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sổ đầu bài & đổi lịch' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hỗ trợ học sinh' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Lớp chủ nhiệm/i })).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /^Lớp chủ nhiệm/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Công nợ lớp chủ nhiệm' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Duyệt đơn xin nghỉ' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Học bạ lớp chủ nhiệm' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Khảo thí giáo viên' })).toBeVisible();
  });
});
