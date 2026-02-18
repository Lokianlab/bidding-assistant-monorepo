const docx = require("docx");
const fs = require("fs");
const path = require("path");

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, TabStopType, TabStopPosition, Header, Footer, PageNumber,
  NumberFormat, TableOfContents, StyleLevel, LevelFormat,
} = docx;

// ── 共用樣式 ──
const FONT = "標楷體";
const FONT_EN = "Times New Roman";
const COLOR_PRIMARY = "1B4F72";
const COLOR_ACCENT = "2E86C1";
const COLOR_DARK = "1C1C1C";
const COLOR_GRAY = "666666";
const COLOR_LIGHT_BG = "EBF5FB";
const COLOR_TABLE_HEADER = "1B4F72";
const COLOR_TABLE_HEADER_TEXT = "FFFFFF";
const COLOR_TABLE_ALT = "F2F8FD";
const BORDER_COLOR = "B0C4DE";

function makeRun(text, opts = {}) {
  return new TextRun({
    text,
    font: { ascii: FONT_EN, eastAsia: FONT },
    size: opts.size || 24,
    bold: opts.bold || false,
    italics: opts.italics || false,
    color: opts.color || COLOR_DARK,
    break: opts.break,
  });
}

function makePara(text, opts = {}) {
  const runs = typeof text === "string" ? [makeRun(text, opts)] : text;
  return new Paragraph({
    children: runs,
    heading: opts.heading,
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: opts.spacing || { before: 120, after: 120 },
    indent: opts.indent,
  });
}

function makeBullet(text, level = 0, opts = {}) {
  return new Paragraph({
    children: [makeRun(text, { size: opts.size || 24 })],
    bullet: { level },
    spacing: { before: 60, after: 60 },
  });
}

function makeH1(text) {
  return new Paragraph({
    children: [makeRun(text, { bold: true, size: 36, color: COLOR_PRIMARY })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_ACCENT },
    },
  });
}

