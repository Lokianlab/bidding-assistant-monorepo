/**
 * Knowledge Base v2 -- constants
 */

export const SUPPORTED_MIME_TYPES: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.google-apps.document': 'gdoc',
  'application/vnd.google-apps.presentation': 'gslides',
};

export const CATEGORIES = ['展覽', '活動', '教育', '文化', '設計', '行政', '其他'] as const;

/** Number of cards to send per AI generation batch */
export const SCAN_BATCH_SIZE = 5;

/** Delay (ms) between Drive API calls to avoid rate limiting */
export const API_DELAY_MS = 200;
