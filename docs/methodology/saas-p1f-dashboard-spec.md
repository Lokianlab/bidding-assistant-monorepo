# SaaS Phase 1f：登入頁面 + 多租戶儀表板 — 規格指令

> 狀態：待 A44T 承接確認
> 分派者：JDNE
> 優先序：P1（關鍵路徑）
> 目標完成日：2026-03-01（7 天）

---

## 一、任務概述

為 SaaS Web App 實裝登入頁面與多租戶儀表板。使用者透過 OAuth 登入後進入儀表板，可查看知識庫統計、最近上傳、同步狀態，並導航到 KB 管理和其他功能模組。

**依賴**：P1b OAuth ✅ 完成 + P1c KB API ✅ 完成 + P1d KB UI ✅ 完成
**被依賴**：無（P1 末端匯集點）
**協作方**：ITEJ（KB API 統計端點）、Z1FV（P1d KB UI 導航）、3O5L（P1e Notion 同步狀態）

---

## 二、功能清單

### 2.1 登入頁面

| 功能 | 說明 | 優先序 |
|------|------|--------|
| **Google OAuth 按鈕** | 紅白藍 Logo，點擊跳轉 OAuth flow | P0 |
| **Microsoft OAuth 按鈕** | MS 標誌，點擊跳轉 OAuth flow | P1（可選） |
| **品牌標誌 + 標語** | 頂部顯示應用名稱、標語 | P0 |
| **暗黑/淺色主題切換** | 登入頁主題偏好 | P2（可延後） |

### 2.2 儀表板首頁

| 模塊 | 內容 | 資料來源 | 優先序 |
|------|------|---------|--------|
| **歡迎區塊** | 「歡迎，{姓名}！」+ 租戶名稱 | User session | P0 |
| **知識庫統計卡片** | 文件總數、存儲大小、最後更新 | KB API | P0 |
| **最近上傳清單** | 最新 5 份文件，含上傳者、時間 | KB API | P1 |
| **同步狀態** | Notion 同步時間、狀態（成功/失敗/進行中） | P1e sync_logs | P1 |
| **快捷導航卡片** | KB 管理 / 設定 / 文件 | 導航 | P0 |
| **使用者卡片** | 頭像、帳號、登出按鈕 | User session | P0 |

### 2.3 導航系統

| 元素 | 位置 | 內容 | 優先序 |
|------|------|------|--------|
| **頂部導覽欄** | 應用名稱 + 使用者菜單 | 應用名稱、通知、使用者下拉菜單（設定、登出） | P0 |
| **側邊欄** | 左側固定/可摺疊 | Home、KB 管理、設定、（未來）日誌、報告 | P0 |
| **麵包屑** | 上方導軌 | 首頁 > 知識庫 | P1 |

---

## 三、技術決策

### 3.1 框架選型

| 技術 | 用途 | 決策 |
|------|------|------|
| Next.js 16 + React 19 | 框架 | ✅ 沿用現有棧 |
| TypeScript | 型別 | ✅ 強制使用 |
| Tailwind CSS 4 | 樣式 | ✅ 沿用 shadcn/ui |
| shadcn/radix-ui | UI 元件 | ✅ Card、Button、Dropdown、Avatar |
| React Context | 狀態 | User session context（與 P1b 共享） |

### 3.2 狀態管理

- **使用者 session**：來自 P1b OAuth，存入 React Context（`<SessionProvider>`）
- **儀表板資料**：useEffect + 伺服器端快取（30s TTL）
- **實時同步狀態**：polling（每 60s 檢查一次） + 可手動重新整理

### 3.3 頁面層級

```
/                    ← 登入頁面（無認證用戶）
/dashboard           ← 儀表板首頁（認證用戶）
/dashboard/kb        ← 導航到 /kb（P1d）
/dashboard/settings  ← 設定（備用，可延後 Phase 2）
```

---

## 四、實作指南

### 4.1 檔案結構

