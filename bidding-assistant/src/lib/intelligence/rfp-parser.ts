// ====== RFP 服務建議書解析器 ======
// 將 RFP 文字內容透過 Claude CLI 解析為結構化資料。
// 若 CLI 不可用，提供 fallback 基本解析。

import { exec } from "child_process";
import { promisify } from "util";
import type { RFPSummaryData, ScoringItem } from "./types";

const execAsync = promisify(exec);

/** Claude CLI 指令最大輸出 buffer（10MB） */
const MAX_BUFFER = 10 * 1024 * 1024;

/**
 * 解析 RFP 文字內容為結構化資料。
 * 優先使用 Claude CLI（`claude -p`），失敗時 fallback 到正則解析。
 */
export async function parseRFPText(text: string): Promise<RFPSummaryData> {
  // 截斷過長的文字（Claude CLI 有 token 限制）
  const truncated = text.length > 50_000 ? text.slice(0, 50_000) : text;

  try {
    const prompt = buildRFPAnalysisPrompt(truncated);
    const response = await callClaudeCLI(prompt);
    return parseClaudeResponse(response);
  } catch {
    // Claude CLI 不可用，使用 fallback 解析
    return fallbackParse(truncated);
  }
}

/**
 * 建構 RFP 分析提示。
 * 指示 Claude 以 JSON 格式輸出結構化摘要。
 */
export function buildRFPAnalysisPrompt(rfpText: string): string {
  return `你是一位專業的政府標案分析師。請分析以下服務建議書（RFP）的內容，並以 JSON 格式輸出結構化摘要。

【輸出格式要求】
請嚴格以下列 JSON 格式回應，不要加任何其他文字或 markdown 標記：

{
  "title": "標案名稱",
  "budget": 預算金額（數字，單位：新臺幣元），
  "deadline": "截止日期（YYYY-MM-DD 格式）",
  "award_method": "決標方式（most_advantageous_eval / most_advantageous_review / lowest_price）",
  "scoring_items": [
    {
      "item": "評分項目名稱",
      "weight": 配分比重（數字），
      "description": "評分項目說明"
    }
  ],
  "key_requirements": ["關鍵需求1", "關鍵需求2"],
  "hidden_needs": ["隱藏需求1（從字裡行間推測的重點）"],
  "qualification_requirements": ["資格條件1", "資格條件2"]
}

【分析重點】
1. 標案名稱：精確擷取
2. 預算金額：轉為純數字（元）。若寫「300萬」則填 3000000
3. 截止日期：轉為 YYYY-MM-DD 格式
4. 決標方式：
   - 「最有利標」且有服務建議書評選 → most_advantageous_eval
   - 「最有利標」採書面審查 → most_advantageous_review
   - 「最低標」或價格評比 → lowest_price
5. 評分項目：列出所有評選配分項目及其比重
6. 關鍵需求：案件的核心要求（3-5 項）
7. 隱藏需求：從措辭、強調語氣、重複提及等線索推測機關特別在意的事項
8. 資格條件：投標廠商必須具備的條件（如經驗、證照、財務能力等）

【RFP 內容】
${rfpText}`;
}

/**
 * 解析 Claude CLI 的 JSON 回應。
 * 處理可能包含 markdown 程式碼區塊的情況。
 */
export function parseClaudeResponse(response: string): RFPSummaryData {
  // 嘗試提取 JSON（可能包在 ```json ... ``` 中）
  let jsonStr = response.trim();

  // 移除 markdown 程式碼區塊
  const jsonBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    jsonStr = jsonBlockMatch[1].trim();
  }

  // 嘗試找到第一個 { 和最後一個 }
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }

  const parsed: unknown = JSON.parse(jsonStr);

  // 型別驗證與安全轉換
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Claude 回應不是有效的 JSON 物件");
  }

  const obj = parsed as Record<string, unknown>;

  return {
    title: typeof obj.title === "string" ? obj.title : "",
    budget: typeof obj.budget === "number" ? obj.budget : 0,
    deadline: typeof obj.deadline === "string" ? obj.deadline : "",
    award_method: parseAwardMethod(obj.award_method),
    scoring_items: parseScoringItems(obj.scoring_items),
    key_requirements: parseStringArray(obj.key_requirements),
    hidden_needs: parseStringArray(obj.hidden_needs),
    qualification_requirements: parseStringArray(obj.qualification_requirements),
  };
}

// ====== 內部輔助函式 ======

/** 呼叫 Claude CLI */
async function callClaudeCLI(prompt: string): Promise<string> {
  // 使用 stdin 傳入 prompt 以避免 shell 跳脫問題
  const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, "\\n");

  const { stdout } = await execAsync(
    `echo "${escapedPrompt}" | claude -p --output-format text`,
    {
      maxBuffer: MAX_BUFFER,
      timeout: 120_000, // 2 分鐘超時
      env: { ...process.env },
    },
  );

  return stdout;
}

/** 解析決標方式字串 */
function parseAwardMethod(
  value: unknown,
): RFPSummaryData["award_method"] {
  if (typeof value !== "string") return "most_advantageous_eval";

  switch (value) {
    case "most_advantageous_eval":
    case "most_advantageous_review":
    case "lowest_price":
      return value;
    default:
      // 嘗試從中文推測
      if (value.includes("最低")) return "lowest_price";
      if (value.includes("審查")) return "most_advantageous_review";
      return "most_advantageous_eval";
  }
}

/** 安全解析評分項目陣列 */
function parseScoringItems(value: unknown): ScoringItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      item: typeof item.item === "string" ? item.item : "",
      weight: typeof item.weight === "number" ? item.weight : 0,
      description: typeof item.description === "string" ? item.description : "",
    }));
}

