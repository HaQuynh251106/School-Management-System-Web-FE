import { Component, useEffect, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, CloudOff, RefreshCw, Wifi } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last-resort recovery screen. Feature-level API errors remain local; this catches
 * unexpected render failures so users never get an empty white page.
 */
export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected application error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="system-failure" role="alert">
        <div className="system-failure__icon"><AlertTriangle size={28} /></div>
        <p className="system-failure__eyebrow">Không thể hiển thị nội dung</p>
        <h1>Trang vừa gặp một sự cố ngoài dự kiến</h1>
        <p>Dữ liệu của bạn chưa bị thay đổi. Hãy tải lại trang; nếu lỗi lặp lại, gửi thời điểm xảy ra lỗi cho quản trị viên.</p>
        <div className="system-failure__actions">
          <button type="button" onClick={() => window.location.reload()}>
            <RefreshCw size={17} /> Tải lại trang
          </button>
          <button className="secondary" type="button" onClick={() => {
            this.setState({ error: null });
            window.location.hash = '#/tong-quan';
          }}>
            Về trang tổng quan
          </button>
        </div>
      </main>
    );
  }
}

export function ConnectivityBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const wentOffline = () => {
      window.clearTimeout(timer);
      setRestored(false);
      setOnline(false);
    };
    const wentOnline = () => {
      setOnline(true);
      setRestored(true);
      timer = window.setTimeout(() => setRestored(false), 3500);
    };
    window.addEventListener('offline', wentOffline);
    window.addEventListener('online', wentOnline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('offline', wentOffline);
      window.removeEventListener('online', wentOnline);
    };
  }, []);

  if (online && !restored) return null;
  return (
    <div
      className={`connectivity-banner ${online ? 'is-online' : 'is-offline'}`}
      role="status"
      aria-live="polite"
    >
      {online ? <Wifi size={17} /> : <CloudOff size={17} />}
      <strong>{online ? 'Đã kết nối lại' : 'Đang mất kết nối mạng'}</strong>
      <span>{online ? 'Dữ liệu mới sẽ được đồng bộ bình thường.' : 'Không đóng trang. Các thao tác lưu sẽ cần thực hiện lại khi có mạng.'}</span>
    </div>
  );
}
