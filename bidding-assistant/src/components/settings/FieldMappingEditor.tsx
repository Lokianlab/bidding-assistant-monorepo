"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  DEFAULT_FIELD_MAP,
  type FieldMappingKey,
} from "@/lib/constants/field-mapping";

interface FieldMappingEditorProps {
  /** 目前使用者自訂的欄位對照（只有覆蓋過的 key 才有值） */
  mapping: Partial<Record<FieldMappingKey, string>>;
  /** 當使用者修改對照表時呼叫 */
  onChange: (mapping: Partial<Record<FieldMappingKey, string>>) => void;
  /** Notion 連線 token（用來拉取 schema） */
  notionToken?: string;
  /** Notion 資料庫 ID */
  notionDbId?: string;
}

export function FieldMappingEditor({
  mapping,
  onChange,
  notionToken,
  notionDbId,
}: FieldMappingEditorProps) {
  const [schemaFields, setSchemaFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 從 Notion 拉取 schema
  const fetchSchema = useCallback(async () => {
    if (!notionToken || !notionDbId) {
      toast.error("請先到「外部連線」設定 Notion Token 和資料庫 ID");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/notion/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: notionToken,
          databaseId: notionDbId,
          action: "schema",
        }),
      });
      if (!res.ok) throw new Error("API 錯誤");
      const data = await res.json();
      // schema 回傳的是 properties 物件，key 就是欄位名稱
      const names = Object.keys(data.schema ?? data.properties ?? {}).sort();
      setSchemaFields(names);
      toast.success(`已從 Notion 偵測到 ${names.length} 個欄位`);
    } catch (err) {
      logger.error("api", "無法取得 Notion schema", String(err));
      toast.error("無法取得 Notion schema，請確認連線設定");
    } finally {
      setLoading(false);
    }
  }, [notionToken, notionDbId]);

  // 初次載入時自動偵測（如果有 token）
  useEffect(() => {
    if (notionToken && notionDbId && schemaFields.length === 0) {
      fetchSchema();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notionToken, notionDbId]);

  /** 取得某個 key 目前實際使用的欄位名稱 */
  function getCurrentValue(key: FieldMappingKey): string {
    return mapping[key] ?? DEFAULT_FIELD_MAP[key];
  }

  /** 檢查某個欄位是否存在於 schema 中 */
  function fieldExistsInSchema(fieldName: string): boolean {
    if (schemaFields.length === 0) return true; // 還沒拉取 schema 時不顯示警告
    return schemaFields.includes(fieldName);
  }

  function handleChange(key: FieldMappingKey, value: string) {
    // 如果跟預設值一樣，就移除 override（保持乾淨）
    if (value === DEFAULT_FIELD_MAP[key]) {
      const next = { ...mapping };
      delete next[key];
      onChange(next);
    } else {
      onChange({ ...mapping, [key]: value });
    }
  }

  function handleResetAll() {
    onChange({});
    toast.success("已恢復所有欄位為預設對應");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Notion 欄位對照</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              設定系統功能對應到 Notion 資料庫的哪個欄位
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
            >
              恢復預設
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSchema}
              disabled={loading}
            >
              {loading ? "偵測中..." : "🔄 從 Notion 偵測"}
            </Button>
          </div>
        </div>
        {schemaFields.length > 0 && (
          <Badge variant="secondary" className="mt-2 w-fit">
            已偵測 {schemaFields.length} 個 Notion 欄位
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">系統用途</TableHead>
              <TableHead className="w-44">預設欄位名稱</TableHead>
              <TableHead>目前對應的 Notion 欄位</TableHead>
              <TableHead className="w-20">狀態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FIELD_KEYS.map((key) => {
              const current = getCurrentValue(key);
              const isOverridden = mapping[key] !== undefined;
              const exists = fieldExistsInSchema(current);
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">
                    {FIELD_LABELS[key]}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {DEFAULT_FIELD_MAP[key]}
                  </TableCell>
                  <TableCell>
                    {schemaFields.length > 0 ? (
                      <Select
                        value={current}
                        onValueChange={(v) => handleChange(key, v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {schemaFields.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{current}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!exists ? (
                      <Badge variant="destructive" className="text-[10px]">
                        ⚠ 找不到
                      </Badge>
                    ) : isOverridden ? (
                      <Badge variant="secondary" className="text-[10px]">
                        已自訂
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        預設
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
