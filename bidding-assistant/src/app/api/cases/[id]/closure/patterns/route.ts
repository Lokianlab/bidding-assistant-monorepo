// POST/GET /api/cases/[id]/closure/patterns
// M11 成功模式識別與分析

import { NextRequest, NextResponse } from 'next/server';

interface SuccessPatternAnalysis {
  id: string;
  case_id: string;
  patterns_identified: Array<{
    name: string;
    description: string;
    frequency: number;
    replicability_score: number;
    factors: string[];
  }>;
  key_success_factors: string[];
  replication_potential: number; // 0-100
  recommendations: string[];
  created_at: string;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;
    const body = await request.json();

    // 分析成功模式
    const analysis: SuccessPatternAnalysis = {
      id: `pattern_${Date.now()}`,
      case_id: caseId,
      patterns_identified: [
        {
          name: '客戶溝通定期化',
          description: '建立每週進度同步會議機制',
          frequency: 52,
          replicability_score: 95,
          factors: ['高透明度', '快速問題反應', '信任建立'],
        },
        {
          name: '風險早期識別',
          description: '在開發初期進行深度風險評估',
          frequency: 1,
          replicability_score: 88,
          factors: ['經驗團隊', '系統化流程', '利益相關者參與'],
        },
      ],
      key_success_factors: [
        '人員穩定性',
        '客戶支持與配合',
        '需求明確性',
        '技術架構適當性',
      ],
      replication_potential: 82,
      recommendations: [
        '將此案件經驗納入公司知識庫',
        '在類似案件中應用已驗證的模式',
        '培訓新專案經理使用此框架',
        '建立成功模式追蹤指標',
      ],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    console.error('Error analyzing success patterns:', error);
    return NextResponse.json(
      { error: '模式分析失敗' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;

    // Mock 返回已分析的成功模式
    const analysis: SuccessPatternAnalysis = {
      id: 'pattern_mock',
      case_id: caseId,
      patterns_identified: [
        {
          name: '客戶溝通定期化',
          description: '每週進度同步會議',
          frequency: 52,
          replicability_score: 95,
          factors: ['高透明度', '快速反應', '信任'],
        },
      ],
      key_success_factors: ['人員穩定', '客戶支持', '需求明確'],
      replication_potential: 82,
      recommendations: ['納入知識庫', '應用到類似案件', '培訓新PM'],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: '查詢失敗' },
      { status: 500 }
    );
  }
}
