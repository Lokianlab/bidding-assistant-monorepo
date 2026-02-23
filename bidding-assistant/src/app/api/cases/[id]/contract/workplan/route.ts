// POST /api/cases/[id]/contract/workplan
// M10 履約管理 - 工作計畫書生成

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;

    // Mock 工作計畫書生成
    const workplan = {
      id: `wp_${Date.now()}`,
      case_id: caseId,
      title: '工作計畫書',
      sections: [
        {
          title: '一、專案概述',
          content: '本案為履約管理工作，需依照合約規定完成各項可交付成果。',
        },
        {
          title: '二、工作內容',
          content: '包含需求分析、設計、開發、測試、部署等階段。',
        },
        {
          title: '三、時程規劃',
          content: '預計總工期 6 個月，分為 4 個里程碑。',
        },
        {
          title: '四、團隊編制',
          content: '專案經理 1 名、開發人員 3 名、測試人員 1 名。',
        },
        {
          title: '五、風險管理',
          content: '識別關鍵風險並制定應對措施。',
        },
      ],
      milestones: [
        { date: '2026-03-31', description: '需求確認完成' },
        { date: '2026-05-31', description: '設計文件交付' },
        { date: '2026-07-31', description: '開發完成' },
        { date: '2026-08-31', description: '測試驗收完成' },
      ],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(workplan, { status: 201 });
  } catch (error) {
    console.error('Error generating workplan:', error);
    return NextResponse.json(
      { error: '工作計畫書生成失敗' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;

    // Mock 返回已生成的工作計畫書
    const workplan = {
      id: 'wp_mock_001',
      case_id: caseId,
      title: '工作計畫書',
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(workplan);
  } catch (error) {
    return NextResponse.json(
      { error: '工作計畫書查詢失敗' },
      { status: 500 }
    );
  }
}
