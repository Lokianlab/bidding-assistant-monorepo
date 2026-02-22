import { describe, it, expect } from "vitest";
import {
  runChecks,
  checkBlacklist,
  checkTerminology,
  checkCustomRules,
  checkIronLaws,
  checkCompanyName,
  checkParagraphLength,
  checkSentenceLength,
  checkDuplicateSentences,
  checkRiskyPromises,
  checkMissingPerformanceRecord,
  checkVagueQuantifiers,
} from "../rules";
import { calculateScore } from "../score";
import type { QualityConfig } from "../types";

// ====== 基礎規則 ======

describe("checkBlacklist", () => {
  it("偵測禁用詞", () => {
    const results = checkBlacklist("本公司有豐富的經驗", ["豐富的經驗"]);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("error");
    expect(results[0].rule).toBe("禁用詞");
    expect(results[0].message).toContain("豐富的經驗");
  });

  it("同一禁用詞出現多次各自回報", () => {
    const results = checkBlacklist("高品質的高品質服務", ["高品質"]);
    expect(results).toHaveLength(2);
  });

  it("沒有禁用詞時回傳空陣列", () => {
    const results = checkBlacklist("本計畫採用明確的執行策略", ["豐富的經驗"]);
    expect(results).toHaveLength(0);
  });

  it("空白清單回傳空陣列", () => {
    const results = checkBlacklist("隨便什麼文字", []);
    expect(results).toHaveLength(0);
  });

  it("正確 escape regex 特殊字元", () => {
    const results = checkBlacklist("成本為 100+200", ["100+200"]);
    expect(results).toHaveLength(1);
  });
});

