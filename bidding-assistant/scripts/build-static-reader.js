#!/usr/bin/env node
/**
 * build-static-reader.js
 * 產生自包含靜態 HTML 文件瀏覽器
 * 掃描 docs/ + bidding-assistant/docs/ 所有 .md 檔案
 * 輸出：bidding-assistant/public/docs-reader.html
 */

const fs = require("fs");
const path = require("path");

// Monorepo root = bidding-assistant 的上一層
const APP_ROOT = path.resolve(__dirname, "..");
const MONOREPO_ROOT = path.resolve(APP_ROOT, "..");

const DOC_SOURCES = [
  { label: "專案文件", basePath: path.join(MONOREPO_ROOT, "docs"), prefix: "docs" },
  { label: "開發計畫", basePath: path.join(APP_ROOT, "docs"), prefix: "app-docs" },
];

// ---------- 分類邏輯（與 API route 一致）----------
function categorize(filePath) {
  if (filePath.includes("dev-plan/_staging")) return "暫存區";
  if (filePath.includes("dev-plan/")) {
    const name = path.basename(filePath);
    if (/^M0/.test(name) || /^M1/.test(name)) return "功能模組";
    if (/^W0/.test(name)) return "工作流程";
    if (/^A0/.test(name)) return "附錄";
    return "全域文件";
  }
  if (filePath.includes("records/analysis")) return "分析報告";
  if (filePath.includes("records/forum")) return "論壇紀錄";
  if (filePath.includes("records/reference")) return "參考資料";
  if (filePath.includes("records/")) return "操作記錄";
  if (filePath.includes("summaries/")) return "工作摘要";
  if (filePath.includes("methodology/")) return "方法論";
  if (filePath.includes("plans/")) return "執行計畫";
  if (filePath.includes("sop/")) return "SOP";
  if (filePath.includes("各種輸出文件")) return "輸出文件";
  return "專案文件";
}

// ---------- 遞迴掃描 ----------
function walkDir(dir, base) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      results.push(...walkDir(fullPath, relPath));
    } else if (entry.name.endsWith(".md")) {
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, "utf-8").replace(/\r\n/g, "\n");
      results.push({
        path: relPath,
        name: entry.name.replace(/\.md$/, ""),
        size: stat.size,
        mtime: stat.mtime.toISOString().slice(0, 10),
        category: categorize(relPath),
        content: content,
      });
    }
  }
  return results;
}

// ---------- 收集所有檔案 ----------
const allFiles = [];
for (const source of DOC_SOURCES) {
  allFiles.push(...walkDir(source.basePath, source.prefix));
}

console.log(`掃描完成：${allFiles.length} 個 .md 檔案`);

// 統計分類
const catCounts = {};
for (const f of allFiles) {
  catCounts[f.category] = (catCounts[f.category] || 0) + 1;
}
for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}

// ---------- 產生 HTML ----------
const buildDate = new Date().toISOString().slice(0, 19).replace("T", " ");

// 將檔案資料序列化（content 單獨，避免 JSON 太大影響載入體驗）
const fileIndex = allFiles.map((f) => ({
  path: f.path,
  name: f.name,
  size: f.size,
  mtime: f.mtime,
  category: f.category,
}));

// 內容 map: path → content
const contentMap = {};
for (const f of allFiles) {
  contentMap[f.path] = f.content;
}

