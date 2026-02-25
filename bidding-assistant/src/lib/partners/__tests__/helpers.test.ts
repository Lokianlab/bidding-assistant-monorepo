import { describe, it, expect } from 'vitest';
import {
  validatePartner,
  searchPartners,
  validateBulkPartners,
  calculateTrustScore,
  sortByRecommendation,
} from '../helpers';
import { Partner, PartnerInput } from '../types';

describe('validatePartner', () => {
  it('應該通過有效的合作夥伴資料', () => {
    const input: PartnerInput = {
      name: '建築設計事務所',
      category: ['建築設計'],
      contact_name: '王經理',
      phone: '02-12345678',
      email: 'contact@example.com',
      rating: 4,
    };

    const result = validatePartner(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('應該檢查名稱必填', () => {
    const input: PartnerInput = {
      name: '',
      category: ['建築設計'],
    };

    const result = validatePartner(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('夥伴名稱必填');
  });

  it('應該檢查分類必填', () => {
    const input: PartnerInput = {
      name: '測試公司',
      category: [],
    };

    const result = validatePartner(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('必須至少選擇一個專業類別');
  });

  it('應該驗證 Email 格式', () => {
    const input: PartnerInput = {
      name: '測試公司',
      category: ['技術顧問'],
      email: 'invalid-email',
    };

    const result = validatePartner(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Email 格式不正確');
  });

  it('應該驗證電話號碼格式', () => {
    const input: PartnerInput = {
      name: '測試公司',
      category: ['技術顧問'],
      phone: '123', // 太短
    };

    const result = validatePartner(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('電話號碼格式不正確（至少 7 個字元）');
  });

  it('應該驗證 URL 格式', () => {
    const input: PartnerInput = {
      name: '測試公司',
      category: ['技術顧問'],
      url: 'example.com', // 缺少 protocol
    };

    const result = validatePartner(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('網址必須以 http:// 或 https:// 開頭');
  });

  it('應該驗證評分範圍', () => {
    const input: PartnerInput = {
      name: '測試公司',
      category: ['技術顧問'],
      rating: 6, // 超過 5
    };

    const result = validatePartner(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('評分必須介於 1-5 之間');
  });

  it('應該接受有效的電話格式變異', () => {
    const inputs = [
      '02-12345678',
      '(02) 1234-5678',
      '+886-2-12345678',
      '0912345678',
    ];

    inputs.forEach((phone) => {
      const input: PartnerInput = {
        name: '測試公司',
        category: ['技術顧問'],
        phone,
      };
      const result = validatePartner(input);
      expect(result.valid, `電話 ${phone} 應該有效`).toBe(true);
    });
  });

  it('應該接受 null 的選用欄位', () => {
    const input: PartnerInput = {
      name: '測試公司',
      category: ['技術顧問'],
    };

    const result = validatePartner(input);
    expect(result.valid).toBe(true);
  });
});

describe('searchPartners', () => {
  const mockPartners: Partner[] = [
    {
      id: '1',
      tenant_id: 'tenant-1',
      name: '建築設計事務所',
      category: ['建築設計'],
      contact_name: '王經理',
      email: 'contact@example.com',
      phone: '02-12345678',
      rating: 4,
      cooperation_count: 5,
      tags: ['推薦'],
      status: 'active',
      created_at: '2026-02-20T00:00:00Z',
      updated_at: '2026-02-20T00:00:00Z',
    },
    {
      id: '2',
      tenant_id: 'tenant-1',
      name: '工程評估公司',
      category: ['工程評估'],
      contact_name: '李工程',
      email: 'eng@example.com',
      phone: '02-87654321',
      rating: 3,
      cooperation_count: 2,
      tags: ['新合作'],
      status: 'active',
      created_at: '2026-02-21T00:00:00Z',
      updated_at: '2026-02-21T00:00:00Z',
    },
    {
      id: '3',
      tenant_id: 'tenant-1',
      name: '已歸檔公司',
      category: ['技術顧問'],
      contact_name: '張顧問',
      email: 'advisor@example.com',
      phone: '02-55555555',
      rating: 2,
      cooperation_count: 1,
      tags: [],
      status: 'archived',
      created_at: '2026-02-19T00:00:00Z',
      updated_at: '2026-02-19T00:00:00Z',
    },
  ];

  it('應該根據關鍵字搜尋名稱', () => {
    const result = searchPartners(mockPartners, { search: '建築' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('建築設計事務所');
  });

  it('應該根據關鍵字搜尋聯絡人', () => {
    const result = searchPartners(mockPartners, { search: '李工程' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('工程評估公司');
  });

  it('應該篩選狀態', () => {
    const result = searchPartners(mockPartners, { status: 'archived' });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('archived');
  });

  it('應該篩選分類', () => {
    const result = searchPartners(mockPartners, { category: '建築設計' });
    expect(result).toHaveLength(1);
    expect(result[0].category).toContain('建築設計');
  });

  it('應該篩選多個分類', () => {
    const result = searchPartners(mockPartners, {
      category: ['建築設計', '工程評估'],
    });
    expect(result).toHaveLength(2);
  });

  it('應該篩選最低評分', () => {
    const result = searchPartners(mockPartners, { min_rating: 3 });
    expect(result).toHaveLength(2);
    expect(result.every((p) => p.rating >= 3)).toBe(true);
  });

  it('應該篩選標籤', () => {
    const result = searchPartners(mockPartners, { tags: ['推薦'] });
    expect(result).toHaveLength(1);
    expect(result[0].tags).toContain('推薦');
  });

  it('應該按名稱排序（升冪）', () => {
    const result = searchPartners(mockPartners, {
      sort: 'name',
      order: 'asc',
    });
    expect(result[0].name).toBe('工程評估公司');
    expect(result[1].name).toBe('已歸檔公司');
    expect(result[2].name).toBe('建築設計事務所');
  });

  it('應該按評分排序（降冪）', () => {
    const result = searchPartners(mockPartners, {
      sort: 'rating',
      order: 'desc',
    });
    expect(result[0].rating).toBe(4);
    expect(result[1].rating).toBe(3);
    expect(result[2].rating).toBe(2);
  });

  it('應該分頁結果', () => {
    const result = searchPartners(mockPartners, {
      limit: 2,
      offset: 1,
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');
  });

  it('應該組合多個篩選條件', () => {
    const result = searchPartners(mockPartners, {
      status: 'active',
      min_rating: 3,
      sort: 'rating',
      order: 'desc',
    });
    expect(result).toHaveLength(2);
    expect(result[0].rating).toBe(4);
    expect(result[1].rating).toBe(3);
  });
});

describe('validateBulkPartners', () => {
  it('應該分離有效和無效的資料', () => {
    const inputs: PartnerInput[] = [
      {
        name: '有效公司',
        category: ['技術顧問'],
      },
      {
        name: '',
        category: [], // 兩個錯誤
      },
    ];

    const result = validateBulkPartners(inputs);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].errors).toContain('夥伴名稱必填');
  });
});

describe('calculateTrustScore', () => {
  it('應該根據評分和合作次數計算信任度', () => {
    const partner: Partner = {
      id: '1',
      tenant_id: 'tenant-1',
      name: '測試',
      category: [],
      rating: 5,
      cooperation_count: 25,
      tags: [],
      status: 'active',
      created_at: '',
      updated_at: '',
    };

    const score = calculateTrustScore(partner);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('高評分應該得到高信任度', () => {
    const partner5: Partner = {
      id: '1',
      tenant_id: 'tenant-1',
      name: '測試',
      category: [],
      rating: 5,
      cooperation_count: 0,
      tags: [],
      status: 'active',
      created_at: '',
      updated_at: '',
    };

    const partner1: Partner = {
      id: '2',
      tenant_id: 'tenant-1',
      name: '測試',
      category: [],
      rating: 1,
      cooperation_count: 0,
      tags: [],
      status: 'active',
      created_at: '',
      updated_at: '',
    };

    expect(calculateTrustScore(partner5)).toBeGreaterThan(
      calculateTrustScore(partner1),
    );
  });
});

describe('sortByRecommendation', () => {
  it('應該按信任度排序', () => {
    const partners: Partner[] = [
      {
        id: '1',
        tenant_id: 'tenant-1',
        name: 'Partner A',
        category: [],
        rating: 2,
        cooperation_count: 0,
        tags: [],
        status: 'active',
        created_at: '',
        updated_at: '',
      },
      {
        id: '2',
        tenant_id: 'tenant-1',
        name: 'Partner B',
        category: [],
        rating: 5,
        cooperation_count: 10,
        tags: [],
        status: 'active',
        created_at: '',
        updated_at: '',
      },
    ];

    const result = sortByRecommendation(partners);
    expect(result[0].name).toBe('Partner B'); // 高評分在前
  });
});
