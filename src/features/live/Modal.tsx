import type { ReactNode } from 'react';
import { X } from 'lucide-react';

/** Popup modal dùng chung. */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Field có nhãn cho form trong modal. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="modal-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
