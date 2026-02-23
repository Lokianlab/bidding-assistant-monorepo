/**
 * M07 外包資源庫 API 路由
 * POST /api/partners/[id]/usage - 標記已洽詢
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Partner, PartnerResponse } from '@/lib/partners/types';
import {
  verifyTenantAuthorization,
  validateResourceId,
} from '@/lib/partners/api-helpers';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/partners/[id]/usage
 * 標記合作夥伴已洽詢
 * - 增加 cooperation_count +1
 * - 更新 last_used 為當前時間
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 驗證 ID 格式
    if (!validateResourceId(id)) {
      return NextResponse.json<PartnerResponse>(
        { success: false, error: '無效的資源 ID' },
        { status: 400 },
      );
    }

    // 驗證租戶授權
    const auth = await verifyTenantAuthorization(request);
    if (!auth.authorized || !auth.tenantId) {
      return NextResponse.json<PartnerResponse>(
        { success: false, error: auth.error || '未授權' },
        { status: 401 },
      );
    }

    const tenantId = auth.tenantId;

    // 查詢現有記錄
    const { data: existing, error: selectError } = await supabase
      .from('partner_contacts')
      .select('cooperation_count')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (selectError || !existing) {
      logger.error(
        'api',
        'Partner not found for usage update',
        selectError?.message || 'Unknown error',
      );
      return NextResponse.json<PartnerResponse>(
        { success: false, error: '夥伴記錄不存在' },
        { status: 404 },
      );
    }

    // 更新 cooperation_count 和 last_used
    const newCooperationCount = (existing.cooperation_count || 0) + 1;
    const { data, error } = await supabase
      .from('partner_contacts')
      .update({
        cooperation_count: newCooperationCount,
        last_used: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      logger.error('api', 'Failed to update usage', error.message);
      return NextResponse.json<PartnerResponse>(
        { success: false, error: '更新失敗' },
        { status: 500 },
      );
    }

    logger.info(
      'api',
      'Partner usage recorded',
      `id=${id} cooperation_count=${newCooperationCount}`,
    );

    return NextResponse.json<PartnerResponse>({
      success: true,
      data: data as Partner,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    logger.error('api', 'POST /api/partners/[id]/usage failed', message);
    return NextResponse.json<PartnerResponse>(
      { success: false, error: '伺服器錯誤' },
      { status: 500 },
    );
  }
}
