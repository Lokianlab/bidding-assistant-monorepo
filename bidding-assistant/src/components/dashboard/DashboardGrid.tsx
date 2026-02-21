"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { useCardLayout } from "@/lib/dashboard/card-layout/useCardLayout";
import { getCardDefinition } from "@/lib/dashboard/card-layout/card-registry";
import { CARD_SIZE_MAP } from "@/lib/dashboard/card-layout/types";
import type { DashboardCardLayout } from "@/lib/dashboard/card-layout/types";
import type { DashboardMetrics } from "@/lib/dashboard/useDashboardMetrics";
import type { TrendAnalysis } from "@/lib/dashboard/useTrendAnalysis";
import { DashboardCard } from "./cards/DashboardCard";
import { CardRenderer } from "./cards/CardRenderer";
import { CardPickerDialog } from "./cards/CardPickerDialog";

// ── Props ────────────────────────────────────────────────────

interface DashboardGridProps {
  metrics: DashboardMetrics;
  trendAnalysis?: TrendAnalysis;
  yearlyGoal: number;
  onGoalEdit: (v: number) => void;
  monthlyTarget: number;
  onMonthlyTargetEdit: (v: number) => void;
  weeklyTarget: number;
  onWeeklyTargetEdit: (v: number) => void;
  showSkeleton: boolean;
}

// ── SortableItem wrapper ─────────────────────────────────────

interface SortableItemProps {
  card: DashboardCardLayout;
  isEditing: boolean;
  metrics: DashboardMetrics;
  trendAnalysis?: TrendAnalysis;
  onResize: (cardId: string, size: DashboardCardLayout["size"]) => void;
  onRemove: (cardId: string) => void;
}

function SortableItem({
  card,
  isEditing,
  metrics,
  trendAnalysis,
  onResize,
  onRemove,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.cardId });

  const sizeInfo = CARD_SIZE_MAP[card.size];
  const def = getCardDefinition(card.type);
  const allowedSizes = def?.allowedSizes ?? [card.size];

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${sizeInfo.colSpan}`,
    gridRow: `span ${sizeInfo.rowSpan}`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <DashboardCard
        cardId={card.cardId}
        title={card.config.title ?? def?.name ?? card.type}
        size={card.size}
        allowedSizes={allowedSizes}
        isEditing={isEditing}
        onResize={(size) => onResize(card.cardId, size)}
        onRemove={() => onRemove(card.cardId)}
        dragAttributes={attributes}
        dragListeners={listeners}
      >
        <CardRenderer
          type={card.type}
          config={card.config}
          metrics={metrics}
          size={card.size}
          trendAnalysis={trendAnalysis}
        />
      </DashboardCard>
    </div>
  );
}

// ── Skeleton placeholder ─────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-xl border py-6 px-6 shadow-sm animate-pulse"
        >
          <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-20 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── DashboardGrid main component ─────────────────────────────

/**
 * The main customizable dashboard grid container.
 * Uses @dnd-kit for drag-and-drop reordering of cards.
 */
export function DashboardGrid(props: DashboardGridProps) {
  const { metrics, trendAnalysis, showSkeleton } = props;
  const { layout, reorder, resize, add, remove, reset } = useCardLayout();
  const [isEditing, setIsEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Sensors ──────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // ── Drag end handler ─────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        reorder(String(active.id), String(over.id));
      }
    },
    [reorder],
  );

  // ── Card IDs for SortableContext ─────────────────────────
  const cardIds = useMemo(
    () => layout.cards.map((c) => c.cardId),
    [layout.cards],
  );

  // ── Callbacks ────────────────────────────────────────────
  const handleResize = useCallback(
    (cardId: string, size: DashboardCardLayout["size"]) => {
      resize(cardId, size);
    },
    [resize],
  );

  const handleRemove = useCallback(
    (cardId: string) => {
      remove(cardId);
    },
    [remove],
  );

  const handleAdd = useCallback(
    (type: string) => {
      add(type);
    },
    [add],
  );

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // ── Render ───────────────────────────────────────────────

  if (showSkeleton) {
    return <SkeletonGrid />;
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditing((prev) => !prev)}
        >
          {isEditing ? "完成編輯" : "編輯佈局"}
        </Button>

        {isEditing && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              新增卡片
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              還原預設
            </Button>
          </div>
        )}
      </div>

      {/* Card grid with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={cardIds}
          strategy={verticalListSortingStrategy}
        >
          <div
            className="grid gap-2 sm:gap-4"
            style={{
              gridTemplateColumns: `repeat(${layout.gridCols}, minmax(0, 1fr))`,
            }}
          >
            {layout.cards.map((card) => (
              <SortableItem
                key={card.cardId}
                card={card}
                isEditing={isEditing}
                metrics={metrics}
                trendAnalysis={trendAnalysis}
                onResize={handleResize}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty state */}
      {layout.cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-sm mb-3">尚未新增任何卡片</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            新增卡片
          </Button>
        </div>
      )}

      {/* Card picker dialog */}
      <CardPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAdd={handleAdd}
      />
    </div>
  );
}

export default DashboardGrid;
