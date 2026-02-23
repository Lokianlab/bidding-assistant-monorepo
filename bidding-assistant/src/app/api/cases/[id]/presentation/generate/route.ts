// POST /api/cases/[id]/presentation/generate
// M08 評選簡報生成器

import { NextRequest, NextResponse } from 'next/server';
import { generateSlideId, getSlideStructure, buildPresentation } from '@/lib/presentation/helpers';
import { TemplateType, PresentationSlide, GenerateSlidesRequest } from '@/lib/presentation/types';

// Mock 資料庫（實際應使用 Supabase）
const presentations = new Map();

// Mock 簡報內容生成
function generateMockSlides(
  templateType: TemplateType,
  caseData: any
): PresentationSlide[] {
  const structure = getSlideStructure(templateType);
  const slides: PresentationSlide[] = [];

  const mockContent: Record<string, { keyPoints: string[]; notes: string }> = {
    工程: {
      keyPoints: ['公司名稱', '行業資質', '成立年份'],
      notes: '尊敬的評審委員，感謝貴機關給予我們參與此案的機會。我司致力於提供高品質的工程服務...',
    },
    顧問: {
      keyPoints: ['顧問專業', '服務範圍', '成功案例'],
      notes: '各位評審，我們對此案提出的顧問方案，基於多年的業界經驗和深入的產業分析...',
    },
    軟體: {
      keyPoints: ['技術能力', '系統架構', '交付經驗'],
      notes: '感謝評審委員的關注。我們的軟體解決方案採用現代化技術棧，確保系統的穩定性和擴展性...',
    },
  };

  structure.forEach((title, index) => {
    const contentKey = templateType === 'engineering' ? '工程' : templateType === 'consulting' ? '顧問' : '軟體';
    const content = mockContent[contentKey];

    slides.push({
      id: generateSlideId(),
      slide_index: index + 1,
      title,
      key_points: content.keyPoints,
      speaker_notes: content.notes,
      speaker_notes_char_count: content.notes.replace(/\s+/g, '').length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  return slides;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;
    const body = (await request.json()) as GenerateSlidesRequest;

    // 驗證輸入
    if (!caseId || !body.template_type) {
      return NextResponse.json(
        { error: '缺少必要參數：case_id 或 template_type' },
        { status: 400 }
      );
    }

    const validTemplateTypes: TemplateType[] = ['engineering', 'consulting', 'software'];
    if (!validTemplateTypes.includes(body.template_type)) {
      return NextResponse.json(
        { error: '無效的 template_type，應為：engineering、consulting 或 software' },
        { status: 400 }
      );
    }

    // 生成簡報
    const slides = generateMockSlides(body.template_type, body.case_data || {});
    const presentation = buildPresentation(caseId, body.template_type, slides);

    // 暫存（後期可改為 Supabase）
    presentations.set(presentation.id, presentation);

    return NextResponse.json(
      {
        presentation_id: presentation.id,
        slides: presentation.slides,
        created_at: presentation.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating presentation:', error);
    return NextResponse.json(
      { error: '簡報生成失敗' },
      { status: 500 }
    );
  }
}
