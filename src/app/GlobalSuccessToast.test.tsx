import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { showAppError, showAppSuccess } from '../api/errorEvents';
import GlobalErrorDialog from './GlobalErrorDialog';
import GlobalSuccessToast from './GlobalSuccessToast';

describe('GlobalSuccessToast', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows success feedback independently from the action component and dismisses it', () => {
    render(<GlobalSuccessToast />);

    act(() => showAppSuccess('Đã duyệt lịch dạy bù và gửi thông báo liên quan.'));

    expect(screen.getByRole('status')).toHaveTextContent('Đã duyệt lịch dạy bù');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps queued feedback and closes each message automatically', () => {
    vi.useFakeTimers();
    render(<GlobalSuccessToast />);

    act(() => {
      showAppSuccess('Thao tác thứ nhất');
      showAppSuccess('Thao tác thứ hai');
    });

    expect(screen.getByRole('status')).toHaveTextContent('Thao tác thứ nhất');
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole('status')).toHaveTextContent('Thao tác thứ hai');
  });

  it('shows failures in the blocking global error dialog', () => {
    render(<GlobalErrorDialog />);

    act(() => showAppError('Không thể duyệt lịch dạy bù do lịch đã thay đổi.'));

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Không thể duyệt lịch dạy bù');
    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
