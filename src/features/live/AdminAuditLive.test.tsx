import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAuditLive } from './AdminAuditLive';

const reload = vi.fn();

vi.mock('../../api/useApi', () => ({
  useApi: (path: string) => {
    if (path === '/audit-logs/stats') {
      return {
        data: {
          total: 8,
          byModule: { academic: 4, finance: 3, identity: 1 },
          byAction: {
            GRADE_CREATE: 1,
            GRADE_UPDATE: 3,
            PAYMENT_CONFIRMED: 2,
            PAYMENT_REFUND: 1,
            USER_CHANGE: 1,
          },
        },
        loading: false,
        error: null,
        reload,
      };
    }
    return {
      data: {
        items: [{
          id: 'audit-1',
          actorName: 'Nguyễn Đức Minh',
          role: 'TEACHER',
          action: 'GRADE_UPDATE',
          module: 'academic',
          entityType: 'grade',
          entityId: 'g-1',
          detail: 'Nguyễn Minh An — môn Toán, Miệng: 9.0 → 9.5. Lý do: Chấm lại',
          createdAt: '2026-08-17T09:00:00Z',
        }],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
        summary: {},
      },
      loading: false,
      error: null,
      reload,
    };
  },
}));

describe('AdminAuditLive', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/quan-tri/audit');
    reload.mockReset();
  });

  afterEach(cleanup);

  it('focuses on important business changes instead of login history', () => {
    render(<AdminAuditLive />);

    expect(screen.getByText('Tổng thay đổi quan trọng')).toBeInTheDocument();
    expect(screen.getByText('Thay đổi điểm')).toBeInTheDocument();
    expect(screen.getByText('Giao dịch thanh toán')).toBeInTheDocument();
    expect(screen.getAllByText('Sửa điểm')).toHaveLength(2);
    expect(screen.getByText(/9\.0 → 9\.5/)).toBeInTheDocument();
    expect(screen.queryByText('Đăng nhập thành công')).not.toBeInTheDocument();
    expect(screen.queryByText('Đăng nhập thất bại')).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Đăng nhập' })).not.toBeInTheDocument();
  });
});
