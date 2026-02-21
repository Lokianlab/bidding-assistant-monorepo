import type { CheckResult, QualityConfig } from "./types";

/**
 * 執行所有品質檢查規則
 *
 * 規則分三類：
 * 1. 基礎規則（禁用詞、用語修正、自訂規則）
 * 2. 鐵律規則（數字、日期等交叉驗證）
 * 3. 提案專用規則（段落長度、句子長度、重複句、承諾風險用語）
 */
export function runChecks(text: string, config: QualityConfig): CheckResult[] {
  if (!text.trim()) return [];

  return [
    ...checkBlacklist(text, config.blacklist),
    ...checkTerminology(text, config.terminology),
    ...checkCustomRules(text, config.customRules),
    ...checkIronLaws(text, config.ironLawEnabled),
    ...checkParagraphLength(text),
    ...checkSentenceLength(text),
    ...checkDuplicateSentences(text),
    ...checkRiskyPromises(text),
  ];
}

// ====== 基礎規則 ======

/** 禁用詞檢查：政府提案中應避免的空泛用語 */
export function checkBlacklist(text: string, blacklist: string[]): CheckResult[] {
  const results: CheckResult[] = [];
  for (const word of blacklist) {
    const regex = new RegExp(escapeRegex(word), "g");
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({
        type: "error",
        rule: "禁用詞",
        message: `發現禁用詞「${word}」`,
        position: `位置 ${match.index}`,
      });
    }
  }
  return results;
}

/** 用語修正：政府採購專用術語 */
export function checkTerminology(
  text: string,
  terminology: { wrong: string; correct: string }[],
): CheckResult[] {
  const results: CheckResult[] = [];
  for (const t of terminology) {
    const regex = new RegExp(escapeRegex(t.wrong), "g");
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({
        type: "warning",
        rule: "用語修正",
        message: `「${t.wrong}」建議改為「${t.correct}」`,
        position: `位置 ${match.index}`,
      });
    }
  }
  return results;
}

/** 自訂規則：使用者在設定中定義的額外檢查 */
export function checkCustomRules(
  text: string,
  customRules: QualityConfig["customRules"],
): CheckResult[] {
  const results: CheckResult[] = [];
  for (const rule of customRules) {
    try {
      const regex = new RegExp(rule.pattern, "g");
      let match;
      while ((match = regex.exec(text)) !== null) {
        results.push({
          type: rule.severity,
          rule: "自訂規則",
          message: rule.message,
          position: `位置 ${match.index}`,
        });
      }
    } catch {
      // 無效的 regex pattern，跳過
    }
  }
  return results;
}

// ====== 鐵律規則 ======

/** 鐵律檢查：數字交叉驗證、日期一致性等 */
export function checkIronLaws(
  text: string,
  flags: QualityConfig["ironLawEnabled"],
): CheckResult[] {
  const results: CheckResult[] = [];

  if (flags.crossValidateNumbers) {
    const numbers = text.match(/\d{1,3}(,\d{3})+|\d+/g);
    if (numbers && numbers.length > 3) {
      results.push({
        type: "info",
        rule: "數字交叉驗證",
        message: `文件中出現 ${numbers.length} 個數字，請人工交叉比對`,
      });
    }
  }

  if (flags.dateConsistency) {
    const dates = text.match(/\d{2,4}[年/.-]\d{1,2}[月/.-]\d{1,2}[日]?/g);
    if (dates && dates.length > 1) {
      results.push({
        type: "info",
        rule: "日期一致性",
        message: `文件中出現 ${dates.length} 個日期，請確認一致性`,
      });
    }
  }

  return results;
}

// ====== 提案專用規則 ======

/** 段落長度檢查：超過 500 字的段落建議分段 */
export function checkParagraphLength(text: string): CheckResult[] {
  const results: CheckResult[] = [];
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  paragraphs.forEach((p, i) => {
    if (p.length > 500) {
      results.push({
        type: "warning",
        rule: "段落長度",
        message: `第 ${i + 1} 段超過 500 字（${p.length} 字），建議分段`,
      });
    }
  });
  return results;
}

/** 句子長度檢查：超過 80 字的句子可讀性差 */
export function checkSentenceLength(text: string): CheckResult[] {
  const results: CheckResult[] = [];
  // 以句號、問號、驚嘆號、分號分句
  const sentences = text.split(/[。！？；\n]+/).filter((s) => s.trim().length > 0);
  let charOffset = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 80) {
      results.push({
        type: "warning",
        rule: "句子過長",
        message: `有一句超過 80 字（${trimmed.length} 字），建議拆分以提高可讀性`,
        position: `約位置 ${charOffset}`,
      });
    }
    // 粗略追蹤位置（含分隔符）
    charOffset += sentence.length + 1;
  }
  return results;
}

/** 重複句偵測：同一句話出現兩次以上（常見的複製貼上錯誤） */
export function checkDuplicateSentences(text: string): CheckResult[] {
  const results: CheckResult[] = [];
  const sentences = text
    .split(/[。！？\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10); // 只檢查有意義長度的句子

  const seen = new Map<string, number>();
  const reported = new Set<string>();

  for (const sentence of sentences) {
    const normalized = sentence.replace(/\s+/g, "");
    const count = (seen.get(normalized) ?? 0) + 1;
    seen.set(normalized, count);

    if (count === 2 && !reported.has(normalized)) {
      reported.add(normalized);
      const preview = sentence.length > 30 ? sentence.slice(0, 30) + "…" : sentence;
      results.push({
        type: "warning",
        rule: "重複內容",
        message: `「${preview}」出現了 2 次以上，可能是複製貼上錯誤`,
      });
    }
  }
  return results;
}

/**
 * 承諾風險用語偵測：政府提案中使用過度承諾的用語會增加履約風險
 *
 * 說明：政府採購契約具法律效力，提案中的承諾可能被視為契約條件。
 * 使用「保證」「一定」「絕對」等詞要特別小心。
 */
export function checkRiskyPromises(text: string): CheckResult[] {
  const results: CheckResult[] = [];
  const riskyWords = [
    { word: "保證", reason: "可能被解讀為契約保證條款" },
    { word: "一定", reason: "過度承諾，建議改為「致力」或具體措施" },
    { word: "絕對", reason: "沒有絕對的事，建議改為具體數據或措施" },
    { word: "百分之百", reason: "不切實際的承諾" },
    { word: "零風險", reason: "不存在零風險，建議改為風險管理措施" },
    { word: "永不", reason: "過度承諾" },
  ];

  for (const { word, reason } of riskyWords) {
    const regex = new RegExp(escapeRegex(word), "g");
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({
        type: "warning",
        rule: "承諾風險",
        message: `「${word}」${reason}`,
        position: `位置 ${match.index}`,
      });
    }
  }
  return results;
}

// ====== 工具函式 ======

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
