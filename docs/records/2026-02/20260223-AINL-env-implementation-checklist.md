OP|20260223-1730|AINL|環變配置實施清單（若選方案 A）

# 環變配置實施清單 — 快速參考

**觸發條件**: Jin T+24h 決策選擇「現在配置真實 Supabase 環變」
**用時**: 5-10 分鐘全機同步完成
**責任**: JDNE 發佈 + 各機執行

---

## 實施步驟總表

| 步驟 | 執行者 | 操作 | 預期耗時 | 驗證 |
|------|--------|------|----------|------|
| 1 | Jin | 提供環變值 | <1 min | 確認 2 個值 ✓ |
| 2 | JDNE | 更新 .env.production | <1 min | grep 確認 |
| 3 | JDNE | git add + commit | <1 min | git log 確認 |
| 4 | JDNE | git push origin main | <1 min | 確認 remote 已更新 |
| 5 | 所有機器 | git pull | <1 min | 各機同步完成 |
| 6 | 所有機器 | npm run build | <5 min | 4.4s 成功 ✓ |
| 7 | 所有機器 | npm run test | <2 min | 3956 PASS ✓ |
| **合計** | | | **<15 min** | |

---

## 必要環變值

**Jin 需提供的 2 個值**：

```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

**檢查清單**：
- [ ] SUPABASE_URL 以 https:// 開頭
- [ ] SUPABASE_URL 不含密碼或密鑰
- [ ] SERVICE_ROLE_KEY 是完整的 JWT token（300+ 字元）
- [ ] 兩個值都非空

---

## JDNE 執行清單

### 1️⃣ 收集環變值（由 Jin 提供）
```bash
# 檢查清單
[ ] 收到 SUPABASE_URL
[ ] 收到 SERVICE_ROLE_KEY
[ ] 兩個值都驗證非空
```

### 2️⃣ 更新 .env.production
```bash
cd /c/dev/cc程式

# 方式 A：編輯檔案
nano .env.production

# 或方式 B：一次性輸入
cat > .env.production << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
EOF

# 驗證
cat .env.production
```

### 3️⃣ 提交並推送
```bash
git add .env.production
git commit -m "[infra] 環變配置：Supabase 真實環變（Jin 決策）"
git push origin main

# 驗證
git log --oneline -1
```

---

## 各機執行清單

### JDNE（協調）
```bash
[ ] git pull origin main
[ ] npm run build  # 預期 <5s
[ ] npm run test   # 預期 3956 PASS
[ ] 確認無錯誤，報告 AINL 環變已就位
```

### ITEJ（測試）
```bash
[ ] git pull origin main
[ ] npm run build  # 預期 <5s
[ ] npm run test   # 預期 3956 PASS
[ ] 驗證 Supabase 連線成功
[ ] 準備 P1 驗收執行（Option A/B）
```

### Z1FV（M02/M08）
```bash
[ ] git pull origin main
[ ] npm run build  # 預期 <5s
[ ] npm run test   # 預期 3956 PASS
[ ] 確認 KB API 路由正常運作
[ ] 準備 Phase 3 規劃同步
```

### A44T（M09/Phase 3）
```bash
[ ] git pull origin main
[ ] npm run build  # 預期 <5s
[ ] npm run test   # 預期 3956 PASS
[ ] 驗證 M09 談判分析功能
[ ] 準備 Phase 3 工作分解
```

### 3O5L（P1/M11）
```bash
[ ] git pull origin main
[ ] npm run build  # 預期 <5s
[ ] npm run test   # 預期 3956 PASS
[ ] 驗證多租戶隔離 RLS 正常
[ ] 準備 M11 實裝推進
```

### AINL（協調）
```bash
[ ] git pull origin main
[ ] npm run build  # 預期 <5s
[ ] npm run test   # 預期 3956 PASS
[ ] 監聽各機完成狀態
[ ] 轉發任何失敗報告給 JDNE
```

---

## 故障排除（快速參考）

### 若 build 失敗
```bash
# 1. 檢查環變值是否正確
cat .env.production

# 2. 清除快取並重新建置
rm -rf .next node_modules/.vite
npm run build

# 3. 若仍失敗，回到 mock 環變
git checkout .env.production
npm run build
```

### 若 test 失敗（某個特定測試）
```bash
# 1. 運行該測試看詳細錯誤
npm run test -- useCommitteeAnalysis

# 2. 檢查 Supabase 連線
curl -i "https://[your-project].supabase.co/rest/v1/"

# 3. 若是環變問題，rollback
git revert <commit-hash>
```

### 若連線超時
```bash
# 1. 驗證網路
ping supabase.co

# 2. 驗證 URL 格式
echo $NEXT_PUBLIC_SUPABASE_URL

# 3. 暫時回到 mock
git checkout .env.production
```

---

## 成功標誌

✅ **環變配置完成**當：
```
[✓] 所有機器 npm run build 成功（<5s）
[✓] 所有機器 npm run test PASS（3956 PASS）
[✓] git log 顯示環變 commit 已推送
[✓] 各機報告環變已同步
```

❌ **回滾條件**（自動）：
```
[✗] build 失敗 → git checkout .env.production
[✗] test 失敗 > 3956 → git revert
[✗] 連線超時 → 切回 mock 環變
```

---

## 時間表（若執行方案 A）

```
09:05 → Jin 提供環變值
09:06 → JDNE 更新 .env.production
09:07 → JDNE git push
09:08 → 各機 git pull
09:13 → 各機 npm run build 完成
09:15 → 各機 npm run test 確認
09:16 → 環變配置完成，進入 P1 驗收
```

**總耗時**: 10-15 分鐘

---

## 備份計畫（若配置失敗）

```
19:00 - 發現問題
19:02 - JDNE 回滾至 mock 環變
19:05 - 所有機器重新 build
19:07 - 確認環變已回滾，系統穩定
19:10 - 重新報告 Jin，建議延後配置至 P2
```

---

**準備完成。** 若 Jin 選擇方案 A，此清單可直接用於快速執行。預計 10-15 分鐘內所有機器配置完成並驗證通過。

