/**
 * POST /api/auth/logout
 *
 * 登出處理：清除 session cookie
 */

import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });

  response.cookies.set('auth-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // 立即過期
    path: '/',
  });

  return response;
}
