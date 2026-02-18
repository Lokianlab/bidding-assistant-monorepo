export interface StageDefinition {
  id: string;
  name: string;
  phase: "投標" | "評選";
  triggerCommand: string;
  description: string;
  promptFile: string;
  expectedOutput: string;
  dialogTips: string;
}

export const STAGES: StageDefinition[] = [
  {
    id: "L1",
    name: "戰略分析",
    phase: "投標",
    triggerCommand: "/分析",
    description: "分析招標文件，產出戰略分析報告與需求對焦提問清單",
    promptFile: "stages/01.md",
    expectedOutput: "戰略分析報告 + 需求對焦提問清單",
    dialogTips: "建議 3-5 輪來回，先上傳招標文件 PDF",
  },
  {
    id: "L2",
    name: "備標規劃",
    phase: "投標",
    triggerCommand: "/規劃",
    description: "根據分析報告與需求對焦結果，產出備標規劃書",
    promptFile: "stages/02.md",
    expectedOutput: "備標規劃書",
    dialogTips: "建議 3-5 輪來回",
  },
  {
    id: "L3",
    name: "企劃草稿",
    phase: "投標",
    triggerCommand: "/企劃",
    description: "根據規劃書產出企劃稿與經費預算表",
    promptFile: "stages/03.md",
    expectedOutput: "企劃稿 + 經費預算表",
    dialogTips: "內容較長，建議分章節產出，每輪 5-8 輪來回",
  },
  {
    id: "L4",
    name: "定稿撰寫",
    phase: "投標",
    triggerCommand: "/撰寫",
    description: "根據審定企劃稿產出各章正式文字初稿",
    promptFile: "stages/04.md",
    expectedOutput: "各章正式文字初稿",
    dialogTips: "建議一次一章，每章獨立對話",
  },
  {
    id: "L5",
    name: "評選分析",
    phase: "評選",
    triggerCommand: "/評選分析",
    description: "分析建議書完稿與評分標準，產出評選戰略分析報告",
    promptFile: "stages/05.md",
    expectedOutput: "評選戰略分析報告 + 戰略摘要",
    dialogTips: "建議 3-5 輪來回，需上傳建議書完稿",
  },
  {
    id: "L6",
    name: "簡報規劃",
    phase: "評選",
    triggerCommand: "/簡報規劃",
    description: "根據評選分析報告規劃簡報頁面架構與時間分配",
    promptFile: "stages/06.md",
    expectedOutput: "簡報頁面架構 + 時間分配 + 架構摘要",
    dialogTips: "建議 2-3 輪來回",
  },
  {
    id: "L7",
    name: "講稿腳本",
    phase: "評選",
    triggerCommand: "/講稿腳本",
    description: "根據簡報規劃產出逐頁講稿與 Q&A 題庫",
    promptFile: "stages/07.md",
    expectedOutput: "逐頁講稿 + Q&A 題庫",
    dialogTips: "建議 3-5 輪來回",
  },
  {
    id: "L8",
    name: "模擬演練",
    phase: "評選",
    triggerCommand: "/模擬演練",
    description: "根據講稿腳本進行模擬演練，產出演練診斷報告",
    promptFile: "stages/08.md",
    expectedOutput: "演練診斷報告 + 評選日備忘錄",
    dialogTips: "建議 3-5 輪來回，可多次演練",
  },
];

export const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.id, s]));
