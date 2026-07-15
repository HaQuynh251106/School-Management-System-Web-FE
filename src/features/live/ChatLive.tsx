import { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useAuth } from '../../api/auth';
import { Section } from '../../components/ui';
import { Async, useToast, fmtDateTime } from './common';

interface Thread { userId: string; name: string; lastMessage: string; lastTime: string; unread: number; }
interface ChatMsg { id: string; senderId: string; senderName: string; recipientId: string; body: string; createdAt: string; }

/** B6/D3: Chat 1-1 với GV/PH/HS — /chat/threads, /chat/messages. */
export function ChatLive() {
  const { user } = useAuth();
  const threads = useApi<Thread[]>('/chat/threads');
  const [withId, setWithId] = useState<string | null>(null);
  const msgs = useApi<ChatMsg[]>(withId ? `/chat/messages?withUserId=${withId}` : null);
  const [text, setText] = useState('');
  const toast = useToast();

  const send = async () => {
    if (!withId || !text.trim()) return;
    try {
      await api.post('/chat/messages', { toUserId: withId, body: text.trim() });
      setText('');
      msgs.reload();
      threads.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title="Trao đổi" subtitle="Nhắn tin trực tiếp với giáo viên, học sinh và phụ huynh" wide>
      {toast.node}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 220, flex: '0 0 240px' }}>
          <Async state={threads} empty="Chưa có hội thoại">
            {(list) => (
              <div className="child-tabs" style={{ flexDirection: 'column' }}>
                {list.map((t) => (
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
