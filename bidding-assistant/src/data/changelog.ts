export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: "feature" | "fix" | "improve" | "breaking";
    description: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "2026-02-16",
    title: "自訂儀表板佈局 + 系統日誌",
    changes: [
      { type: "feature", description: "儀表板卡片可自由拖曳排列和調整大小" },
      { type: "feature", description: "支援 8 種圖表顯示方式（數字、圓環、長條圖、折線圖、儀表盤、迷你表格、堆疊圖、熱力圖）" },
      { type: "feature", description: "自訂卡片可自由組合統計指標與顯示方式" },
      { type: "feature", description: "新增更新日誌面板" },
      { type: "feature", description: "新增除錯日誌面板（含篩選、搜尋、匯出）" },
      { type: "improve", description: "開發規範強化：閉環開發流程、模組化結構規範" },
      { type: "improve", description: "新增 vitest 測試框架" },
    ],
  },
  {
    version: "1.0.0",
    date: "2025-12-01",
    title: "初始版本",
    changes: [
      { type: "feature", description: "備標指揮部儀表板（多視圖：表格、看板、日曆）" },
      { type: "feature", description: "提示詞組裝系統（L1-L8 八階段 AI 工作流）" },
      { type: "feature", description: "五類知識庫管理（團隊、實績、時程、SOP、檢討）" },
      { type: "feature", description: "品質檢查工具（禁用詞、術語修正、鐵律驗證）" },
      { type: "feature", description: "報價驗算工具" },
      { type: "feature", description: "文件生成框架" },
      { type: "feature", description: "績效分析（交叉矩陣、成本分析、年度對比）" },
      { type: "feature", description: "Notion API 整合（讀取標案資料庫）" },
      { type: "feature", description: "SmugMug 照片庫整合" },
      { type: "feature", description: "六頁設定管理系統" },
    ],
  },
];
