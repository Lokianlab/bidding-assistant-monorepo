export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogCategory =
  | "api"
  | "settings"
  | "navigation"
  | "cache"
  | "render"
  | "system"
  | "sync"
  | "cron";

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: string;
  source?: string;
}
