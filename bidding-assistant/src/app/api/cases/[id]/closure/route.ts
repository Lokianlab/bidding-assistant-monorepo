// POST /api/cases/[id]/closure
// M11 結案飛輪 - 案件結案與回流

import { NextRequest, NextResponse } from 'next/server';
import { CaseClosureRequest, CaseClosureResponse } from '@/lib/closure/types';

// Mock 資料庫
const closures = new Map();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;
    const body = (await request.json()) as CaseClosureRequest;

    // 驗證輸入
    if (!caseId || !body.final_status) {
      return NextResponse.json(
        { error: '缺少必要參數：case_id 或 final_status' },
        { status: 400 }
      );
    }

    // 驗證評分類別
    const validCategories = ['delivery', 'quality', 'client_satisfaction', 'team_performance', 'profitability'];
    for (const score of body.scores) {
      if (!validCategories.includes(score.category)) {
        return NextResponse.json(
          { error: '無效的評分類別' },
          { status: 400 }
        );
      }
    }

    // 建立結案記錄
    const closureId = `cls_${Date.now()}`;
    const closure: CaseClosureResponse = {
      closure_id: closureId,
      case_id: caseId,
      closure_date: body.closure_date,
      final_status: body.final_status,
      scores: body.scores.map((s) => ({
        id: `score_${Date.now()}_${Math.random()}`,
        case_id: caseId,
        category: s.category as any,
        score: s.score,
        notes: s.notes,
        created_at: new Date().toISOString(),
      })),
      patterns: body.success_patterns.map((p) => ({
        id: `pattern_${Date.now()}_${Math.random()}`,
        case_id: caseId,
        pattern_name: p.pattern_name,
        description: p.description,
        tags: p.tags,
        replicability_score: Math.round(Math.random() * 100),
        created_at: new Date().toISOString(),
      })),
      kb_entry: {
        id: `kb_${Date.now()}`,
        case_id: caseId,
        lessons_learned: body.kb_feedback.lessons_learned,
        best_practices: body.kb_feedback.best_practices,
        challenges_faced: body.kb_feedback.challenges_faced,
        solutions_applied: body.kb_feedback.solutions_applied,
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    // 暫存
    closures.set(closureId, closure);

    return NextResponse.json(closure, { status: 201 });
  } catch (error) {
    console.error('Error processing case closure:', error);
    return NextResponse.json(
      { error: '案件結案失敗' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;

    // Mock 返回已結案的案件
    const closure = {
      closure_id: `cls_${caseId}`,
      case_id: caseId,
      closure_date: new Date().toISOString(),
      final_status: 'completed',
      scores: [
        {
          id: 'score_delivery',
          case_id: caseId,
          category: 'delivery',
          score: 95,
          notes: '按時交付所有可交付成果',
          created_at: new Date().toISOString(),
        },
        {
          id: 'score_quality',
          case_id: caseId,
          category: 'quality',
          score: 92,
          notes: '符合客戶品質標準',
          created_at: new Date().toISOString(),
        },
      ],
      patterns: [],
      kb_entry: {
        id: `kb_${caseId}`,
        case_id: caseId,
        lessons_learned: '客戶溝通的及時性影響交付品質',
        best_practices: ['定期狀態報告', '風險早期識別'],
        challenges_faced: ['需求變更頻繁', '資源限制'],
        solutions_applied: ['建立變更控制流程', '提前規劃資源'],
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(closure);
  } catch (error) {
    return NextResponse.json(
      { error: '查詢結案記錄失敗' },
      { status: 500 }
    );
  }
}