const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>全能標案助理 — 文件瀏覽器（靜態版）</title>
<style>
  :root {
    --bg: #0a0a0a; --surface: #141414; --surface2: #1e1e1e;
    --border: #2a2a2a; --text: #e5e5e5; --text2: #a0a0a0;
    --accent: #3b82f6; --accent-dim: #1e3a5f;
    --green: #22c55e; --orange: #f59e0b; --red: #ef4444;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; }

  .app { display: flex; height: 100vh; }

  /* --- 側欄 --- */
  .sidebar { width: 320px; min-width: 320px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
  .sidebar-header { padding: 16px; border-bottom: 1px solid var(--border); }
  .sidebar-header h1 { font-size: 16px; margin-bottom: 8px; }
  .sidebar-header .meta { font-size: 12px; color: var(--text2); }
  .search-box { width: 100%; padding: 8px 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 13px; outline: none; margin-top: 8px; }
  .search-box:focus { border-color: var(--accent); }
  .search-box::placeholder { color: var(--text2); }

  .sidebar-list { flex: 1; overflow-y: auto; padding: 8px; }
  .cat-group { margin-bottom: 4px; }
  .cat-header { display: flex; align-items: center; gap: 6px; padding: 6px 8px; font-size: 12px; font-weight: 600; color: var(--text2); cursor: pointer; border-radius: 4px; user-select: none; }
  .cat-header:hover { background: var(--surface2); }
  .cat-header .arrow { transition: transform 0.15s; font-size: 10px; }
  .cat-header.collapsed .arrow { transform: rotate(-90deg); }
  .cat-header .count { margin-left: auto; background: var(--surface2); padding: 1px 6px; border-radius: 10px; font-size: 11px; }
  .cat-files { }
  .cat-files.hidden { display: none; }
  .file-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 24px; font-size: 13px; cursor: pointer; border-radius: 4px; color: var(--text); text-decoration: none; }
  .file-item:hover { background: var(--surface2); }
  .file-item.active { background: var(--accent-dim); color: white; }
  .file-item .fname { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-item .fmeta { font-size: 11px; color: var(--text2); white-space: nowrap; }

  /* --- 內容區 --- */
  .content { flex: 1; overflow-y: auto; padding: 32px 48px; max-width: 900px; }
  .content.empty { display: flex; align-items: center; justify-content: center; max-width: 100%; }
  .empty-msg { text-align: center; color: var(--text2); }
  .empty-msg h2 { font-size: 20px; margin-bottom: 8px; color: var(--text); }
  .empty-msg p { font-size: 14px; }
  .empty-msg kbd { background: var(--surface2); padding: 2px 6px; border-radius: 4px; font-size: 12px; border: 1px solid var(--border); }

  /* --- Frontmatter --- */
  .frontmatter { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; }
  .frontmatter .row { display: flex; gap: 16px; margin-bottom: 4px; }
  .frontmatter .label { color: var(--text2); min-width: 60px; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #16532d; color: #86efac; }
  .badge-orange { background: #533416; color: #fcd34d; }
  .badge-blue { background: #1e3a5f; color: #93c5fd; }

  /* --- Markdown 渲染 --- */
  .md-content h1 { font-size: 28px; font-weight: 700; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .md-content h2 { font-size: 22px; font-weight: 600; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
  .md-content h3 { font-size: 18px; font-weight: 600; margin: 24px 0 8px; }
  .md-content h4 { font-size: 15px; font-weight: 600; margin: 20px 0 6px; }
  .md-content p { margin: 8px 0; line-height: 1.7; }
  .md-content ul, .md-content ol { margin: 8px 0 8px 24px; }
  .md-content li { margin: 4px 0; line-height: 1.6; }
  .md-content li ul, .md-content li ol { margin: 2px 0 2px 20px; }
  .md-content code { background: var(--surface2); padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: "Cascadia Code", "Fira Code", monospace; }
  .md-content pre { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 12px 0; }
  .md-content pre code { background: none; padding: 0; font-size: 13px; }
  .md-content blockquote { border-left: 3px solid var(--accent); padding: 8px 16px; margin: 12px 0; color: var(--text2); background: var(--surface); border-radius: 0 6px 6px 0; }
  .md-content table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
  .md-content th, .md-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
  .md-content th { background: var(--surface); font-weight: 600; }
  .md-content tr:nth-child(even) { background: var(--surface); }
  .md-content a { color: var(--accent); text-decoration: none; }
  .md-content a:hover { text-decoration: underline; }
  .md-content hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
  .md-content strong { font-weight: 600; }
  .md-content em { font-style: italic; }
  .md-content img { max-width: 100%; border-radius: 8px; }
  .md-content .task-done { text-decoration: line-through; color: var(--text2); }

  /* --- 捲軸 --- */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #444; }

  /* --- RWD --- */
  @media (max-width: 768px) {
    .sidebar { width: 100%; min-width: 100%; position: fixed; z-index: 10; transform: translateX(-100%); transition: transform 0.2s; }
    .sidebar.open { transform: translateX(0); }
    .content { padding: 16px; }
    .mobile-toggle { display: block; position: fixed; top: 12px; left: 12px; z-index: 20; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; color: var(--text); cursor: pointer; font-size: 16px; }
  }
  @media (min-width: 769px) {
    .mobile-toggle { display: none; }
  }
</style>
</head>
<body>

<button class="mobile-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">☰</button>

<div class="app">
  <div class="sidebar">
    <div class="sidebar-header">
      <h1>📋 文件瀏覽器（靜態版）</h1>
      <div class="meta">共 ${allFiles.length} 份文件 · 建置於 ${buildDate}</div>
      <input class="search-box" id="searchBox" placeholder="搜尋文件名… (按 / 聚焦)" />
    </div>
    <div class="sidebar-list" id="sidebarList"></div>
  </div>
  <div class="content empty" id="contentArea">
    <div class="empty-msg">
      <h2>📋 文件瀏覽器</h2>
      <p>從左側選擇文件開始閱讀</p>
      <p style="margin-top:8px"><kbd>/</kbd> 搜尋 · <kbd>Esc</kbd> 清除</p>
    </div>
  </div>
</div>

<script>
// ===== 資料 =====
const FILE_INDEX = ${JSON.stringify(fileIndex)};
const CONTENT_MAP = ${JSON.stringify(contentMap)};

// ===== 分類排序 =====
const CAT_ORDER = [
  "全域文件","功能模組","工作流程","附錄","暫存區",
  "方法論","執行計畫","SOP","專案文件","輸出文件",
  "操作記錄","工作摘要","分析報告","論壇紀錄","參考資料"
];

// ===== 狀態 =====
let currentFile = null;
let collapsedCats = new Set();

// ===== Markdown 解析 =====
function parseFrontmatter(content) {
  const m = content.match(/^---\\n([\\s\\S]*?)\\n---/);
  if (!m) return { meta: null, body: content };
  const meta = {};
  m[1].split("\\n").forEach(line => {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      meta[key] = val;
    }
  });
  return { meta, body: content.slice(m[0].length).trim() };
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function renderMarkdown(md) {
  let html = "";
  const lines = md.split("\\n");
  let i = 0;
  let inCodeBlock = false, codeLang = "", codeLines = [];
  let inTable = false, tableRows = [];

  function flushTable() {
    if (!inTable || tableRows.length === 0) return;
    inTable = false;
    let t = "<table><thead><tr>";
    const headers = tableRows[0];
    headers.forEach(h => t += "<th>" + inlineFormat(h.trim()) + "</th>");
    t += "</tr></thead><tbody>";
    for (let r = 2; r < tableRows.length; r++) {
      t += "<tr>";
      tableRows[r].forEach(c => t += "<td>" + inlineFormat(c.trim()) + "</td>");
      t += "</tr>";
    }
    t += "</tbody></table>";
    html += t;
    tableRows = [];
  }

  function inlineFormat(text) {
    // Images
    text = text.replace(/!\\[([^\\]]*)\\]\\(([^)]+)\\)/g, '<img src="$2" alt="$1">');
    // Links
    text = text.replace(/\\[([^\\]]*)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
    // Bold+Italic
    text = text.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\\*(.+?)\\*/g, '<em>$1</em>');
    // Strikethrough
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Inline code
    text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
    // Checkbox
    text = text.replace(/\\[x\\]/gi, '☑');
    text = text.replace(/\\[ \\]/g, '☐');
    return text;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("\`\`\`")) {
      if (inCodeBlock) {
        html += '<pre><code>' + escapeHtml(codeLines.join("\\n")) + '</code></pre>';
        inCodeBlock = false;
        codeLines = [];
      } else {
        flushTable();
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").slice(1, -1);
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      // Skip separator row
      if (cells.every(c => /^[\\s:-]+$/.test(c))) {
        tableRows.push(null); // placeholder for separator
        i++;
        continue;
      }
      tableRows.push(cells);
      i++;
      continue;
    }
    if (inTable) flushTable();

    // Heading
    const hMatch = line.match(/^(#{1,6})\\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      html += '<h' + level + '>' + inlineFormat(hMatch[2]) + '</h' + level + '>';
      i++;
      continue;
    }

    // HR
    if (/^(---|\\*\\*\\*|___)\\s*$/.test(line.trim())) {
      html += '<hr>';
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      let bq = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        bq.push(lines[i].slice(2));
        i++;
      }
      html += '<blockquote>' + bq.map(l => '<p>' + inlineFormat(l) + '</p>').join("") + '</blockquote>';
      continue;
    }

    // Unordered list
    if (/^(\\s*)[\\-\\*]\\s+/.test(line)) {
      let items = [];
      while (i < lines.length && /^(\\s*)[\\-\\*]\\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\\s*[\\-\\*]\\s+/, ""));
        i++;
      }
      html += '<ul>' + items.map(it => '<li>' + inlineFormat(it) + '</li>').join("") + '</ul>';
      continue;
    }

    // Ordered list
    if (/^\\s*\\d+\\.\\s+/.test(line)) {
      let items = [];
      while (i < lines.length && /^\\s*\\d+\\.\\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\\s*\\d+\\.\\s+/, ""));
        i++;
      }
      html += '<ol>' + items.map(it => '<li>' + inlineFormat(it) + '</li>').join("") + '</ol>';
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    html += '<p>' + inlineFormat(line) + '</p>';
    i++;
  }

  if (inCodeBlock) {
    html += '<pre><code>' + escapeHtml(codeLines.join("\\n")) + '</code></pre>';
  }
  flushTable();

  return html;
}

// ===== 側欄渲染 =====
function renderSidebar(filter) {
  const list = document.getElementById("sidebarList");
  const filtered = filter
    ? FILE_INDEX.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()) || f.path.toLowerCase().includes(filter.toLowerCase()))
    : FILE_INDEX;

  // 按分類分組
  const grouped = {};
  for (const f of filtered) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }

  // 排序分類
  const cats = Object.keys(grouped).sort((a, b) => {
    const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  let html = "";
  for (const cat of cats) {
    const files = grouped[cat].sort((a, b) => a.path.localeCompare(b.path));
    const collapsed = collapsedCats.has(cat);
    html += '<div class="cat-group">';
    html += '<div class="cat-header' + (collapsed ? " collapsed" : "") + '" onclick="toggleCat(this, \\''+cat.replace(/'/g,"\\\\'")+'\\')"><span class="arrow">▼</span> ' + cat + ' <span class="count">' + files.length + '</span></div>';
    html += '<div class="cat-files' + (collapsed ? " hidden" : "") + '">';
    for (const f of files) {
      const active = currentFile === f.path ? " active" : "";
      const sizeKB = (f.size / 1024).toFixed(1);
      html += '<div class="file-item' + active + '" onclick="openFile(\\''+f.path.replace(/'/g,"\\\\'")+'\\')"><span class="fname">' + escapeHtml(f.name) + '</span><span class="fmeta">' + sizeKB + 'K</span></div>';
    }
    html += '</div></div>';
  }

  if (filtered.length === 0) {
    html = '<div style="padding:16px;text-align:center;color:var(--text2)">沒有符合的文件</div>';
  }

  list.innerHTML = html;
}

