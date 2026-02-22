/**
 * Google OAuth2 認證測試
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGoogleAccessToken, clearTokenCache } from '../google-auth';

describe('getGoogleAccessToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearTokenCache();
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_REFRESH_TOKEN: 'test-refresh-token',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('缺少 GOOGLE_CLIENT_ID 時 throw', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    await expect(getGoogleAccessToken()).rejects.toThrow('GOOGLE_CLIENT_ID');
  });

  it('缺少 GOOGLE_CLIENT_SECRET 時 throw', async () => {
    delete process.env.GOOGLE_CLIENT_SECRET;
    await expect(getGoogleAccessToken()).rejects.toThrow('GOOGLE_CLIENT_SECRET');
  });

  it('缺少 GOOGLE_REFRESH_TOKEN 時 throw', async () => {
    delete process.env.GOOGLE_REFRESH_TOKEN;
    await expect(getGoogleAccessToken()).rejects.toThrow('GOOGLE_REFRESH_TOKEN');
  });

  it('成功換取 access token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-token',
            expires_in: 3600,
          }),
      }),
    );

    const token = await getGoogleAccessToken();
    expect(token).toBe('new-access-token');
  });

  it('快取有效時不重複呼叫 API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'cached-token',
          expires_in: 3600,
        }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await getGoogleAccessToken();
    await getGoogleAccessToken();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('API 錯誤時 throw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'invalid_grant',
            error_description: 'Token has been revoked',
          }),
      }),
    );

    await expect(getGoogleAccessToken()).rejects.toThrow('Token has been revoked');
  });

  it('網路錯誤時 throw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network failure')),
    );

    await expect(getGoogleAccessToken()).rejects.toThrow('Network failure');
  });
});
