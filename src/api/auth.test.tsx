import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './auth';
import { setTokens } from './client';

function SessionProbe() {
  const { loading, user } = useAuth();
  if (loading) return <span>Đang khôi phục</span>;
  return <span>{user?.fullName ?? 'Chưa đăng nhập'}</span>;
}

describe('AuthProvider session restore', () => {
  beforeEach(() => setTokens(null));

  afterEach(() => {
    vi.unstubAllGlobals();
    setTokens(null);
  });

  it('restores the user from the HttpOnly refresh cookie after a reload', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'restored-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'u-admin-1',
        username: 'admin',
        fullName: 'Nguyễn Văn Quản',
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordChangeRequired: false,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><SessionProbe /></AuthProvider>);

    expect(screen.getByText('Đang khôi phục')).toBeInTheDocument();
    expect(await screen.findByText('Nguyễn Văn Quản')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/auth\/refresh$/),
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/me$/),
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ Authorization: 'Bearer restored-token' }),
      }),
    );
  });
});
