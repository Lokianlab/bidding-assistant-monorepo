import type { LogLevel, LogCategory, DebugLogEntry } from "./types";

export type { LogLevel, LogCategory, DebugLogEntry } from "./types";

export interface LogFilters {
  level?: LogLevel;
  category?: LogCategory;
  search?: string;
}

const STORAGE_KEY = "bidding-assistant-debug-logs";
const MAX_ENTRIES = 500;

class DebugLogger {
  private static instance: DebugLogger | null = null;

  private constructor() {
    // Private constructor enforces singleton pattern
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  // ---------------------------------------------------------------------------
  // Core logging
  // ---------------------------------------------------------------------------

  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: string,
    source?: string
  ): DebugLogEntry | null {
    if (typeof window === "undefined") return null;

    const entry: DebugLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...(details !== undefined && { details }),
      ...(source !== undefined && { source }),
    };

    const entries = this.readFromStorage();
    entries.push(entry);

    // Ring buffer: keep the most recent MAX_ENTRIES items
    if (entries.length > MAX_ENTRIES) {
      entries.splice(0, entries.length - MAX_ENTRIES);
    }

    this.writeToStorage(entries);
    return entry;
  }

  // ---------------------------------------------------------------------------
  // Convenience helpers
  // ---------------------------------------------------------------------------

  debug(category: LogCategory, message: string, details?: string, source?: string) {
    return this.log("debug", category, message, details, source);
  }

  info(category: LogCategory, message: string, details?: string, source?: string) {
    return this.log("info", category, message, details, source);
  }

  warn(category: LogCategory, message: string, details?: string, source?: string) {
    return this.log("warn", category, message, details, source);
  }

  error(category: LogCategory, message: string, details?: string, source?: string) {
    return this.log("error", category, message, details, source);
  }

  // ---------------------------------------------------------------------------
  // Retrieval (newest first)
  // ---------------------------------------------------------------------------

  getEntries(filters?: LogFilters): DebugLogEntry[] {
    if (typeof window === "undefined") return [];

    let entries = this.readFromStorage();

    if (filters?.level) {
      entries = entries.filter((e) => e.level === filters.level);
    }

    if (filters?.category) {
      entries = entries.filter((e) => e.category === filters.category);
    }

    if (filters?.search) {
      const keyword = filters.search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.message.toLowerCase().includes(keyword) ||
          (e.details && e.details.toLowerCase().includes(keyword)) ||
          (e.source && e.source.toLowerCase().includes(keyword))
      );
    }

    // Return newest first
    return entries.reverse();
  }

  // ---------------------------------------------------------------------------
  // Management
  // ---------------------------------------------------------------------------

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  }

  export(): string {
    if (typeof window === "undefined") return "[]";

    const entries = this.getEntries();
    return JSON.stringify(entries, null, 2);
  }

  // ---------------------------------------------------------------------------
  // Internal storage helpers
  // ---------------------------------------------------------------------------

  private readFromStorage(): DebugLogEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(entries: DebugLogEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage full or unavailable -- silently ignore
    }
  }
}

export const logger = DebugLogger.getInstance();
export default logger;
