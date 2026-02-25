"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_KEYS, FIELD_LABELS } from "@/lib/constants/field-mapping";
import {
  FIELD_TYPE_MAP,
  OPERATORS_BY_TYPE,
  OPERATOR_LABELS,
  NO_VALUE_OPERATORS,
} from "@/lib/settings/case-board-filter";
import type { CaseBoardFilterSettings, FilterCondition, FilterOperator } from "@/lib/settings/types";

interface Props {
  value: CaseBoardFilterSettings;
  onChange: (v: CaseBoardFilterSettings) => void;
}

/** 可篩選的欄位（只取有 type 定義的） */
const FILTERABLE_KEYS = FIELD_KEYS.filter(k => k in FIELD_TYPE_MAP);

function newConditionId() {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function CaseBoardFilterEditor({ value, onChange }: Props) {
  const { logic, conditions } = value;

  function updateLogic(v: "and" | "or") {
    onChange({ ...value, logic: v });
  }

  function addCondition() {
    const defaultProp = "確定協作";
    const defaultType = FIELD_TYPE_MAP[defaultProp]!;
    const defaultOp = OPERATORS_BY_TYPE[defaultType][0];
    const defaultVal = defaultType === "checkbox" ? true : "";
    onChange({
      ...value,
      conditions: [
        ...conditions,
        { id: newConditionId(), property: defaultProp, operator: defaultOp, value: defaultVal },
      ],
    });
  }

  function removeCondition(idx: number) {
    onChange({ ...value, conditions: conditions.filter((_, i) => i !== idx) });
  }

  function updateConditionProp(idx: number, prop: string) {
    const type = FIELD_TYPE_MAP[prop as keyof typeof FIELD_TYPE_MAP];
    if (!type) return;
    const ops = OPERATORS_BY_TYPE[type];
    const op = ops[0];
    const val = type === "checkbox" ? true : "";
    const next = conditions.map((c, i) =>
      i === idx ? { ...c, property: prop, operator: op, value: val } : c,
    );
    onChange({ ...value, conditions: next });
  }

  function updateConditionOp(idx: number, op: FilterOperator) {
    const cond = conditions[idx];
    const noValue = NO_VALUE_OPERATORS.includes(op);
    const next = conditions.map((c, i) =>
      i === idx
        ? { ...c, operator: op, value: noValue ? undefined : c.value }
        : c,
    );
    onChange({ ...value, conditions: next });
  }

  function updateConditionVal(idx: number, val: string | boolean | number) {
    const next = conditions.map((c, i) =>
      i === idx ? { ...c, value: val } : c,
    );
    onChange({ ...value, conditions: next });
  }

  return (
    <div className="space-y-4">
      {/* Logic toggle */}
      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">條件邏輯：</Label>
        <Select value={logic} onValueChange={(v) => updateLogic(v as "and" | "or")}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">全部符合（AND）</SelectItem>
            <SelectItem value="or">任一符合（OR）</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conditions */}
      <div className="space-y-2">
        {conditions.map((cond, idx) => {
          const type = FIELD_TYPE_MAP[cond.property as keyof typeof FIELD_TYPE_MAP];
          const ops = type ? OPERATORS_BY_TYPE[type] : [];
          const needsValue = !NO_VALUE_OPERATORS.includes(cond.operator);

          return (
            <div key={cond.id} className="flex gap-2 items-center flex-wrap">
              {/* Property */}
              <Select value={cond.property} onValueChange={(v) => updateConditionProp(idx, v)}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTERABLE_KEYS.map(k => (
                    <SelectItem key={k} value={k}>{FIELD_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator */}
              <Select
                value={cond.operator}
                onValueChange={(v) => updateConditionOp(idx, v as FilterOperator)}
              >
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ops.map(op => (
                    <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value */}
              {needsValue && type === "checkbox" && (
                <Select
                  value={String(cond.value ?? true)}
                  onValueChange={(v) => updateConditionVal(idx, v === "true")}
                >
                  <SelectTrigger className="w-20 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">是</SelectItem>
                    <SelectItem value="false">否</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {needsValue && type === "number" && (
                <Input
                  type="number"
                  value={String(cond.value ?? "")}
                  onChange={(e) => updateConditionVal(idx, Number(e.target.value))}
                  className="w-32 h-8 text-sm"
                  placeholder="數值"
                />
              )}

              {needsValue && type === "date" && (
                <Input
                  type="date"
                  value={String(cond.value ?? "")}
                  onChange={(e) => updateConditionVal(idx, e.target.value)}
                  className="w-36 h-8 text-sm"
                />
              )}

              {needsValue && type && !["checkbox", "number", "date"].includes(type) && (
                <Input
                  value={String(cond.value ?? "")}
                  onChange={(e) => updateConditionVal(idx, e.target.value)}
                  className="w-36 h-8 text-sm"
                  placeholder="值"
                />
              )}

              {/* Remove */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground"
                onClick={() => removeCondition(idx)}
              >
                &times;
              </Button>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={addCondition}>
        + 新增條件
      </Button>

      {conditions.length === 0 && (
        <p className="text-xs text-amber-600">⚠ 沒有條件時會撈出所有案件（Notion 效能可能受影響）</p>
      )}
    </div>
  );
}
