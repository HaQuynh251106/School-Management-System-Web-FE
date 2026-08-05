import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { APP_SUCCESS_EVENT } from '../api/errorEvents';

type SuccessMessage = { id: number; text: string };

export default function GlobalSuccessToast() {
  const [messages, setMessages] = useState<SuccessMessage[]>([]);

  useEffect(() => {
    const receive = (event: Event) => {
      const text = (event as CustomEvent<{ message?: string }>).detail?.message?.trim();
      if (!text) return;
      setMessages((current) => [...current, { id: Date.now() + Math.random(), text }]);
    };
    window.addEventListener(APP_SUCCESS_EVENT, receive);
    return () => window.removeEventListener(APP_SUCCESS_EVENT, receive);
  }, []);

  const active = messages[0];
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setTimeout(() => {
      setMessages((current) => current.filter((item) => item.id !== active.id));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) return null;
  const dismiss = () => setMessages((current) => current.filter((item) => item.id !== active.id));

  return (
    <div className="live-toast-region" aria-live="polite" aria-atomic="true">
      <div className="live-toast ok" role="status">
        <CheckCircle2 className="live-toast-icon" size={21} aria-hidden="true" />
        <div className="live-toast-content">
          <strong>Thao tác thành công</strong>
          <span>{active.text}</span>
        </div>
        <button type="button" onClick={dismiss} aria-label="Đóng thông báo" title="Đóng thông báo">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
