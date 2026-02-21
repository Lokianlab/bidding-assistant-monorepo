import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  formatKB,
  buildFilename,
  computeFileList,
  computeActiveFiles,
  assembleContent,
} from "../helpers";
import { RULE_MAP } from "@/data/config/prompt-assembly";
import type { FileListItem } from "../types";

// ====== estimateTokens ======

describe("estimateTokens", () => {
  it("中文字每字算 2 tokens", () => {
    expect(estimateTokens("你好世界")).toBe(8); // 4 * 2
  });

  it("英文字母約每 4 字元 1 token", () => {
    expect(estimateTokens("abcd")).toBe(1); // 4 / 4
  });

  it("中英混合", () => {
    // 2 中文 (4) + 4 英文 (1) = 5
    expect(estimateTokens("你好abcd")).toBe(5);
  });

  it("空字串回傳 0", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("包含空格和標點", () => {
    // "Hello, World!" = 13 非中文字元 → 13/4 = 3.25 → round = 3
    expect(estimateTokens("Hello, World!")).toBe(3);
  });
});

// ====== formatKB ======

describe("formatKB", () => {
  it("1024 bytes = 1.0 KB", () => {
    expect(formatKB(1024)).toBe("1.0 KB");
  });

  it("0 bytes = 0.0 KB", () => {
    expect(formatKB(0)).toBe("0.0 KB");
  });

  it("帶小數", () => {
    expect(formatKB(1536)).toBe("1.5 KB");
  });

  it("大檔案", () => {
    expect(formatKB(102400)).toBe("100.0 KB");
  });
});

// ====== buildFilename ======

describe("buildFilename", () => {
  const fixedDate = new Date(2026, 1, 22, 15, 30); // 2026-02-22 15:30

  it("無案件碼的 md 檔名", () => {
    const name = buildFilename("L1", "", "md", fixedDate);
    expect(name).toBe("L1_戰略分析_2602221530.md");
  });

  it("有案件碼的 txt 檔名", () => {
    const name = buildFilename("L1", "123", "txt", fixedDate);
    expect(name).toBe("[BID-00123] L1_戰略分析_2602221530.txt");
  });

  it("案件碼自動補零到 5 位", () => {
    const name = buildFilename("L3", "7", "md", fixedDate);
    expect(name).toContain("[BID-00007]");
  });

  it("未知階段使用 fallback 名稱", () => {
    const name = buildFilename("X99", "", "md", fixedDate);
    expect(name).toBe("X99_prompt_2602221530.md");
  });

  it("案件碼有空白會被 trim", () => {
    const name = buildFilename("L1", "  456  ", "md", fixedDate);
    expect(name).toContain("[BID-00456]");
  });

  it("空白案件碼不產生前綴", () => {
    const name = buildFilename("L1", "   ", "md", fixedDate);
    expect(name).not.toContain("[BID-");
  });
});

// ====== computeFileList ======

describe("computeFileList", () => {
  it("L1 階段包含 core、index、L1 提示詞和知識庫", () => {
    const list = computeFileList(RULE_MAP["L1"]);
    const ids = list.map((item) => item.file.id);
    expect(ids).toContain("core");
    expect(ids).toContain("index");
    expect(ids).toContain("L1");
  });

  it("L1 的 00B 是必要引用", () => {
    const list = computeFileList(RULE_MAP["L1"]);
    const kb00B = list.find((item) => item.file.id === "00B");
    expect(kb00B).toBeDefined();
    expect(kb00B!.ref).toBe("required");
    expect(kb00B!.auto).toBe(true);
  });

  it("L1 的 00A 是選擇性引用", () => {
    const list = computeFileList(RULE_MAP["L1"]);
    const kb00A = list.find((item) => item.file.id === "00A");
    expect(kb00A).toBeDefined();
    expect(kb00A!.ref).toBe("optional");
    expect(kb00A!.auto).toBe(false);
  });

  it("L3 包含撰寫規範", () => {
    const list = computeFileList(RULE_MAP["L3"]);
    const ids = list.map((item) => item.file.id);
    expect(ids).toContain("spec");
  });

  it("L6 沒有知識庫引用", () => {
    const list = computeFileList(RULE_MAP["L6"]);
    const kbItems = list.filter((item) => item.ref !== undefined);
    expect(kbItems).toHaveLength(0);
  });

  it("undefined rule 回傳空陣列", () => {
    expect(computeFileList(undefined)).toEqual([]);
  });
});

// ====== computeActiveFiles ======

describe("computeActiveFiles", () => {
  const l1FileList = computeFileList(RULE_MAP["L1"]);

  it("只有 auto 檔案（未勾選任何 optional）", () => {
    const active = computeActiveFiles(l1FileList, {}, "L1");
    const allAuto = active.every((item) => item.auto);
    expect(allAuto).toBe(true);
  });

  it("勾選 optional 後該檔案出現在結果中", () => {
    const toggles = { "L1-00A": true };
    const active = computeActiveFiles(l1FileList, toggles, "L1");
    const ids = active.map((item) => item.file.id);
    expect(ids).toContain("00A");
  });

  it("取消勾選 optional 後該檔案不在結果中", () => {
    const toggles = { "L1-00A": false };
    const active = computeActiveFiles(l1FileList, toggles, "L1");
    // 00A in L1 is optional and not auto, so should NOT be included
    const kb00A = active.find((item) => item.file.id === "00A");
    expect(kb00A).toBeUndefined();
  });

  it("手動加入不在矩陣中的檔案", () => {
    const toggles = { "L1-T1": true }; // T1 工具不在 L1 矩陣裡
    const active = computeActiveFiles(l1FileList, toggles, "L1");
    const t1 = active.find((item) => item.file.id === "T1");
    expect(t1).toBeDefined();
    expect(t1!.reason).toBe("手動加入");
  });

  it("其他階段的勾選不會影響當前階段", () => {
    const toggles = { "L2-00A": true }; // L2 的勾選
    const active = computeActiveFiles(l1FileList, toggles, "L1");
    // 00A in L1 should not be active because toggle key is L2-00A, not L1-00A
    const kb00A = active.find((item) => item.file.id === "00A" && !item.auto);
    expect(kb00A).toBeUndefined();
  });

  it("空 fileList 仍可手動加入", () => {
    const toggles = { "L6-T3": true };
    const active = computeActiveFiles([], toggles, "L6");
    expect(active.some((item) => item.file.id === "T3")).toBe(true);
  });
});

// ====== assembleContent ======

describe("assembleContent", () => {
  const mockFile = (id: string, label: string): FileListItem => ({
    file: { id, label, filename: `${id}.md`, category: "system", categoryLabel: "系統" },
    reason: "test",
    auto: true,
  });

  it("組裝多個檔案", () => {
    const files = [mockFile("a", "檔案A"), mockFile("b", "檔案B")];
    const contents = { a: "內容A", b: "內容B" };
    const result = assembleContent(files, contents);
    expect(result).toContain("檔案A");
    expect(result).toContain("內容A");
    expect(result).toContain("檔案B");
    expect(result).toContain("內容B");
  });

  it("包含分隔線", () => {
    const files = [mockFile("a", "檔案A")];
    const contents = { a: "內容" };
    const result = assembleContent(files, contents);
    expect(result).toContain("=".repeat(60));
  });

  it("跳過沒有內容的檔案", () => {
    const files = [mockFile("a", "檔案A"), mockFile("b", "檔案B")];
    const contents = { a: "內容A" }; // b 沒有內容
    const result = assembleContent(files, contents);
    expect(result).toContain("檔案A");
    expect(result).not.toContain("檔案B");
  });

  it("空檔案清單回傳空字串", () => {
    expect(assembleContent([], {})).toBe("");
  });

  it("跳過內容為空字串的檔案", () => {
    const files = [mockFile("a", "檔案A"), mockFile("b", "檔案B")];
    const contents = { a: "內容A", b: "" }; // b 是空字串
    const result = assembleContent(files, contents);
    expect(result).toContain("檔案A");
    expect(result).not.toContain("檔案B");
  });
});
