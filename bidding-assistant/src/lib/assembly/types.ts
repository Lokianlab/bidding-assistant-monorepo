import type { PromptFile, KBRef } from "@/data/config/prompt-assembly";

/** 檔案清單中的一個項目（含原因和引用類型） */
export interface FileListItem {
  file: PromptFile;
  reason: string;
  ref?: KBRef;
  /** 是否自動載入（true = required/always, false = optional/manual） */
  auto: boolean;
}
