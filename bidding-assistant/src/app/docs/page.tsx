"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ====== Types ======

interface FileEntry {
  path: string;
  name: string;
  size: number;
  mtime: string;
  category: string;
}

interface FileListResponse {
  total: number;
  sources: string[];
  categories: Record<string, FileEntry[]>;
}

interface FileContentResponse {
  path: string;
  content: string;
  size: number;
  mtime: string;
}

// ====== Simple Markdown Renderer ======
// 用 dangerouslySetInnerHTML + 簡單的 markdown→HTML 轉換
// 足以處理 heading、list、table、code block、blockquote、bold/italic/link

function parseMarkdown(md: string): string {
  // 移除 YAML frontmatter，但保留 meta 資訊
  let frontmatter = "";
  let body = md;
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fmMatch) {
    frontmatter = fmMatch[1];
    body = md.slice(fmMatch[0].length);
  }

  let html = "";

  // 解析 frontmatter 顯示
  if (frontmatter) {
    const meta: Record<string, string> = {};
    const changelog: string[] = [];
    let inChangelog = false;
    frontmatter.split("\n").forEach((line) => {
      if (inChangelog) {
        const m = line.match(/^\s+-\s+"(.+)"$/);
        if (m) changelog.push(m[1]);
        else inChangelog = false;
      }
      const kv = line.match(/^(\w+):\s*"?([^"]*)"?$/);
      if (kv && kv[2]) meta[kv[1]] = kv[2];
      if (line.match(/^changelog:$/)) inChangelog = true;
    });

    if (Object.keys(meta).length > 0) {
      html += '<div class="doc-frontmatter">';
      if (meta.version) html += `<span class="doc-meta">v${meta.version}</span>`;
      if (meta.status) html += `<span class="doc-meta doc-status-${meta.status}">${meta.status}</span>`;
      if (meta.updated) html += `<span class="doc-meta">${meta.updated}</span>`;
      if (changelog.length > 0) {
        html += `<details class="doc-changelog"><summary>變更紀錄 (${changelog.length})</summary><ul>`;
        changelog.forEach((c) => (html += `<li>${escapeHtml(c)}</li>`));
        html += "</ul></details>";
      }
      html += "</div>";
    }
  }

  // 逐行解析 markdown
  const lines = body.split("\n");
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeContent = "";
  let inTable = false;
  let tableRows: string[][] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";

  function flushTable() {
    if (tableRows.length === 0) return;
    html += '<div class="doc-table-wrap"><table>';
    tableRows.forEach((row, i) => {
      const tag = i === 0 ? "th" : "td";
      html += "<tr>" + row.map((c) => `<${tag}>${inlineMarkdown(c.trim())}</${tag}>`).join("") + "</tr>";
    });
    html += "</table></div>";
    tableRows = [];
    inTable = false;
  }

  function flushList() {
    if (inList) {
      html += listType === "ul" ? "</ul>" : "</ol>";
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html += `<pre><code class="lang-${escapeHtml(codeBlockLang)}">${escapeHtml(codeContent)}</code></pre>`;
        inCodeBlock = false;
        codeContent = "";
        codeBlockLang = "";
      } else {
        flushTable();
        flushList();
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent += (codeContent ? "\n" : "") + line;
      continue;
    }

    // Table row
    if (line.match(/^\|.+\|$/)) {
      flushList();
      // 跳過分隔行
      if (line.match(/^\|[\s\-:|]+\|$/)) continue;
      const cells = line.split("|").slice(1, -1);
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Empty line
    if (line.trim() === "") {
      flushList();
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const id = headingMatch[2].replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "-").toLowerCase();
      html += `<h${level} id="${id}">${inlineMarkdown(headingMatch[2])}</h${level}>`;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      html += `<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`;
      continue;
    }

    // HR
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      flushList();
      html += "<hr>";
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[*\-+]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        flushList();
        html += "<ul>";
        inList = true;
        listType = "ul";
      }
      html += `<li>${inlineMarkdown(ulMatch[2])}</li>`;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        flushList();
        html += "<ol>";
        inList = true;
        listType = "ol";
      }
      html += `<li>${inlineMarkdown(olMatch[2])}</li>`;
      continue;
    }

    // Paragraph
    flushList();
    html += `<p>${inlineMarkdown(line)}</p>`;
  }

  flushTable();
  flushList();

  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineMarkdown(text: string): string {
  let result = escapeHtml(text);
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  result = result.replace(/`(.+?)`/g, '<code class="inline-code">$1</code>');
  // Links
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // Strikethrough
  result = result.replace(/~~(.+?)~~/g, "<del>$1</del>");
  return result;
}

// ====== Category icons & order ======

