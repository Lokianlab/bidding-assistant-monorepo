/**
 * Knowledge Base v2 -- Card recommender
 *
 * Recommends knowledge cards relevant to a specific case by extracting
 * search terms from the case's RFP summary (intel cache) or falling back
 * to the case title.
 */

import { getIntelCache } from '@/lib/supabase/intel-client';
import { searchKnowledge } from './search';
import type { KnowledgeCard } from '@/lib/supabase/types';

const MAX_RESULTS = 10;

/**
 * Recommend knowledge cards for a given case.
 *
 * Strategy:
 * 1. Look up the RFP summary from intelligence_cache
 * 2. If available, extract key_requirements as search terms
 * 3. If not, fall back to the case title
 * 4. Return up to 10 results
 */
export async function recommendCards(
  caseId: string,
  caseTitle: string,
): Promise<KnowledgeCard[]> {
  // Try to get RFP summary from intel cache
  const rfpSummary = await getIntelCache(caseId, 'rfp_summary').catch(() => null);

  let searchTerms: string[] = [];

  if (rfpSummary?.data) {
    const data = rfpSummary.data as Record<string, unknown>;

    // Extract key_requirements if available
    if (Array.isArray(data.key_requirements)) {
      searchTerms = data.key_requirements
        .filter((r): r is string => typeof r === 'string')
        .slice(0, 5);
    }

    // Also use project_name or title from summary
    if (typeof data.project_name === 'string' && data.project_name) {
      searchTerms.unshift(data.project_name);
    }
  }

  // Fall back to case title if no search terms found
  if (searchTerms.length === 0) {
    searchTerms = [caseTitle];
  }

  // Search with each term and deduplicate
  const seenIds = new Set<string>();
  const results: KnowledgeCard[] = [];

  for (const term of searchTerms) {
    if (results.length >= MAX_RESULTS) break;

    const remaining = MAX_RESULTS - results.length;
    const { results: cards } = await searchKnowledge(term);

    for (const card of cards) {
      if (results.length >= remaining + results.length) break;
      if (!seenIds.has(card.id)) {
        seenIds.add(card.id);
        results.push(card);
      }
      if (results.length >= MAX_RESULTS) break;
    }
  }

  return results.slice(0, MAX_RESULTS);
}
