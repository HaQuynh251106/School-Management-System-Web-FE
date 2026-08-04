import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { confirmAction } from './confirmAction';

describe('confirmAction', () => {
  it('hủy thao tác mà không tạo hộp thoại native của trình duyệt', async () => {
    const result = confirmAction({
      title: 'Xóa bản ghi?',
      description: 'Dữ liệu sẽ không thể khôi phục.',
      confirmLabel: 'Xóa',
      tone: 'danger',
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Hủy' }));

    await expect(result).resolves.toBe(false);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('trả về true khi người dùng xác nhận', async () => {
    const result = confirmAction({ title: 'Áp dụng phương án?', confirmLabel: 'Áp dụng' });

    fireEvent.click(await screen.findByRole('button', { name: 'Áp dụng' }));

    await expect(result).resolves.toBe(true);
  });
});
