// GET /api/cases/[id]/contract/milestones
// POST /api/cases/[id]/contract/milestones
// PATCH /api/cases/[id]/contract/milestones/:milestoneId
// M10 履約管理 - 里程碑 API

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cases/[id]/contract/milestones
 * 查詢特定合約的所有里程碑
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;

    // Mock 回傳里程碑清單
    const milestones = [
      {
        id: 'ms_001',
        contract_id: `contract_${caseId}`,
        name: '需求確認',
        description: '確認客戶需求並完成需求分析',
        weight: 0.3,
        due_date: '2026-03-31',
        completed_date: null,
        progress: 50,
        status: 'in-progress',
        payment_amount: 300000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'ms_002',
        contract_id: `contract_${caseId}`,
        name: '設計交付',
        description: '完成系統設計文件交付',
        weight: 0.5,
        due_date: '2026-05-31',
        completed_date: null,
        progress: 0,
        status: 'pending',
        payment_amount: 500000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'ms_003',
        contract_id: `contract_${caseId}`,
        name: '驗收完成',
        description: '測試驗收並完成最終交付',
        weight: 0.2,
        due_date: '2026-08-31',
        completed_date: null,
        progress: 0,
        status: 'pending',
        payment_amount: 200000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      data: milestones,
      total: milestones.length,
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json(
      { error: '里程碑查詢失敗' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cases/[id]/contract/milestones
 * 建立新的里程碑
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;
    const body = await request.json();

    // 驗證必填欄位
    if (!body.name || !body.weight || !body.due_date || !body.payment_amount) {
      return NextResponse.json(
        { error: '缺少必填欄位：name, weight, due_date, payment_amount' },
        { status: 400 }
      );
    }

    // Mock 建立里程碑
    const newMilestone = {
      id: `ms_${Date.now()}`,
      contract_id: `contract_${caseId}`,
      name: body.name,
      description: body.description || '',
      weight: body.weight,
      due_date: body.due_date,
      completed_date: null,
      progress: 0,
      status: 'pending',
      payment_amount: body.payment_amount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: newMilestone,
        message: '里程碑建立成功',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json(
      { error: '里程碑建立失敗' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cases/[id]/contract/milestones/:milestoneId
 * 更新里程碑進度或狀態
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;
    const body = await request.json();

    // 驗證 milestoneId
    if (!body.milestoneId) {
      return NextResponse.json(
        { error: '缺少 milestoneId' },
        { status: 400 }
      );
    }

    // Mock 更新里程碑
    const updatedMilestone = {
      id: body.milestoneId,
      contract_id: `contract_${caseId}`,
      name: body.name || '里程碑名稱',
      description: body.description || '',
      weight: body.weight || 0.3,
      due_date: body.due_date || '2026-03-31',
      completed_date: body.progress === 100 ? new Date().toISOString().split('T')[0] : null,
      progress: body.progress !== undefined ? body.progress : 0,
      status: body.status || 'in-progress',
      payment_amount: body.payment_amount || 300000,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: updatedMilestone,
        message: '里程碑更新成功',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json(
      { error: '里程碑更新失敗' },
      { status: 500 }
    );
  }
}