function makeH2(text) {
  return new Paragraph({
    children: [makeRun(text, { bold: true, size: 30, color: COLOR_ACCENT })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function makeH3(text) {
  return new Paragraph({
    children: [makeRun(text, { bold: true, size: 26, color: COLOR_PRIMARY })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
  });
}

function makeQuote(text) {
  return new Paragraph({
    children: [makeRun(text, { size: 26, bold: true, color: COLOR_PRIMARY })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    indent: { left: 720, right: 720 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: COLOR_ACCENT },
    },
    shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
  });
}

function makeCodeBlock(lines) {
  return lines.map((line, i) =>
    new Paragraph({
      children: [new TextRun({ text: line || " ", font: { ascii: "Consolas", eastAsia: FONT }, size: 20, color: "2C3E50" })],
      spacing: { before: i === 0 ? 120 : 0, after: i === lines.length - 1 ? 120 : 0 },
      indent: { left: 360 },
      shading: { type: ShadingType.CLEAR, fill: "F4F6F7" },
    })
  );
}

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function makeTableCell(text, opts = {}) {
  return new TableCell({
    children: [new Paragraph({
      children: [makeRun(text, {
        size: opts.size || 22,
        bold: opts.bold || false,
        color: opts.color || COLOR_DARK,
      })],
      alignment: opts.alignment || AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
    })],
    borders,
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: "center",
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
}

function makeHeaderCell(text, width) {
  return makeTableCell(text, {
    bold: true, color: COLOR_TABLE_HEADER_TEXT,
    shading: COLOR_TABLE_HEADER, width,
  });
}

function makeAltCell(text, width, isAlt) {
  return makeTableCell(text, {
    shading: isAlt ? COLOR_TABLE_ALT : undefined, width,
  });
}

function makeTable(headers, rows, widths) {
  return new Table({
    rows: [
      new TableRow({
        children: headers.map((h, i) => makeHeaderCell(h, widths?.[i])),
        tableHeader: true,
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell, ci) => makeAltCell(cell, widths?.[ci], ri % 2 === 1)),
        })
      ),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function spacer(size = 200) {
  return new Paragraph({ children: [], spacing: { before: size } });
}

// ── 封面頁 ──
function coverPage() {
  return [
    spacer(1600),
    new Paragraph({
      children: [makeRun("全能標案助理", { size: 56, bold: true, color: COLOR_PRIMARY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [makeRun("開發計畫書", { size: 44, bold: true, color: COLOR_ACCENT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", size: 24, color: COLOR_ACCENT, font: { ascii: "Consolas" } })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    makeQuote("從招標文件到得標，越投越強、越投越準的 AI 提案系統。"),
    spacer(400),
    new Paragraph({
      children: [makeRun("v4.0 — 提案寫作駕駛艙版", { size: 28, color: COLOR_GRAY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [makeRun("2026-02-18", { size: 24, color: COLOR_GRAY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [makeRun("大員洛川股份有限公司", { size: 24, color: COLOR_GRAY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    spacer(800),
    new Paragraph({
      children: [makeRun("文件狀態：系統定位 + 能力設計 + Discord Bot 規格已定，待逐層實作", { size: 20, color: COLOR_GRAY, italics: true })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ── 主文件 ──
function buildSections() {
  const children = [];

  // ═══ 1. 商業背景與核心問題 ═══
  children.push(makeH1("1. 商業背景與核心問題"));

  children.push(makeH2("1.1 公司基本資料"));
  children.push(makeTable(
    ["項目", "內容"],
    [
      ["公司名稱", "大員洛川股份有限公司"],
      ["統一編號", "89170941"],
      ["設立日期", "民國 112 年（前身社團自 96 年起，連續 16+ 年實務經驗）"],
      ["負責人", "黃偉誠"],
      ["團隊規模", "約 15 人（含核心成員與專案制人員）"],
      ["年營收目標", "NT$3,000 萬"],
    ],
    [30, 70]
  ));

  children.push(makeH2("1.2 三大業務主軸"));
  children.push(makeBullet("課程、導覽及走讀服務：公衛教育、人權教育、食農教育、國家語言教育、藝文展覽策劃"));
  children.push(makeBullet("臺灣傳統服飾製作與推廣：型制史研究、復原設計、品牌轉譯"));
  children.push(makeBullet("綠色照護與永續發展：環境教育、森林保健、親子互動教育、長照新模式"));

  children.push(makeH2("1.3 核心問題"));
  children.push(...makeCodeBlock([
    "去年實績：投標 46 案，總預算金額 NT$105,748,770",
    "         得標 0 件，0 元 —— 0% 得標率",
    "         標案類型：大部分是最有利標（建議書品質決定一切）",
  ]));
  children.push(makePara("收入公式："));
  children.push(...makeCodeBlock([
    "收入 = 投標案件數 × 得標率 × 平均金額 × 毛利率",
    "",
    "  投標案件數 = 發現的機會數 × 投標決策通過率",
    "  得標率 = f（建議書品質、簡報品質、價格競爭力、團隊適配度）",
  ]));
  children.push(makePara([
    makeRun("0% 得標率的根因", { bold: true, color: COLOR_PRIMARY }),
    makeRun("：企劃端跳過戰略分析直接寫、AI 產出沒有公司真實知識、沒有品質閘門、經驗沒有累積。"),
  ]));

  children.push(makeH2("1.4 完整痛點清單（23 條）"));

  children.push(makeH3("選案階段"));
  children.push(makeBullet("#1 篩案靠感覺和興趣 — 沒有可驗證的篩選機制"));

  children.push(makeH3("戰略階段"));
  children.push(makeBullet("#21 沒有深入的戰略分析就開始寫 — 不了解機關潛台詞、競爭優勢、贏的切入角度"));
  children.push(makeBullet("#22 缺乏戰略性的企劃架構 — 建議書變成資料堆疊"));

  children.push(makeH3("拆解階段"));
  children.push(makeBullet("#2 需求書沒有系統拆解 — 寫漏評分項目"));
  children.push(makeBullet("#3 沒有結構化的寫作順序 — 不知道先寫什麼後寫什麼"));

  children.push(makeH3("寫作階段"));
  children.push(makeBullet("#4 知識庫是空的（00A-00E 未建立）— AI 只能寫空話"));
  children.push(makeBullet("#5 在 4-5 個 AI 工具間跳來跳去 — 不知做到哪了"));
  children.push(makeBullet("#6 多案並行，大腦不斷切換 — 要自己記住所有狀態"));
  children.push(makeBullet("#7 每個 AI 都要重新調校 — 花大量時間「教 AI 認識你」"));
  children.push(makeBullet("#8 對話上限是黑箱 — 爆了交接文件又不準"));
  children.push(makeBullet("#9 各工具產出不一致 — 要自己當人肉膠水縫合"));
  children.push(makeBullet("#10 AI 幻覺抓不完 — 被評委問到答不出來"));
  children.push(makeBullet("#11 AI 不自檢、死不認錯 — 你變成 AI 的品管員"));
  children.push(makeBullet("#23 AI 的「創意」沒有常識 — 聽起來厲害但不切實際"));

  children.push(makeH3("產出階段"));
  children.push(makeBullet("#12 寫完還是像初稿 — 品質上不去"));
  children.push(makeBullet("#13 主視覺/示意圖跟文字脫節 — 圖文不搭"));
  children.push(makeBullet("#14 排版很痛 — 建議書和評選簡報的排版都是痛點"));

  children.push(makeH3("結案階段"));
  children.push(makeBullet("#15 落標意見回收不系統 — 參考價值低"));
  children.push(makeBullet("#16 每次從頭來，經驗沒累積 — 做完的案件經驗沒有回流"));

  children.push(makeH3("策略層問題"));
  children.push(makeBullet("#17 實績冷啟動困境 — 沒得標→沒實績→評分被扣→繼續沒得標"));
  children.push(makeBullet("#18 質 vs 量策略問題 — 46 案全投但品質都不夠"));
  children.push(makeBullet("#19 不夠了解評委真正在看什麼"));
  children.push(makeBullet("#20 不了解競爭對手"));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══ 2. 系統定位 ═══
  children.push(makeH1("2. 系統定位"));

  children.push(makeH2("2.1 一句話定位"));
  children.push(makeQuote("從招標文件到得標，越投越強、越投越準的 AI 提案系統。"));

  children.push(makeH2("2.2 系統是什麼 / 不是什麼"));
  children.push(makeTable(
    ["✅ 是", "❌ 不是"],
    [
      ["提案寫作駕駛艙", "儀表板"],
      ["從招標文件進去，建議書出來", "看板"],
      ["AI 火力統一指揮中心", "RAG 聊天機器人"],
      ["越用越聰明的飛輪", "專案管理工具"],
    ],
    [50, 50]
  ));

  children.push(makeH2("2.3 飛輪三齒輪"));
  children.push(...makeCodeBlock([
    "          ┌──────────────┐",
    "      ┌───│  選對的案     │←──┐",
    "      │   │ （策略）      │   │",
    "      │   └──────────────┘   │",
    "      ▼                      │",
    "  ┌──────────────┐    ┌──────────────┐",
    "  │ 寫出好建議書  │───→│ 從結果學習    │",
    "  │ （執行）      │    │ （回饋）      │",
    "  └──────────────┘    └──────────────┘",
  ]));
  children.push(makeBullet("選對的案（策略）— 系統輔助分析，不浪費時間在贏不了的案子"));
  children.push(makeBullet("寫出好建議書（執行）— 系統的核心價值，AI 帶真實知識寫、自動檢查品質"));
  children.push(makeBullet("從每次結果學習（回饋）— 系統幫助累積經驗，飛輪越轉越快"));

  children.push(makeH2("2.4 案件分級策略"));
  children.push(...makeCodeBlock([
    "200 件/月（企劃選入）",
    "    ↓ L1 快速分析（每案 30 min）",
    "    ↓",
    "├── A 類（高勝算）→ 全力做 L1-L8 → 精",
    "├── B 類（中勝算）→ 精簡流程 → 量",
    "├── C 類（可能獨家）→ 最低限度 → 撿漏",
    "└── D 類（低勝算）→ 放棄 → 省時間",
  ]));
  children.push(makePara([
    makeRun("精和量不是二選一，是依案件分級同時進行。", { bold: true, color: COLOR_PRIMARY }),
  ]));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══ 3. 現行流程診斷 ═══
  children.push(makeH1("3. 現行流程診斷"));

  children.push(makeH2("3.1 三端全貌"));
  children.push(makeTable(
    ["端", "設計", "落地", "產出", "人力"],
    [
      ["行政端", "✅", "✅ 貫徹", "穩定（600-1200 件/月）", "5 位助理"],
      ["企劃端", "✅ L1-L8", "❌ 未部署", "46 案 0 得標", "同一批人"],
      ["執行端", "✅ 30 節點", "❌ 未貫徹", "差強人意（靠老客戶）", "同一批人"],
    ],
    [15, 15, 15, 30, 25]
  ));

  children.push(makeH2("3.2 行政端（穩定，不動）"));
  children.push(...makeCodeBlock([
    "pcc 瀏覽（多帳號 200*N）",
    "    ↓ 行政初篩（標準：案名 vs 公司業務範圍）",
    "600-1200 件/月 通過初篩",
    "    ↓ 行政第一輪（每件都做）：",
    "    │   ├─ 貼表：案件資訊填入 Notion",
    "    │   ├─ 貼檔：下載→清理→備標評估文件→嵌入 Notion",
    "    │   ├─ 摘要：Notion AI 生成案件摘要",
    "    │   └─ 情蒐：查過往決標記錄 + 投標地址行車資訊",
    "    ↓ 企劃初選",
    "~200 件/月 選入",
    "    ↓ 行政第二輪（選入才做）：",
    "    │   ├─ 開 Drive 資料夾結構",
    "    │   └─ 將備標評估文件貼入 Drive",
    "    ↓ 企劃 + AI 深度分析",
    "~4 件/月 決定投標 → 正式領標 → L2-L8",
  ]));
  children.push(makeBullet("5 位行政助理分工，每人每天 6-12 件，穩定運作"));
  children.push(makeBullet("四個動作全部可自動化，但排在 Phase 3（不急）"));

  children.push(makeH2("3.3 企劃端（所有開發資源集中在這裡）"));
  children.push(makePara([makeRun("這是 0% 得標率的根因。", { bold: true, color: "C0392B" })]));
  children.push(makePara("現行做法："));
  children.push(makeBullet("企劃認領案子，各自想辦法在截標前交出建議書"));
  children.push(makeBullet("把備標評估文件整份丟給 AI →「寫一份完整建議書」→ 拿到初稿 → 自己改"));
  children.push(makeBullet("完全跳過 L1 戰略分析、L2 備標規劃，直接衝到「寫完」"));
  children.push(makeBullet("沒有審稿、沒有品質閘門，寫完就送"));
  children.push(makePara("根因分析："));
  children.push(...makeCodeBlock([
    "量衝不起來 ← 每案手工作業太重，流程無法規模化",
    "質提不上去 ← 跳過分析直接寫，AI 產出是沒有靈魂的初稿",
    "兩頭卡住   ← 流程本身不支援任何一種策略",
  ]));

  children.push(makeH2("3.4 執行端（設計完整但未落地）"));
  children.push(makeBullet("Notion 上有完整的「執行企劃作業流程工作手冊」（30 個節點、5 階段）"));
  children.push(makeBullet("但未貫徹，不確定可行性——跟 L1-L8 一樣：設計完整，落地為零"));
  children.push(makeBullet("同一批人同時做企劃和執行，哪邊緊急救哪邊"));
  children.push(makePara("飛輪斷裂點："));
  children.push(...makeCodeBlock([
    "9C 專案檢討不做 → 00E 永遠空 → 知識庫沒彈藥",
    "→ 下次建議書更難寫 → 得標更難 → 惡性循環",
  ]));

  children.push(makeH2("3.5 策略對焦"));
  children.push(makeQuote("行政端流程成熟穩定，不動。企劃端是 0% 得標率的根因，所有開發資源集中在這裡。"));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══ 4. 六大系統能力 ═══
  children.push(makeH1("4. 六大系統能力"));

  // 能力 1
  children.push(makeH2("能力 1：戰略分析引擎"));
  children.push(makePara("從招標文件到作戰計畫，一條龍："));
  children.push(makeTable(
    ["步驟", "內容"],
    [
      ["① 拆解", "評分項目、交付要求、資格條件、應備文件"],
      ["② 分析", "適配度、決勝點、紅旗、評委關注點"],
      ["③ 決策", "投 or 不投（可驗證的依據）"],
      ["④ 作戰計畫", "核心論述 + 攻略策略 + 寫作順序 + 每項所需資料"],
    ],
    [20, 80]
  ));
  children.push(makePara([
    makeRun("解決痛點", { bold: true }),
    makeRun("：#1, #2, #3, #19, #20, #21, #22（7 條）"),
  ]));

  // 能力 2
  children.push(makeH2("能力 2：公司知識庫"));
  children.push(makePara("飛輪的燃料，結構化存放 + 智慧檢索："));
  children.push(makeBullet("00A 團隊資料庫、00B 實績資料庫、00C 時程範本庫"));
  children.push(makeBullet("00D 應變 SOP 庫、00E 案後檢討庫、00F 創意庫（新增）"));
  children.push(makeBullet("AI 寫作時自動注入最相關的知識"));
  children.push(makeBullet("案件結束後自動回流更新"));
  children.push(makePara([
    makeRun("解決痛點", { bold: true }),
    makeRun("：#4, #16, #17, #23（4 條）"),
  ]));

  // 能力 3
  children.push(makeH2("能力 3：統一 AI 調度中心"));
  children.push(makeBullet("每案一個工作區（Discord Forum 帖 = 所有對話/產出/進度都在一起）"));
  children.push(makeBullet("自動選 AI、帶入知識庫 + 本案脈絡 + 作戰計畫"));
  children.push(makeBullet("不需重新調校，系統永遠記得"));
  children.push(makeBullet("多案並行：獨立工作區，一鍵切換"));
  children.push(makePara([
    makeRun("解決痛點", { bold: true }),
    makeRun("：#5, #6, #7, #8, #9（5 條）"),
  ]));

  // 能力 4
  children.push(makeH2("能力 4：AI 品質閘門"));
  children.push(makePara("每段產出經過三道檢查："));
  children.push(makeTable(
    ["閘門", "檢查內容"],
    [
      ["閘門 1 事實查核", "有知識庫來源嗎？"],
      ["閘門 2 需求對照", "回應了哪個評分項目？"],
      ["閘門 3 實務檢驗", "預算做得到？對象用得了？公司有能力？"],
    ],
    [30, 70]
  ));
  children.push(makePara([
    makeRun("解決痛點", { bold: true }),
    makeRun("：#10, #11, #12, #23（4 條）"),
  ]));

  // 能力 5
  children.push(makeH2("能力 5：視覺生成整合"));
  children.push(makeBullet("寫到需要圖的地方，系統建議並生成對應圖像"));
  children.push(makeBullet("一案一套視覺風格，圖文同源"));
  children.push(makeBullet("目前用 Nano Banana（Gemini 網頁版）手動做先將就"));
  children.push(makePara([makeRun("解決痛點", { bold: true }), makeRun("：#13（1 條）")]));

  // 能力 6
  children.push(makeH2("能力 6：排版輸出 + 落標學習"));
  children.push(makeBullet("排版：建議書/簡報一鍵匯出，套用公司模板"));
  children.push(makeBullet("落標學習：結構化分析每案結果，累積後校準篩案機制"));
  children.push(makePara([makeRun("解決痛點", { bold: true }), makeRun("：#14, #15, #18（3 條）")]));

  // 總覽表
  children.push(makeH2("能力 vs 痛點總覽"));
  children.push(makeTable(
    ["能力", "痛點數", "痛點編號"],
    [
      ["1. 戰略分析引擎", "7", "#1, #2, #3, #19, #20, #21, #22"],
      ["2. 公司知識庫", "4", "#4, #16, #17, #23"],
      ["3. 統一 AI 調度中心", "5", "#5, #6, #7, #8, #9"],
      ["4. AI 品質閘門", "4", "#10, #11, #12, #23"],
      ["5. 視覺生成整合", "1", "#13"],
      ["6. 排版輸出+落標學習", "3", "#14, #15, #18"],
    ],
    [35, 15, 50]
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══ 5. 技術架構 ═══
  children.push(makeH1("5. 技術架構"));

  children.push(makeH2("5.1 雙介面架構"));
  children.push(...makeCodeBlock([
    "┌─────────────────────────────────────────────┐",
    "│                  使用者                       │",
    "│       ┌──────────┐    ┌──────────┐           │",
    "│       │ Discord  │    │ Web App  │           │",
    "│       │（駕駛座） │    │（儀表板）│           │",
    "│       └────┬─────┘    └────┬─────┘           │",
    "│            │               │                  │",
    "│       ┌────▼───────────────▼─────┐           │",
    "│       │     共用 API 層           │           │",
    "│       │ （Next.js API Routes）    │           │",
    "│       └────┬───────────────┬─────┘           │",
    "│            │               │                  │",
    "│  ┌─────────▼──┐   ┌───────▼────────┐        │",
    "│  │  Notion DB  │   │ 知識庫（本地）  │        │",
    "│  └────────────┘   └────────────────┘        │",
    "└─────────────────────────────────────────────┘",
  ]));

  children.push(makeTable(
    ["", "Discord Bot（駕駛座）", "Web App（儀表板）"],
    [
      ["定位", "日常操作介面（做事）", "管理後台（看全局）"],
      ["誰用", "企劃、行政、所有人", "管理者、需全局視圖時"],
      ["操作", "上傳文件、下指令、跑分析、輸出文件", "統計報表、知識庫維護、系統設定"],
    ],
    [15, 42, 43]
  ));

  children.push(makeH2("5.2 AI 工具生態系"));
  children.push(makePara([makeRun("原則：全部走現有訂閱，額外成本 = $0", { bold: true, color: COLOR_PRIMARY })]));
  children.push(makeTable(
    ["工具", "方案", "月費", "串接方式", "系統角色"],
    [
      ["Claude", "Max 20x", "$200", "CLI + MCP", "主力 AI（寫作/分析/品質檢查）"],
      ["OpenAI", "Pro", "$200", "CLI + MCP", "備援 AI（寫作/創意）"],
      ["Gemini", "Ultra", "~$22", "CLI + MCP", "備援 AI（研究/長上下文）"],
      ["Perplexity", "Max", "~$20", "網頁版手動", "深度網路研究（P 偵察報告）"],
      ["Notion", "商業版+AI", "~$28/人", "MCP 已連", "資料庫/知識管理"],
    ],
    [15, 15, 12, 20, 38]
  ));

  children.push(makePara("最終工具生態系（額外安裝 = 0）："));
  children.push(...makeCodeBlock([
    "P（Perplexity 網頁版）  → 外部情報（P 偵察報告）",
    "C（Claude Code, 1M）    → 文件分析 + 策略推理 + L1-L8",
    "Napkin AI（網頁版）     → 資訊圖表（流程圖/組織圖/甘特圖）",
    "Nano Banana（Gemini）   → 視覺概念圖/插畫",
    "NotebookLM（備用）      → PDF 精準檢索",
  ]));

  children.push(makeH2("5.3 核心技術棧"));
  children.push(makeTable(
    ["層", "技術", "說明"],
    [
      ["Web 框架", "Next.js 16 + React 19 + TypeScript", "App Router + Turbopack"],
      ["UI", "shadcn/radix-ui + Tailwind CSS 4", "中文優先"],
      ["圖表", "recharts", "儀表板統計"],
      ["Discord Bot", "discord.js", "Slash Commands + Forum + Embeds"],
      ["資料源", "Notion API (@notionhq/client)", "案件主庫"],
      ["知識庫", "本地 Markdown + 向量化索引（待選型）", "00A-00F"],
      ["文件生成", "docx 套件", "內部文件 .docx"],
      ["測試", "Vitest + Testing Library", "單元 + 元件"],
    ],
    [20, 40, 40]
  ));

  children.push(makeH2("5.4 已建成的基礎設施"));
  children.push(makeTable(
    ["基礎設施", "狀態", "說明"],
    [
      ["Feature Registry + 設定系統", "✅", "所有模組可開關"],
      ["API Routes", "✅", "Notion 查詢路由"],
      ["UI 元件庫", "✅", "shadcn 基礎元件"],
      ["階段設定（STAGES / PROMPT_FILES）", "✅", "L1-L8 設定"],
      ["Notion API 整合", "✅", "唯讀查詢"],
      ["Logger 服務", "✅", "分類日誌"],
      ["品質檢查", "⚠️ 基礎", "regex（禁用詞/術語）"],
      ["知識庫 UI", "⚠️ 骨架", "骨架有了，內容空"],
      ["Docx 匯出", "⚠️ 骨架", "UI 有，無生成邏輯"],
    ],
    [35, 15, 50]
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══ 6. Discord Bot 規格 ═══
  children.push(makeH1("6. Discord Bot 規格"));

  children.push(makeH2("6.1 頻道結構"));
  children.push(...makeCodeBlock([
    "📂 標案系統（新增 Discord 分類）",
    "├── #標案公告        一般頻道｜bot 單向推播",
    "├── #標案指令台      一般頻道｜通用指令",
    "└── 📋 標案工作區    Forum 頻道｜每案一帖",
    "         標籤：🔵新案 🟡分析中 🟠寫作中 🔴審查中 ✅已投標 ⚫結案",
  ]));
  children.push(makeBullet("Forum 頻道：每案一帖，天然支援標籤過濾、格狀瀏覽、自動歸檔"));
  children.push(makeBullet("等同輕量案件看板，直接解決痛點 #6（多案並行）"));

  children.push(makeH2("6.2 案件生命週期"));
  children.push(...makeCodeBlock([
    "行政上傳招標文件到 #標案指令台",
    "  → bot 自動處理（分類/清理/摘要）",
    "  → 摘要貼到 #標案公告",
    "  → 企劃 /case claim 認領",
    "  → bot 在 📋標案工作區 自動開 Forum 帖",
    "  → 企劃在帖內：",
    "      /l1 → 戰略分析",
    "      /l2 → 備標規劃",
    "      /l3 <章節> → 撰寫",
    "      /check all → 品質閘門",
    "      /export proposal → bot 回傳建議書檔案",
    "  → 案件結束 → 標籤改 ⚫結案，帖自動歸檔",
  ]));

  children.push(makeH2("6.3 指令清單"));

  children.push(makeH3("一、案件管理"));
  children.push(makeTable(
    ["指令", "說明", "位置"],
    [
      ["/case new", "上傳招標文件 → 自動分類/清理/摘要/建帖", "#標案指令台"],
      ["/case list", "列出進行中案件（可篩選）", "#標案指令台"],
      ["/case info <案號>", "查看案件詳情", "任何地方"],
      ["/case claim", "企劃認領案件", "Forum 帖內"],
      ["/case status <標籤>", "更新案件標籤", "Forum 帖內"],
      ["/case deadline", "所有案件截標日倒數", "#標案指令台"],
    ],
    [25, 50, 25]
  ));

  children.push(makeH3("二、戰略分析（L1 + P 偵察）"));
  children.push(makeTable(
    ["指令", "說明", "位置"],
    [
      ["/p-report", "生成 P 偵察報告模板", "Forum 帖內"],
      ["/p-report upload", "上傳完成的 P 偵察報告", "Forum 帖內"],
      ["/l1", "跑 L1 戰略分析（帶入所有資料）", "Forum 帖內"],
      ["/l1 summary", "顯示 L1 摘要", "Forum 帖內"],
      ["/bid-decision", "彙整 L1 結果供團隊討論", "Forum 帖內"],
    ],
    [25, 50, 25]
  ));

  children.push(makeH3("三、寫作流程（L2-L4）"));
  children.push(makeTable(
    ["指令", "說明", "位置"],
    [
      ["/l2", "L2 備標規劃", "Forum 帖內"],
      ["/l3 <章節>", "L3 撰寫指定章節", "Forum 帖內"],
      ["/l3 status", "各章節完成度", "Forum 帖內"],
      ["/l4", "L4 品質審查（全案）", "Forum 帖內"],
      ["/l4 <章節>", "L4 品質審查（指定章節）", "Forum 帖內"],
    ],
    [25, 50, 25]
  ));

  children.push(makeH3("四、品質閘門"));
  children.push(makeTable(
    ["指令", "說明", "位置"],
    [
      ["/check facts", "事實查核（追溯知識庫來源）", "Forum 帖內"],
      ["/check requirements", "需求對照（評分項目覆蓋度）", "Forum 帖內"],
      ["/check feasibility", "實務檢驗（預算/能力/承諾）", "Forum 帖內"],
      ["/check all", "三道閘門全跑", "Forum 帖內"],
    ],
    [25, 50, 25]
  ));

  children.push(makeH3("五、知識庫"));
  children.push(makeTable(
    ["指令", "說明", "位置"],
    [
      ["/kb search <關鍵字>", "搜尋知識庫（00A-00F 全搜）", "任何地方"],
      ["/kb team", "查詢團隊資料（00A）", "任何地方"],
      ["/kb portfolio <關鍵字>", "查詢相關實績（00B）", "任何地方"],
      ["/kb sop <關鍵字>", "查詢相關 SOP（00D）", "任何地方"],
      ["/kb add", "上傳資料到知識庫", "#標案指令台"],
    ],
    [28, 47, 25]
  ));

  children.push(makeH3("六、文件輸出"));
  children.push(makeTable(
    ["指令", "說明", "位置"],
    [
      ["/export proposal", "匯出建議書（docx）", "Forum 帖內"],
      ["/export slides", "匯出評選簡報", "Forum 帖內"],
      ["/export l1", "匯出 L1 分析報告", "Forum 帖內"],
      ["/export checklist", "匯出投標檢核清單", "Forum 帖內"],
    ],
    [25, 50, 25]
  ));

  children.push(makeH3("七、自動推播（不需指令）"));
  children.push(makeTable(
    ["事件", "推到", "內容"],
    [
      ["新標案匹配", "#標案公告", "案名、預算、截標日、AI 推薦理由"],
      ["截標倒數 7 天", "#標案公告 + @企劃", "提醒"],
      ["截標倒數 3 天", "#標案公告 + @企劃", "警告"],
      ["品質閘門未過", "Forum 帖內", "問題清單"],
      ["案件階段變更", "Forum 帖內", "狀態更新"],
    ],
    [25, 30, 45]
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══ 7. 開發路線圖 ═══
  children.push(makeH1("7. 開發路線圖"));

  children.push(makeH2("7.1 總覽"));
  children.push(...makeCodeBlock([
    "Layer 0 — 不需系統，馬上做（本週）",
    "  └── 知識庫手動建立（T1 精靈 + Claude 對話式建庫）",
    "",
    "Layer 1 — 最直接影響得標率（先蓋）",
    "  ├── P0：Discord Bot 基礎建設",
    "  ├── P1：戰略分析引擎 + 知識庫查詢",
    "  └── P2：寫作流程 + 品質閘門 + 文件輸出",
    "",
    "Layer 2 — 提升效率和體驗（接著蓋）",
    "  ├── P3：自動推播 + 截標提醒",
    "  └── P4：排版輸出 + 落標學習",
    "",
    "Layer 3 — 錦上添花（最後蓋）",
    "  ├── 視覺生成整合",
    "  └── 行政端自動化（pcc-api）",
  ]));

  children.push(makeH2("7.2 Layer 0：知識庫手動建立"));
  children.push(makePara([makeRun("目標", { bold: true }), makeRun("：讓 L1-L8 從裸奔變有彈藥，馬上提升 AI 產出品質。")]));
  children.push(makePara("做法："));
  children.push(makeBullet("跟 Claude 聊過去做過的案子 → 產出 00E 初始內容"));
  children.push(makeBullet("把 00E 餵給 T1 知識庫維護精靈 → 自動拆解出 00A/00B/00C/00D"));
  children.push(makeBullet("確認、補充、修正 → 知識庫建立完成"));
  children.push(makePara([makeRun("預估 2-3 天，不需要等系統蓋好。", { bold: true, color: COLOR_PRIMARY })]));

  children.push(makeH2("7.3 Layer 1：最直接影響得標率"));

  children.push(makeH3("P0：Discord Bot 基礎建設"));
  children.push(makeTable(
    ["功能", "說明"],
    [
      ["Bot 框架", "discord.js + Slash Commands 註冊"],
      ["/case new", "上傳招標文件 → 儲存 + 建 Forum 帖"],
      ["/case list", "列出進行中案件"],
      ["/case info", "查看案件詳情"],
      ["/case claim", "認領案件"],
      ["/case status", "更新標籤"],
      ["/case deadline", "截標日倒數"],
      ["Forum 帖自動建立", "含標籤、案件摘要、基本資訊"],
      ["Notion 連動", "案件資訊同步（雙向）"],
    ],
    [30, 70]
  ));

  children.push(makeH3("P1：戰略分析 + 知識庫查詢"));
  children.push(makeTable(
    ["功能", "說明"],
    [
      ["/p-report", "生成 P 偵察報告模板"],
      ["/p-report upload", "上傳 P 報告"],
      ["/l1", "跑 L1 v2.3 戰略分析（帶入所有資料）"],
      ["/l1 summary", "顯示分析摘要"],
      ["/bid-decision", "投標決策彙整"],
      ["/kb search", "知識庫全文搜尋"],
      ["/kb team / portfolio / sop", "分類查詢"],
    ],
    [30, 70]
  ));

  children.push(makeH3("P2：寫作流程 + 品質閘門 + 文件輸出"));
  children.push(makeTable(
    ["功能", "說明"],
    [
      ["/l2", "備標規劃"],
      ["/l3 <章節>", "章節撰寫"],
      ["/l3 status", "章節完成度追蹤"],
      ["/l4", "品質審查"],
      ["/check all", "三道品質閘門"],
      ["/export proposal", "匯出建議書 docx"],
      ["/export l1 / checklist", "匯出報告 / 檢核清單"],
      ["/kb add", "上傳資料到知識庫"],
    ],
    [30, 70]
  ));

  children.push(makeH2("7.4 Layer 2：提升效率和體驗"));
  children.push(makeH3("P3：自動推播"));
  children.push(makeBullet("新標案匹配 → 推到 #標案公告"));
  children.push(makeBullet("截標倒數 7 天 / 3 天 → @相關企劃"));
  children.push(makeBullet("品質閘門未過 → 自動通知"));

  children.push(makeH3("P4：排版輸出 + 落標學習"));
  children.push(makeBullet("建議書排版：套用公司模板，一鍵匯出"));
  children.push(makeBullet("落標分析：結構化收集落標意見"));
  children.push(makeBullet("經驗回流：自動更新知識庫（00E → T1 → 00A-00D）"));
  children.push(makeBullet("篩案校準：落標數據回饋到 L1 決策矩陣"));

  children.push(makeH2("7.5 Layer 3：錦上添花"));
  children.push(makeBullet("視覺生成整合：寫到需要圖時自動建議並生成"));
  children.push(makeBullet("pcc-api 監控：自動發現新標案（取代行政手動刷）"));
  children.push(makeBullet("行政自動化：AI 分類/清理/摘要/情蒐"));

  children.push(makeH2("7.6 排序邏輯"));
  children.push(makeTable(
    ["優先級", "邏輯"],
    [
      ["Layer 0 先行", "不需要系統就能馬上提升 AI 產出品質，本週就做"],
      ["P0 最高", "Discord Bot 是系統的主要介面，沒有它什麼都做不了"],
      ["P1 緊接 P0", "戰略分析是得標的第一步，知識庫是 AI 寫作的彈藥"],
      ["P2 接 P1", "有了分析和知識庫，才能寫出有品質的建議書"],
      ["P3 獨立", "通知系統可以隨時加，不影響核心流程"],
      ["P4 需要 P2", "排版建立在有內容的前提上，落標學習需要案件數據累積"],
      ["Layer 3 最後", "視覺目前手動做先將就，行政端已穩定不急"],
    ],
    [20, 80]
  ));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══ 8. 提示詞系統 ═══
  children.push(makeH1("8. 提示詞系統"));

  children.push(makeH2("8.1 檔案結構（22 個檔案）"));
  children.push(makePara("提示詞系統放在 public/prompts/，是公司投標作業的 AI 操作手冊。"));

  children.push(makePara([makeRun("系統核心層（所有階段載入）", { bold: true })]));
  children.push(makeBullet("00-1_系統核心_v2.0.md — 角色定義 + 公司背景 + GC-01~10"));
  children.push(makeBullet("00-3_階段索引_v2.0.md — 工作流程 + 知識庫矩陣"));

  children.push(makePara([makeRun("撰寫規範層（L3/L4 載入）", { bold: true })]));
  children.push(makeBullet("00-2_撰寫規範_v2.0.md — 六大鐵律 + 章節結構 + 範本庫"));

  children.push(makePara([makeRun("8 個階段提示詞", { bold: true })]));
  children.push(makeBullet("L1 戰略分析 v2.3（含 P 偵察報告整合、真實競爭分析）"));
  children.push(makeBullet("L2 備標規劃 v2.1"));
  children.push(makeBullet("L3 企劃草稿 v2.1（最複雜，含完整報價流程）"));
  children.push(makeBullet("L4 定稿撰寫 v2.0"));
  children.push(makeBullet("L5 評選分析 v2.0"));
  children.push(makeBullet("L6 簡報規劃 v2.0"));
  children.push(makeBullet("L7 講稿腳本 v2.0"));
  children.push(makeBullet("L8 模擬演練 v2.0"));

  children.push(makePara([makeRun("P 偵察報告（新增）", { bold: true })]));
  children.push(makeBullet("P_偵察報告_v1.0.md — 填入案件資訊後貼入 Perplexity Deep Research"));

  children.push(makePara([makeRun("5 座知識庫", { bold: true })]));
  children.push(makeBullet("00A 團隊、00B 實績、00C 時程、00D 應變、00E 檢討"));

  children.push(makePara([makeRun("工具", { bold: true })]));
  children.push(makeBullet("T1 知識庫維護精靈 v2.0（915 行，5 個 Phase）"));
  children.push(makeBullet("T3 報價編列指南 v2.0"));

  children.push(makeH2("8.2 知識庫引用矩陣"));
  children.push(makeTable(
    ["階段", "00A 團隊", "00B 實績", "00C 時程", "00D 應變", "00E 檢討"],
    [
      ["L1 前半（需求分析）", "—", "—", "—", "—", "—"],
      ["L1 後半（適配度）", "○", "●", "—", "—", "○"],
      ["L2 備標規劃", "○", "○", "—", "—", "○"],
      ["L3 企劃草稿", "—", "—", "●", "●", "—"],
      ["L4 定稿撰寫", "●", "●", "●", "●", "—"],
      ["L5 評選分析", "—", "○", "—", "—", "—"],
      ["L6 簡報規劃", "—", "—", "—", "—", "—"],
      ["L7 講稿腳本", "○", "—", "—", "—", "—"],
      ["L8 模擬演練", "—", "—", "—", "—", "—"],
    ],
    [22, 16, 16, 15, 15, 16]
  ));
  children.push(makePara("● 必要引用　○ 選擇性引用　— 不需引用", { size: 20, color: COLOR_GRAY }));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══ 9. 設計原則 ═══
  children.push(makeH1("9. 設計原則"));

  children.push(makeH2("9.1 Discord 優先"));
  children.push(makePara("Discord 是團隊每天打開的工具。所有「做事」的功能放 Discord，Web app 只做「看全局」和「改設定」。不要在 Web app 裡蓋 Discord 已經做得好的東西（聊天、通知、檔案分享）。"));

  children.push(makeH2("9.2 人機協作，不是無人自動化"));
  children.push(makeBullet("系統不取代人的判斷，只讓判斷所需的資訊更容易取得"));
  children.push(makeBullet("AI 的斷點（A/B/C/D/E）在系統中可見、可追蹤，但決策權仍在人手上"));
  children.push(makeBullet("容災設計：任何工具掛了，人都能切到替代方案繼續工作"));

  children.push(makeH2("9.3 從收入公式逆推"));
  children.push(makePara([makeRun("每個功能都要能回答：這推動了收入公式的哪一項？", { bold: true, color: COLOR_PRIMARY })]));

  children.push(makeH2("9.4 飛輪思維"));
  children.push(makePara("每個案件的結果（得標或落標）都要回饋到系統，讓下次更好。知識庫是飛輪的燃料，結案回饋是飛輪的齒輪。"));

  children.push(makeH2("9.5 技術原則"));
  children.push(makeBullet("SSOT（Single Source of Truth）：常數只定義一次"));
  children.push(makeBullet("Feature Registry Pattern：所有模組在註冊表中管理"));
  children.push(makeBullet("閉環開發：寫碼 → 審查 → 測試 → build → 驗證"));
  children.push(makeBullet("Hydration-safe：所有 localStorage 操作用 useEffect"));
  children.push(makeBullet("中文優先：所有 UI 文字使用繁體中文"));

  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ═══ 附錄 ═══
  children.push(makeH1("附錄"));

  children.push(makeH2("附錄 A：交付物格式規格"));
  children.push(makeH3("內部文件（.docx）— GC-10 規格"));
  children.push(makeTable(
    ["規格項目", "設定值"],
    [
      ["紙張尺寸", "A4（11906 × 16838 DXA）"],
      ["邊距", "上下左右各 1 英吋（1440 DXA）"],
      ["預設字型", "標楷體 12pt（24 half-points）"],
      ["Heading 1", "16pt 粗體，含 outlineLevel"],
      ["Heading 2", "14pt 粗體"],
      ["Heading 3", "12pt 粗體"],
      ["表格框線", "SINGLE, size=1, color=CCCCCC"],
      ["表頭底色", "fill=D5E8F0"],
    ],
    [30, 70]
  ));

  children.push(makeH3("服務建議書正式稿（直式 A4）"));
  children.push(makeBullet("直式 Portrait、A4（210mm × 297mm）"));
  children.push(makeBullet("印刷裝訂送件，評委翻閱紙本"));
  children.push(makeBullet("排版品質等同專業設計公司出品"));

  children.push(makeH3("評選簡報（橫式 16:9）"));
  children.push(makeBullet("橫式 Landscape、16:9（33.867cm × 19.05cm）"));
  children.push(makeBullet("評選現場投影，大字少字、視覺主導"));

  children.push(makeH2("附錄 B：v3.0 → v4.0 對照"));
  children.push(makeTable(
    ["項目", "v3.0（已廢止）", "v4.0（本版）"],
    [
      ["定位", "L1-L8 的指揮中心", "AI 提案寫作駕駛艙"],
      ["主介面", "Web App", "Discord Bot"],
      ["AI 調用", "不調用 AI API", "Bot 調度 AI"],
      ["開發順序", "A→B→C→...→J（10 批次）", "Layer 0→1→2→3（能力導向）"],
      ["知識庫", "Batch I（倒數第二）", "Layer 0（第一個做）"],
      ["結案回饋", "Batch J（最後）", "Layer 2 P4（提前）"],
      ["Discord", "未排期", "系統核心介面"],
      ["痛點覆蓋", "按角色分（5 角色）", "按能力分（6 能力 × 23 痛點）"],
    ],
    [20, 40, 40]
  ));

  children.push(spacer(400));
  children.push(new Paragraph({
    children: [new TextRun({ text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", size: 24, color: COLOR_ACCENT, font: { ascii: "Consolas" } })],
    alignment: AlignmentType.CENTER,
  }));
  children.push(new Paragraph({
    children: [makeRun("文件修訂紀錄", { bold: true, size: 22, color: COLOR_GRAY })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
  }));
  children.push(makeTable(
    ["日期", "版本", "修訂內容"],
    [
      ["2025-02-17", "v3.0", "第一性原理重構。廢止前版 plan"],
      ["2026-02-18", "v4.0", "提案寫作駕駛艙版。重新定位系統、Discord Bot 為主介面、能力導向開發路線、23 痛點對症下藥"],
    ],
    [15, 10, 75]
  ));

  return children;
}

// ── 組裝文件 ──
async function main() {
  const doc = new Document({
    creator: "大員洛川股份有限公司",
    title: "全能標案助理 — 開發計畫書 v4.0",
    description: "提案寫作駕駛艙版",
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: FONT_EN, eastAsia: FONT },
            size: 24,
            color: COLOR_DARK,
          },
        },
      },
    },
    numbering: {
      config: [{
        reference: "default-bullet",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [makeRun("全能標案助理 — 開發計畫書 v4.0", { size: 18, color: COLOR_GRAY })],
              alignment: AlignmentType.RIGHT,
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [
                makeRun("大員洛川股份有限公司", { size: 18, color: COLOR_GRAY }),
                makeRun("    |    第 ", { size: 18, color: COLOR_GRAY }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: COLOR_GRAY, font: { ascii: FONT_EN } }),
                makeRun(" 頁", { size: 18, color: COLOR_GRAY }),
              ],
              alignment: AlignmentType.CENTER,
            })],
          }),
        },
        children: [
          ...coverPage(),
          ...buildSections(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, "..", "docs", "開發計畫書_v4.0_提案寫作駕駛艙版.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Generated:", outPath);
  console.log("Size:", (buffer.length / 1024).toFixed(1), "KB");
}

main().catch(console.error);