function toggleCat(el, cat) {
  if (collapsedCats.has(cat)) {
    collapsedCats.delete(cat);
    el.classList.remove("collapsed");
    el.nextElementSibling.classList.remove("hidden");
  } else {
    collapsedCats.add(cat);
    el.classList.add("collapsed");
    el.nextElementSibling.classList.add("hidden");
  }
}

// ===== 開啟檔案 =====
function openFile(filePath) {
  currentFile = filePath;
  const content = CONTENT_MAP[filePath];
  if (!content) return;

  const area = document.getElementById("contentArea");
  area.classList.remove("empty");

  const { meta, body } = parseFrontmatter(content);

  let html = '';

  // Frontmatter
  if (meta && Object.keys(meta).length > 0) {
    html += '<div class="frontmatter">';
    if (meta.version) {
      html += '<div class="row"><span class="label">版本</span><span class="badge badge-blue">v' + escapeHtml(meta.version) + '</span></div>';
    }
    if (meta.status) {
      const cls = meta.status === '定案' ? 'badge-green' : meta.status === '草案' ? 'badge-orange' : 'badge-blue';
      html += '<div class="row"><span class="label">狀態</span><span class="badge ' + cls + '">' + escapeHtml(meta.status) + '</span></div>';
    }
    if (meta.updated) {
      html += '<div class="row"><span class="label">更新</span><span>' + escapeHtml(meta.updated) + '</span></div>';
    }
    for (const [k, v] of Object.entries(meta)) {
      if (['version', 'status', 'updated'].includes(k)) continue;
      html += '<div class="row"><span class="label">' + escapeHtml(k) + '</span><span>' + escapeHtml(v) + '</span></div>';
    }
    html += '</div>';
  }

  html += '<div class="md-content">' + renderMarkdown(body) + '</div>';

  area.innerHTML = html;
  area.scrollTop = 0;

  // 更新側欄 active 狀態
  renderSidebar(document.getElementById("searchBox").value);

  // 手機版自動關側欄
  document.querySelector('.sidebar').classList.remove('open');
}

// ===== 搜尋 =====
const searchBox = document.getElementById("searchBox");
searchBox.addEventListener("input", () => renderSidebar(searchBox.value));

// 鍵盤快捷鍵
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== searchBox) {
    e.preventDefault();
    searchBox.focus();
  }
  if (e.key === "Escape") {
    searchBox.value = "";
    searchBox.blur();
    renderSidebar("");
  }
});

// ===== 初始化 =====
renderSidebar("");
</script>

</body>
</html>`;

// ---------- 寫檔 ----------
const outputPath = path.join(APP_ROOT, "public", "docs-reader.html");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, "utf-8");

const sizeKB = (Buffer.byteLength(html, "utf-8") / 1024).toFixed(0);
console.log(`\n✅ 靜態版已產生：${outputPath}`);
console.log(`   大小：${sizeKB} KB`);
console.log(`   開啟方式：直接在瀏覽器開啟 docs-reader.html`);
