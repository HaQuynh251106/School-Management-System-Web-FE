import { describe, expect, it } from 'vitest';
import { mergeChronologicalMessages } from './ChatLive';

const message = (id: string, createdAt: string) => ({
  id, createdAt, senderId: 'a', senderName: 'A', recipientId: 'b',
  body: id, readFlag: false,
});

describe('phân trang hội thoại', () => {
  it('đảo trang mới nhất và đặt sau các trang tin nhắn cũ', () => {
    const older = [message('1', '2026-01-01'), message('2', '2026-01-02')];
    const newestDescending = [message('4', '2026-01-04'), message('3', '2026-01-03')];
    expect(mergeChronologicalMessages(newestDescending, older).map((item) => item.id))
      .toEqual(['1', '2', '3', '4']);
  });

  it('không thay đổi mảng phản hồi gốc', () => {
    const newestDescending = [message('2', '2026-01-02'), message('1', '2026-01-01')];
    mergeChronologicalMessages(newestDescending, []);
    expect(newestDescending.map((item) => item.id)).toEqual(['2', '1']);
  });
});