```
src/app/
  ├── auth/
  │   └── login/
  │       └── page.tsx           ← 登入頁面
  │
  ├── dashboard/
  │   ├── page.tsx               ← 儀表板首頁
  │   ├── layout.tsx             ← 儀表板佈局（導航）
  │   └── kb/
  │       └── page.tsx           ← 連接到 /kb（P1d）

src/lib/dashboard/
  ├── types.ts                   ← 儀表板相關型別
  ├── useDashboardData.ts        ← Hook：取得 KB 統計 + 同步狀態
  ├── helpers.ts                 ← 輔助函式（格式化日期、計算大小）

src/components/dashboard/
  ├── WelcomeSection.tsx         ← 歡迎區塊
  ├── KBStatsCard.tsx            ← 知識庫統計卡片
  ├── RecentUploadsCard.tsx      ← 最近上傳清單
  ├── SyncStatusCard.tsx         ← 同步狀態卡片
  ├── QuickNavCard.tsx           ← 快捷導航卡片
  ├── UserCard.tsx               ← 使用者卡片 + 登出
  ├── DashboardSidebar.tsx       ← 側邊欄導航
  ├── TopNavBar.tsx              ← 頂部導覽欄
  └── DashboardLayout.tsx        ← 儀表板佈局容器

src/components/auth/
  └── LoginPage.tsx              ← 登入頁面主體
```

### 4.2 核心元件

