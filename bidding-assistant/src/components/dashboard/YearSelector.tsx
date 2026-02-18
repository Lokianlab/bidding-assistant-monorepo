"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface YearSelectorProps {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}

export function YearSelector({ years, value, onChange }: YearSelectorProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(Number(v))}
    >
      <SelectTrigger className="w-[140px] h-8 text-sm">
        <SelectValue placeholder="選擇年份" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">至今總計</SelectItem>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y} 年
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
