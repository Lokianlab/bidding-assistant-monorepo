"use client";

/**
 * 可編輯下拉元件（帶自訂常用選項管理）
 *
 * - 使用者可以自由輸入任何值
 * - 聚焦時顯示常用選項下拉
 * - 可將當前輸入值加入常用選項
 * - 可刪除不需要的常用選項
 */

import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { OptionFieldKey } from "@/lib/knowledge-base/useCustomOptions";

interface EditableSelectProps {
  /** 當前值 */
  value: string;
  /** 值變更回呼 */
  onChange: (value: string) => void;
  /** 常用選項列表 */
  options: string[];
  /** placeholder 文字 */
  placeholder?: string;
  /** 選項欄位 key（用於增刪操作） */
  fieldKey?: OptionFieldKey;
  /** 新增常用選項 */
  onAddOption?: (key: OptionFieldKey, value: string) => void;
  /** 刪除常用選項 */
  onRemoveOption?: (key: OptionFieldKey, value: string) => void;
}

export function EditableSelect({
  value,
  onChange,
  options,
  placeholder,
  fieldKey,
  onAddOption,
  onRemoveOption,
}: EditableSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 過濾匹配的選項
  const filtered = useMemo(
    () => options.filter((s) => !value || s.includes(value)),
    [options, value]
  );

  // 當前值是否已在常用選項中
  const isInOptions = value.trim() && options.includes(value.trim());
  // 是否可以加入常用
  const canAdd = !!fieldKey && !!onAddOption && !!value.trim() && !isInOptions;

  const showDropdown = inputFocused && (filtered.length > 0 || canAdd);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { setInputFocused(true); setOpen(true); }}
        onBlur={() => { setTimeout(() => { setInputFocused(false); setOpen(false); }, 200); }}
        placeholder={placeholder}
      />
      {open && showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-52 overflow-y-auto">
          {/* 常用選項列表 */}
          {filtered.map((option) => (
            <div
              key={option}
              className="flex items-center gap-1 hover:bg-accent group"
            >
              <button
                type="button"
                className="flex-1 text-left px-3 py-1.5 text-sm truncate"
                onMouseDown={(e) => { e.preventDefault(); onChange(option); setOpen(false); }}
              >
                {option}
              </button>
              {fieldKey && onRemoveOption && (
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive px-2 py-1 text-xs shrink-0 transition-opacity"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveOption(fieldKey, option);
                  }}
                  title="從常用選項移除"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {/* 加入常用按鈕 */}
          {canAdd && (
            <>
              {filtered.length > 0 && (
                <div className="border-t mx-2" />
              )}
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-accent flex items-center gap-1"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddOption(fieldKey, value.trim());
                }}
              >
                <span>＋</span>
                <span>將「{value.trim()}」加入常用選項</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
