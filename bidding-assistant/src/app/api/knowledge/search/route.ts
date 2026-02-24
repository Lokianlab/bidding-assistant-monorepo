import { NextRequest, NextResponse } from 'next/server';
import { searchCards } from '@/lib/supabase/cards-client';

/**
 * GET /api/knowledge/search?q=展覽&category=活動&limit=50&offset=0
 * 知識庫搜尋
 */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('q') ?? '';
    const category = request.nextUrl.searchParams.get('category') ?? undefined;
    const subcategory = request.nextUrl.searchParams.get('subcategory') ?? undefined;
    const fileType = request.nextUrl.searchParams.get('file_type') ?? undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);

    const result = await searchCards(
      query,
      { category, subcategory, file_type: fileType },
      limit,
      offset,
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