/** 安全解析字串陣列 */
function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

// ====== Fallback 解析（無 Claude CLI 時使用） ======

/**
 * 正則式 fallback 解析。
 * 從 RFP 文字中盡量提取結構化資訊。
 */
function fallbackParse(text: string): RFPSummaryData {
  return {
    title: extractTitle(text),
    budget: extractBudget(text),
    deadline: extractDeadline(text),
    award_method: extractAwardMethod(text),
    scoring_items: extractScoringItems(text),
    key_requirements: extractKeyRequirements(text),
    hidden_needs: [],
    qualification_requirements: extractQualifications(text),
  };
}

/** 提取標案名稱 */
function extractTitle(text: string): string {
  // 常見格式：「案名：XXX」或「標案名稱：XXX」
  const patterns = [
    /(?:案名|標案名稱|計畫名稱|專案名稱)[：:]\s*(.+)/,
    /(?:招標公告|招標書)[^]*?(?:案名|名稱)[：:]\s*(.+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().slice(0, 200);
  }

  return "";
}

/** 提取預算金額 */
function extractBudget(text: string): number {
  const patterns = [
    /(?:預算金額|預算|經費)[：:]\s*(?:新臺幣|NT\$?)?\s*([\d,]+)\s*(?:萬)?/,
    /(?:預算金額|預算|經費)[：:]\s*(?:新臺幣|NT\$?)?\s*([\d.]+)\s*萬/,
    /(?:預算金額|預算|經費)[：:]\s*(?:新臺幣|NT\$?)?\s*([\d.]+)\s*億/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      if (isNaN(num)) continue;

      // 判斷單位
      if (pattern.source.includes("億")) return num * 100_000_000;
      if (pattern.source.includes("萬")) return num * 10_000;
      // 若數字小於 1000，可能是「萬」為單位
      if (num < 1000) return num * 10_000;
      return num;
    }
  }

  return 0;
}

/** 提取截止日期 */
function extractDeadline(text: string): string {
  const patterns = [
    /(?:截止日期|截止投標|收件截止|截標日期)[：:]\s*(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/,
    /(?:截止日期|截止投標|收件截止|截標日期)[：:]\s*(?:中華)?民國?\s*(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      if (i === 0) {
        // 西元年格式
        return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
      }
      // 民國年格式
      const year = parseInt(match[1], 10) + 1911;
      return `${year}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    }
  }

  return "";
}

/** 提取決標方式 */
function extractAwardMethod(text: string): RFPSummaryData["award_method"] {
  if (text.includes("最低標") || text.includes("最低價")) {
    return "lowest_price";
  }
  if (text.includes("書面審查") || text.includes("資格審查")) {
    return "most_advantageous_review";
  }
  if (text.includes("最有利標") || text.includes("評選") || text.includes("服務建議書")) {
    return "most_advantageous_eval";
  }
  return "most_advantageous_eval";
}

/** 提取評分項目 */
function extractScoringItems(text: string): ScoringItem[] {
  const items: ScoringItem[] = [];

  // 常見格式：「（一）服務團隊 30 分」或「1. 服務經驗（20%）」
  const patterns = [
    /[（(]?[一二三四五六七八九十\d]+[）)]?\s*[.、]?\s*(.+?)\s*(?:：|:|\s)\s*(\d+)\s*(?:分|%)/g,
    /(?:評分項目|評選項目|配分)[^]*?([^\n]+?)\s+(\d+)\s*(?:分|%)/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const itemName = match[1].trim();
      const weight = parseInt(match[2], 10);

      // 過濾明顯不是評分項目的結果
      if (itemName.length < 2 || itemName.length > 50 || isNaN(weight)) {
        continue;
      }

      items.push({
        item: itemName,
        weight,
        description: "",
      });
    }

    if (items.length > 0) break; // 用第一個成功的 pattern
  }

  return items;
}

/** 提取關鍵需求 */
function extractKeyRequirements(text: string): string[] {
  const requirements: string[] = [];

  // 尋找「工作範圍」或「服務項目」段落
  const sectionMatch = text.match(
    /(?:工作範圍|服務項目|工作內容|服務範圍|主要工作)[：:]\s*\n?([\s\S]{100,2000}?)(?:\n\n|\n[一二三四五六七八九十]{1,2}[、.])/,
  );

  if (sectionMatch?.[1]) {
    const lines = sectionMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 5 && l.length < 200);

    for (const line of lines.slice(0, 5)) {
      // 移除編號前綴
      const cleaned = line.replace(/^[（(]?[\d一二三四五六七八九十]+[）)]\s*[.、]?\s*/, "");
      if (cleaned.length > 3) {
        requirements.push(cleaned);
      }
    }
  }

  return requirements;
}

/** 提取資格條件 */
function extractQualifications(text: string): string[] {
  const qualifications: string[] = [];

  // 尋找「投標廠商資格」或「資格條件」段落
  const sectionMatch = text.match(
    /(?:投標廠商資格|資格條件|廠商資格|投標資格)[：:]\s*\n?([\s\S]{50,2000}?)(?:\n\n|\n[一二三四五六七八九十]{1,2}[、.])/,
  );

  if (sectionMatch?.[1]) {
    const lines = sectionMatch[1]
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 5 && l.length < 200);

    for (const line of lines.slice(0, 5)) {
      const cleaned = line.replace(/^[（(]?[\d一二三四五六七八九十]+[）)]\s*[.、]?\s*/, "");
      if (cleaned.length > 3) {
        qualifications.push(cleaned);
      }
    }
  }

  return qualifications;
}
