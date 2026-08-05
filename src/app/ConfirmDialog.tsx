import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { Modal } from '../features/live/Modal';

type ConfirmTone = 'default' | 'warning' | 'danger';
type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};
type PendingConfirmation = ConfirmOptions & { resolve: (confirmed: boolean) => void };
type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const confirm = useCallback<ConfirmFunction>((options) => new Promise((resolve) => {
    setPending({ ...options, resolve });
  }), []);
  const value = useMemo(() => confirm, [confirm]);
  const settle = (confirmed: boolean) => {
    pending?.resolve(confirmed);
    setPending(null);
  };
  const Icon = pending?.tone === 'danger' ? Trash2
    : pending?.tone === 'warning' ? AlertTriangle : CheckCircle2;

  return <ConfirmContext.Provider value={value}>
    {children}
    {pending && <Modal title={pending.title} onClose={() => settle(false)} footer={<>
      <button className="live-btn ghost" type="button" onClick={() => settle(false)}>{pending.cancelLabel || 'Quay lại'}</button>
      <button className={`live-btn ${pending.tone === 'danger' ? 'danger' : ''}`} type="button" onClick={() => settle(true)}>
        {pending.confirmLabel || 'Xác nhận'}
      </button>
    </>}>
      <div className={`app-confirm-content ${pending.tone || 'default'}`}>
        <span><Icon size={24} /></span>
        <p>{pending.message}</p>
      </div>
    </Modal>}
  </ConfirmContext.Provider>;
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm phải được dùng bên trong ConfirmProvider');
  return confirm;
}
