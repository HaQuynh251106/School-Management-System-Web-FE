import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, TriangleAlert, X } from 'lucide-react';

/** Popup modal dùng chung. */
export function Modal({
  title,
  onClose,
  children,
  footer,
  size = 'default',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'default' | 'wide';
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-card ${size === 'wide' ? 'modal-card-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
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
export function Field({ label, children, error, hint }: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className={`modal-field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      {children}
      {error && <small className="modal-field-error">{error}</small>}
      {!error && hint && <small className="modal-field-hint">{hint}</small>}
    </label>
  );
}

/** Hiển thị điều kiện hợp lệ trước khi người dùng gửi một thao tác phức tạp. */
export function FormValidationSummary({ errors, warnings = [], success = 'Đủ điều kiện để tiếp tục.' }: {
  errors: string[];
  warnings?: string[];
  success?: string;
}) {
  const valid = errors.length === 0;
  return (
    <div className={`form-readiness ${valid ? 'valid' : 'invalid'}`} role="status" aria-live="polite">
      {valid ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      <div>
        <strong>{valid ? success : `Cần xử lý ${errors.length} mục trước khi tiếp tục`}</strong>
        {errors.length > 0 && <ul>{errors.map((item) => <li key={item}>{item}</li>)}</ul>}
        {warnings.length > 0 && <div className="form-readiness-warnings">
          <TriangleAlert size={16} />
          <ul>{warnings.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>}
      </div>
    </div>
  );
}
