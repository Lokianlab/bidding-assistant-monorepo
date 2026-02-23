/**
 * M07 外包資源庫 API 路由
 * PATCH /api/partners/[id] - 編輯夥伴
 * DELETE /api/partners/[id] - 刪除夥伴
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Partner, PartnerInput, PartnerResponse } from '@/lib/partners/types';
import { validatePartner } from '@/lib/partners/helpers';
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
 * PATCH /api/partners/[id]
 * 編輯合作夥伴資訊
 */
export async function PATCH(
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

    const input: Partial<PartnerInput> = await request.json();

    // 如果有提供新資料，進行驗證
    if (Object.keys(input).length > 0) {
      // 只驗證提供的欄位（合併現有資料）
      const { data: existing } = await supabase
        .from('partner_contacts')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (!existing) {
        return NextResponse.json<PartnerResponse>(
          { success: false, error: '夥伴記錄不存在' },
          { status: 404 },
        );
      }

      const merged = { ...existing, ...input } as PartnerInput;
      const validation = validatePartner(merged);
      if (!validation.valid) {
        return NextResponse.json<PartnerResponse>(
          {
            success: false,
            error: validation.errors.join('; '),
          },
          { status: 400 },
        );
      }
    }

    // 更新資料
    const { data, error } = await supabase
      .from('partner_contacts')
      .update({
        name: input.name,
        category: input.category,
        contact_name: input.contact_name,
        phone: input.phone,
        email: input.email,
        url: input.url,
        rating: input.rating,
        notes: input.notes,
        tags: input.tags,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      logger.error('api', 'Failed to update partner', error.message);
      return NextResponse.json<PartnerResponse>(
        { success: false, error: '更新失敗' },
        { status: 500 },
      );
    }

    logger.info('api', 'Partner updated', `id=${id}`);

    return NextResponse.json<PartnerResponse>({
      success: true,
      data: data as Partner,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    logger.error('api', 'PATCH /api/partners/[id] failed', message);
    return NextResponse.json<PartnerResponse>(
      { success: false, error: '伺服器錯誤' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/partners/[id]
 * 刪除合作夥伴（軟刪除：設定 status='archived'）
 */
export async function DELETE(
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

    // 軟刪除：設定 status='archived'
    const { data, error } = await supabase
      .from('partner_contacts')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      logger.error('api', 'Failed to delete partner', error.message);
      return NextResponse.json<PartnerResponse>(
        { success: false, error: '刪除失敗' },
        { status: 500 },
      );
    }

    logger.info('api', 'Partner archived', `id=${id}`);

    return NextResponse.json<PartnerResponse>({
      success: true,
      data: data as Partner,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知錯誤';
    logger.error('api', 'DELETE /api/partners/[id] failed', message);
    return NextResponse.json<PartnerResponse>(
      { success: false, error: '伺服器錯誤' },
      { status: 500 },
    );
  }
}
