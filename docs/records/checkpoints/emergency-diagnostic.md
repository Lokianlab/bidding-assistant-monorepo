# 應急診斷手冊 — Checkpoint 用

**準備者**：JDNE
**日期**：2026-02-23 21:00
**用途**：當某機卡住時，快速診斷根因並決定對策

---

## 快速診斷樹

### 情況 A：某機無進度（0% 完成）

**第 1 步：確認是否收到工作包**

```bash
ls -lh docs/work-packages/*.md | grep -i {機器代號}
```

- ✅ 檔案存在 → 進入「規格理解」診斷
- ❌ 檔案不存在 → 重新發送工作包

**第 2 步：確認環境是否就緒**

```bash
npm run build 2>&1 | tail -20
```

- ✅ 成功 → 進入「編碼卡點」診斷
- ❌ 失敗 → 根據錯誤類型進入「環變問題」或「依賴問題」診斷

**第 3 步：確認規格是否清晰**

- 機器回報：「規格不清楚」
  → JDNE 直接釐清（無需等 Jin）
  → 更新工作包備註
  → 機器重新開始編碼

- 機器回報：「不知道該做什麼」
  → 確認是否讀了工作包
  → 讀完後按「快速開始」小節做

---

### 情況 B：某機進度卡在中途（20-80% 之間）

**第 1 步：確認卡在哪個環節**

```bash
git log --oneline --since="6 hours ago" | grep {機器名}
```

- 有新 commit → 卡在 API 實作或測試階段
- 無新 commit → 卡在環境或架構決策

**第 2 步：查看最新 commit message**

```bash
git log -1 --format="%B" {last-commit-hash}
```

分析 commit message：
- `feat`：在寫功能，進度正常 → 不是卡點
- `WIP` 或 `draft`：正在探索，需要支援或決策
- `test`：在補測試，進度正常
- 長時間無 commit → 確實卡住，需要診斷

**第 3 步：根據模組診斷**

**若是 ITEJ（M02 KB 後端）卡點**：
- 環變檢查：`echo $SUPABASE_SERVICE_ROLE_KEY | wc -c`（應 > 100）
- Supabase 連線：測試 POST /api/kb/upload 端點
- 若卡在 RLS 隔離：查 Supabase schema，確認 policy 邏輯

**若是 AINL（M02 KB 前端）卡點**：
- API contract 檢查：`grep -r "POST.*kb" src/app/api/` 看 ITEJ API 是否完成
- Hook 實作檢查：確認 useKBSearch 的 fetch 邏輯是否與 API 匹配
- 若卡在 Hook 邏輯：提供範例或直接修改

**若是 Z1FV（M08/M10）卡點**：
- API routes 結構檢查：`find src/app/api/m08 -type f | wc -l`
- 若缺少某個 route：確認工作包優先序，優先完成 API 再做 Hook/UI
- 若是測試問題：提供測試範例

**若是 3O5L（M11）卡點**：
- 依賴檢查：ITEJ/AINL M02 是否已完成基礎
- 邏輯卡點：success-pattern-matcher.ts 是否卡在算法設計
- 若卡在邏輯：提供 pseudo code 或決策支援

**若是 A44T（00A）卡點**：
- 文檔優先：確認規範文檔（00A-team-resources.md）是否已啟動
- 若卡在規範編寫：提供大綱或決策指導
- 若卡在 matcher 邏輯：提供算法參考

---

## 對策速查表

| 卡點類型 | 表現 | 對策 |
|---------|------|------|
| **環變缺失** | build fail + "env not found" | 檢查 .env.local，補充 mock 值 |
| **API 依賴未完成** | 前端無法調用 | 查 ITEJ 進度，若落後則推遲前端集成 |
| **規格不清** | 機器提問 | JDNE 直接釐清（無需等 Jin） |
| **測試難寫** | API 完成但測試卡 | 提供相同模組的測試範例 |
| **時間不夠** | 無法在截止前完成 | 評估是否延期（需 Jin 批准） |
| **模組衝突** | 兩台搶同模組 | JDNE 協調分工（此 session 無此問題） |
| **npm build fail** | 編譯錯誤 | 檢查 TypeScript 型別或依賴版本 |

---

## 快速開始（給卡住的機器用）

若某機無從下手，JDNE 提供的快速清單：

### M02（ITEJ/AINL）

```bash
# ITEJ 第一步
mkdir -p src/app/api/kb/upload
# 編寫 route.ts：處理 POST /api/kb/upload

# AINL 第一步
mkdir -p src/lib/hooks
# 編寫 use-kb-search.ts：定義 Hook 介面
```

### M08/M10（Z1FV）

```bash
# 優先編寫 API routes（3 個）
mkdir -p src/app/api/m08
mkdir -p src/app/api/m10
# 逐個完成 route.ts

# 再做 Hook
mkdir -p src/lib/hooks
# 編寫 use-m08-presentation.ts 和 use-m10-contract-management.ts
```

### M11（3O5L）

```bash
# 先編寫邏輯函式
cat > src/lib/success-pattern-matcher.ts << 'EOF'
// Pattern detection logic
export function calculateSuccessScore(factors: SuccessFactors): number {
  // TODO: implement
}
EOF
```

### 00A（A44T）

```bash
# 優先編寫規範文檔
mkdir -p docs/dev-plan
cat > docs/dev-plan/00A-team-resources.md << 'EOF'
# 00A 外部資源規範

## 技能矩陣
...
EOF
```

---

## 若 Checkpoint 發現多機卡點

**決策流程**：

1. **若 1-2 個卡點**：JDNE 直接解決或推遲
2. **若 ≥3 個卡點**：升級給 Jin，暫停推進，評估是否調整策略

---

## 聯繫清單

**若某機卡住，JDNE 應立即**：

1. 讀機器快照和最新 commit
2. 按診斷樹找根因
3. 執行對策（或請機器執行）
4. 記錄到 OP（含根因 + 對策）

**機器的責任**：
- 卡住立即報告（不要悶著）
- 提供錯誤訊息全文
- 說明已經嘗試過什麼

---

**最後更新**：2026-02-23 21:00
**下次更新**：2026-02-24 checkpoint 後（若有新卡點類型）

