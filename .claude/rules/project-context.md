# 專案結構與技術背景

```
cc程式/
  bidding-assistant/    ← 主 Web App（Next.js 16 + React 19）
  pcc-api-mcp/          ← PCC 標案 API MCP Server
  docs/records/         ← 記錄層
  docs/methodology/     ← 方法論
```

技術棧：Node v22, Next.js 16.1.6, React 19, TS 5, Tailwind 4, Vitest 4, shadcn/radix-ui, Supabase, Notion API。Dev port: 3000。

**注意**：
- Windows bash 語法，用 `> /dev/null` 不用 `> nul`
- npm registry: `https://registry.npmjs.org/`
- **資料庫安全（硬性規定）**：禁止直接修改原始資料庫，一律用沙盒或複製庫

詳細架構見 `bidding-assistant/CLAUDE.md`，除錯見 `docs/debugging.md`
