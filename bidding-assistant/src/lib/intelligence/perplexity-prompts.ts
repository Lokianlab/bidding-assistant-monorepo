// ====== Perplexity 搜尋提示產生器 ======
// 產生三輪假設驅動的搜尋提示，引導使用者透過 Perplexity 蒐集情報。
// 所有提示內容為繁體中文。

import { formatBudget } from "./helpers";
import type {
  AgencyHistoryData,
  CompetitorData,
  PerplexityPrompt,
} from "./types";

/**
 * 產生三輪 Perplexity 搜尋提示。
 *
 * 第一輪：競爭對手與機關關係調查
 * 第二輪：評委背景與市場脈絡
 * 第三輪：標案策略意涵
 *
 * 每則提示結構：已知線索 → 假設 → 調查指示 → 意外發現欄位
 */
export function generatePrompts(
  caseTitle: string,
  agency: string,
  budget: number | null,
  agencyHistory: AgencyHistoryData,
  competitors: CompetitorData,
): PerplexityPrompt[] {
  const prompts: PerplexityPrompt[] = [];

  prompts.push(
    buildRound1(caseTitle, agency, agencyHistory, competitors),
  );
  prompts.push(
    buildRound2(caseTitle, agency, budget, agencyHistory),
  );
  prompts.push(
    buildRound3(caseTitle, agency, budget, agencyHistory, competitors),
  );

  return prompts;
}

// ====== 第一輪：競爭對手－機關關係 ======

function buildRound1(
  caseTitle: string,
  agency: string,
  history: AgencyHistoryData,
  competitors: CompetitorData,
): PerplexityPrompt {
  const topCompetitors = competitors.competitors.slice(0, 3);
  const competitorNames = topCompetitors.map((c) => c.name).join("、");

  const competitorDetails = topCompetitors
    .map((c) => {
      const parts = [`${c.name}（得標 ${c.win_count} 次`];
      if (c.consecutive_years > 0) {
        parts.push(`連續 ${c.consecutive_years} 年`);
      }
      if (c.specializations.length > 0) {
        parts.push(`專長：${c.specializations.join("、")}`);
      }
      return parts.join("，") + "）";
    })
    .join("\n  - ");

  const topWinnerInfo = history.top_winners[0]
    ? `最常得標廠商「${history.top_winners[0].name}」共 ${history.top_winners[0].win_count} 次，連續 ${history.top_winners[0].consecutive_years} 年。`
    : "無明顯常勝廠商。";

  const prompt = `你是一位政府標案情報分析師。請針對以下案件進行競爭對手與機關關係的深度調查。

【標案資訊】
案名：${caseTitle}
機關：${agency}

【已知線索】
1. ${agency}過去共有 ${history.total_cases} 筆決標紀錄。
2. ${topWinnerInfo}
3. 主要競爭對手：
  - ${competitorDetails || "尚未辨識出明確競爭對手"}

【假設】
- 假設 H1：${competitorNames || "某些廠商"}與${agency}之間可能有長期合作關係或人脈連結。
- 假設 H2：常勝廠商可能在該機關有獨特的服務優勢或在地經驗。

【調查指示】
1. 搜尋上述競爭對手的公司背景、近年得標新聞、與${agency}的公開互動紀錄。
2. 查詢這些廠商的其他政府標案得標紀錄，判斷其核心業務與優勢領域。
3. 分析這些廠商在同類型案件中的評價或案例分享。

【意外發現】
如果在搜尋過程中發現：
- 廠商近期有重大變動（合併、負責人更換、財務問題）
- 與機關有非業務往來（捐款、參與諮詢委員會等）
- 有相關的爭議或申訴紀錄
請一併記錄，這些資訊可能影響評估判斷。`;

  return {
    round: 1,
    title: "第一輪：競爭對手與機關關係調查",
    prompt,
    purpose: "調查主要競爭對手與機關的關係深度，判斷是否存在難以突破的既有優勢。",
  };
}

// ====== 第二輪：評委背景與市場脈絡 ======

