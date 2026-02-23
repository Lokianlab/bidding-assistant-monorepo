/**
 * M07 Partners Module - Helper Functions (Stub)
 * TODO: Complete implementation by AINL
 */

import type { Partner, PartnerInput, PartnerSearchParams } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate partner input data
 */
export function validatePartner(input: PartnerInput): ValidationResult {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push('夥伴名稱不能為空');
  }

  if (!input.category || input.category.length === 0) {
    errors.push('夥伴類別不能為空');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Search/filter partners by search params
 */
export function searchPartners(
  partners: Partner[],
  params: PartnerSearchParams
): Partner[] {
  let result = partners;

  if (params.search) {
    const keyword = params.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.category.some((cat) => cat.toLowerCase().includes(keyword))
    );
  }

  if (params.category) {
    const categories = Array.isArray(params.category)
      ? params.category
      : [params.category];
    result = result.filter((p) =>
      p.category.some((cat) => categories.includes(cat))
    );
  }

  if (params.status && params.status !== 'all') {
    result = result.filter((p) => p.status === params.status);
  }

  return result;
}
