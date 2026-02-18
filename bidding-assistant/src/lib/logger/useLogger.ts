"use client";

import { useState, useCallback, useMemo } from "react";
import { logger } from "./index";
import type { LogLevel, LogCategory, DebugLogEntry } from "./types";

export interface UseLoggerFilters {
  level?: LogLevel;
  category?: LogCategory;
  search?: string;
}

export interface UseLoggerReturn {
  entries: DebugLogEntry[];
  log: (
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: string,
    source?: string
  ) => void;
  clear: () => void;
  exportJson: () => string;
}

export function useLogger(filters?: UseLoggerFilters): UseLoggerReturn {
  // Version counter used solely to trigger re-renders after mutations
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const entries = useMemo(() => {
    // version is intentionally referenced so the memo recomputes on changes
    void version;
    return logger.getEntries(filters);
  }, [version, filters]);

  const log = useCallback(
    (
      level: LogLevel,
      category: LogCategory,
      message: string,
      details?: string,
      source?: string
    ) => {
      logger.log(level, category, message, details, source);
      bump();
    },
    [bump]
  );

  const clear = useCallback(() => {
    logger.clear();
    bump();
  }, [bump]);

  const exportJson = useCallback(() => {
    return logger.export();
  }, []);

  return { entries, log, clear, exportJson };
}

export default useLogger;
