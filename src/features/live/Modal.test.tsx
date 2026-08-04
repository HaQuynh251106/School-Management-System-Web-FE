import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Modal } from './Modal';

function Fixture() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)}>Mở hộp thoại</button>
    {open && <Modal title="Xác nhận thao tác" onClose={() => setOpen(false)}>
      <label>Ghi chú<input aria-label="Ghi chú" /></label>
      <button type="button">Xác nhận</button>
    </Modal>}
  </>;
}

describe('Modal accessibility', () => {
  it('traps focus, closes with Escape and restores focus to the trigger', async () => {
    render(<Fixture />);
    const trigger = screen.getByRole('button', { name: 'Mở hộp thoại' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Xác nhận thao tác' });
    expect(dialog).toBeInTheDocument();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    const close = screen.getByRole('button', { name: 'Đóng: Xác nhận thao tác' });
    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