#### LoginPage.tsx
```typescript
export function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold">全能標案助理 SaaS</h1>
          <p className="text-sm text-muted-foreground">透過 OAuth 安全登入</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => signInWithGoogle()}
            className="w-full"
          >
            <GoogleIcon /> Google 登入
          </Button>
          <Button
            onClick={() => signInWithMicrosoft()}
            variant="outline"
            className="w-full"
          >
            <MicrosoftIcon /> Microsoft 登入（選用）
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### useDashboardData.ts
```typescript
export function useDashboardData() {
  const [stats, setStats] = useState<KBStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 同時呼叫 KB 統計 + 同步狀態
    Promise.all([
      fetch('/api/kb/stats').then(r => r.json()),
      fetch('/api/cron/sync-notion/status').then(r => r.json())
    ]).then(([s, sync]) => {
      setStats(s);
      setSyncStatus(sync);
      setLoading(false);
    });
  }, []);

  return { stats, syncStatus, loading };
}
```

---

## 五、整合點

### 5.1 與 P1b OAuth 的銜接

- OAuth callback 後設定 session，重導到 `/dashboard`
- JWT token 自動驗證進入 `/dashboard`
- 登出清除 session，重導回 `/auth/login`

### 5.2 與 P1c KB API 的銜接

- 統計卡片呼叫 `GET /api/kb/stats`（需 P1c 新增此端點）
- 最近上傳清單呼叫 `GET /api/kb/documents?limit=5`
- 所有請求自動帶 JWT token（middleware）

### 5.3 與 P1d KB UI 的銜接

- 側邊欄「知識庫」連結指向 `/kb`（Z1FV P1d 實作）
- 快捷導航「去管理」按鈕也指向 `/kb`

### 5.4 與 P1e Notion 同步的銜接

- 同步狀態卡片查詢最新的 sync_logs 表
- 顯示最後同步時間 + 狀態（✅ 成功 / ❌ 失敗 / ⏳ 進行中）
- 可選：「立即同步」按鈕手動觸發 `POST /api/cron/sync-notion`

---

## 六、測試清單

| 測試項 | 目標 | 預期結果 |
|--------|------|---------|
| **登入流程** | Google OAuth 登入 → 重導到儀表板 | 成功進入 `/dashboard`，session 有效 |
| **儀表板載入** | 訪問 `/dashboard` | KB 統計、同步狀態正確顯示 |
| **統計數據正確** | KB 文件數與 API 一致 | 數字匹配 |
| **同步狀態更新** | 觀察狀態變化 | 新同步後狀態及時更新 |
| **導航連結** | 點擊側邊欄各連結 | 正確跳轉到各頁面 |
| **登出流程** | 點擊登出 | session 清除，重導回 `/auth/login` |
| **權限隔離** | 直接訪問 `/dashboard`（無 token） | 重導回 `/auth/login` |
| **多租戶隔離** | 租戶 A 登入，查看統計 | 只看到租戶 A 的資料 |
| **響應式設計** | 桌面 / 平板 / 手機 | 版面適應各尺寸 |
| **暗黑主題** | 檢查樣式正確性 | 對比度良好，可讀 |

---

## 七、驗收標準

### 7.1 功能驗收

- [ ] Google OAuth 登入可成功進行
- [ ] Microsoft OAuth 登入可成功進行（或標記為可選）
- [ ] 登入後自動進入儀表板
- [ ] 儀表板顯示歡迎訊息、知識庫統計、最近上傳、同步狀態
- [ ] 側邊欄導航可正確跳轉到 `/kb` 和其他頁面
- [ ] 登出功能正常工作
- [ ] 未認證使用者無法直接訪問儀表板

### 7.2 安全驗收

- [ ] JWT token 正確驗證（無效 token 被擋掉）
- [ ] 多租戶隔離：租戶 A 無法看到租戶 B 的統計資料
- [ ] CSRF 防護正確
- [ ] 機密無洩漏（OAuth secret 不出現在前端）

### 7.3 測試驗收

- [ ] ≥20 個單元測試（登入流程、儀表板載入、導航各 5+）
- [ ] ≥10 個整合測試（完整登入到儀表板到 KB 管理流程）
- [ ] `npm test` PASS（無 skip）
- [ ] `npm run build` 成功

---

## 八、時程預估

| 里程碑 | 預計日期 | 完成 |
|--------|---------|------|
| 登入頁面 UI + OAuth 整合 | 2026-02-27 | — |
| 儀表板卡片元件開發 | 2026-02-28 | — |
| 導航系統 + 整合 P1d/P1e | 2026-03-01 | — |
| 測試 + 文件 + 統合驗收 | 2026-03-01 | — |

---

## 九、依賴和協作

### 9.1 上游依賴

- **P1a Supabase schema**：users / tenants 表結構 ✅ JDNE 完成
- **P1b OAuth 認證層**：session + JWT 管理 ⏳ A44T 進行中
- **P1c KB API**：6 個 KB 端點 + 多租戶隔離 ✅ ITEJ 完成
- **P1d KB UI**：`/kb` 頁面 ✅ Z1FV 完成
- **P1e Notion 同步**：sync_logs 表 + 狀態查詢 ⏳ 3O5L 進行中

### 9.2 新增 API 端點需求

P1c KB API 需補充以下端點（若尚未實作）：

- `GET /api/kb/stats` — 回傳 `{ totalDocuments, totalSize, lastUpdated }`
- `GET /api/kb/documents?limit=5` — 回傳最近 5 份文件（已有）
- `GET /api/cron/sync-notion/status` — 回傳最新同步狀態

### 9.3 協作檢查點

1. **與 P1b OAuth 確認**：session context 的介面和生命週期
   - session 何時建立、何時過期
   - token 刷新機制
   - 登出時清除內容

2. **與 P1c KB API 確認**：統計端點設計
   - `/api/kb/stats` 的回傳格式
   - 多租戶過濾是否自動施加

3. **與 P1d KB UI 確認**：導航連結設計
   - 儀表板到 `/kb` 的連結位置
   - 返回儀表板的連結位置

4. **與 P1e Notion 同步確認**：sync_logs 查詢介面
   - 最新狀態如何查詢
   - 同步進行中如何判斷

---

## 十、溝通窗口

- **統籌者**：JDNE（遇到阻塞或方案改變直接通知）
- **OAuth 依賴**：A44T（P1b）
- **KB API 依賴**：ITEJ（P1c）
- **KB UI 整合**：Z1FV（P1d）
- **同步狀態依賴**：3O5L（P1e）

---

## 十一、加分項（若時間充裕）

- [ ] 實時通知（新文件上傳時提示）
- [ ] 儀表板卡片自訂排列
- [ ] 統計圖表（檔案成長趨勢）
- [ ] 快速搜尋欄位（橫跨 KB）
- [ ] 使用者偏好設定（側欄收摺、主題）

---

> **版本**：v0.1
> **發布**：2026-02-23
> **分派者**：JDNE
> **待 A44T 確認承接**

---

## 附錄：設計參考

### 顏色方案
- 背景：`bg-background`（淺色模式：#ffffff，暗色模式：#0a0a0a）
- 卡片：`bg-card`
- 主題色：`text-primary`（藍色系，詳見 Tailwind 設定）
- 邊框：`border-border`

### 間距規範
- 頁面邊距：`px-8 py-8`
- 卡片間距：`gap-6`
- 卡片內部：`p-6`

### 字體規範
- 標題：`text-2xl font-bold`（儀表板標題）
- 副標題：`text-lg font-semibold`（卡片標題）
- 正文：`text-sm text-muted-foreground`

