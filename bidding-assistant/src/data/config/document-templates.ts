import type { DocumentTemplate } from "@/lib/output/types";
import { TEMPLATE_IDS } from "@/lib/output/constants";

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: TEMPLATE_IDS.PROPOSAL_STANDARD,
    name: "標準建議書",
    description: "政府採購標案建議書，五章制（可依需求書自訂）",
    chapters: [
      {
        defaultTitle: "第壹章 專案理解與服務理念",
        required: true,
        suggestedLength: "2000-3000",
        kbSuggestions: ["00D"],
        guideText: "說明對本案的理解、服務宗旨與執行理念，展現對機關需求的掌握。",
      },
      {
        defaultTitle: "第貳章 工作計畫",
        required: true,
        suggestedLength: "3000-5000",
        kbSuggestions: ["00C"],
        guideText: "說明各項工作項目的執行方法、時程安排與里程碑。",
      },
      {
        defaultTitle: "第參章 執行團隊",
        required: true,
        suggestedLength: "1500-3000",
        kbSuggestions: ["00A", "00B"],
        guideText: "介紹計畫主持人及核心團隊成員的專長與相關經驗。",
      },
      {
        defaultTitle: "第肆章 相關實績",
        required: true,
        suggestedLength: "2000-4000",
        kbSuggestions: ["00B"],
        guideText: "列舉近年類似案件的執行成果，佐以具體數據或客戶評語。",
      },
      {
        defaultTitle: "第伍章 其他說明",
        required: false,
        suggestedLength: "500-1500",
        kbSuggestions: [],
        guideText: "補充說明：品質保證機制、風險管理、配合事項等。",
      },
    ],
    variables: [
      {
        key: "projectName",
        label: "案件名稱",
        source: "manual",
        defaultValue: "",
      },
      {
        key: "companyName",
        label: "公司名稱",
        source: "settings",
        defaultValue: "",
      },
      {
        key: "contactAgency",
        label: "招標機關",
        source: "manual",
        defaultValue: "",
      },
    ],
  },
  {
    id: TEMPLATE_IDS.PROPOSAL_SIMPLIFIED,
    name: "簡式建議書",
    description: "小型標案或勞務採購，精簡版三至五章",
    chapters: [
      {
        defaultTitle: "壹、服務說明",
        required: true,
        suggestedLength: "1000-2000",
        kbSuggestions: [],
        guideText: "簡述服務範圍與執行方式。",
      },
      {
        defaultTitle: "貳、執行團隊",
        required: true,
        suggestedLength: "800-1500",
        kbSuggestions: ["00A"],
        guideText: "主要成員簡介。",
      },
      {
        defaultTitle: "參、相關經驗",
        required: true,
        suggestedLength: "500-1500",
        kbSuggestions: ["00B"],
        guideText: "列舉 2-3 件相關實績。",
      },
    ],
    variables: [
      {
        key: "projectName",
        label: "案件名稱",
        source: "manual",
        defaultValue: "",
      },
      {
        key: "companyName",
        label: "公司名稱",
        source: "settings",
        defaultValue: "",
      },
    ],
  },
  {
    id: TEMPLATE_IDS.CUSTOM,
    name: "自訂",
    description: "自行定義章節結構",
    chapters: [],
    variables: [
      {
        key: "projectName",
        label: "案件名稱",
        source: "manual",
        defaultValue: "",
      },
      {
        key: "companyName",
        label: "公司名稱",
        source: "settings",
        defaultValue: "",
      },
    ],
  },
];

export const DEFAULT_TEMPLATE_ID = TEMPLATE_IDS.PROPOSAL_STANDARD;
