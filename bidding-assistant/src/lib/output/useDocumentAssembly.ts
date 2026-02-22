"use client";

import { useState, useCallback } from "react";
import { assembleDocument, countChars } from "./assembly-pipeline";
import {
  getTemplateById,
  getDefaultTemplate,
  templateToChapters,
  createEmptyChapter,
} from "./template-manager";
import type { WorkbenchChapter, AssemblyResult } from "./types";

export interface UseDocumentAssemblyReturn {
  templateId: string;
  projectName: string;
  chapters: WorkbenchChapter[];
  lastAssembly: AssemblyResult | null;

  setTemplateId: (id: string, customTemplates?: import("./types").DocumentTemplate[]) => void;
  setProjectName: (name: string) => void;
  updateChapter: (id: string, patch: Partial<Omit<WorkbenchChapter, "id" | "charCount">>) => void;
  addChapter: (title?: string) => void;
  removeChapter: (id: string) => void;
  moveChapter: (id: string, direction: "up" | "down") => void;
  assemble: () => AssemblyResult;
}

export function useDocumentAssembly(): UseDocumentAssemblyReturn {
  const defaultTemplate = getDefaultTemplate();
  const [templateId, setTemplateIdState] = useState(defaultTemplate.id);
  const [projectName, setProjectName] = useState("");
  const [chapters, setChapters] = useState<WorkbenchChapter[]>(() =>
    templateToChapters(defaultTemplate)
  );
  const [lastAssembly, setLastAssembly] = useState<AssemblyResult | null>(null);

  const setTemplateId = useCallback(
    (id: string, customTemplates?: import("./types").DocumentTemplate[]) => {
      const template = getTemplateById(id, customTemplates);
      if (!template) return;
      setTemplateIdState(id);
      setChapters(templateToChapters(template));
      setLastAssembly(null);
    },
    []
  );

  const updateChapter = useCallback(
    (id: string, patch: Partial<Omit<WorkbenchChapter, "id" | "charCount">>) => {
      setChapters((prev) =>
        prev.map((ch) => {
          if (ch.id !== id) return ch;
          const updated = { ...ch, ...patch };
          updated.charCount = countChars(updated.content);
          return updated;
        })
      );
    },
    []
  );

  const addChapter = useCallback((title?: string) => {
    setChapters((prev) => [...prev, createEmptyChapter(title)]);
  }, []);

  const removeChapter = useCallback((id: string) => {
    setChapters((prev) => prev.filter((ch) => ch.id !== id));
  }, []);

  const moveChapter = useCallback((id: string, direction: "up" | "down") => {
    setChapters((prev) => {
      const idx = prev.findIndex((ch) => ch.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const assemble = useCallback((): AssemblyResult => {
    const result = assembleDocument(chapters, projectName);
    setLastAssembly(result);
    return result;
  }, [chapters, projectName]);

  return {
    templateId,
    projectName,
    chapters,
    lastAssembly,
    setTemplateId,
    setProjectName,
    updateChapter,
    addChapter,
    removeChapter,
    moveChapter,
    assemble,
  };
}
