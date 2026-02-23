/**
 * M02 Phase 2: KB Export API
 *
 * GET /api/kb/export — 匯出知識庫資料
 *
 * 查詢參數：
 * - format: "json" | "markdown"（必填）
 * - categories: 逗號分隔的分類（選填）
 * - status: "active" | "draft" | "archived"（選填）
 */

import { NextRequest, NextResponse } from 'next/server';
import { withKBAuth } from '@/lib/supabase/middleware';
import type { KBId, KBEntry, KBEntryStatus } from '@/lib/supabase/types';

export async function GET(request: NextRequest) {
  return withKBAuth(request, async (req, auth) => {
    try {
      const url = new URL(req.url);
      const format = url.searchParams.get('format') || 'json';
      const categoriesParam = url.searchParams.get('categories');
      const status = (url.searchParams.get('status') as KBEntryStatus | null);

      // 驗證格式
      if (format !== 'json' && format !== 'markdown') {
        return NextResponse.json(
          { error: 'Invalid format: must be "json" or "markdown"' },
          { status: 400 }
        );
      }

      const { supabaseClient, session } = auth;

      // 解析 categories
      const categories = categoriesParam
        ? (categoriesParam.split(',') as KBId[])
        : undefined;

      // 建立查詢
      let qb = supabaseClient
        .from('kb_entries')
        .select('*')
        .eq('tenant_id', session.user.id);

      // 添加篩選條件
      if (categories && categories.length > 0) {
        qb = qb.in('category', categories);
      }
      if (status) {
        qb = qb.eq('status', status);
      }

      // 排序
      const { data, error } = await qb.order('category').order('created_at');

      if (error) {
        console.error('[KB API] Export error:', error);
        throw error;
      }

      // 根據格式匯出
      if (format === 'json') {
        return exportAsJson(data || []);
      } else {
        return exportAsMarkdown(data || []);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      console.error('[KB API] Export error:', message);
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }
  });
}

/**
 * 匯出為 JSON 格式
 */
function exportAsJson(entries: KBEntry[]) {
  const json = JSON.stringify(entries, null, 2);
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="kb-export-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}

/**
 * 匯出為 Markdown 格式
 */
function exportAsMarkdown(entries: KBEntry[]) {
  const categoryLabels: Record<KBId, string> = {
    '00A': '團隊資料庫',
    '00B': '實績資料庫',
    '00C': '時程範本庫',
    '00D': 'SOP/風險管理',
    '00E': '檢討記錄',
  };

  let markdown = '# 知識庫匯出\n\n';
  markdown += `**匯出日期**：${new Date().toLocaleString('zh-TW')}\n\n`;
  markdown += `**項目總數**：${entries.length}\n\n`;

  // 按分類分組
  const grouped = entries.reduce(
    (acc, entry) => {
      const category = entry.category as KBId;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(entry);
      return acc;
    },
    {} as Record<KBId, KBEntry[]>
  );

  // 為每個分類生成 Markdown
  for (const [category, items] of Object.entries(grouped)) {
    const categoryLabel = categoryLabels[category as KBId];
    markdown += `## ${categoryLabel} (${category})\n\n`;

    for (const item of items) {
      markdown += `### ${item.data?.name || item.entry_id}\n\n`;
      markdown += `**ID**：${item.entry_id}\n`;
      markdown += `**狀態**：${item.status}\n`;
      markdown += `**更新時間**：${new Date(item.updated_at).toLocaleString('zh-TW')}\n\n`;

      // 列出資料欄位
      markdown += '**資料**：\n\n';
      markdown += '```json\n';
      markdown += JSON.stringify(item.data, null, 2);
      markdown += '\n```\n\n';
    }
  }

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="kb-export-${new Date().toISOString().split('T')[0]}.md"`,
    },
  });
}
