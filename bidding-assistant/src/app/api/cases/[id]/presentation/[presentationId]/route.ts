// PUT /api/cases/[id]/presentation/[presentationId]
// M08 簡報實時編輯

import { NextRequest, NextResponse } from 'next/server';
import { PresentationSlide } from '@/lib/presentation/types';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; presentationId: string }> }
) {
  try {
    const { id: caseId, presentationId } = await context.params;
    const body = await request.json();

    // Mock 更新幻燈片
    const updatedSlides: PresentationSlide[] = body.slides.map((slide: any) => ({
      id: slide.id,
      slide_index: slide.slide_index,
      title: slide.title,
      key_points: slide.key_points,
      speaker_notes: slide.speaker_notes,
      speaker_notes_char_count: (slide.speaker_notes || '').replace(/\s+/g, '').length,
      created_at: slide.created_at,
      updated_at: new Date().toISOString(),
    }));

    return NextResponse.json(
      {
        presentation_id: presentationId,
        case_id: caseId,
        slides: updatedSlides,
        updated_at: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating presentation:', error);
    return NextResponse.json(
      { error: '簡報更新失敗' },
      { status: 500 }
    );
  }
}
