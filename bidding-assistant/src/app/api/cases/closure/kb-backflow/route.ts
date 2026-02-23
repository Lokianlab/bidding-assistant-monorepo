// M11 知識庫回流 API

import { NextResponse } from 'next/server';
import type { KBBackflowEntry } from '@/lib/m11/types';

/**
 * POST /api/cases/closure/kb-backflow
 * 將結案案件的成功模式和經驗教訓回流至知識庫
 */
export async function POST(request: Request) {
  try {
    const body: KBBackflowEntry = await request.json();

    // 驗證必要欄位
    if (!body.sourceCase) {
      return NextResponse.json(
        { error: '缺少來源案件 ID' },
        { status: 400 }
      );
    }

    if (!body.patterns || body.patterns.length === 0) {
      return NextResponse.json(
        { error: '缺少成功模式' },
        { status: 400 }
      );
    }

    if (!body.targetCategories || body.targetCategories.length === 0) {
      return NextResponse.json(
        { error: '缺少目標知識庫分類' },
        { status: 400 }
      );
    }

    // 這裡可以接入實際的知識庫存儲邏輯
    // 目前返回成功響應示意
    console.log(`[KB-Backflow] 案件 ${body.sourceCase} 的資料已提交`);
    console.log(`[KB-Backflow] 模式數: ${body.patterns.length}`);
    console.log(`[KB-Backflow] 目標分類: ${body.targetCategories.join(', ')}`);

    return NextResponse.json({
      success: true,
      message: '知識庫回流資料已成功接收',
      data: {
        sourceCase: body.sourceCase,
        patternsCount: body.patterns.length,
        targetCategories: body.targetCategories,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[KB-Backflow Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cases/closure/kb-backflow
 * 查詢知識庫回流的歷史記錄（可選功能）
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('caseId');

  if (!caseId) {
    return NextResponse.json(
      { error: '缺少 caseId 參數' },
      { status: 400 }
    );
  }

  // 示意性回應 - 實際應連接資料庫
  return NextResponse.json({
    caseId,
    backflows: [],
    message: '目前沒有該案件的回流記錄'
  });
}
