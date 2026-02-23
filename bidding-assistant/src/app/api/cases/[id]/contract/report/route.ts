// GET /api/cases/[id]/contract/report
// M10 定期進度報告生成

import { NextRequest, NextResponse } from 'next/server';

interface ProgressReport {
  id: string;
  case_id: string;
  report_date: string;
  period: string; // 'weekly' | 'monthly'
  status: string;
  completed_tasks: number;
  total_tasks: number;
  progress_percentage: number;
  milestones_met: string[];
  pending_milestones: string[];
  risks: string[];
  next_steps: string[];
  created_at: string;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;
    const period = request.nextUrl.searchParams.get('period') || 'monthly';

    // Mock 定期報告
    const report: ProgressReport = {
      id: `report_${Date.now()}`,
      case_id: caseId,
      report_date: new Date().toISOString().split('T')[0],
      period: period as 'weekly' | 'monthly',
      status: '進行中',
      completed_tasks: 24,
      total_tasks: 32,
      progress_percentage: 75,
      milestones_met: ['需求確認完成', '設計文件交付'],
      pending_milestones: ['開發完成', '測試驗收完成'],
      risks: ['人力資源不足', '第三方依賴延遲'],
      next_steps: ['完成核心模組開發', '啟動測試流程', '客戶進度審核'],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error('Error generating progress report:', error);
    return NextResponse.json(
      { error: '報告生成失敗' },
      { status: 500 }
    );
  }
}

// POST - 生成 PDF 或 DOCX 版本
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;
    const body = await request.json();

    // Mock 報告檔案生成
    const reportContent = `
進度報告書
案件 ID: ${caseId}
報告日期: ${new Date().toISOString()}
周期: ${body.period || '月度'}

完成度: 75% (24/32)

已完成里程碑:
- 需求確認完成
- 設計文件交付

待完成里程碑:
- 開發完成 (預計 2026-07-31)
- 測試驗收完成 (預計 2026-08-31)

發現的風險:
- 人力資源不足 (高優先度)
- 第三方依賴延遲 (中優先度)

下一步行動:
1. 完成核心模組開發
2. 啟動測試流程
3. 客戶進度審核
    `.trim();

    // 回傳報告
    const response = new NextResponse(reportContent);
    response.headers.set('Content-Type', 'text/plain; charset=utf-8');
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="progress-report-${caseId}-${Date.now()}.txt"`
    );

    return response;
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      { error: '報告匯出失敗' },
      { status: 500 }
    );
  }
}
