"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { KB_MATRIX, KB_LABELS, WRITING_RULES_STAGES } from "@/data/config/kb-matrix";
import { STAGES } from "@/data/config/stages";

export function KBMatrixTable() {
  const kbIds = Object.keys(KB_LABELS);
  const writingSet = new Set(WRITING_RULES_STAGES);

  return (
    <div className="overflow-x-auto -mx-3 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">階段</TableHead>
            {kbIds.map((id) => (
              <TableHead key={id} className="text-center w-24">
                <div className="text-xs">{id}</div>
                <div className="text-[10px] text-muted-foreground">{KB_LABELS[id]}</div>
              </TableHead>
            ))}
            <TableHead className="text-center w-24">
              <div className="text-xs">撰寫規範</div>
              <div className="text-[10px] text-muted-foreground">00-2</div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {STAGES.map((stage) => {
            const row = KB_MATRIX[stage.id] ?? {};
            const hasWritingRules = writingSet.has(stage.id);
            return (
              <TableRow key={stage.id}>
                <TableCell className="font-medium">
                  <span className="text-sm">{stage.id}</span>
                  <span className="text-xs text-muted-foreground ml-1">{stage.name}</span>
                </TableCell>
                {kbIds.map((kbId) => {
                  const val = row[kbId] ?? "none";
                  return (
                    <TableCell key={kbId} className="text-center">
                      {val === "required" ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-green-100 text-green-700 text-sm font-bold">
                          ●
                        </span>
                      ) : val === "optional" ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-blue-50 text-blue-500 text-sm">
                          ○
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  {hasWritingRules ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-green-100 text-green-700 text-sm font-bold">
                      ●
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* 圖例 */}
      <div className="flex gap-4 mt-3 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-green-100 text-green-700 text-center text-[10px] leading-4 font-bold">●</span>
          必要引用
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-4 rounded bg-blue-50 text-blue-500 text-center text-[10px] leading-4">○</span>
          選擇性引用
        </span>
        <span className="flex items-center gap-1">
          <span className="text-gray-300">—</span>
          不需引用
        </span>
      </div>
    </div>
  );
}
