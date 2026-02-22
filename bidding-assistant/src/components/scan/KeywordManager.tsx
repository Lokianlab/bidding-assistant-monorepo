// ====== 巡標關鍵字管理元件 ======

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_SEARCH_KEYWORDS } from "@/lib/scan/constants";

interface KeywordManagerProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

export function KeywordManager({ keywords, onChange }: KeywordManagerProps) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const val = input.trim();
    if (!val || keywords.includes(val)) return;
    onChange([...keywords, val]);
    setInput("");
  }

  function handleRemove(kw: string) {
    onChange(keywords.filter((k) => k !== kw));
  }

  function handleReset() {
    onChange([...DEFAULT_SEARCH_KEYWORDS]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <div className="space-y-4">
      {/* 關鍵字 chip 列表 */}
      <div className="flex flex-wrap gap-2 min-h-10">
        {keywords.length === 0 && (
          <p className="text-sm text-muted-foreground">尚未設定任何關鍵字</p>
        )}
        {keywords.map((kw) => (
          <Badge
            key={kw}
            variant="secondary"
            className="cursor-pointer hover:bg-destructive/10 hover:text-destructive gap-1"
            onClick={() => handleRemove(kw)}
          >
            {kw} &times;
          </Badge>
        ))}
      </div>

      {/* 新增輸入列 */}
      <div className="flex gap-2">
        <Input
          placeholder="新增關鍵字（按 Enter 確認）"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" variant="outline" onClick={handleAdd} disabled={!input.trim()}>
          新增
        </Button>
        <Button type="button" variant="ghost" onClick={handleReset}>
          恢復預設
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        點擊關鍵字可移除。這些關鍵字決定掃描時搜尋哪些 PCC 公告。
      </p>
    </div>
  );
}
