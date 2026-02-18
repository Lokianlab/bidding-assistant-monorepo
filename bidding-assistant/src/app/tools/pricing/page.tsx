"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo } from "react";

interface CostItem {
  id: string;
  category: "人事費" | "業務費" | "雜支";
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

const EMPTY_ITEM: CostItem = {
  id: "",
  category: "人事費",
  name: "",
  unit: "人月",
  quantity: 1,
  unitPrice: 0,
};

export default function PricingPage() {
  const { settings } = useSettings();
  const { taxRate, managementFeeRate } = settings.modules.pricing;

  const [items, setItems] = useState<CostItem[]>([
    { id: "1", category: "人事費", name: "計畫主持人", unit: "人月", quantity: 6, unitPrice: 95000 },
    { id: "2", category: "人事費", name: "協同主持人", unit: "人月", quantity: 6, unitPrice: 80000 },
    { id: "3", category: "人事費", name: "專任助理", unit: "人月", quantity: 6, unitPrice: 45000 },
    { id: "4", category: "業務費", name: "交通費", unit: "式", quantity: 1, unitPrice: 50000 },
    { id: "5", category: "業務費", name: "印刷費", unit: "式", quantity: 1, unitPrice: 30000 },
    { id: "6", category: "雜支", name: "雜支", unit: "式", quantity: 1, unitPrice: 20000 },
  ]);

  const [budgetCeiling, setBudgetCeiling] = useState(2000000);

  function addItem() {
    setItems([...items, { ...EMPTY_ITEM, id: String(Date.now()) }]);
  }

  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  function updateItem(id: string, patch: Partial<CostItem>) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  const summary = useMemo(() => {
    const directCost = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const managementFee = Math.round(directCost * managementFeeRate);
    const subtotal = directCost + managementFee;
    const tax = Math.round(subtotal * taxRate);
    const total = subtotal + tax;
    const overBudget = total > budgetCeiling;
    const utilization = budgetCeiling > 0 ? ((total / budgetCeiling) * 100).toFixed(1) : "0";

    const byCategory = {
      人事費: items.filter((i) => i.category === "人事費").reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      業務費: items.filter((i) => i.category === "業務費").reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      雜支: items.filter((i) => i.category === "雜支").reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    };

    return { directCost, managementFee, subtotal, tax, total, overBudget, utilization, byCategory };
  }, [items, taxRate, managementFeeRate, budgetCeiling]);

  const fmt = (n: number) => n.toLocaleString("zh-TW");

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">報價驗算</h1>
        <p className="text-muted-foreground mt-1">經費預算表編輯與即時驗算</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主表格 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">經費明細</CardTitle>
                <Button size="sm" onClick={addItem}>
                  新增項目
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">類別</TableHead>
                    <TableHead>項目名稱</TableHead>
                    <TableHead className="w-20">單位</TableHead>
                    <TableHead className="w-20">數量</TableHead>
                    <TableHead className="w-28">單價</TableHead>
                    <TableHead className="w-28 text-right">小計</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <select
                          className="w-full text-sm bg-transparent border rounded px-1 py-0.5"
                          value={item.category}
                          onChange={(e) =>
                            updateItem(item.id, { category: e.target.value as CostItem["category"] })
                          }
                        >
                          <option>人事費</option>
                          <option>業務費</option>
                          <option>雜支</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-sm"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-sm"
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 text-sm"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 text-sm"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmt(item.quantity * item.unitPrice)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          &times;
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* 右側摘要 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">預算上限</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>標案預算（元）</Label>
                <Input
                  type="number"
                  value={budgetCeiling}
                  onChange={(e) => setBudgetCeiling(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">費用摘要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                {(["人事費", "業務費", "雜支"] as const).map((cat) => (
                  <div key={cat} className="flex justify-between">
                    <span className="text-muted-foreground">{cat}</span>
                    <span className="font-mono">{fmt(summary.byCategory[cat])}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">直接成本</span>
                <span className="font-mono">{fmt(summary.directCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  管理費（{(managementFeeRate * 100).toFixed(0)}%）
                </span>
                <span className="font-mono">{fmt(summary.managementFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  營業稅（{(taxRate * 100).toFixed(0)}%）
                </span>
                <span className="font-mono">{fmt(summary.tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span>合計</span>
                <span className="font-mono">{fmt(summary.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">預算使用率</span>
                <Badge variant={summary.overBudget ? "destructive" : "default"}>
                  {summary.utilization}%
                </Badge>
              </div>
              {summary.overBudget && (
                <p className="text-xs text-destructive font-medium">
                  超出預算 {fmt(summary.total - budgetCeiling)} 元
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
