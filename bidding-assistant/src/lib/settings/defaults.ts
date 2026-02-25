import type { AppSettings } from "./types";
import { KB_MATRIX } from "@/data/config/kb-matrix";
import { STAGES } from "@/data/config/stages";
import { DEFAULT_DASHBOARD_LAYOUT } from "@/lib/dashboard/card-layout/defaults";
import { DEFAULT_SEARCH_KEYWORDS } from "@/lib/scan/constants";

export const DEFAULT_SETTINGS: AppSettings = {
  document: {
    fonts: {
      body: "標楷體",
      heading: "標楷體",
      headerFooter: "標楷體",
      customFonts: [],
    },
    fontSize: {
      body: 12,
      h1: 18,
      h2: 16,
      h3: 14,
      h4: 13,
    },
    page: {
      size: "A4",
      margins: { top: 1, bottom: 1, left: 1, right: 1 },
      lineSpacing: 1.5,
      paragraphSpacing: { before: 0, after: 6 },
    },
    header: { template: "{{案名}} — {{章節名}}" },
    footer: { template: "{{公司名}} | 第 {{頁碼}} 頁" },
    driveNamingRule: "BID-{{唯一碼}}({{民國年}}.{{月}}.{{日}}){{案名}}",
  },
  connections: {
    notion: {
      token: process.env.NEXT_PUBLIC_NOTION_TOKEN ?? "",
      databaseId: process.env.NEXT_PUBLIC_NOTION_DATABASE_ID ?? "",
    },
    googleDrive: {
      refreshToken: "",
      sharedDriveFolderId: "",
    },
    smugmug: {
      apiKey: "",
      apiSecret: "",
      accessToken: "",
      tokenSecret: "",
    },
  },
  company: {
    name: "大員洛川顧問有限公司",
    taxId: "",
    brand: "大員洛川",
  },
  modules: {
    kbMatrix: { ...KB_MATRIX },
    qualityRules: {
      blacklist: [
        "豐富的經驗", "盡最大努力", "全方位", "一站式",
        "客製化", "最佳化", "高品質", "高效率",
        "專業的團隊", "完善的", "積極", "確保",
        "致力於", "竭誠", "優質", "卓越",
        "創新", "務實", "用心", "深耕",
        "精準", "即時", "靈活", "彈性",
      ],
      terminology: [
        { wrong: "貴單位", correct: "貴機關" },
        { wrong: "執行專案", correct: "履約" },
        { wrong: "結案報告", correct: "成果報告" },
        { wrong: "合約", correct: "契約" },
        { wrong: "廠商", correct: "受託單位" },
        { wrong: "專案經理", correct: "計畫主持人" },
        { wrong: "報告書", correct: "成果報告書" },
      ],
      ironLawEnabled: {
        crossValidateNumbers: true,
        budgetConsistency: true,
        dateConsistency: true,
        teamConsistency: true,
        scopeConsistency: true,
      },
      customRules: [],
    },
    pricing: {
      taxRate: 0.05,
      managementFeeRate: 0.1,
      marketRates: {},
    },
    negotiation: {
      minMargin: 0.05,       // 5%
      expectedMargin: 0.15,  // 15%
      idealMargin: 0.20,     // 20%
      maxMargin: 0.30,       // 30%
    },
  },
  yearlyGoal: 0,
  qualityGate: {
    gates: { factCheck: true, requirementTrace: true, feasibility: true },
    factCheckThreshold: 3,
    feasibilityMarginMin: 10,
    overallPassThreshold: 70,
    overallRiskThreshold: 50,
  },
  output: {
    defaultTemplate: "proposal-standard",
    customTemplates: [],
    recentExports: [],
    kbAutoSuggest: true,
  },
  scan: {
    searchKeywords: [...DEFAULT_SEARCH_KEYWORDS],
  },
  budgetTiers: [
    { name: '小型', maxAmount: 500_000 },
    { name: '中型', maxAmount: 2_000_000 },
    { name: '大型', maxAmount: 5_000_000 },
    { name: '旗艦', maxAmount: null },
  ],
  dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
  workflow: {
    stages: STAGES.map((s) => ({
      id: s.id,
      name: s.name,
      triggerCommand: s.triggerCommand,
      guidanceText: "",
    })),
    autoStatusRules: [
      {
        id: "l1-complete",
        trigger: "L1_complete",
        actions: [
          { property: "分析作業完成", value: true },
          { property: "AI階段", value: "L2" },
        ],
        enabled: true,
      },
      {
        id: "l2-complete",
        trigger: "L2_complete",
        actions: [{ property: "AI階段", value: "L3" }],
        enabled: true,
      },
      {
        id: "l3-complete",
        trigger: "L3_complete",
        actions: [{ property: "AI階段", value: "L4" }],
        enabled: true,
      },
      {
        id: "l4-complete",
        trigger: "L4_complete",
        actions: [
          { property: "備標進度", value: ["建議書完稿"] },
          { property: "AI階段", value: "L5" },
        ],
        enabled: true,
      },
      {
        id: "l5-complete",
        trigger: "L5_complete",
        actions: [{ property: "AI階段", value: "L6" }],
        enabled: true,
      },
      {
        id: "l6-complete",
        trigger: "L6_complete",
        actions: [{ property: "AI階段", value: "L7" }],
        enabled: true,
      },
      {
        id: "l7-complete",
        trigger: "L7_complete",
        actions: [{ property: "AI階段", value: "L8" }],
        enabled: true,
      },
      {
        id: "l8-complete",
        trigger: "L8_complete",
        actions: [{ property: "AI階段", value: "完成" }],
        enabled: true,
      },
    ],
    viewOverrides: {},
    customViews: [],
  },
};
