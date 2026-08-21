import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DomainRealtimeEvent } from '../../api/domainRealtime';
import { PublishedEducationPlan } from './StudentLive';

const realtime = vi.hoisted(() => ({
  callback: null as ((event: DomainRealtimeEvent) => void) | null,
  close: vi.fn(),
  reloadPlan: vi.fn(),
  streamSse: vi.fn((_path: string, callback: (event: DomainRealtimeEvent) => void) => {
    realtime.callback = callback;
    return { close: realtime.close };
  }),
}));

vi.mock('../../api/client', () => ({
  api: { streamSse: realtime.streamSse },
}));

vi.mock('../../api/useApi', () => ({
  useApi: (path: string) => path.startsWith('/academic/training-plans/published/me')
    ? { data: null, loading: false, error: null, reload: realtime.reloadPlan }
    : { data: [], loading: false, error: null, reload: vi.fn() },
}));

describe('PublishedEducationPlan realtime synchronization', () => {
  afterEach(() => {
    realtime.callback = null;
    realtime.close.mockClear();
    realtime.reloadPlan.mockClear();
    realtime.streamSse.mockClear();
  });

  it('reloads the student plan when the backend publishes an academic plan', () => {
    const view = render(<PublishedEducationPlan />);

    expect(realtime.streamSse).toHaveBeenCalledWith(
      '/realtime/events',
      expect.any(Function),
    );

    act(() => realtime.callback?.({
      resource: 'grade',
      action: 'academic.grade.changed',
    }));
    expect(realtime.reloadPlan).not.toHaveBeenCalled();

    act(() => realtime.callback?.({
      resource: 'education_plan',
      action: 'academic.education_plan.published',
    }));
    expect(realtime.reloadPlan).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(realtime.close).toHaveBeenCalledTimes(1);
  });
});
