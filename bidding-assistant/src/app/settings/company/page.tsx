"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// Select removed: brand is now a free-text field
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function CompanyPage() {
  const { settings, hydrated, updateSection } = useSettings();
  const [company, setCompany] = useState(settings.company);

  // hydration 完成後，用 localStorage 的值更新 local state
  useEffect(() => {
    if (hydrated) setCompany(settings.company);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function handleSave() {
    updateSection("company", company);
    toast.success("公司資訊已儲存");
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">公司資訊</h1>
        <p className="text-muted-foreground mt-1">設定公司基本資訊與品牌</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">公司名稱</Label>
            <Input
              id="company-name"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-id">統一編號</Label>
            <Input
              id="tax-id"
              value={company.taxId}
              onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
              maxLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">品牌（用於情報搜尋）</Label>
            <Input
              id="brand"
              value={company.brand}
              onChange={(e) => setCompany({ ...company, brand: e.target.value })}
              placeholder="例：大員洛川"
            />
            <p className="text-xs text-muted-foreground">
              情報模組會用這個名稱搜尋你的投標紀錄和競爭分析
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo-path">Logo 路徑</Label>
            <Input
              id="logo-path"
              placeholder="/images/logo.png"
              value={company.logoPath ?? ""}
              onChange={(e) => setCompany({ ...company, logoPath: e.target.value || undefined })}
            />
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setCompany(settings.company)}>
          取消
        </Button>
        <Button onClick={handleSave}>儲存</Button>
      </div>
    </div>
  );
}
