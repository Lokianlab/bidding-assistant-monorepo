"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CardSizePreset } from "@/lib/dashboard/card-layout/types";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";

interface DashboardCardProps {
  cardId: string;
  title: string;
  size: CardSizePreset;
  allowedSizes: CardSizePreset[];
  isEditing: boolean;
  onResize: (size: CardSizePreset) => void;
  onRemove: () => void;
  onOpenSettings?: () => void;
  children: React.ReactNode;
  dragAttributes?: DraggableAttributes;
  dragListeners?: DraggableSyntheticListeners;
}

const SIZE_LABELS: Record<CardSizePreset, string> = {
  small: "S",
  medium: "M",
  large: "L",
  wide: "W",
  tall: "T",
};

/**
 * Universal card wrapper for the customizable dashboard grid.
 * Provides drag handle, title, size toggle, delete, settings, and card content.
 */
export function DashboardCard({
  title,
  size,
  allowedSizes,
  isEditing,
  onResize,
  onRemove,
  onOpenSettings,
  children,
  dragAttributes,
  dragListeners,
}: DashboardCardProps) {
  /** Cycle through allowed sizes */
  const handleCycleSize = () => {
    const currentIndex = allowedSizes.indexOf(size);
    const nextIndex = (currentIndex + 1) % allowedSizes.length;
    onResize(allowedSizes[nextIndex]);
  };

  return (
    <Card
      className={
        isEditing
          ? "relative border-dashed border-2 border-muted-foreground/30 transition-all"
          : "relative transition-all"
      }
    >
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          {/* Drag handle - only visible in editing mode */}
          {isEditing && (
            <button
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
              aria-label="拖曳排序"
              {...dragAttributes}
              {...dragListeners}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="5" r="1" />
                <circle cx="9" cy="12" r="1" />
                <circle cx="9" cy="19" r="1" />
                <circle cx="15" cy="5" r="1" />
                <circle cx="15" cy="12" r="1" />
                <circle cx="15" cy="19" r="1" />
              </svg>
            </button>
          )}
          <CardTitle className="text-sm truncate">{title}</CardTitle>
        </div>

        {/* Action buttons - only visible in editing mode */}
        {isEditing && (
          <CardAction>
            <div className="flex items-center gap-1">
              {/* Size toggle */}
              {allowedSizes.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCycleSize}
                  title={`目前大小: ${SIZE_LABELS[size]} (點擊切換)`}
                >
                  <span className="text-[10px] font-bold">
                    {SIZE_LABELS[size]}
                  </span>
                </Button>
              )}

              {/* Settings button */}
              {onOpenSettings && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onOpenSettings}
                  title="卡片設定"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </Button>
              )}

              {/* Delete button */}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onRemove}
                title="移除卡片"
                className="text-destructive hover:text-destructive"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </Button>
            </div>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="pt-2">{children}</CardContent>
    </Card>
  );
}

export default DashboardCard;
