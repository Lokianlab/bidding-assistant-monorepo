/**
 * OAuth 配置測試（SaaS Phase 1B）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOAuthConfig,
  getAuthorizationUrl,
  parseIdToken,
  validateWorkspaceDomain,
  extractUserInfo,
} from '../oauth-config';

describe('OAuth Configuration', () => {
  beforeEach(() => {
    // 設置測試環境變數
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
    process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN = 'example.com';
  });

  describe('getOAuthConfig', () => {
    it('應該返回正確的 OAuth 配置', () => {
      const config = getOAuthConfig('http://localhost:3000');
      expect(config.clientId).toBe('test-client-id');
      expect(config.clientSecret).toBe('test-secret');
      expect(config.workspaceDomain).toBe('example.com');
      expect(config.redirectUri).toBe('http://localhost:3000/api/auth/callback');
    });

    it('環境變數缺失時應拋出錯誤', () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      expect(() => getOAuthConfig()).toThrow('缺少 Google OAuth 環境變數');
    });

    it('應使用 NEXT_PUBLIC_APP_URL 如果提供', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      const config = getOAuthConfig();
      expect(config.redirectUri).toBe('https://app.example.com/api/auth/callback');
    });
  });

  describe('getAuthorizationUrl', () => {
    it('應生成有效的授權 URL', () => {
      const url = getAuthorizationUrl('http://localhost:3000');
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid');
      expect(url).toContain('hd=example.com');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback');
    });

    it('URL 應包含必要的參數', () => {
      const url = getAuthorizationUrl();
      const params = new URL(url).searchParams;
      expect(params.get('client_id')).toBe('test-client-id');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('prompt')).toBe('select_account');
      expect(params.get('hd')).toBe('example.com');
    });
  });

  describe('parseIdToken', () => {
    it('應解析有效的 ID Token', () => {
      // 建立測試用 JWT（不驗證簽名）
      const payload = {
        iss: 'https://accounts.google.com',
        sub: 'user-123',
        email: 'user@example.com',
        email_verified: true,
        hd: 'example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
      };

      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const result = parseIdToken(token);
      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('user@example.com');
      expect(result.hd).toBe('example.com');
    });

    it('無效的 token 格式應拋出錯誤', () => {
      expect(() => parseIdToken('invalid-token')).toThrow('無效的 JWT token');
    });

    it('損壞的 payload 應拋出錯誤', () => {
      const token = 'header.invalid-base64!@#.signature';
      expect(() => parseIdToken(token)).toThrow('無法解析 ID Token payload');
    });
  });

  describe('validateWorkspaceDomain', () => {
    it('相符的域名應驗證通過', () => {
      const payload = { hd: 'example.com' };
      expect(validateWorkspaceDomain(payload, 'example.com')).toBe(true);
    });

    it('不相符的域名應驗證失敗', () => {
      const payload = { hd: 'other.com' };
      expect(validateWorkspaceDomain(payload, 'example.com')).toBe(false);
    });

    it('缺少 hd 字段應驗證失敗', () => {
      const payload = {};
      expect(validateWorkspaceDomain(payload, 'example.com')).toBe(false);
    });
  });

  describe('extractUserInfo', () => {
    it('應從 token payload 提取用戶信息', () => {
      const payload = {
        sub: 'google-id-123',
        email: 'user@example.com',
        name: 'John Doe',
        picture: 'https://example.com/pic.jpg',
        hd: 'example.com',
      };

      const userInfo = extractUserInfo(payload);
      expect(userInfo.googleId).toBe('google-id-123');
      expect(userInfo.email).toBe('user@example.com');
      expect(userInfo.name).toBe('John Doe');
      expect(userInfo.picture).toBe('https://example.com/pic.jpg');
      expect(userInfo.domain).toBe('example.com');
    });

    it('名稱和圖片為可選字段', () => {
      const payload = {
        sub: 'google-id-123',
        email: 'user@example.com',
        hd: 'example.com',
      };

      const userInfo = extractUserInfo(payload);
      expect(userInfo.googleId).toBe('google-id-123');
      expect(userInfo.email).toBe('user@example.com');
      expect(userInfo.name).toBeUndefined();
      expect(userInfo.picture).toBeUndefined();
      expect(userInfo.domain).toBe('example.com');
    });
  });
});
