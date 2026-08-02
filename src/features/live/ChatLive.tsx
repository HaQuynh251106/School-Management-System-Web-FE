import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, Download, MessageCircleMore, Paperclip, RefreshCw, RotateCcw, Search, Send, ShieldCheck, SlidersHorizontal, UserRound, UsersRound, X } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useAuth } from '../../api/auth';
import { CHAT_REALTIME_RECEIVED, emitChatUnreadChanged } from '../../api/liveEvents';
import { Section } from '../../components/ui';
import { Async, fmtDateTime, useToast } from './common';
import type { ApiUser, ChatThread, PageResponse, SchoolClass, StoredFile } from '../../api/types';
import { useHashString } from '../../api/urlState';

interface ChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  body: string;
  readFlag: boolean;
  readAt?: string | null;
  attachmentFileId?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

interface ContactThread extends ChatThread {
  contact: ApiUser;
}

interface ChatContactScope {
  classId: string;
  classCode: string;
  relation: string;
}

export function mergeChronologicalMessages(latestDescending: ChatMsg[], olderChronological: ChatMsg[]) {
  return [...olderChronological, ...[...latestDescending].reverse()];
}

const ROLE_LABEL: Record<string, string> = {
  TEACHER: 'Giáo viên',
  STUDENT: 'Học sinh',
  PARENT: 'Phụ huynh',
  ADMIN: 'Quản trị viên',
};

const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();

