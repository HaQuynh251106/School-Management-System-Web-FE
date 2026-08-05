import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CircleCheck, CircleX, Clock3, RefreshCw, School, ShieldAlert } from 'lucide-react';
import { api } from '../../api/client';
import { showAppError } from '../../api/errorEvents';
import type { PaymentReturnResponse } from '../../api/types';

const money = (value?: number | null) => value == null
  ? '—'
  : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export function PaymentReturnPage({ provider }: { provider: string }) {
  const [result, setResult] = useState<PaymentReturnResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const query = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete('paymentReturn');
    return params.toString();
  }, []);
  const providerLabel = provider.toLowerCase() === 'momo' ? 'MoMo' : 'VNPAY';
  const providerTransactionLabel = provider.toLowerCase() === 'momo' ? 'Mã MoMo' : 'Mã VNPAY';

  useEffect(() => {
    if (error) showAppError(error);
  }, [error]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setResult(await api.get<PaymentReturnResponse>(`/payments/${encodeURIComponent(provider)}/return?${query}`));
    } catch (reason: any) {
      setError(reason.message || 'Không thể kiểm tra kết quả thanh toán');
    } finally {
      setLoading(false);
    }
  }, [provider, query]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!result || result.finalStatus || result.signatureValid !== true || result.gatewaySuccessful !== true) return;
    const timer = window.setTimeout(load, 2500);
    return () => window.clearTimeout(timer);
  }, [load, result]);

  const success = result?.status === 'SUCCESS';
  const invalid = !!error || result?.signatureValid === false || ['INVALID', 'NOT_FOUND', 'FAILED'].includes(result?.status || '');
  const Icon = success ? CircleCheck : invalid ? CircleX : result ? Clock3 : ShieldAlert;
  const title = success
    ? 'Thanh toán thành công'
    : invalid
      ? 'Giao dịch không thành công'
      : result
        ? 'Đang xác nhận thanh toán'
        : 'Kiểm tra giao dịch';

  const backToSystem = () => {
    window.location.assign(`${window.location.origin}${window.location.pathname}`);
  };

  return (
    <main className="payment-return-screen">
      <header className="payment-return-brand"><School size={23} /><div><strong>Trường học số</strong><span>Thanh toán học phí</span></div></header>
      <section className={`payment-return-panel ${success ? 'success' : invalid ? 'failed' : 'pending'}`}>
        <span className="payment-return-icon"><Icon size={32} /></span>
        <div className="payment-return-heading">
          <span>{providerLabel}</span>
          <h1>{loading && !result ? 'Đang kiểm tra…' : title}</h1>
          <p>{error || result?.message || 'Hệ thống đang xác thực dữ liệu trả về từ cổng thanh toán.'}</p>
        </div>
        {result && (
          <dl className="payment-return-details">
            <div><dt>Mã giao dịch</dt><dd>{result.txnRef || '—'}</dd></div>
            <div><dt>{providerTransactionLabel}</dt><dd>{result.providerTransactionId || '—'}</dd></div>
            <div><dt>Số tiền</dt><dd>{money(result.amount)}</dd></div>
            <div><dt>Trạng thái hệ thống</dt><dd>{result.status}</dd></div>
          </dl>
        )}
        <footer className="payment-return-actions">
          <button type="button" className="live-btn ghost" onClick={backToSystem}><ArrowLeft size={16} /> Về hệ thống</button>
          <button type="button" className="live-btn" disabled={loading} onClick={load}><RefreshCw size={16} /> {loading ? 'Đang kiểm tra' : 'Kiểm tra lại'}</button>
        </footer>
      </section>
    </main>
  );
}