function buildRound2(
  caseTitle: string,
  agency: string,
  budget: number | null,
  history: AgencyHistoryData,
): PerplexityPrompt {
  const budgetStr = budget ? formatBudget(budget) : "未公開";
  const avgBidders =
    history.cases.length > 0
      ? (
          history.cases.reduce((sum, c) => sum + c.bidder_count, 0) /
          history.cases.length
        ).toFixed(1)
      : "不明";

  const recentCases = history.cases
    .slice(0, 5)
    .map((c) => `「${c.title}」（${c.award_date}，得標：${c.winner_name || "不明"}）`)
    .join("\n  - ");

  const prompt = `你是一位政府標案情報分析師。請針對以下案件的評委背景與市場脈絡進行調查。

【標案資訊】
案名：${caseTitle}
機關：${agency}
預算金額：${budgetStr}
機關歷史平均投標家數：${avgBidders} 家

【已知線索】
1. ${agency}近期案件：
  - ${recentCases || "無近期案件紀錄"}
2. 此機關歷史上共有 ${history.total_cases} 筆決標紀錄。

【假設】
- 假設 H1：此機關的評委組成（學者 vs 機關代表比例）會影響評選風格與偏好。
- 假設 H2：此案可能與特定政策方向或計畫有關，了解背景有助於對齊評委期待。

【調查指示】
1. 搜尋${agency}的組織架構、主管層級、近期施政重點或新聞。
2. 查詢此機關或同類型案件曾出現的評選委員名單（公開資訊，如決標公告、政府公報）。
3. 搜尋案名相關的政策背景：「${caseTitle}」是否隸屬於更大的施政計畫？有無相關法規、預算編列。
4. 了解此領域的市場行情：同類案件的預算規模、常見的服務範圍與交付標準。

【意外發現】
如果在搜尋過程中發現：
- 機關主管近期異動或組織調整
- 與此案相關的民意、輿論或政治動態
- 前期案件的執行爭議或媒體報導
請一併記錄。`;

  return {
    round: 2,
    title: "第二輪：評委背景與市場脈絡",
    prompt,
    purpose: "了解機關的決策風格、評委偏好與案件的政策脈絡，為簡報方向定調。",
  };
}

// ====== 第三輪：策略意涵 ======

function buildRound3(
  caseTitle: string,
  agency: string,
  budget: number | null,
  history: AgencyHistoryData,
  competitors: CompetitorData,
): PerplexityPrompt {
  const budgetStr = budget ? formatBudget(budget) : "未公開";

  const topCompetitor = competitors.competitors[0];
  const competitorInfo = topCompetitor
    ? `主要競爭對手「${topCompetitor.name}」已在 ${topCompetitor.other_agencies.length} 個其他機關布局，專長：${topCompetitor.specializations.join("、") || "綜合型"}`
    : "尚未辨識出明確的主要競爭對手";

  const topWinner = history.top_winners[0];
  const incumbentInfo = topWinner
    ? `現任得標者「${topWinner.name}」，連續得標 ${topWinner.consecutive_years} 年`
    : "無明顯現任得標者";

  const prompt = `你是一位政府標案策略顧問。請根據前兩輪蒐集的情報，綜合分析此案的策略意涵。

【標案資訊】
案名：${caseTitle}
機關：${agency}
預算金額：${budgetStr}

【前兩輪情報摘要】
1. 機關端：${agency}共有 ${history.total_cases} 筆歷史案件。${incumbentInfo}。
2. 競爭端：${competitorInfo}。

【假設】
- 假設 H1：此案的規格書可能存在對現任廠商有利的隱性門檻或加分條件。
- 假設 H2：新進廠商需要展現差異化優勢，而非僅價格競爭。

【調查指示】
1. 搜尋此案或同名稱案件的過往招標公告、規格書公開內容，分析是否有「量身訂做」的跡象。
2. 查詢此案所屬領域的產業趨勢：有無新技術、新法規、新政策可能改變遊戲規則？
3. 搜尋機關對此案的公開說明或先期規劃文件。
4. 分析得標對公司的策略意義：
   - 是否開拓新客戶/新領域？
   - 與現有業務的綜效？
   - 後續延伸案件的可能性？

【意外發現】
如果在搜尋過程中發現：
- 此案有延續性（前一期是誰做的？成效如何？）
- 有廠商在公開場合表達對此案的興趣
- 此領域正在發生典範轉移或政策大轉向
請一併記錄，這些資訊對投標策略至關重要。`;

  return {
    round: 3,
    title: "第三輪：策略意涵與投標方向",
    prompt,
    purpose: "綜合前兩輪情報，判斷投標的策略價值與差異化方向。",
  };
}
