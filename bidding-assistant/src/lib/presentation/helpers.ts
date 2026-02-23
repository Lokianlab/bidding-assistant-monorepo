// M08 評選簡報 - 輔助函式

import { TemplateType, PresentationSlide, CaseData } from './types';

// 根據案件類型選擇簡報結構
export function getSlideStructure(templateType: TemplateType): string[] {
  const structures: Record<TemplateType, string[]> = {
    engineering: [
      '封面',
      '公司簡介',
      '工程資質',
      '技術方案',
      '實績案例',
      '時程計畫',
      '團隊組成',
      'Q&A 預備',
    ],
    consulting: [
      '封面',
      '公司簡介',
      '顧問經驗',
      '服務方法論',
      '本案工作計畫',
      '團隊背景',
      '預期成果',
      'Q&A 預備',
    ],
    software: [
      '封面',
      '公司簡介',
      '技術棧',
      '產品功能',
      '安全性 / 效能',
      '開發團隊',
      '支援與維護',
      'Q&A 預備',
    ],
  };

  return structures[templateType];
}

// 生成簡報 ID
export function generatePresentationId(): string {
  return `pres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 生成投影片 ID
export function generateSlideId(): string {
  return `slide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 計算講稿字數
export function countChars(text: string): number {
  return text.replace(/\s+/g, '').length;
}

// 驗證講稿字數（目標 100-150）
export function validateSpeakerNotes(notes: string): {
  isValid: boolean;
  charCount: number;
  message?: string;
} {
  const charCount = countChars(notes);
  if (charCount < 50) {
    return {
      isValid: false,
      charCount,
      message: '講稿過短，建議 100-150 字',
    };
  }
  if (charCount > 300) {
    return {
      isValid: false,
      charCount,
      message: '講稿過長，建議 100-150 字',
    };
  }
  return {
    isValid: true,
    charCount,
  };
}

// 建構簡報對象
export function buildPresentation(
  caseId: string,
  templateType: TemplateType,
  slides: PresentationSlide[]
) {
  return {
    id: generatePresentationId(),
    case_id: caseId,
    template_type: templateType,
    slides,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
