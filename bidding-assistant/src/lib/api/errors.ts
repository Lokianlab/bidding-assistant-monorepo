/**
 * API 錯誤類與處理
 *
 * 統一的 API 層錯誤定義與轉換邏輯
 */

/**
 * 租戶相關錯誤
 */
export class TenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantError';
  }
}

/**
 * 認證錯誤（無效或過期 session）
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 授權錯誤（權限不足）
 */
export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * 驗證錯誤（請求數據無效）
 */
export class ValidationError extends Error {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 通用 HTTP 錯誤
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * 將錯誤轉換為 API 回應格式
 *
 * 使用方式：
 *   try {
 *     // ...
 *   } catch (error) {
 *     const { status, message } = handleApiError(error);
 *     return NextResponse.json({ error: message }, { status });
 *   }
 */
export interface ApiErrorResponse {
  status: number;
  message: string;
}

export function handleApiError(error: any): ApiErrorResponse {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof TenantError) {
    return {
      status: 400,
      message: error.message,
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      status: 401,
      message: error.message,
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      status: 403,
      message: error.message,
    };
  }

  if (error instanceof ValidationError) {
    return {
      status: 400,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    console.error('[API Error]', error.message);
    return {
      status: 500,
      message: 'Internal Server Error',
    };
  }

  return {
    status: 500,
    message: 'Internal Server Error',
  };
}
