"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CARD_REGISTRY,
  type CardDefinition,
} from "@/lib/dashboard/card-layout/card-registry";

interface CardPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: string) => void;
}

const CATEGORY_LABELS: Record<CardDefinition["category"], string> = {
  stat: "統計卡片",
  chart: "圖表卡片",
  gauge: "儀表卡片",
  custom: "自訂卡片",
};

const CATEGORY_ORDER: CardDefinition["category"][] = [
  "stat",
  "chart",
  "gauge",
  "custom",
];

/**
 * A dialog that lets users pick a card type to add to the dashboard.
 * Shows cards grouped by category (stat, chart, gauge, custom).
 */
export function CardPickerDialog({
  open,
  onOpenChange,
  onAdd,
}: CardPickerDialogProps) {
  // Group cards by category
  const grouped = React.useMemo(() => {
    const map = new Map<CardDefinition["category"], CardDefinition[]>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const card of CARD_REGISTRY) {
      const list = map.get(card.category);
      if (list) {
        list.push(card);
      }
    }
    return map;
  }, []);

  const handleAdd = (type: string) => {
    onAdd(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新增卡片</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col gap-6 pr-2">
            {CATEGORY_ORDER.map((category) => {
              const cards = grouped.get(category);
              if (!cards || cards.length === 0) return null;

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {cards.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {cards.map((card) => (
                      <Button
                        key={card.type}
                        variant="outline"
                        className="h-auto justify-start gap-3 px-3 py-3 text-left"
                        onClick={() => handleAdd(card.type)}
                      >
                        <span className="text-lg shrink-0">{card.icon}</span>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {card.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {card.description}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default CardPickerDialog;
