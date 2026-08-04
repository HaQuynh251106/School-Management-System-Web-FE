import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(-1);
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

  useEffect(() => {
    setActiveIndex(results.length ? 0 : -1);
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
  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || !results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => current < results.length - 1 ? current + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => current > 0 ? current - 1 : results.length - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  };

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
          onKeyDown={onSearchKeyDown}
          placeholder={copy.placeholder} aria-label={copy.label} role="combobox" aria-autocomplete="list"
          aria-expanded={open && query.trim().length >= 2} aria-controls="global-search-results"
          aria-activedescendant={activeIndex >= 0 ? `global-search-option-${activeIndex}` : undefined} />
        {query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => { setQuery(''); setResults([]); }}>
          <X size={15} />
        </button>}
        {!query && <kbd aria-hidden="true">Ctrl K</kbd>}
      </div>
      {open && query.trim().length >= 2 && (
        <div id="global-search-results" className="global-search-panel" role="listbox" aria-label="Kết quả tìm kiếm">
          {loading && <div className="global-search-state"><LoaderCircle size={18} className="is-spinning" /> Đang tìm kiếm…</div>}
          {!loading && error && <div className="global-search-state error">{error}</div>}
          {!loading && !error && results.length === 0 && <div className="global-search-state">Không tìm thấy kết quả phù hợp</div>}
          {!loading && !error && groups.map(([category, items]) => (
            <section key={category}>
              <header>{category}<span>{items.length}</span></header>
              {items.map((item) => {
                const Icon = TYPE_ICON[item.type as keyof typeof TYPE_ICON] || Search;
                const resultIndex = results.indexOf(item);
                return (
                  <button type="button" role="option" aria-selected={activeIndex === resultIndex} id={`global-search-option-${resultIndex}`} className={activeIndex === resultIndex ? 'keyboard-active' : ''} key={`${item.type}:${item.id}`} onMouseEnter={() => setActiveIndex(resultIndex)} onClick={() => choose(item)}>
                    <span><Icon size={17} /></span>
                    <div><strong>{item.title}</strong><small>{item.subtitle || category}</small></div>
                  </button>
                );
              })}
            </section>
          ))}
          {!loading && results.length > 0 && <footer>{results.length} kết quả · ↑↓ để chọn · Enter để mở · Esc để đóng</footer>}
        </div>
      )}
    </div>
  );
}
