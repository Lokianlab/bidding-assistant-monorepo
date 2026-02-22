# KB 初始化執行計劃

> 待 Jin 授權後，按此計劃逐步執行知識庫初始化。本文檔描述具體執行步驟。

## 前置檢查

### 1. 驗證授權

```bash
# 確認 Jin 已明確授權以下三項：
# 1. 導入範圍（D→E→C→B 全部或部分？）
# 2. 去重政策（Layer 1+2 還是額外 Layer 3？）
# 3. 回滾計劃已確認
```

### 2. 設置環境變數

```bash
# 在你的 shell 中設置（可加入 .bashrc 或臨時設置）
export KB_SOURCE="H:/共用雲端硬碟/專案執行中心"
export KB_IMPORT_AUTHORIZED=true
```

### 3. 檢查依賴

```bash
# 確認 Node.js 可用（Phase 1-2 腳本需要）
node --version  # 需要 v14+
npm --version   # 用於查看 logs 和報告
```

---

## Phase 1：快速層去重（1-2 分鐘）

### 目標
刪除所有檔名含「複製」標記的檔案，保留最新版本。

### 執行

**第 1 步：試運行**

```bash
cd tools/kb-import

# 試運行，查看會刪除哪些檔案
node phase1-dedup.js \
  --source "$KB_SOURCE/B. 備標集中區" \
  --dry-run \
  --output phase1-preview.log

# 檢查日誌
cat phase1-preview.log
```

**第 2 步：驗證清單**

檢查日誌中的「將刪除的檔案（前 10 個）」，確保沒有誤刪。如果發現問題，停止並聯絡 Jin。

**第 3 步：備份**

```bash
# 建立備份（以防萬一）
cp -r "$KB_SOURCE/B. 備標集中區" \
      "$KB_SOURCE/B.備標集中區-backup-$(date +%Y%m%d-%H%M%S)"

# 確認備份成功
du -sh "$KB_SOURCE/B.備標集中區-backup"*
```

**第 4 步：實際執行**

```bash
# 實際刪除（不可回復！）
node phase1-dedup.js \
  --source "$KB_SOURCE/B. 備標集中區" \
  --execute \
  --output phase1-result.log

# 查看結果
tail -30 phase1-result.log
```

### 驗證

```bash
# 檢查檔案計數
# 應該從 ~30,389 減少到 ~29,071（刪除 ~1,318 個）
find "$KB_SOURCE/B. 備標集中區" -type f | wc -l

# 備份貼 commit message
git add phase1-result.log
git commit -m "docs: KB Phase 1 dedup result - 1318 files removed"
```

---

## Phase 2：案件層去重（5-10 分鐘）

### 目標
按案件編號分組，每組內只保留修改時間最新的檔案。

### 執行

**第 1 步：試運行**

```bash
# 試運行，查看會保留哪些案件和刪除多少
node phase2-dedup.js \
  --source "$KB_SOURCE/B. 備標集中區" \
  --dry-run \
  --output phase2-preview.log

# 檢查分組統計
grep "清單準備\|獨立案件\|有重複版本" phase2-preview.log
```

**第 2 步：驗證分組邏輯**

```bash
# 隨機抽查 5 個案件，確認保留的是最新版本
# 查看日誌中「保留」和「刪除」的詳情
head -50 phase2-preview.log | grep "保留\|刪除"
```

**第 3 步：備份當前狀態**

```bash
# 備份 Phase 1 之後的狀態（以防 Phase 2 出現問題）
cp -r "$KB_SOURCE/B. 備標集中區" \
      "$KB_SOURCE/B.備標集中區-after-phase1-$(date +%Y%m%d-%H%M%S)"
```

**第 4 步：實際執行**

```bash
# 實際刪除
node phase2-dedup.js \
  --source "$KB_SOURCE/B. 備標集中區" \
  --execute \
  --output phase2-result.log

# 查看結果
tail -50 phase2-result.log
```

### 驗證

```bash
# 檢查檔案計數
# 應該從 ~29,071 減少到 ~25,000-26,000（刪除 ~3,000-4,000 個）
find "$KB_SOURCE/B. 備標集中區" -type f | wc -l

# 確認 git
git add phase2-result.log
git commit -m "docs: KB Phase 2 dedup result - case-level deduplication"
```

---

