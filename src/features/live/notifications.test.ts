import { describe, expect, it } from 'vitest';
import type { Notification } from '../../api/types';
import { filterNotifications, notificationSummary } from './notifications';

const notifications: Notification[] = [
  { id: '1', recipientId: 'u-1', type: 'GENERAL', title: 'Lịch họp', body: 'Họp toàn trường', priority: 'NORMAL', read: true, createdAt: '2026-07-19T08:00:00Z' },
  { id: '2', recipientId: 'u-1', type: 'ATTENDANCE', title: 'Điểm danh', body: 'Học sinh đi muộn', priority: 'IMPORTANT', read: false, createdAt: '2026-07-20T08:00:00Z' },
  { id: '3', recipientId: 'u-1', type: 'FEE', title: 'Khoản thu', body: 'Sắp đến hạn', priority: 'URGENT', read: false, createdAt: '2026-07-20T09:00:00Z' },
];

describe('notification inbox', () => {
  it('filters unread notifications by type and keeps newest first', () => {
    expect(filterNotifications(notifications, {
      query: '', read: 'UNREAD', priority: 'ALL', type: 'FEE',
    }).map((item) => item.id)).toEqual(['3']);
  });

  it('searches Vietnamese notification content', () => {
    expect(filterNotifications(notifications, {
      query: 'đi muộn', read: 'ALL', priority: 'ALL', type: 'ALL',
    }).map((item) => item.id)).toEqual(['2']);
  });

  it('calculates inbox summary for the current day', () => {
    expect(notificationSummary(notifications, new Date('2026-07-20T12:00:00Z'))).toEqual({
      total: 3, unread: 2, important: 2, today: 2,
    });
  });
});
