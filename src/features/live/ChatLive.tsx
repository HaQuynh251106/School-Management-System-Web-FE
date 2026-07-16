import { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useAuth } from '../../api/auth';
import { Section } from '../../components/ui';
import { Async, useToast, fmtDateTime } from './common';
import type { ApiUser, SchoolClass } from '../../api/types';

interface Thread { userId: string; name: string; lastMessage: string; lastTime: string; unread: number; }
interface ChatMsg { id: string; senderId: string; senderName: string; recipientId: string; body: string; createdAt: string; }

/** B6/D3: Chat 1-1 với GV/PH/HS — /chat/threads, /chat/messages. */
export function ChatLive() {
  const { user } = useAuth();
  const threads = useApi<Thread[]>('/chat/threads');
  const contacts = useApi<ApiUser[]>('/chat/contacts');
  const teachingClasses = useApi<SchoolClass[]>(user?.role === 'TEACHER' ? '/me/teaching-classes' : null);
  const [withId, setWithId] = useState<string | null>(null);
  const msgs = useApi<ChatMsg[]>(withId ? `/chat/messages?withUserId=${withId}` : null);
  const [text, setText] = useState('');
  const [broadcastClassId, setBroadcastClassId] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const toast = useToast();
  const available = (contacts.data ?? []).map((contact) => {
    const thread = threads.data?.find((item) => item.userId === contact.id);
    return thread ?? { userId: contact.id, name: contact.fullName, lastMessage: 'Bắt đầu hội thoại', lastTime: '', unread: 0 };
  });

  const send = async () => {
    if (!withId || !text.trim()) return;
    try {
      await api.post('/chat/messages', { toUserId: withId, body: text.trim() });
      setText('');
      msgs.reload();
      threads.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const sendBroadcast = async () => {
    if (!broadcastClassId || !broadcastText.trim()) return toast.show('err', 'Chọn lớp và nhập nội dung thông báo');
    try {
      await api.post('/announcements', { audience: `CLASS:${broadcastClassId}`, title: 'Thông báo từ giáo viên', body: broadcastText.trim() });
      setBroadcastText(''); toast.show('ok', 'Đã gửi thông báo tới lớp');
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title="Trao đổi" subtitle="Nhắn tin trực tiếp với giáo viên, học sinh và phụ huynh" wide>
      {toast.node}
      {user?.role === 'TEACHER' && (
        <div className="class-broadcast-box">
          <div><strong>Thông báo tới lớp</strong><small>Gửi đồng thời tới hộp thư của học sinh trong lớp phụ trách</small></div>
          <select className="live-select" value={broadcastClassId} onChange={(e) => setBroadcastClassId(e.target.value)}>
            <option value="">— Chọn lớp —</option>{(teachingClasses.data ?? []).map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code}</option>)}
          </select>
          <input className="live-input grow" placeholder="Nội dung thông báo…" value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)} />
          <button className="live-btn" onClick={sendBroadcast}><Send size={14} /> Gửi lớp</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220, flex: '0 0 240px' }}>
          <Async state={contacts} empty="Không có người liên hệ phù hợp">
            {() => (
              <div className="child-tabs" style={{ flexDirection: 'column' }}>
                {available.map((t) => (
                  <button key={t.userId} className={withId === t.userId ? 'active' : ''}
                    style={{ textAlign: 'left' }} onClick={() => setWithId(t.userId)}>
                    {t.name} {t.unread > 0 ? `(${t.unread})` : ''}
                    <br /><small style={{ opacity: 0.7 }}>{t.lastMessage?.slice(0, 30)}</small>
                  </button>
                ))}
              </div>
            )}
          </Async>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          {!withId ? (
            <div className="live-loading">Chọn một hội thoại để nhắn tin.</div>
          ) : (
            <>
              <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 12 }}>
                <Async state={msgs} empty="Chưa có tin nhắn">
                  {(list) => (
                    <div>
                      {list.map((m) => {
                        const mine = m.senderId === user?.id;
                        return (
                          <div key={m.id} style={{ textAlign: mine ? 'right' : 'left', margin: '6px 0' }}>
                            <div style={{
                              display: 'inline-block', maxWidth: '75%', padding: '8px 12px', borderRadius: 12,
                              background: mine ? 'var(--blue)' : '#eef2fb', color: mine ? '#fff' : 'var(--ink)',
                            }}>
                              {m.body}
                              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{fmtDateTime(m.createdAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Async>
              </div>
              <div className="live-toolbar">
                <input className="live-input grow" placeholder="Nhập tin nhắn…" value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
                <button className="live-btn" onClick={send}><Send size={15} /> Gửi</button>
              </div>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
