import { NextResponse } from 'next/server';
import { getCategoryStats } from '@/lib/supabase/cards-client';

/**
 * GET /api/knowledge/categories
 * 取得分類樹狀結構
 */
export async function GET() {
  try {
    const stats = await getCategoryStats();

    // 建構樹狀結構
    const tree: Record<string, { count: number; subcategories: Record<string, number> }> = {};

    for (const { category, subcategory, count } of stats) {
      if (!category) continue;
      if (!tree[category]) {
        tree[category] = { count: 0, subcategories: {} };
      }
      tree[category].count += count;
      if (subcategory) {
        tree[category].subcategories[subcategory] = (tree[category].subcategories[subcategory] ?? 0) + count;
      }
    }

    // 轉成陣列格式
    const categories = Object.entries(tree)
      .map(([name, data]) => ({
        name,
        count: data.count,
        children: Object.entries(data.subcategories).map(([subName, subCount]) => ({
          name: subName,
          count: subCount,
        })),
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ categories });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
