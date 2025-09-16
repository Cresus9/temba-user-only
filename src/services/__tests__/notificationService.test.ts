import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NotificationService } from '../notificationService';

const createLogger = () => ({
  error: vi.fn(),
  warn: vi.fn(),
});

describe('NotificationService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches notifications scoped to the authenticated user with a sane limit', async () => {
    const notificationsBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 'notif-1' }], error: null }),
    };

    const auth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    };

    const from = vi.fn((table: string) => {
      if (table === 'notifications') {
        return notificationsBuilder;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const supabaseMock = { auth, from } as unknown as SupabaseClient;
    const logger = createLogger();
    const service = new NotificationService({ supabaseClient: supabaseMock, logger });

    const notifications = await service.getUserNotifications(-5);

    expect(auth.getUser).toHaveBeenCalledTimes(1);
    expect(notificationsBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(notificationsBuilder.limit).toHaveBeenCalledWith(10);
    expect(notifications).toEqual([{ id: 'notif-1' }]);
  });

  it('marks a notification as read while enforcing ownership', async () => {
    const notificationsBuilder: any = {};
    notificationsBuilder.update = vi.fn().mockReturnValue(notificationsBuilder);
    notificationsBuilder.eq = vi.fn().mockReturnThis();
    notificationsBuilder.select = vi.fn().mockResolvedValue({ data: [{ id: 'notif-1' }], error: null });

    const auth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    };

    const from = vi.fn((table: string) => {
      if (table === 'notifications') {
        return notificationsBuilder;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const supabaseMock = { auth, from } as unknown as SupabaseClient;
    const logger = createLogger();
    const service = new NotificationService({ supabaseClient: supabaseMock, logger });

    await expect(service.markAsRead('notif-1')).resolves.toBe(true);

    expect(notificationsBuilder.update).toHaveBeenCalledWith({
      read: 'true',
      read_at: expect.any(String),
    });
    expect(notificationsBuilder.eq).toHaveBeenNthCalledWith(1, 'id', 'notif-1');
    expect(notificationsBuilder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-1');
    expect(notificationsBuilder.select).toHaveBeenCalledWith('id');
  });

  it('deletes a notification scoped to the authenticated user', async () => {
    const deleteByUser = vi.fn().mockResolvedValue({ error: null, count: 1 });
    const deleteById = vi.fn().mockReturnValue({ eq: deleteByUser });
    const notificationsBuilder: any = {
      delete: vi.fn().mockReturnValue({ eq: deleteById }),
    };

    const auth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    };

    const from = vi.fn((table: string) => {
      if (table === 'notifications') {
        return notificationsBuilder;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const supabaseMock = { auth, from } as unknown as SupabaseClient;
    const logger = createLogger();
    const service = new NotificationService({ supabaseClient: supabaseMock, logger });

    await expect(service.deleteNotification('notif-1')).resolves.toBeUndefined();

    expect(notificationsBuilder.delete).toHaveBeenCalledWith({ count: 'exact' });
    expect(deleteById).toHaveBeenCalledWith('id', 'notif-1');
    expect(deleteByUser).toHaveBeenCalledWith('user_id', 'user-1');
  });
});
