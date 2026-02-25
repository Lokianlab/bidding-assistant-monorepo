/**
 * Knowledge Base v2 -- Search & category tree
 *
 * Wraps the Supabase cards-client with knowledge-v2-specific logic.
 */

import { searchCards, getCategoryStats } from '@/lib/supabase/cards-client';
import type { KnowledgeCard } from '@/lib/supabase/types';
import type { CategoryNode } from './types';

/**
 * Search knowledge cards with optional category/subcategory filters.
 */
export async function searchKnowledge(
  query: string,
  filters?: { category?: string; subcategory?: string },
): Promise<{ results: KnowledgeCard[]; total: number }> {
  return searchCards(query, filters);
}

/**
 * Build a tree structure from flat category stats.
 *
 * Returns an array of CategoryNode, each representing a top-level category
 * with its subcategories as children.
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const stats = await getCategoryStats();

  // Group by category
  const categoryMap = new Map<string, { total: number; subs: Map<string, number> }>();

  for (const row of stats) {
    const cat = row.category || '其他';
    const existing = categoryMap.get(cat);
    if (existing) {
      existing.total += row.count;
      if (row.subcategory) {
        existing.subs.set(
          row.subcategory,
          (existing.subs.get(row.subcategory) ?? 0) + row.count,
        );
      }
    } else {
      const subs = new Map<string, number>();
      if (row.subcategory) {
        subs.set(row.subcategory, row.count);
      }
      categoryMap.set(cat, { total: row.count, subs });
    }
  }

  // Convert to tree
  const tree: CategoryNode[] = [];

  for (const [name, data] of categoryMap) {
    const children: CategoryNode[] = Array.from(data.subs.entries())
      .map(([subName, count]) => ({
        name: subName,
        count,
        children: [],
      }))
      .sort((a, b) => b.count - a.count);

    tree.push({
      name,
      count: data.total,
      children,
    });
  }

  // Sort top-level categories by count descending
  tree.sort((a, b) => b.count - a.count);

  return tree;
}
