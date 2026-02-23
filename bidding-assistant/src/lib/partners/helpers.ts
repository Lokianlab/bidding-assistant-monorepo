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
    errors.push('夥伴名稱不能為空');
  }

  // 類別必填且至少一個
  if (!input.category || input.category.length === 0) {
    errors.push('至少需選擇一個專業類別');
  }

  // 電話格式驗證（可選）
  if (input.phone && !/^[0-9\-\+\s()]+$/.test(input.phone)) {
    errors.push('電話格式不正確');
  }

  // 電郵格式驗證（可選）
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.push('電郵格式不正確');
  }

  // 評分範圍驗證（可選）
  if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
    errors.push('評分必須在 1-5 之間');
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

  // 6. 排序
  const sortKey = params.sort || 'name';
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

  // 7. 分頁
  const limit = params.limit || 50;
  const offset = params.offset || 0;

  return results.slice(offset, offset + limit);
}
