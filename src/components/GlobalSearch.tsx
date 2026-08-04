import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Building2, CalendarClock, FileText, GraduationCap, LoaderCircle, ReceiptText, Search, UserRound, X } from 'lucide-react';
import { api } from '../api/client';
import type { GlobalSearchItem, GlobalSearchResponse } from '../api/types';
import type { PageId, RoleId } from '../types';

const SEARCH_COPY: Record<RoleId, { placeholder: string; label: string }> = {
  admin: { placeholder: 'Tìm người dùng, tài khoản, thông báo…', label: 'Tìm kiếm trong khu vực quản trị' },
  academic_staff: { placeholder: 'Tìm học sinh, lớp, môn, kỳ thi…', label: 'Tìm kiếm trong nghiệp vụ giáo vụ' },
  accountant: { placeholder: 'Tìm đợt thu, hóa đơn, học sinh…', label: 'Tìm kiếm trong nghiệp vụ tài chính' },
  teacher: { placeholder: 'Tìm lớp, học sinh, bài tập…', label: 'Tìm kiếm trong không gian giáo viên' },
  student: { placeholder: 'Tìm bài tập, kỳ thi, thông báo…', label: 'Tìm kiếm trong cổng học sinh' },
  parent: { placeholder: 'Tìm lịch học, học phí, thông báo…', label: 'Tìm kiếm trong cổng phụ huynh' },
};

const TYPE_ICON = {
  USER: UserRound,
  STUDENT: GraduationCap,
  CLASS: Building2,
  SUBJECT: BookOpen,
  ASSIGNMENT: FileText,
  INVOICE: ReceiptText,
  EXAM: CalendarClock,
  NOTIFICATION: FileText,
} as const;

export function GlobalSearch({ roleId, onNavigate }: { roleId: RoleId; onNavigate: (page: PageId) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
        window.requestAnimationFrame(() => input.current?.focus());
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.get<GlobalSearchResponse>(`/search?q=${encodeURIComponent(value)}&limit=20`);
        if (currentRequest !== requestId.current) return;
        setResults(response.items);
        setError(null);
        setOpen(true);
      } catch (cause) {
        if (currentRequest !== requestId.current) return;
        setResults([]);
        setError(cause instanceof Error ? cause.message : 'Không thể tìm kiếm');
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const groups = useMemo(() => {
    const output = new Map<string, GlobalSearchItem[]>();
    results.forEach((item) => output.set(item.category, [...(output.get(item.category) || []), item]));
    return [...output.entries()];
  }, [results]);

  const choose = (item: GlobalSearchItem) => {
    onNavigate(item.pageId);
    setOpen(false);
    setQuery('');
  };

  const activate = () => {
    setOpen(true);
    window.requestAnimationFrame(() => input.current?.focus());
  };
  const copy = SEARCH_COPY[roleId];

  return (
    <div className={`global-search ${open ? 'open' : ''}`} ref={root}>
      <button type="button" className="global-search-mobile-trigger" onClick={activate}
        aria-label="Mở tìm kiếm toàn hệ thống">
        <Search size={18} />
      </button>
      <div className="global-search-input" onClick={activate}>
        {loading ? <LoaderCircle size={17} className="is-spinning" /> : <Search size={17} />}
        <input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder={copy.placeholder} aria-label={copy.label} />
        {query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => { setQuery(''); setResults([]); }}>
          <X size={15} />
        </button>}
        {!query && <kbd aria-hidden="true">Ctrl K</kbd>}
      </div>
      {open && query.trim().length >= 2 && (
        <div className="global-search-panel" role="dialog" aria-label="Kết quả tìm kiếm">
          {loading && <div className="global-search-state"><LoaderCircle size={18} className="is-spinning" /> Đang tìm kiếm…</div>}
          {!loading && error && <div className="global-search-state error">{error}</div>}
          {!loading && !error && results.length === 0 && <div className="global-search-state">Không tìm thấy kết quả phù hợp</div>}
          {!loading && !error && groups.map(([category, items]) => (
            <section key={category}>
              <header>{category}<span>{items.length}</span></header>
              {items.map((item) => {
                const Icon = TYPE_ICON[item.type as keyof typeof TYPE_ICON] || Search;
                return (
                  <button type="button" key={`${item.type}:${item.id}`} onClick={() => choose(item)}>
                    <span><Icon size={17} /></span>
                    <div><strong>{item.title}</strong><small>{item.subtitle || category}</small></div>
                  </button>
                );
              })}
            </section>
          ))}
          {!loading && results.length > 0 && <footer>{results.length} kết quả · Kết quả được giới hạn theo quyền truy cập</footer>}
        </div>
      )}
    </div>
  );
}