/** Hộp thư 1-1 giữa học sinh, giáo viên và phụ huynh trong đúng phạm vi lớp học. */
export function ChatLive() {
  const { user } = useAuth();
  const threads = useApi<ChatThread[]>('/chat/threads');
  const contacts = useApi<ApiUser[]>('/chat/contacts');
  const contactScopes = useApi<Record<string, ChatContactScope[]>>('/chat/contact-scopes');
  const teachingClasses = useApi<SchoolClass[]>(user?.role === 'TEACHER' ? '/me/teaching-classes' : null);
  const studentClass = useApi<SchoolClass>(user?.role === 'STUDENT' && user.classId ? `/classes/${user.classId}` : null);
  const [withParam, setWithParam] = useHashString('with', '');
  const withId = withParam || null;
  const msgs = useApi<PageResponse<ChatMsg>>(withId ? `/chat/messages/page?withUserId=${encodeURIComponent(withId)}&page=0&size=50` : null);
  const [olderMessages, setOlderMessages] = useState<ChatMsg[]>([]);
  const [loadedPage, setLoadedPage] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const reloadThreads = threads.reload;
  const reloadMessages = msgs.reload;
  const messagesLoading = msgs.loading;
  const messagesData = msgs.data?.items;
  const [search, setSearch] = useHashString('q', '');
  const [roleFilter, setRoleFilter] = useHashString('contactRole', 'ALL');
  const [classFilter, setClassFilter] = useHashString('contactClass', 'ALL');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [broadcastClassId, setBroadcastClassId] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const previousUnreadTotal = useRef<number | null>(null);
  const toast = useToast();

  const available = useMemo<ContactThread[]>(() => {
    return (contacts.data ?? []).map((contact) => {
      const thread = threads.data?.find((item) => item.userId === contact.id);
      return {
        userId: contact.id,
        name: contact.fullName,
        lastMessage: thread?.lastMessage || 'Bắt đầu cuộc trò chuyện',
        lastTime: thread?.lastTime || '',
        unread: thread?.unread || 0,
        contact,
      };
    }).sort((left, right) => {
      if (left.lastTime && right.lastTime) return new Date(right.lastTime).getTime() - new Date(left.lastTime).getTime();
      if (left.lastTime) return -1;
      if (right.lastTime) return 1;
      return left.name.localeCompare(right.name, 'vi');
    });
  }, [contacts.data, threads.data]);

  const availableClasses = useMemo(() => {
    const byId = new Map<string, ChatContactScope>();
    Object.values(contactScopes.data || {}).flat().forEach((scope) => byId.set(scope.classId, scope));
    return [...byId.values()].sort((left, right) => left.classCode.localeCompare(right.classCode, 'vi'));
  }, [contactScopes.data]);

  const availableRoles = useMemo(() => [...new Set(available.map((item) => item.contact.role))], [available]);

  const filteredContacts = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return available.filter(({ contact, lastMessage }) => {
      const scopes = contactScopes.data?.[contact.id] || [];
      const matchesRole = roleFilter === 'ALL' || contact.role === roleFilter;
      const matchesClass = classFilter === 'ALL' || scopes.some((scope) => scope.classId === classFilter);
      const matchesKeyword = !keyword || [
        contact.fullName,
        ROLE_LABEL[contact.role] || contact.role,
        contact.className,
        contact.mainSubject,
        lastMessage,
        ...scopes.flatMap((scope) => [scope.classCode, scope.relation]),
      ].some((value) => value?.toLocaleLowerCase('vi').includes(keyword));
      return matchesRole && matchesClass && matchesKeyword;
    });
  }, [available, classFilter, contactScopes.data, roleFilter, search]);

  const selected = available.find((item) => item.userId === withId) || null;
  const unreadTotal = available.reduce((total, item) => total + item.unread, 0);
  const homeroomClasses = (teachingClasses.data ?? []).filter((schoolClass) => schoolClass.homeroomTeacherId === user?.id);
  const activeFilters = (roleFilter !== 'ALL' ? 1 : 0) + (classFilter !== 'ALL' ? 1 : 0) + (search.trim() ? 1 : 0);
  const currentMessages = useMemo(() => {
    return mergeChronologicalMessages(msgs.data?.items || [], olderMessages);
  }, [msgs.data?.items, olderMessages]);
  const hasOlderMessages = loadedPage + 1 < (msgs.data?.totalPages || 0);

  const contactRelation = (contact: ApiUser) => {
    if (user?.role === 'PARENT') return 'Giáo viên chủ nhiệm';
    if (user?.role === 'STUDENT') {
      if (contact.role === 'STUDENT') return 'Bạn cùng lớp';
      return contact.id === studentClass.data?.homeroomTeacherId
        ? 'Giáo viên chủ nhiệm'
        : `Giáo viên bộ môn${contact.mainSubject ? ` · ${contact.mainSubject}` : ''}`;
    }
    if (user?.role === 'TEACHER') {
      if (contact.role === 'TEACHER') return 'Giáo viên chủ nhiệm lớp đang dạy';
      return contact.role === 'PARENT' ? 'Phụ huynh lớp chủ nhiệm' : 'Học sinh lớp chủ nhiệm';
    }
    return ROLE_LABEL[contact.role] || contact.role;
  };

  const contactScopeText = (contact: ApiUser) => {
    const scopes = contactScopes.data?.[contact.id] || [];
    return scopes.length ? scopes.map((scope) => `${scope.relation} ${scope.classCode}`).join(' · ') : contactRelation(contact);
  };

  useEffect(() => {
    if (filteredContacts.length === 0) {
      if (withId) setWithParam('', 'replace');
      return;
    }
    if (!filteredContacts.some((item) => item.userId === withId)) setWithParam(filteredContacts[0].userId, 'replace');
  }, [filteredContacts, setWithParam, withId]);

  useEffect(() => {
    setOlderMessages([]);
    setLoadedPage(0);
  }, [withId]);

  useEffect(() => {
    const refresh = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<Record<string, unknown>>;
      const relatedId = String(event.detail?.fromUserId || event.detail?.toUserId || event.detail?.readByUserId || '');
      reloadThreads();
      if (!relatedId || relatedId === withId) reloadMessages();
    };
    window.addEventListener(CHAT_REALTIME_RECEIVED, refresh);
    return () => window.removeEventListener(CHAT_REALTIME_RECEIVED, refresh);
  }, [reloadMessages, reloadThreads, withId]);

  useEffect(() => {
    if (!withId || messagesLoading || messagesData == null) return;
    reloadThreads();
  }, [withId, messagesLoading, messagesData, reloadThreads]); // Cập nhật số chưa đọc sau khi mở hội thoại.

  useEffect(() => {
    if (previousUnreadTotal.current !== null && previousUnreadTotal.current !== unreadTotal) {
      emitChatUnreadChanged();
    }
    previousUnreadTotal.current = unreadTotal;
  }, [unreadTotal]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [withId, currentMessages.length]);

  const loadOlder = async () => {
    if (!withId || loadingOlder || !hasOlderMessages) return;
    const nextPage = loadedPage + 1;
    setLoadingOlder(true);
    try {
      const page = await api.get<PageResponse<ChatMsg>>(`/chat/messages/page?withUserId=${encodeURIComponent(withId)}&page=${nextPage}&size=50`);
      setOlderMessages((current) => [...page.items].reverse().concat(current));
      setLoadedPage(nextPage);
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!withId || (!body && !attachment) || sending) return;
    setSending(true);
    try {
      let stored: StoredFile | null = null;
      if (attachment) {
        if (attachment.size > 10 * 1024 * 1024) throw new Error('Tệp không được vượt quá 10 MB');
        stored = await api.upload<StoredFile>('/files', attachment);
      }
      await api.post('/chat/messages', { toUserId: withId, body, attachmentFileId: stored?.id || null });
      setText('');
      setAttachment(null);
      reloadMessages();
      reloadThreads();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setSending(false);
    }
  };

  const downloadAttachment = async (message: ChatMsg) => {
    if (!message.attachmentFileId) return;
    try {
      const result = await api.download(`/files/${message.attachmentFileId}/content`);
      const href = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = result.filename || message.attachmentName || 'tep-dinh-kem';
      anchor.click();
      URL.revokeObjectURL(href);
    } catch (error: any) { toast.show('err', error.message); }
  };

  const sendBroadcast = async () => {
    if (!broadcastClassId || !broadcastText.trim()) return toast.show('err', 'Chọn lớp và nhập nội dung thông báo');
    try {
      await api.post('/announcements', { audience: `CLASS:${broadcastClassId}`, title: 'Thông báo từ giáo viên', body: broadcastText.trim() });
      setBroadcastText('');
      toast.show('ok', 'Đã gửi thông báo tới lớp');
    } catch (error: any) {
      toast.show('err', error.message);
    }
  };

  const title = user?.role === 'STUDENT' ? 'Trao đổi với giáo viên' : 'Tin nhắn trao đổi';
  const subtitle = user?.role === 'STUDENT'
    ? 'Hỏi bài và trao đổi trực tiếp với giáo viên đang phụ trách lớp của bạn'
    : 'Liên lạc trong đúng phạm vi lớp học và nhiệm vụ được phân công';

  return (
    <Section title={title} subtitle={subtitle} wide>
      {toast.node}
      <div className="chat-workspace-intro">
        <div className="chat-intro-main"><span><MessageCircleMore size={24} /></span><div><strong>Trung tâm trao đổi</strong><small>Hội thoại, tệp đính kèm và trạng thái đã đọc trong một không gian tập trung.</small></div></div>
        <div className="chat-intro-stats"><article><strong>{available.length}</strong><small>Liên hệ</small></article><article className={unreadTotal ? 'attention' : ''}><strong>{unreadTotal}</strong><small>Chưa đọc</small></article><article><strong>{availableClasses.length}</strong><small>Lớp liên quan</small></article></div>
      </div>
      <div className="chat-policy-box">
        <ShieldCheck size={19} />
        <div><strong>Danh bạ đã được kiểm soát theo phân công</strong><small>{user?.role === 'TEACHER'
          ? 'Giáo viên chủ nhiệm trao đổi với học sinh, phụ huynh; giáo viên bộ môn trao đổi với giáo viên chủ nhiệm của lớp đang dạy.'
          : user?.role === 'STUDENT'
            ? 'Bạn có thể trao đổi với giáo viên phụ trách và các bạn học sinh trong cùng lớp.'
            : user?.role === 'PARENT'
              ? 'Phụ huynh trao đổi trực tiếp với giáo viên chủ nhiệm của con.'
              : 'Danh sách liên hệ được kiểm soát theo vai trò và nhiệm vụ.'}</small></div>
      </div>
      {user?.role === 'TEACHER' && homeroomClasses.length > 0 && (
        <div className="class-broadcast-box">
          <span className="chat-broadcast-icon"><UsersRound size={18} /></span>
          <div><strong>Thông báo tới lớp</strong><small>Gửi một thông báo chung tới học sinh trong lớp phụ trách</small></div>
          <select className="live-select" value={broadcastClassId} onChange={(event) => setBroadcastClassId(event.target.value)} aria-label="Chọn lớp nhận thông báo">
            <option value="">— Chọn lớp —</option>
            {homeroomClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code}</option>)}
          </select>
          <input className="live-input grow" maxLength={2000} placeholder="Nội dung thông báo…" value={broadcastText} onChange={(event) => setBroadcastText(event.target.value)} />
          <button className="live-btn" onClick={sendBroadcast}><Send size={14} /> Gửi lớp</button>
        </div>
      )}

      <div className="chat-shell">
        <aside className="chat-sidebar">
          <header>
            <div><strong>Hội thoại</strong><small>{available.length} người liên hệ{unreadTotal ? ` · ${unreadTotal} tin chưa đọc` : ''}</small></div>
            <button type="button" aria-label="Làm mới hội thoại" onClick={() => { contacts.reload(); reloadThreads(); }}><RefreshCw size={16} /></button>
          </header>
          <div className="chat-filter-panel">
            <div className="chat-filter-title"><span><SlidersHorizontal size={16} /> Lọc danh bạ</span>{activeFilters > 0 && <button type="button" onClick={() => { setRoleFilter('ALL'); setClassFilter('ALL'); setSearch(''); }}><RotateCcw size={13} /> Đặt lại</button>}</div>
            <div className="chat-filter-selects">
              <label><span>Nhóm liên hệ</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="ALL">Tất cả đối tượng</option>
                {availableRoles.includes('STUDENT') && <option value="STUDENT">Học sinh</option>}
                {availableRoles.includes('PARENT') && <option value="PARENT">Phụ huynh</option>}
                {availableRoles.includes('TEACHER') && <option value="TEACHER">Giáo viên chủ nhiệm</option>}
              </select></label>
              <label><span>Lớp học</span><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
                <option value="ALL">Tất cả lớp</option>{availableClasses.map((scope) => <option key={scope.classId} value={scope.classId}>Lớp {scope.classCode}</option>)}
              </select></label>
            </div>
            <label className="chat-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, lớp, môn hoặc nội dung…" /></label>
            <div className="chat-filter-result"><span>{filteredContacts.length} liên hệ phù hợp</span>{activeFilters > 0 && <b>{activeFilters} bộ lọc</b>}</div>
          </div>
          <Async
            paginate
            pageSize={10}
            itemLabel="liên hệ"
            state={{ data: filteredContacts, loading: contacts.loading || threads.loading || contactScopes.loading, error: contacts.error || threads.error || contactScopes.error }}
            empty={search ? 'Không tìm thấy người liên hệ' : 'Không có người liên hệ phù hợp'}
          >
            {(items) => (
              <div className="chat-contact-list">
                {items.map((item) => (
                  <button type="button" key={item.userId} className={withId === item.userId ? 'active' : ''} onClick={() => setWithParam(item.userId, 'push')}>
                    <span className="chat-avatar">{initials(item.name) || <UserRound size={17} />}</span>
                    <span className="chat-contact-copy">
                      <span><strong>{item.name}</strong><time>{item.lastTime ? fmtDateTime(item.lastTime) : ''}</time></span>
                      <small>{contactScopeText(item.contact)}</small>
                      <p>{item.lastMessage}</p>
                    </span>
                    {item.unread > 0 && <b className="chat-unread">{item.unread > 99 ? '99+' : item.unread}</b>}
                  </button>
                ))}
              </div>
            )}
          </Async>
        </aside>

        <main className="chat-conversation">
          {!selected ? (
            <div className="chat-empty"><MessageCircleMore size={42} /><strong>Chọn một hội thoại</strong><span>Người liên hệ được giới hạn theo lớp học và phân công giảng dạy.</span></div>
          ) : (
            <>
              <header className="chat-conversation-head">
                <span className="chat-avatar">{initials(selected.name)}</span>
                <div><strong>{selected.name}</strong><small>{contactScopeText(selected.contact)}</small></div>
                <span className="chat-secure-label"><CheckCheck size={15} /> Hội thoại nội bộ</span>
              </header>
              <div className="chat-message-list" aria-live="polite">
                {hasOlderMessages && <button className="chat-load-older" type="button" disabled={loadingOlder} onClick={loadOlder}>
                  {loadingOlder ? 'Đang tải…' : 'Tải tin nhắn cũ hơn'}
                </button>}
                <Async state={{ data: currentMessages, loading: msgs.loading, error: msgs.error }} empty="Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.">
                  {(list) => (
                    <div className="chat-message-stack">
                      {list.map((message) => {
                        const mine = message.senderId === user?.id;
                        return (
                          <article key={message.id} className={`chat-message ${mine ? 'mine' : 'theirs'}`}>
                            {!mine && <span className="chat-message-sender">{message.senderName}</span>}
                            {message.body && <p>{message.body}</p>}
                            {message.attachmentFileId && <button className="chat-file-message" onClick={() => downloadAttachment(message)}><Paperclip size={15} /><span>{message.attachmentName || 'Tệp đính kèm'}</span><Download size={14} /></button>}
                            <small>{fmtDateTime(message.createdAt)}{mine ? ` · ${message.readFlag ? 'Đã xem' : 'Đã gửi'}` : ''}</small>
                          </article>
                        );
                      })}
                      <div ref={messageEndRef} />
                    </div>
                  )}
                </Async>
              </div>
              <div className="chat-composer">
                {attachment && <div className="chat-attachment-preview"><Paperclip size={14} /><span>{attachment.name}</span><small>{Math.ceil(attachment.size / 1024)} KB</small><button type="button" onClick={() => setAttachment(null)} aria-label="Bỏ tệp"><X size={14} /></button></div>}
                <textarea
                  maxLength={2000}
                  rows={2}
                  placeholder={`Nhắn tin cho ${selected.name}…`}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                />
                <label className="chat-file-picker" title="Đính kèm tệp"><Paperclip size={17} /><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp" onChange={(event) => setAttachment(event.target.files?.[0] || null)} /></label>
                <span>{text.length}/2000 · Enter để gửi · Tệp tối đa 10 MB</span>
                <button className="live-btn" type="button" disabled={(!text.trim() && !attachment) || sending} onClick={send}><Send size={16} /> {sending ? 'Đang gửi…' : 'Gửi'}</button>
              </div>
            </>
          )}
        </main>
      </div>
    </Section>
  );
}
