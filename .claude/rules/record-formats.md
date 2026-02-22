# 記錄格式規則（精簡版）

完整範例見 `docs/records/format-reference.md`（按需 Read，不自動載入）。

## 核心規則

- **OP 只記例外**：失敗、意外、重要決策、教訓。成功靠 commit message。
- **Commit 格式**：`[type] 一句話（機器碼）`。type = feat/fix/test/review/infra/admin。
- **快照標記**：`[ ]` 待做 `[>]` 進行中 `[x]` 完成 `[?]` 未決 `[~]` 放棄（附理由）。
- **快照時間戳**：日期從 system prompt `currentDate`，時分用 `powershell -c "Get-Date -Format 'HHmm'"`。禁止估算。
- **快照更新**：讀舊 → [x]/[~] 遷 archive → 逐項更新 → 加新 → Write 覆蓋。
- **[>] 補測試粒度**：連續多天同檔 → 描述標檔名避碰撞。一次性不需要。
- **完成標準**：L1 test+build; L2 +非作者審查; L3 +Jin 確認。
- **審查結果**：`[x] review-{模組}|PASS：{N} issues，{M} fixed，{K} deferred`，deferred 掛快照行。
- **索引格式**：`{topic}|{狀態}|{一句話}|{出處}|{日期}`。狀態：進行中/完成/已被取代/已放棄。
- **訊息格式**：`MSG|{日期時間}|{寄件人}|to:{收件人}`，內容用壓縮短格式。收件人=機器碼或 ALL。
- **訊息收發**：Write→push 寄出；SessionStart hook 自動掃描收件匣；已讀搬 archive/。
- **機器間語言**：快照/訊息/OP 用壓縮英文短格式。面對人類才用自然中文。
- **三層檢索**：索引（是什麼）→ 回報（為什麼）→ OP（原始細節）。從上往下查。
- **修正**：不改原檔，寫新 OP 提及原記錄日期和 topic。
- **寫入前檢查**：commit message 說得清楚嗎？說得清就不用寫 OP。
