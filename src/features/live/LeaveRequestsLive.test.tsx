import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaveRequestsLive } from './LeaveRequestsLive';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  api: { post: mocks.post },
}));

vi.mock('../../api/useApi', () => ({
  useApi: () => ({
    data: [{
      id: 'leave-1',
      studentId: 'student-1',
      studentName: 'Nguyễn Hoài An',
      classId: 'class-1',
      classCode: '10A1',
      startDate: '2026-07-24',
      endDate: '2026-07-24',
      reason: 'Em có lịch khám chuyên khoa tại bệnh viện.',
      status: 'PENDING_HOMEROOM',
      parentName: 'Nguyễn Văn Nam',
      homeroomTeacherName: 'Nguyễn Đức Minh',
      createdAt: '2026-07-22T07:35:00',
    }],
    loading: false,
    error: null,
    reload: mocks.reload,
  }),
}));

describe('LeaveRequestsLive', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/giao-vien/duyet-don-xin-nghi');
    mocks.post.mockReset();
    mocks.reload.mockReset();
    mocks.post.mockResolvedValue({});
  });

  afterEach(cleanup);

  it('requires a reason before a teacher can reject a leave request', async () => {
    render(<LeaveRequestsLive actor="teacher" />);

    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));

    const reason = screen.getByPlaceholderText('Ví dụ: Vui lòng bổ sung giấy xác nhận hoặc thông tin lịch khám...');
    const confirm = screen.getByRole('button', { name: 'Xác nhận từ chối' });
    expect(confirm).toBeDisabled();

    fireEvent.change(reason, { target: { value: 'Vui lòng bổ sung giấy xác nhận lịch khám.' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(
      '/leave-requests/leave-1/reject',
      { note: 'Vui lòng bổ sung giấy xác nhận lịch khám.' },
    ));
  });

  it('opens a separate optional response area before approving', () => {
    render(<LeaveRequestsLive actor="teacher" />);

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt đơn' }));

    expect(screen.getByText('Ghi chú phản hồi')).toBeInTheDocument();
    expect(screen.getByText('Không bắt buộc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xác nhận duyệt' })).toBeEnabled();
  });
});
