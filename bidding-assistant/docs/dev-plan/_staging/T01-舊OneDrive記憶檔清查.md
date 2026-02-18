# 暫存：舊 OneDrive 記憶檔清查結果

- **目標文件**：無（清查報告，供未來參考）
- **操作**：新增
- **來源對話**：~/.claude/ 舊記憶檔清查與遷移（2026-02-19）

## 背景

舊專案路徑 `C:\Users\gary2\OneDrive\桌面\cc程式` 搬遷到 `C:\dev\cc程式` 後，
Claude Code 在 `~/.claude/projects/C--Users-gary2-OneDrive----cc--/memory/` 遺留了 7 個記憶檔。
本次清查確認哪些已推 GitHub、哪些有遺漏。

## 清查結果

| 舊記憶檔 | GitHub 對應位置 | 狀態 |
|---|---|---|
| `debugging.md` | `docs/debugging.md` | 完全相同，已在 GitHub |
| `dev-environment.md` | `docs/dev-environment.md` | GitHub 版本更新（已改新路徑） |
| `development-plan.md` | `_staging/development-plan-v3-summary.md` | 已推（加了來源標注） |
| `pcc-api-integration.md` | `_staging/pcc-api-integration.md` | 已推（加了來源標注） |
| `pain-points-analysis.md` | `_staging/pain-points-analysis.md` | 已推（加了來源標注） |
| `saas-architecture-discussion.md` | `_staging/saas-architecture-discussion.md` | 已推（加了來源標注） |
| **`MEMORY.md`** | 無對應 | 唯一未推的檔案 |

## MEMORY.md 獨有資訊（其餘已被 CLAUDE.md 覆蓋）

1. **Desktop App 大檔問題**：Large session files (>10MB) cause "Failed to load session" in Claude desktop app
2. **Gamma 退訂**：Gamma 已退訂（難用），AI 工具清單中應移除
3. **記憶檔流程規則**：討論結論經 /暫存 指令生成的檔案 = 建議書，不是定案；正式寫入前需先評估
4. **docx 套件版本**：docx 9.5.2（用於 .docx 文件生成）
5. **Agent Team 設定細節**：Windows 使用 in-process 模式（Shift+Up/Down 切換 agent）
6. **開發計畫書 v4.0**：`docs/開發計畫書_v4.0_提案寫作駕駛艙版.docx`（已生成）

## ~~待處理：settings.json 清理~~ ✅ 已完成（2026-02-19）

已清理 18 條過期 OneDrive 路徑規則（從 123 條減為 105 條）。

## ~~待處理：舊記憶目錄刪除~~ ✅ 已完成（2026-02-19）

`~/.claude/projects/C--Users-gary2-OneDrive----cc--/` 已整個刪除。

## 結論

舊記憶檔已全數遷移完畢。新專案的記憶目錄為 `~/.claude/projects/C--dev-cc--/memory/`。
