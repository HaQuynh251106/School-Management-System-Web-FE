import { useEffect, useRef, useState } from 'react';
import { CircleAlert, X } from 'lucide-react';
import { APP_ERROR_EVENT } from '../api/errorEvents';

export default function GlobalErrorDialog() {
  const [messages, setMessages] = useState<string[]>([]);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const receive = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message?.trim();
      if (!message) return;
      setMessages((current) => current.includes(message) ? current : [...current, message]);
    };
    window.addEventListener(APP_ERROR_EVENT, receive);
    return () => window.removeEventListener(APP_ERROR_EVENT, receive);
  }, []);

  useEffect(() => {
    if (messages.length) closeButton.current?.focus();
  }, [messages.length]);

  if (!messages.length) return null;
  const [message] = messages;
  return (
    <div className="global-error-overlay" role="presentation">
      <section className="global-error-dialog" role="alertdialog" aria-modal="true" aria-labelledby="global-error-title" aria-describedby="global-error-message">
        <header>
          <span className="global-error-icon"><CircleAlert size={25} /></span>
          <div>
            <h2 id="global-error-title">Không thể hoàn tất thao tác</h2>
            <small>Vui lòng kiểm tra nội dung bên dưới</small>
          </div>
          <button type="button" className="global-error-close" aria-label="Đóng thông báo lỗi" onClick={() => setMessages((current) => current.slice(1))}>
            <X size={20} />
          </button>
        </header>
        <p id="global-error-message">{message}</p>
        {messages.length > 1 && <small className="global-error-remaining">Còn {messages.length - 1} thông báo lỗi</small>}
        <footer>
          <button ref={closeButton} type="button" className="live-btn" onClick={() => setMessages((current) => current.slice(1))}>Đã hiểu</button>
        </footer>
      </section>
    </div>
  );
}
