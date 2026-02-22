"use client";

import { useSettings } from "@/lib/context/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function WorkflowPage() {
  const { settings, hydrated, updateSection } = useSettings();
  const [workflow, setWorkflow] = useState(settings.workflow);

  // hydration 完成後，用 localStorage 的值更新 local state
  useEffect(() => {
    if (hydrated) setWorkflow(settings.workflow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function handleSave() {
    updateSection("workflow", workflow);
    toast.success("工作流程設定已儲存");
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">工作流程</h1>
        <p className="text-muted-foreground mt-1">
          設定 AI 八階段的名稱、觸發指令，以及 Notion 狀態自動更新規則
        </p>
      </div>

      <div className="space-y-6">
        {/* 階段設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI 八階段設定</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              每個階段對應一個 AI 任務。你可以修改階段名稱和觸發指令，這些設定會同步到提示詞編輯器。
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {workflow.stages.map((stage, idx) => (
                <AccordionItem key={stage.id} value={stage.id}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {stage.id}
                      </Badge>
                      {stage.name}
                      <span className="text-muted-foreground text-xs ml-2">
                        {stage.triggerCommand}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>階段名稱</Label>
                        <Input
                          value={stage.name}
                          onChange={(e) => {
                            const next = [...workflow.stages];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setWorkflow({ ...workflow, stages: next });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>觸發指令</Label>
                        <Input
                          value={stage.triggerCommand}
                          onChange={(e) => {
                            const next = [...workflow.stages];
                            next[idx] = { ...next[idx], triggerCommand: e.target.value };
                            setWorkflow({ ...workflow, stages: next });
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>引導文字</Label>
                      <Textarea
                        placeholder="給使用者的引導提示..."
                        value={stage.guidanceText}
                        onChange={(e) => {
                          const next = [...workflow.stages];
                          next[idx] = { ...next[idx], guidanceText: e.target.value };
                          setWorkflow({ ...workflow, stages: next });
                        }}
                        rows={3}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* 自動狀態規則 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">自動狀態規則</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              當標案進入特定階段時，可自動更新 Notion 的進程狀態。勾選左方核取方塊啟用規則。
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">啟用</TableHead>
                  <TableHead>觸發條件</TableHead>
                  <TableHead>動作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflow.autoStatusRules.map((rule, idx) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Checkbox
                        checked={rule.enabled}
                        onCheckedChange={(v) => {
                          const next = [...workflow.autoStatusRules];
                          next[idx] = { ...next[idx], enabled: !!v };
                          setWorkflow({ ...workflow, autoStatusRules: next });
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{rule.trigger}</TableCell>
                    <TableCell className="text-sm">
                      {rule.actions.map((a, i) => (
                        <Badge key={i} variant="secondary" className="mr-1 mb-1">
                          {a.property} = {String(a.value)}
                        </Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setWorkflow(settings.workflow)}>
            取消
          </Button>
          <Button onClick={handleSave}>儲存工作流程</Button>
        </div>
      </div>
    </div>
  );
}