## Phase 3：內容層去重（可選，30 分鐘）

### 目標
使用 SHA-256 雜湊檢測完全相同的檔案（位元組級）。

### 何時執行
- 如果 Phase 1 + Phase 2 後的檔案計數仍然過多
- 或 Jin 指示必須達到特定數字

### 預期削減
5-10%（~1,500-2,500 個檔案）

### 成本
約 30 分鐘，取決於機器速度和磁碟 I/O

### 實現方式
參考 `KB-deduplication-strategy.md` 第 125-155 行的 Layer 3 描述。

---

## 回滾計劃

### 如果 Phase 1 失敗

```bash
# 還原 Phase 1 前的備份
rm -rf "$KB_SOURCE/B. 備標集中區"
cp -r "$KB_SOURCE/B.備標集中區-backup-*" \
      "$KB_SOURCE/B. 備標集中區"

# 重新檢查試運行
node phase1-dedup.js --dry-run ...
```

### 如果 Phase 2 失敗

```bash
# 還原 Phase 1 之後的狀態
rm -rf "$KB_SOURCE/B. 備標集中區"
cp -r "$KB_SOURCE/B.備標集中區-after-phase1-*" \
      "$KB_SOURCE/B. 備標集中區"

# 重新檢查試運行
node phase2-dedup.js --dry-run ...
```

### 完整回滾

```bash
# 回復到初始狀態（Phase 1 前）
rm -rf "$KB_SOURCE/B. 備標集中區"
cp -r "$KB_SOURCE/B.備標集中區-backup-*" \
      "$KB_SOURCE/B. 備標集中區"

# 刪除備份
rm -rf "$KB_SOURCE/B.備標集中區-backup-*"
rm -rf "$KB_SOURCE/B.備標集中區-after-phase1-*"
```

---

## 故障排除

### 問題：腳本執行出錯

**症狀**：`EACCES` 或 `ENOENT` 錯誤

**原因**：檔案權限不足或路徑錯誤

**解決方案**：
```bash
# 檢查路徑是否正確
ls "$KB_SOURCE/B. 備標集中區" | head

# 檢查讀寫權限
touch "$KB_SOURCE/B. 備標集中區/test-write.txt" && \
  rm "$KB_SOURCE/B. 備標集中區/test-write.txt" && \
  echo "✓ 有寫入權限"
```

### 問題：執行速度很慢

**症狀**：Phase 1 或 Phase 2 超過預期時間

**原因**：檔案系統繁忙或網路磁碟延遲

**解決方案**：
- 確認沒有其他程式存取該資料夾
- 如果是網路磁碟，檢查網路連線品質
- 嘗試在非繁忙時段（如晚間）執行

### 問題：不確定是否成功刪除

**檢查方式**：

```bash
# 查看日誌中的成功統計
grep "✓ 刪除完成\|實際刪除" phase1-result.log
grep "✓ 刪除完成\|實際刪除" phase2-result.log

# 確認檔案計數變化
# Phase 1 後應該看到 ~1,318 個減少
# Phase 2 後應該看到再減少 ~3,000 個
```

---

## 完成檢查清單

- [ ] Jin 授權三項確認（範圍、政策、回滾計劃）
- [ ] 環境變數設置
- [ ] 備份已建立
- [ ] Phase 1 試運行驗證
- [ ] Phase 1 實際執行完成
- [ ] Phase 1 結果已 commit
- [ ] Phase 2 試運行驗證
- [ ] Phase 2 實際執行完成
- [ ] Phase 2 結果已 commit
- [ ] 檔案計數達到預期
- [ ] 備份已安全保存或清理

---

## 下一步

完成 Phase 1 + Phase 2 後：

1. **掃描 D、E、C 資料夾**（如授權包含）
   - 每個資料夾用相同的 Phase 1 + Phase 2 流程
   - 預計 D folder：1-2 小時，E folder：2-4 小時，C folder：1-2 小時

2. **建立知識庫導入清單**
   - 列出 D、E、C、B 資料夾的最終檔案清單
   - 建立目錄索引（按資料夾、按類型）

3. **初始化知識庫資料庫**
   - 建立 00A - 00E 的資料結構
   - 匯入去重後的檔案

---

**準備時間**：2026-02-26
**執行者**：待 Jin 授權後由 AINL 或指定機器執行
**文檔維護**：AINL
