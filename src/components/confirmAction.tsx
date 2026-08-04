import { createRoot } from 'react-dom/client';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ConfirmTone = 'default' | 'danger' | 'warning';

export interface ConfirmActionOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

export function confirmAction({
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  tone = 'default',
}: ConfirmActionOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.className = 'confirm-action-host';
    document.body.appendChild(host);
    const root = createRoot(host);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let completed = false;

    const finish = (accepted: boolean) => {
      if (completed) return;
      completed = true;
      window.removeEventListener('keydown', onKeyDown);
      root.unmount();
      host.remove();
      window.requestAnimationFrame(() => previousFocus?.focus());
      resolve(accepted);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false);
      if (event.key !== 'Tab') return;
      const dialog = host.querySelector<HTMLElement>('[role="alertdialog"]');
      const focusable = dialog ? [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')] : [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);

    const Icon = tone === 'danger' || tone === 'warning' ? AlertTriangle : Info;
    root.render(
      <div className="modal-overlay confirm-action-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && finish(false)}>
        <section className={`confirm-action-card is-${tone}`} role="alertdialog" aria-modal="true" aria-labelledby="confirm-action-title" aria-describedby={description ? 'confirm-action-description' : undefined}>
          <button className="confirm-action-close" type="button" aria-label="Đóng hộp xác nhận" onClick={() => finish(false)}><X size={19} /></button>
          <span className="confirm-action-icon"><Icon size={23} /></span>
          <div className="confirm-action-copy"><h3 id="confirm-action-title">{title}</h3>{description && <p id="confirm-action-description">{description}</p>}</div>
          <footer>
            <button className="live-btn ghost" type="button" onClick={() => finish(false)}>{cancelLabel}</button>
            <button className={`live-btn confirm-action-primary ${tone === 'danger' ? 'danger' : ''}`} type="button" autoFocus onClick={() => finish(true)}>
              {tone === 'default' && <CheckCircle2 size={16} />}{confirmLabel}
            </button>
          </footer>
        </section>
      </div>,
    );
  });
}
