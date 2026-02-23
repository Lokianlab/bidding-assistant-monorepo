MSG|20260223-0950|JDNE|missing-dependency-fix

## @tanstack/react-table 缺失依賴修復

**問題**：P1d KB UI 實裝（Z1FV）未包含 npm 依賴
**根因**：Z1FV commit 2822538 使用 `@tanstack/react-table` 但未執行 `npm install`
**影響**：`npm run build` 失敗，編譯無法通過

**修復**：
```bash
npm install @tanstack/react-table
```

**狀態**：✅ 已安裝，編譯驗證通過
- 編譯時間：4.4s
- 無錯誤，正常完成

**下次 session 提醒**：
- Z1FV 或後續機器應在 commit 新依賴時自動執行 `npm install` 並提交 package-lock.json
- 或在 CLAUDE.md 中補充「新增外部依賴時的檢查清單」

