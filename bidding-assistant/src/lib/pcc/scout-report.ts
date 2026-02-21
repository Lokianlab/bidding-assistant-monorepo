import { formatAmount } from "./helpers";
import type { TenderSummary } from "./types";

interface AgencyContext {
  totalCases: number;
  incumbents: { name: string; wins: number }[];
  myHistory: { title: string; date: number; won: boolean }[];
}

interface ScoutReportInput {
  /** 標案基本資料 */
  title: string;
  agency: string;
  jobNumber: string;
  /** 標案詳情（如有） */
  summary: TenderSummary | null;
  /** 機關情報（如有） */
  agencyIntel: AgencyContext | null;
  /** 已知的競爭對手名單（如有） */
  competitors: string[];
}

/**
 * 產生 P 偵察報告 prompt（可直接貼進 Perplexity）
 *
 * 設計原則：
 * - 硬數據由系統預填，Perplexity 只需查軟情報
 * - prompt 用中文，因為搜尋對象是台灣政府機關
 * - 結構化讓 AI 知道哪些已知、哪些要查
 */
export function generateScoutPrompt(input: ScoutReportInput): string {
  const sections: string[] = [];

  // === 開頭指令 ===
  sections.push(
    `我正在評估是否要投以下政府標案，請幫我做投標前的情報偵察。`,
    `以下「已知資訊」是我從政府採購網取得的硬數據，不需要再查。請專注在「待查項目」。`,
  );

  // === 已知資訊 ===
  const known: string[] = [];
  known.push(`案名：${input.title}`);
  known.push(`招標機關：${input.agency}`);
  known.push(`案號：${input.jobNumber}`);

  if (input.summary) {
    const s = input.summary;
    if (s.budget !== null) known.push(`預算金額：${formatAmount(s.budget)}`);
    if (s.awardAmount !== null) known.push(`決標金額：${formatAmount(s.awardAmount)}`);
    if (s.bidderCount !== null) known.push(`投標家數：${s.bidderCount} 家`);
    if (s.awardMethod) known.push(`決標方式：${s.awardMethod}`);
    if (s.procurementType) known.push(`採購類別：${s.procurementType}`);
    if (s.floorPrice !== null && s.budget !== null) {
      const ratio = ((s.floorPrice / s.budget) * 100).toFixed(1);
      known.push(`底價/預算比：${ratio}%`);
    }
  }

  if (input.agencyIntel) {
    const intel = input.agencyIntel;
    known.push(`此機關近期決標案件：${intel.totalCases} 筆`);
    if (intel.incumbents.length > 0) {
      const top = intel.incumbents.slice(0, 3).map(
        (i) => `${i.name}（${i.wins} 次得標）`,
      );
      known.push(`在位者：${top.join("、")}`);
    }
    if (intel.myHistory.length > 0) {
      const wins = intel.myHistory.filter((h) => h.won).length;
      known.push(`我方在此機關紀錄：${wins}/${intel.myHistory.length} 得標`);
    }
  }

  if (input.competitors.length > 0) {
    known.push(`已知可能競爭對手：${input.competitors.slice(0, 5).join("、")}`);
  }

  sections.push("");
  sections.push("## 已知資訊");
  sections.push(known.join("\n"));

  // === 待查項目 ===
  sections.push("");
  sections.push("## 請幫我查以下項目");
  sections.push("");

  const queries = [
    `1. **機關背景**：${input.agency}的組織定位、近期重點政策方向、相關首長或承辦人異動`,
    `2. **案件脈絡**：這個案子的政策背景，是新案還是延續案？前幾年有沒有類似的案子？執行成效如何？`,
    `3. **甲方偏好**：${input.agency}過去類似案件的執行廠商風格（偏好在地/全國、大公司/小團隊、學術/業界）`,
  ];

  if (input.competitors.length > 0) {
    queries.push(
      `4. **競爭對手情報**：${input.competitors.slice(0, 3).join("、")}這幾家公司的近況（最近有沒有類似案子、公司規模、專長）`,
    );
    queries.push(
      `5. **勝算評估**：根據以上資訊，我方投標的優勢和劣勢分析，以及建議的切入角度`,
    );
  } else {
    queries.push(
      `4. **潛在對手**：這類案子通常會有哪些類型的廠商來投？有沒有已知的強勢競爭者？`,
    );
    queries.push(
      `5. **勝算評估**：根據以上資訊，投標的機會和風險評估，以及建議的切入角度`,
    );
  }

  sections.push(queries.join("\n"));

  // === 輸出要求 ===
  sections.push("");
  sections.push("## 輸出要求");
  sections.push(
    "- 每個項目用 2-3 段話回答，附上資訊來源\n" +
    "- 如果某項資訊查不到，直接說查不到，不要編造\n" +
    "- 最後給一個「投標建議」的結論段落（建議投/不建議投/需要更多資訊）",
  );

  return sections.join("\n");
}

/**
 * 從案件詳情頁面的所有已有資訊組裝 ScoutReportInput
 */
export function buildScoutInput(params: {
  title: string;
  agency: string;
  jobNumber: string;
  summary: TenderSummary | null;
  agencyIntel: AgencyContext | null;
  competitorNames: string[];
}): ScoutReportInput {
  return {
    title: params.title,
    agency: params.agency,
    jobNumber: params.jobNumber,
    summary: params.summary,
    agencyIntel: params.agencyIntel,
    competitors: params.competitorNames,
  };
}