const CATEGORY_CONFIG: Record<string, { icon: string; order: number }> = {
  "全域文件": { icon: "📄", order: 0 },
  "功能模組": { icon: "🧩", order: 1 },
  "工作流程": { icon: "⚙️", order: 2 },
  "附錄": { icon: "📎", order: 3 },
  "暫存區": { icon: "📝", order: 4 },
  "專案文件": { icon: "📂", order: 5 },
  "方法論": { icon: "🧠", order: 6 },
  "執行計畫": { icon: "🎯", order: 7 },
  "SOP": { icon: "📋", order: 8 },
  "操作記錄": { icon: "📜", order: 9 },
  "分析報告": { icon: "📊", order: 10 },
  "工作摘要": { icon: "📑", order: 11 },
  "論壇紀錄": { icon: "💬", order: 12 },
  "參考資料": { icon: "🔖", order: 13 },
  "輸出文件": { icon: "📤", order: 14 },
};

function getCategoryConfig(cat: string) {
  return CATEGORY_CONFIG[cat] || { icon: "📄", order: 99 };
}

// ====== Main Component ======

export default function DocsPage() {
  const [fileList, setFileList] = useState<FileListResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContentResponse | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  // 載入文件列表
  const loadFileList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/docs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FileListResponse = await res.json();
      setFileList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFileList();
  }, [loadFileList]);

  // 載入單一檔案
  const loadFile = useCallback(async (filePath: string) => {
    try {
      setContentLoading(true);
      setSelectedFile(filePath);
      const res = await fetch(`/api/docs?file=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FileContentResponse = await res.json();
      setFileContent(data);
      contentRef.current?.scrollTo(0, 0);
    } catch (e) {
      setFileContent(null);
      setError(e instanceof Error ? e.message : "讀取失敗");
    } finally {
      setContentLoading(false);
    }
  }, []);

  // 搜尋過濾
  const filteredCategories = fileList
    ? Object.entries(fileList.categories)
        .map(([cat, files]) => ({
          cat,
          files: search
            ? files.filter(
                (f) =>
                  f.name.toLowerCase().includes(search.toLowerCase()) ||
                  f.path.toLowerCase().includes(search.toLowerCase()),
              )
            : files,
        }))
        .filter((g) => g.files.length > 0)
        .sort((a, b) => getCategoryConfig(a.cat).order - getCategoryConfig(b.cat).order)
    : [];

  const totalFiltered = filteredCategories.reduce((sum, g) => sum + g.files.length, 0);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // 鍵盤快捷鍵
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.ctrlKey && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        document.getElementById("doc-search")?.focus();
      }
      if (e.key === "Escape") {
        setSearch("");
        (document.activeElement as HTMLElement)?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* ====== 左側導航 ====== */}
      <div className="w-72 min-w-[260px] border-r bg-muted/30 flex flex-col">
        {/* 標題 + 搜尋 */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/80">文件瀏覽器</h2>
            {fileList && (
              <Badge variant="secondary" className="text-[10px]">
                {totalFiltered}/{fileList.total}
              </Badge>
            )}
          </div>
          <Input
            id="doc-search"
            placeholder="搜尋文件... (按 / 聚焦)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
          <button
            onClick={loadFileList}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            title="重新掃描檔案（新增文件後按此更新）"
          >
            🔄 重新掃描
          </button>
        </div>

        {/* 文件樹 */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading && <p className="text-xs text-muted-foreground p-3">載入中...</p>}
            {error && !loading && (
              <p className="text-xs text-destructive p-3">{error}</p>
            )}
            {filteredCategories.map(({ cat, files }) => {
              const config = getCategoryConfig(cat);
              const isCollapsed = collapsedCategories.has(cat);
              return (
                <div key={cat} className="mb-1">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors rounded"
                  >
                    <span className="text-xs">{isCollapsed ? "▸" : "▾"}</span>
                    <span>{config.icon}</span>
                    <span>{cat}</span>
                    <span className="ml-auto text-[10px] opacity-60">{files.length}</span>
                  </button>
                  {!isCollapsed &&
                    files.map((f) => (
                      <button
                        key={f.path}
                        onClick={() => loadFile(f.path)}
                        title={f.path}
                        className={cn(
                          "flex items-center w-full text-left px-3 py-1 ml-2 text-xs rounded transition-colors truncate",
                          selectedFile === f.path
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* ====== 右側內容 ====== */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {!selectedFile && !contentLoading && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-3 text-muted-foreground">
              <div className="text-5xl">📋</div>
              <h3 className="text-lg font-medium text-foreground/70">文件瀏覽器</h3>
              <p className="text-sm">從左側選擇一份文件開始閱讀</p>
              <p className="text-xs">
                按 <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">/</kbd> 搜尋
              </p>
              {fileList && (
                <p className="text-xs opacity-60">
                  共 {fileList.total} 份文件・{Object.keys(fileList.categories).length} 個分類
                </p>
              )}
            </div>
          </div>
        )}

        {contentLoading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground animate-pulse">載入中...</p>
          </div>
        )}

        {selectedFile && fileContent && !contentLoading && (
          <div className="max-w-4xl mx-auto px-8 py-6">
            {/* 文件路徑標籤 */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="font-mono text-[10px]">
                {fileContent.path}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {(fileContent.size / 1024).toFixed(1)} KB・
                {new Date(fileContent.mtime).toLocaleDateString("zh-TW")}
              </span>
            </div>

            {/* Markdown 內容 */}
            <article
              className="doc-content prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(fileContent.content) }}
            />
          </div>
        )}
      </div>

      {/* 內嵌文件閱讀器樣式 */}
      <style jsx global>{`
        .doc-content h1 { font-size: 1.6rem; font-weight: 700; margin: 1.5rem 0 0.75rem; padding-bottom: 0.4rem; border-bottom: 2px solid hsl(var(--primary)); }
        .doc-content h2 { font-size: 1.3rem; font-weight: 600; margin: 1.5rem 0 0.6rem; color: hsl(var(--foreground) / 0.9); }
        .doc-content h3 { font-size: 1.1rem; font-weight: 600; margin: 1.2rem 0 0.4rem; }
        .doc-content h4 { font-size: 1rem; font-weight: 600; margin: 1rem 0 0.3rem; }
        .doc-content p { margin: 0.5rem 0; line-height: 1.75; font-size: 0.9rem; }
        .doc-content ul, .doc-content ol { margin: 0.5rem 0 0.5rem 1.5rem; font-size: 0.9rem; line-height: 1.75; }
        .doc-content li { margin: 0.2rem 0; }
        .doc-content strong { color: hsl(var(--foreground)); }
        .doc-content a { color: hsl(var(--primary)); text-decoration: none; }
        .doc-content a:hover { text-decoration: underline; }
        .doc-content blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding: 0.5rem 1rem; margin: 0.75rem 0;
          background: hsl(var(--muted)); border-radius: 0 0.5rem 0.5rem 0;
          font-size: 0.85rem; color: hsl(var(--muted-foreground));
        }
        .doc-content pre {
          background: hsl(var(--card)); border: 1px solid hsl(var(--border));
          border-radius: 0.5rem; padding: 1rem; overflow-x: auto;
          font-size: 0.8rem; line-height: 1.5; margin: 0.75rem 0;
        }
        .doc-content .inline-code {
          background: hsl(var(--muted)); padding: 0.15rem 0.4rem;
          border-radius: 0.25rem; font-size: 0.8rem;
          font-family: var(--font-geist-mono), monospace;
        }
        .doc-content hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1.5rem 0; }
        .doc-table-wrap { overflow-x: auto; margin: 0.75rem 0; }
        .doc-content table { border-collapse: collapse; width: 100%; font-size: 0.8rem; }
        .doc-content th { background: hsl(var(--muted)); padding: 0.4rem 0.6rem; border: 1px solid hsl(var(--border)); font-weight: 600; text-align: left; }
        .doc-content td { padding: 0.4rem 0.6rem; border: 1px solid hsl(var(--border)); }
        .doc-content tr:nth-child(even) { background: hsl(var(--muted) / 0.5); }
        .doc-content img { max-width: 100%; border-radius: 0.5rem; }
        .doc-content del { opacity: 0.5; }

        .doc-frontmatter {
          display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
          padding: 0.5rem 0.75rem; margin-bottom: 1rem;
          background: hsl(var(--muted)); border-radius: 0.5rem;
          border: 1px solid hsl(var(--border)); font-size: 0.75rem;
        }
        .doc-meta {
          padding: 0.15rem 0.5rem; border-radius: 999px;
          background: hsl(var(--background)); border: 1px solid hsl(var(--border));
        }
        .doc-status-定案 { color: hsl(142 76% 36%); border-color: hsl(142 76% 36% / 0.3); }
        .doc-status-草案 { color: hsl(38 92% 50%); border-color: hsl(38 92% 50% / 0.3); }
        .doc-status-待寫 { color: hsl(var(--muted-foreground)); }
        .doc-status-修訂中 { color: hsl(221 83% 53%); border-color: hsl(221 83% 53% / 0.3); }

        .doc-changelog { margin-top: 0.3rem; font-size: 0.7rem; }
        .doc-changelog summary { cursor: pointer; color: hsl(var(--muted-foreground)); }
        .doc-changelog ul { margin: 0.3rem 0 0 1.2rem; }
        .doc-changelog li { margin: 0.15rem 0; color: hsl(var(--muted-foreground)); }
      `}</style>
    </div>
  );
}
