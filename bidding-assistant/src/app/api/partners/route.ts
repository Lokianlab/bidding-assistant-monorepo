/**
 * M07 外包資源庫 API 路由
 * GET /api/partners - 取得夥伴列表
 * POST /api/partners - 新增夥伴
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Partner, PartnerInput, PartnerResponse } from '@/lib/partners/types';
import { validatePartner, searchPartners } from '@/lib/partners/helpers';
import {
  verifyTenantAuthorization,
} from '@/lib/partners/api-helpers';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/partners
 * 取得合作夥伴列表（支援搜尋、篩選、排序）
 */
export async function GET(request: NextRequest) {
  try {
    // 驗證租戶授權
    const auth = await verifyTenantAuthorization(request);
    if (!auth.authorized || !auth.tenantId) {
      return NextResponse.json<PartnerResponse>(
        { success: false, error: auth.error || '未授權' },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const tenantId = auth.tenantId;

    // 查詢資料庫
    let query = supabase
      .from('partner_contacts')
      .select('*')
      .eq('tenant_id', tenantId);

    // 狀態篩選
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else if (!status || status === 'all') {
      query = query.eq('status', 'active'); // 預設只取 active
    }

    const { data, error } = await query;

    if (error) {
      logger.error('api', 'Database query failed', error.message);
      return NextResponse.json<PartnerResponse>(
        { success: false, error: '查詢失敗' },
        { status: 500 },
      );
    }

    // 本地篩選和搜尋
    const partners = (data || []) as Partner[];
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const sortParam = searchParams.get('sort');
    // 只允許 API 支援的排序值；"trust" 由 sortByRecommendation 在 helpers 中處理
    const sort = (sortParam === 'name' || sortParam === 'rating' || sortParam === 'last_used' || sortParam === 'created_at')
      ? sortParam
      : undefined;
    const limit = searchParams.get('limit');

    const filtered = searchPartners(partners, {
      search: search || undefined,
      category: category ? category.split(',') : undefined,
      status: 'active',
      sort,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    logger.info('api', 'Retrieved partners list', `count=${filtered.length}`);

    return NextResponse.json<PartnerResponse>({
      success: true,
      data: filtered,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    logger.error('api', 'GET /api/partners failed', message);
    return NextResponse.json<PartnerResponse>(
      { success: false, error: '伺服器錯誤' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/partners
 * 新增合作夥伴
 */
export async function POST(request: NextRequest) {
  try {
    // 驗證租戶授權
    const auth = await verifyTenantAuthorization(request);
    if (!auth.authorized || !auth.tenantId) {
      return NextResponse.json<PartnerResponse>(
        { success: false, error: auth.error || '未授權' },
        { status: 401 },
      );
    }

    const tenantId = auth.tenantId;

    const input: PartnerInput = await request.json();

    // 驗證輸入
    const validation = validatePartner(input);
    if (!validation.valid) {
      return NextResponse.json<PartnerResponse>(
        {
          success: false,
          error: validation.errors.join('; '),
        },
        { status: 400 },
      );
    }

    // 插入資料
    const { data, error } = await supabase
      .from('partner_contacts')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        category: input.category,
        contact_name: input.contact_name,
        phone: input.phone,
        email: input.email,
        url: input.url,
        rating: input.rating || 3,
        notes: input.notes,
        tags: input.tags || [],
        status: 'active',
        cooperation_count: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('api', 'Failed to insert partner', error.message);
      return NextResponse.json<PartnerResponse>(
        { success: false, error: '新增失敗' },
        { status: 500 },
      );
    }

    logger.info('api', 'Partner created', `id=${data.id} name=${input.name}`);

    return NextResponse.json<PartnerResponse>(
      {
        success: true,
        data: data as Partner,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    logger.error('api', 'POST /api/partners failed', message);
    return NextResponse.json<PartnerResponse>(
      { success: false, error: '伺服器錯誤' },
      { status: 500 },
    );
  }
}