describe("checkTerminology", () => {
  it("偵測錯誤用語並建議修正", () => {
    const results = checkTerminology("請貴單位審核", [
      { wrong: "貴單位", correct: "貴機關" },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("warning");
    expect(results[0].message).toContain("貴機關");
  });

  it("多組用語各自檢查", () => {
    const results = checkTerminology("合約簽訂後由專案經理負責", [
      { wrong: "合約", correct: "契約" },
      { wrong: "專案經理", correct: "計畫主持人" },
    ]);
    expect(results).toHaveLength(2);
  });

  it("正確用語不觸發", () => {
    const results = checkTerminology("貴機關審核", [
      { wrong: "貴單位", correct: "貴機關" },
    ]);
    expect(results).toHaveLength(0);
  });
});

describe("checkCustomRules", () => {
  it("自訂 regex 規則正常運作", () => {
    const results = checkCustomRules("金額為 NTD 100,000", [
      { pattern: "NTD", message: "請使用「新臺幣」", severity: "warning" },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("自訂規則");
    expect(results[0].type).toBe("warning");
  });

  it("無效 regex 不會拋錯", () => {
    const results = checkCustomRules("任何文字", [
      { pattern: "[invalid(", message: "不會觸發", severity: "error" },
    ]);
    expect(results).toHaveLength(0);
  });

  it("空規則陣列回傳空結果", () => {
    const results = checkCustomRules("任何文字", []);
    expect(results).toHaveLength(0);
  });

  it("支援 error 嚴重程度", () => {
    const results = checkCustomRules("機密資料", [
      { pattern: "機密", message: "不應出現在提案中", severity: "error" },
    ]);
    expect(results[0].type).toBe("error");
  });
});

// ====== 鐵律規則 ======

describe("checkIronLaws", () => {
  const allEnabled = {
    crossValidateNumbers: true,
    budgetConsistency: true,
    dateConsistency: true,
    teamConsistency: true,
    scopeConsistency: true,
  };

  const allDisabled = {
    crossValidateNumbers: false,
    budgetConsistency: false,
    dateConsistency: false,
    teamConsistency: false,
    scopeConsistency: false,
  };

  it("偵測多個數字需要交叉驗證", () => {
    const text = "預算 100 萬，人力 5 人，工期 12 個月，費率 2000";
    const results = checkIronLaws(text, allEnabled);
    const numCheck = results.find((r) => r.rule === "數字交叉驗證");
    expect(numCheck).toBeDefined();
    expect(numCheck!.type).toBe("info");
  });

  it("3 個以下數字不觸發", () => {
    const text = "預算 100 萬，人力 5 人";
    const results = checkIronLaws(text, allEnabled);
    expect(results.find((r) => r.rule === "數字交叉驗證")).toBeUndefined();
  });

  it("偵測多個日期需要一致性確認", () => {
    const text = "起始日 2026年3月1日，結束日 2026年12月31日";
    const results = checkIronLaws(text, allEnabled);
    const dateCheck = results.find((r) => r.rule === "日期一致性");
    expect(dateCheck).toBeDefined();
  });

  it("關閉的旗標不觸發", () => {
    const text = "預算 100 萬，人力 5 人，工期 12 個月，費率 2000";
    const results = checkIronLaws(text, allDisabled);
    expect(results).toHaveLength(0);
  });

  it("偵測多處金額或預算描述", () => {
    const text = "預算500萬元，經費分四期撥付，報價含稅，費用明細如附件";
    const results = checkIronLaws(text, { ...allDisabled, budgetConsistency: true });
    const budgetCheck = results.find((r) => r.rule === "預算一致性");
    expect(budgetCheck).toBeDefined();
    expect(budgetCheck!.type).toBe("info");
  });

  it("金額描述 ≤3 處不觸發預算一致性", () => {
    const text = "預算500萬元，經費分期撥付";
    const results = checkIronLaws(text, { ...allDisabled, budgetConsistency: true });
    expect(results.find((r) => r.rule === "預算一致性")).toBeUndefined();
  });

  it("偵測多處人員角色描述", () => {
    const text = "主持人負責統籌，協同主持人協助，專任助理執行，工程師開發";
    const results = checkIronLaws(text, { ...allDisabled, teamConsistency: true });
    const teamCheck = results.find((r) => r.rule === "人力一致性");
    expect(teamCheck).toBeDefined();
    expect(teamCheck!.type).toBe("info");
  });

  it("角色描述 ≤3 處不觸發人力一致性", () => {
    const text = "主持人負責統籌，工程師開發";
    const results = checkIronLaws(text, { ...allDisabled, teamConsistency: true });
    expect(results.find((r) => r.rule === "人力一致性")).toBeUndefined();
  });

  it("偵測多處工作範圍描述", () => {
    const text = "工作範圍涵蓋系統開發，服務範圍包括維護，辦理事項詳列如下";
    const results = checkIronLaws(text, { ...allDisabled, scopeConsistency: true });
    const scopeCheck = results.find((r) => r.rule === "範圍一致性");
    expect(scopeCheck).toBeDefined();
    expect(scopeCheck!.type).toBe("info");
  });

  it("範圍描述 ≤2 處不觸發範圍一致性", () => {
    const text = "工作範圍涵蓋系統開發與維護";
    const results = checkIronLaws(text, { ...allDisabled, scopeConsistency: true });
    expect(results.find((r) => r.rule === "範圍一致性")).toBeUndefined();
  });
});

// ====== 公司名稱一致性 ======

describe("checkCompanyName", () => {
  it("未設定公司名稱時不檢查", () => {
    const results = checkCompanyName("任何文字", undefined, undefined);
    expect(results).toHaveLength(0);
  });

  it("公司全名出現時不觸發", () => {
    const results = checkCompanyName(
      "本案由全能科技股份有限公司執行",
      "全能科技股份有限公司",
    );
    expect(results).toHaveLength(0);
  });

  it("公司全名未出現時觸發提醒", () => {
    const results = checkCompanyName(
      "本案由某團隊執行",
      "全能科技股份有限公司",
    );
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("公司名稱");
    expect(results[0].type).toBe("info");
    expect(results[0].message).toContain("全能科技股份有限公司");
  });

  it("品牌簡稱單獨使用時觸發提醒", () => {
    const results = checkCompanyName(
      "全能科技股份有限公司承攬本案。全能團隊具備豐富經驗。",
      "全能科技股份有限公司",
      "全能",
    );
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("單獨出現");
    expect(results[0].message).toContain("1 次");
  });

  it("品牌簡稱作為全名一部分出現時不觸發", () => {
    const results = checkCompanyName(
      "全能科技股份有限公司承攬本案",
      "全能科技股份有限公司",
      "全能",
    );
    expect(results).toHaveLength(0);
  });

  it("品牌簡稱等於全名時不檢查簡稱", () => {
    const results = checkCompanyName(
      "全能公司承攬本案",
      "全能公司",
      "全能公司",
    );
    expect(results).toHaveLength(0);
  });

  it("多次單獨使用品牌簡稱正確計數", () => {
    const results = checkCompanyName(
      "全能科技股份有限公司執行。全能負責開發。全能負責測試。全能負責部署。",
      "全能科技股份有限公司",
      "全能",
    );
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("3 次");
  });

  it("品牌簡稱在文字開頭時正確偵測為獨立出現", () => {
    const results = checkCompanyName(
      "全能負責開發。全能科技股份有限公司執行。",
      "全能科技股份有限公司",
      "全能",
    );
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("1 次");
  });

  it("品牌簡稱在文字結尾時正確偵測為獨立出現", () => {
    const results = checkCompanyName(
      "全能科技股份有限公司執行。委託全能",
      "全能科技股份有限公司",
      "全能",
    );
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("1 次");
  });
});

// ====== 提案專用規則 ======

describe("checkParagraphLength", () => {
  it("超過 500 字的段落觸發警告", () => {
    const longParagraph = "字".repeat(501);
    const results = checkParagraphLength(longParagraph);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("warning");
    expect(results[0].message).toContain("501");
  });

  it("500 字以內不觸發", () => {
    const normalParagraph = "字".repeat(500);
    const results = checkParagraphLength(normalParagraph);
    expect(results).toHaveLength(0);
  });

  it("多段落各自檢查", () => {
    const text = "字".repeat(600) + "\n\n" + "字".repeat(600);
    const results = checkParagraphLength(text);
    expect(results).toHaveLength(2);
    expect(results[0].message).toContain("第 1 段");
    expect(results[1].message).toContain("第 2 段");
  });
});

describe("checkSentenceLength", () => {
  it("超過 80 字的句子觸發警告", () => {
    const longSentence = "字".repeat(81) + "。";
    const results = checkSentenceLength(longSentence);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("句子過長");
    expect(results[0].message).toContain("81");
  });

  it("80 字以內不觸發", () => {
    const normalSentence = "字".repeat(80) + "。";
    const results = checkSentenceLength(normalSentence);
    expect(results).toHaveLength(0);
  });

  it("用問號和驚嘆號正確分句", () => {
    const text = "字".repeat(81) + "？" + "字".repeat(81) + "！";
    const results = checkSentenceLength(text);
    expect(results).toHaveLength(2);
  });

  it("換行也算分句", () => {
    const text = "字".repeat(81) + "\n" + "正常短句。";
    const results = checkSentenceLength(text);
    expect(results).toHaveLength(1);
  });
});

describe("checkDuplicateSentences", () => {
  it("偵測重複句", () => {
    const text = "本計畫的執行策略如下所述。其他內容。本計畫的執行策略如下所述。";
    const results = checkDuplicateSentences(text);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("重複內容");
  });

  it("短句（<10字）不檢查", () => {
    const text = "是的。其他。是的。";
    const results = checkDuplicateSentences(text);
    expect(results).toHaveLength(0);
  });

  it("不同內容不觸發", () => {
    const text = "第一段完整內容說明。第二段不同的內容描述。";
    const results = checkDuplicateSentences(text);
    expect(results).toHaveLength(0);
  });

  it("空白差異視為相同", () => {
    const text = "本計畫的 執行策略如下。其他。本計畫的執行策略如下。";
    const results = checkDuplicateSentences(text);
    expect(results).toHaveLength(1);
  });

  it("同句出現 3 次只報一次", () => {
    const s = "這是一個會重複出現的完整句子";
    const text = `${s}。其他。${s}。更多。${s}。`;
    const results = checkDuplicateSentences(text);
    expect(results).toHaveLength(1);
  });
});

describe("checkRiskyPromises", () => {
  it("偵測保證", () => {
    const results = checkRiskyPromises("本公司保證如期完成");
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("承諾風險");
    expect(results[0].message).toContain("保證");
  });

  it("偵測多個風險用語", () => {
    const results = checkRiskyPromises("我們一定做到零風險");
    expect(results).toHaveLength(2); // 一定 + 零風險
  });

  it("正常用語不觸發", () => {
    const results = checkRiskyPromises("本計畫將採用風險管理措施降低執行風險");
    expect(results).toHaveLength(0);
  });

  it("偵測百分之百", () => {
    const results = checkRiskyPromises("百分之百達成目標");
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("不切實際");
  });
});

describe("checkMissingPerformanceRecord", () => {
  // 每段 45 字，repeat(10) = 450 字，確保超過 300 字門檻
  const longProposalBase = "本計畫將辦理一系列文化活動，包含講座、展覽及工作坊等，預計推動相關工作坊計畫推廣文化活動。";

  it("文件有活動但無履約實績 → 觸發警告", () => {
    const text = longProposalBase.repeat(10); // ~450 字，超過 300 字門檻
    const results = checkMissingPerformanceRecord(text);
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("履約實績缺失");
    expect(results[0].type).toBe("warning");
    expect(results[0].message).toContain("履約實績");
  });

  it("文件包含「曾辦理」→ 不觸發", () => {
    const text = longProposalBase.repeat(10) + "本團隊曾辦理多項類似計畫。";
    const results = checkMissingPerformanceRecord(text);
    expect(results).toHaveLength(0);
  });

  it("文件包含「履約實績」→ 不觸發", () => {
    const text = longProposalBase.repeat(10) + "本公司具備豐富的履約實績。";
    const results = checkMissingPerformanceRecord(text);
    expect(results).toHaveLength(0);
  });

  it("文件包含「過往案例」→ 不觸發", () => {
    const text = longProposalBase.repeat(10) + "以下列出過往案例供參考。";
    const results = checkMissingPerformanceRecord(text);
    expect(results).toHaveLength(0);
  });

  it("短文件（< 300 字）不觸發", () => {
    const results = checkMissingPerformanceRecord("舉辦活動。");
    expect(results).toHaveLength(0);
  });

  it("無活動關鍵詞的文件不觸發", () => {
    // 假設是純技術說明文件，沒有 活動/計畫/辦理 等詞
    const text = "系統架構採用微服務設計，資料庫使用 PostgreSQL。".repeat(15);
    const results = checkMissingPerformanceRecord(text);
    expect(results).toHaveLength(0);
  });

  it("包含「承辦過」→ 不觸發", () => {
    const text = longProposalBase.repeat(10) + "本公司承辦過類似規模的文化推廣案。";
    const results = checkMissingPerformanceRecord(text);
    expect(results).toHaveLength(0);
  });
});

describe("checkVagueQuantifiers", () => {
  it("偵測「若干」→ 觸發警告", () => {
    const results = checkVagueQuantifiers("本計畫將舉辦若干場次的活動");
    expect(results).toHaveLength(1);
    expect(results[0].rule).toBe("模糊量化");
    expect(results[0].type).toBe("warning");
    expect(results[0].message).toContain("若干");
    expect(results[0].message).toContain("數量");
  });

  it("偵測「廣大民眾」→ 觸發警告", () => {
    const results = checkVagueQuantifiers("本活動面向廣大民眾推廣");
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("廣大民眾");
  });

  it("偵測「各界人士」→ 觸發警告", () => {
    const results = checkVagueQuantifiers("邀請各界人士共同參與");
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("各界人士");
  });

  it("偵測「屆時再定」→ 觸發警告", () => {
    const results = checkVagueQuantifiers("活動場地屆時再定");
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("屆時再定");
  });

  it("偵測「待確認」→ 觸發警告", () => {
    const results = checkVagueQuantifiers("講師人選待確認");
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain("待確認");
  });

  it("同一用語出現兩次，各自回報", () => {
    const results = checkVagueQuantifiers("第一場若干人，第二場若干人");
    expect(results).toHaveLength(2);
  });

  it("多種模糊詞各自偵測", () => {
    const results = checkVagueQuantifiers("若干場次邀請廣大民眾，細節待確認");
    expect(results).toHaveLength(3);
    const rules = results.map((r) => r.rule);
    expect(rules.every((r) => r === "模糊量化")).toBe(true);
  });

  it("不含模糊量化詞的文字不觸發", () => {
    const results = checkVagueQuantifiers("本計畫預計辦理 3 場講座，每場 100 人，共計 300 人次");
    expect(results).toHaveLength(0);
  });

  it("回傳 position 欄位", () => {
    const results = checkVagueQuantifiers("若干場次");
    expect(results[0].position).toContain("位置");
  });
});

// ====== 整合測試 ======

describe("runChecks", () => {
  const defaultConfig: QualityConfig = {
    blacklist: ["豐富的經驗", "高品質"],
    terminology: [{ wrong: "貴單位", correct: "貴機關" }],
    ironLawEnabled: {
      crossValidateNumbers: true,
      budgetConsistency: true,
      dateConsistency: true,
      teamConsistency: true,
      scopeConsistency: true,
    },
    customRules: [],
  };

  it("空文字回傳空結果", () => {
    expect(runChecks("", defaultConfig)).toHaveLength(0);
    expect(runChecks("   ", defaultConfig)).toHaveLength(0);
  });

  it("乾淨文字只有提案規則的結果", () => {
    const results = runChecks("一句正常的短句。", defaultConfig);
    // 不應有禁用詞、用語修正或鐵律問題
    const errors = results.filter((r) => r.type === "error");
    expect(errors).toHaveLength(0);
  });

  it("綜合情境：多種問題同時偵測", () => {
    const text = "本公司有豐富的經驗，保證貴單位滿意。預算100萬，工期12月，人力5人，費率2000。";
    const results = runChecks(text, defaultConfig);

    const rules = results.map((r) => r.rule);
    expect(rules).toContain("禁用詞");
    expect(rules).toContain("用語修正");
    expect(rules).toContain("承諾風險");
  });

  it("自訂規則整合運作", () => {
    const config = {
      ...defaultConfig,
      customRules: [{ pattern: "TODO", message: "未完成項目", severity: "error" as const }],
    };
    const results = runChecks("這裡有個 TODO 要處理", config);
    expect(results.find((r) => r.rule === "自訂規則")).toBeDefined();
  });
});

// ====== 分數計算 ======

describe("calculateScore", () => {
  it("無問題得 100 分", () => {
    const score = calculateScore([]);
    expect(score.value).toBe(100);
    expect(score.label).toBe("品質良好");
  });

  it("每個 error 扣 10 分", () => {
    const results = [
      { type: "error" as const, rule: "test", message: "test" },
      { type: "error" as const, rule: "test", message: "test" },
    ];
    const score = calculateScore(results);
    expect(score.value).toBe(80);
    expect(score.errorCount).toBe(2);
  });

  it("每個 warning 扣 3 分", () => {
    const results = [
      { type: "warning" as const, rule: "test", message: "test" },
    ];
    const score = calculateScore(results);
    expect(score.value).toBe(97);
    expect(score.warningCount).toBe(1);
  });

  it("info 不扣分", () => {
    const results = [
      { type: "info" as const, rule: "test", message: "test" },
    ];
    const score = calculateScore(results);
    expect(score.value).toBe(100);
    expect(score.infoCount).toBe(1);
  });

  it("分數不低於 0", () => {
    const results = Array.from({ length: 20 }, () => ({
      type: "error" as const,
      rule: "test",
      message: "test",
    }));
    const score = calculateScore(results);
    expect(score.value).toBe(0);
    expect(score.label).toBe("品質不佳");
  });

  it("60-79 分標示需要改善", () => {
    const results = Array.from({ length: 3 }, () => ({
      type: "error" as const,
      rule: "test",
      message: "test",
    }));
    const score = calculateScore(results);
    expect(score.value).toBe(70);
    expect(score.label).toBe("需要改善");
  });
});
