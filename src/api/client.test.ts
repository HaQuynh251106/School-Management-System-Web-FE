import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, resolveApiBase } from './client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveApiBase', () => {
  it('uses the website hostname for the default local API', () => {
    expect(resolveApiBase(undefined, {
      protocol: 'http:',
      hostname: '127.0.0.1',
    })).toBe('http://127.0.0.1:4000');
  });

  it('normalizes localhost to the loopback hostname used by the website', () => {
    expect(resolveApiBase('http://localhost:4000', {
      protocol: 'http:',
      hostname: '127.0.0.1',
    })).toBe('http://127.0.0.1:4000');
  });

  it('keeps an explicitly configured production API unchanged', () => {
    expect(resolveApiBase('https://api.school.example/', {
      protocol: 'https:',
      hostname: 'school.example',
    })).toBe('https://api.school.example');
  });

  it('sends a request id and preserves structured backend errors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      status: 400,
      code: 'VALIDATION_ERROR',
      error: 'Dữ liệu chưa hợp lệ',
      requestId: 'web-test-request-001',
      fieldErrors: { fullName: 'không được để trống' },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'web-test-request-001' },
    }));

    await expect(api.post('/users', {})).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      requestId: 'web-test-request-001',
      message: 'fullName: không được để trống',
    });
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      'X-Request-ID': expect.stringMatching(/^web-/),
    });
  });

  it('returns a friendly network error when the API is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));

    await expect(api.get('/health')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
