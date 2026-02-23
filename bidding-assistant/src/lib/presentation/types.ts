// M08 評選簡報 - 資料型別定義

export type TemplateType = 'engineering' | 'consulting' | 'software';

export interface PresentationSlide {
  id: string;
  slide_index: number;
  title: string;
  key_points: string[];
  speaker_notes: string;
  speaker_notes_char_count: number;
  created_at: string;
  updated_at: string;
}

export interface Presentation {
  id: string;
  case_id: string;
  template_type: TemplateType;
  slides: PresentationSlide[];
  created_at: string;
  updated_at: string;
}

export interface CaseData {
  name: string;
  budget?: string;
  requirements?: string;
  category?: string;
  [key: string]: any;
}

export interface GenerateSlidesRequest {
  case_id: string;
  template_type: TemplateType;
  case_data: CaseData;
}

export interface GenerateSlidesResponse {
  presentation_id: string;
  slides: PresentationSlide[];
  created_at: string;
}
