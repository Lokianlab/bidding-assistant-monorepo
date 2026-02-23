/**
 * M07 外包資源庫 - 輔助函式
 * 驗證、搜尋、篩選夥伴
 */

import { Partner, PartnerInput, PartnerSearchParams, ValidationResult } from './types';

/**
 * 驗證夥伴輸入資料
 */
export function validatePartner(input: PartnerInput): ValidationResult {
  const errors: string[] = [];

  // 名稱必填
  if (!input.name || input.name.trim().length === 0) {
    errors.push('夥伴名稱必填');
  }

  // 類別必填且至少一個
  if (!input.category || input.category.length === 0) {
    errors.push('必須至少選擇一個專業類別');
  }

  // 電話格式驗證（可選，至少 7 個字元）
  if (input.phone && (input.phone.length < 7 || !/^[0-9\-\+\s()]+$/.test(input.phone))) {
    errors.push('電話號碼格式不正確（至少 7 個字元）');
  }

  // 電郵格式驗證（可選）
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push('Email 格式不正確');
  }

  // 網址格式驗證（可選）
  if (input.url && !/^https?:\/\//.test(input.url)) {
    errors.push('網址必須以 http:// 或 https:// 開頭');
  }

  // 評分範圍驗證（可選）
  if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
    errors.push('評分必須介於 1-5 之間');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 搜尋與篩選夥伴
 */
export function searchPartners(partners: Partner[], params: PartnerSearchParams = {}): Partner[] {
  let results = [...partners];

  // 1. 狀態篩選
  if (params.status && params.status !== 'all') {
    results = results.filter((p) => p.status === params.status);
  }

  // 2. 類別篩選
  if (params.category) {
    const categories = Array.isArray(params.category) ? params.category : [params.category];
    results = results.filter((p) => categories.some((c) => p.category.includes(c)));
  }

  // 3. 最低評分篩選
  if (params.min_rating !== undefined) {
    results = results.filter((p) => p.rating >= params.min_rating!);
  }

  // 4. 標籤篩選
  if (params.tags && params.tags.length > 0) {
    results = results.filter((p) => params.tags!.some((t) => p.tags.includes(t)));
  }

  // 5. 文字搜尋（名稱、聯絡人）
  if (params.search) {
    const query = params.search.toLowerCase();
    results = results.filter((p) => {
      const name = p.name.toLowerCase();
      const contact = p.contact_name ? p.contact_name.toLowerCase() : '';
      return name.includes(query) || contact.includes(query);
    });
  }

  // 6. 排序（僅當指定時）
  if (params.sort) {
    const sortKey = params.sort;
    const order = params.order === 'desc' ? -1 : 1;

    results.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortKey) {
        case 'rating':
          aVal = a.rating;
          bVal = b.rating;
          break;
        case 'last_used':
          aVal = a.last_used ? new Date(a.last_used).getTime() : 0;
          bVal = b.last_used ? new Date(b.last_used).getTime() : 0;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'name':
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
      }

      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
    });
  }

  // 7. 分頁
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  return results.slice(offset, offset + limit);
}

/**
 * 批量驗證夥伴資料
 */
export function validateBulkPartners(inputs: PartnerInput[]): {
  valid: Partner[];
  invalid: Array<{ data: PartnerInput; errors: string[] }>;
} {
  const valid: Partner[] = [];
  const invalid: Array<{ data: PartnerInput; errors: string[] }> = [];

  for (const input of inputs) {
    const result = validatePartner(input);
    if (result.valid) {
      // 轉換為 Partner 物件（簡化版，實際需完整欄位）
      valid.push({
        id: '',
        tenant_id: '',
        name: input.name || '',
        category: input.category || [],
        rating: input.rating || 3,
        cooperation_count: 0,
        tags: [],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    } else {
      invalid.push({ data: input, errors: result.errors });
    }
  }

  return { valid, invalid };
}

/**
 * 計算夥伴信任度分數（0-100）
 */
export function calculateTrustScore(partner: Partner): number {
  // 基分：評分（1-5）權重 50%
  const ratingScore = (partner.rating / 5) * 50;

  // 合作次數（權重 50%，上限 20 次）
  const cooperationScore = Math.min(partner.cooperation_count / 20, 1) * 50;

  return Math.round(ratingScore + cooperationScore);
}

/**
 * 按信任度排序夥伴（降序）
 */
export function sortByRecommendation(partners: Partner[]): Partner[] {
  return [...partners].sort((a, b) => {
    const scoreA = calculateTrustScore(a);
    const scoreB = calculateTrustScore(b);
    return scoreB - scoreA; // 降序
  });
}
