"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FeatureDefinition } from "@/lib/modules/feature-registry";
import { getDependents, FEATURE_REGISTRY } from "@/lib/modules/feature-registry";

interface FeatureToggleCardProps {
  feature: FeatureDefinition;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function FeatureToggleCard({ feature, enabled, onToggle }: FeatureToggleCardProps) {
  const dependents = getDependents(feature.id);
  const hasDependents = dependents.length > 0;

  return (
    <Card className={cn(
      "transition-all duration-200",
      !enabled && "opacity-60"
    )}>
      <CardContent className="flex items-center gap-4 py-4">
        {/* 圖示 */}
        <span className="text-3xl shrink-0">{feature.icon}</span>

        {/* 說明 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{feature.name}</h3>
            {feature.dependencies && feature.dependencies.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                需要：{feature.dependencies.map(depId =>
                  FEATURE_REGISTRY.find(f => f.id === depId)?.name ?? depId
                ).join("、")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {feature.description}
          </p>
          {/* 依賴警告 */}
          {hasDependents && !enabled && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠ 關閉此模組會影響：{dependents.map((d) => d.name).join("、")}
            </p>
          )}
        </div>

        {/* 開關 */}
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </CardContent>
    </Card>
  );
}
