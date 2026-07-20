import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, Download, MessageCircleMore, Paperclip, RefreshCw, Search, Send, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useAuth } from '../../api/auth';
import { Section } from '../../components/ui';
import { Async, fmtDateTime, useToast } from './common';
import type { ApiUser, SchoolClass, StoredFile } from '../../api/types';

interface Thread {
  userId: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

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

interface ContactThread extends Thread {
  contact: ApiUser;
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
  const threads = useApi<Thread[]>('/chat/threads');
  const contacts = useApi<ApiUser[]>('/chat/contacts');
  const teachingClasses = useApi<SchoolClass[]>(user?.role === 'TEACHER' ? '/me/teaching-classes' : null);
  const studentClass = useApi<SchoolClass>(user?.role === 'STUDENT' && user.classId ? `/classes/${user.classId}` : null);
  const [withId, setWithId] = useState<string | null>(null);
  const msgs = useApi<ChatMsg[]>(withId ? `/chat/messages?withUserId=${encodeURIComponent(withId)}` : null);
  const reloadThreads = threads.reload;
  const reloadMessages = msgs.reload;
  const messagesLoading = msgs.loading;
  const messagesData = msgs.data;
  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [broadcastClassId, setBroadcastClassId] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const messageEndRef = useRef<HTMLDivElement | null>(null);
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

  const filteredContacts = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    if (!keyword) return available;
    return available.filter(({ contact, lastMessage }) => [
      contact.fullName,
      ROLE_LABEL[contact.role] || contact.role,
      contact.className,
      contact.mainSubject,
      lastMessage,
    ].some((value) => value?.toLocaleLowerCase('vi').includes(keyword)));
  }, [available, search]);

  const selected = available.find((item) => item.userId === withId) || null;
  const unreadTotal = available.reduce((total, item) => total + item.unread, 0);
  const homeroomClasses = (teachingClasses.data ?? []).filter((schoolClass) => schoolClass.homeroomTeacherId === user?.id);

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

  useEffect(() => {
    if (!withId && available.length > 0) setWithId(available[0].userId);
  }, [available, withId]);

  useEffect(() => {
    if (!withId) return undefined;
    const timer = window.setInterval(() => {
      reloadMessages();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [withId, reloadMessages]);

  useEffect(() => {
    if (!withId || messagesLoading || messagesData == null) return;
    reloadThreads();
  }, [withId, messagesLoading, messagesData, reloadThreads]); // Cập nhật số chưa đọc sau khi mở hội thoại.

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [withId, msgs.data?.length]);

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
      <div className="chat-policy-box">
        <ShieldCheck size={20} />
        <div><strong>Liên hệ đúng phạm vi nhà trường</strong><small>{user?.role === 'TEACHER'
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
          <label className="chat-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, lớp hoặc môn…" /></label>
          <Async
            paginate
            pageSize={10}
            itemLabel="liên hệ"
            state={{ data: filteredContacts, loading: contacts.loading || threads.loading, error: contacts.error || threads.error }}
            empty={search ? 'Không tìm thấy người liên hệ' : 'Không có người liên hệ phù hợp'}
          >
            {(items) => (
              <div className="chat-contact-list">
                {items.map((item) => (
                  <button type="button" key={item.userId} className={withId === item.userId ? 'active' : ''} onClick={() => setWithId(item.userId)}>
                    <span className="chat-avatar">{initials(item.name) || <UserRound size={17} />}</span>
                    <span className="chat-contact-copy">
                      <span><strong>{item.name}</strong><time>{item.lastTime ? fmtDateTime(item.lastTime) : ''}</time></span>
                      <small>{contactRelation(item.contact)}{item.contact.className ? ` · ${item.contact.className}` : ''}</small>
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
                <div><strong>{selected.name}</strong><small>{contactRelation(selected.contact)}{selected.contact.className ? ` · Lớp ${selected.contact.className}` : ''}</small></div>
                <span className="chat-secure-label"><CheckCheck size={15} /> Hội thoại nội bộ</span>
              </header>
              <div className="chat-message-list" aria-live="polite">
                <Async state={msgs} empty="Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.">
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
