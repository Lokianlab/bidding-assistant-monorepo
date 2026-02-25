/**
 * Knowledge Base v2 -- Drive file scanning & card indexing types
 */

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderPath: string;
  modifiedTime: string;
  webViewLink: string;
}

export interface ExtractedPage {
  page_number: number;
  text: string;
  card_type: 'slide' | 'document_section' | 'table';
  is_scannable: boolean;
  scan_error?: string;
}

export interface CardGenerationInput {
  page_number: number;
  text: string;
  source_file_name: string;
  source_folder_path: string;
}

export interface GeneratedCard {
  title: string;
  summary: string;
  tags: string[];
  category: string;
  subcategory: string;
}

export type IndexStatus = 'idle' | 'scanning' | 'processing' | 'done' | 'error';

export interface InitProgress {
  total_files: number;
  processed_files: number;
  total_cards: number;
  errors: string[];
  status: IndexStatus;
  started_at: string;
  current_file?: string;
}

export interface CategoryNode {
  name: string;
  count: number;
  children: CategoryNode[];
}
