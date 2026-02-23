"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Partner } from "@/lib/partners/types";
import { searchPartners, calculateTrustScore, sortByRecommendation } from "@/lib/partners/helpers";
import { DEFAULT_CATEGORIES, COMMON_TAGS } from "@/lib/partners/types";

interface PartnerSidebarProps {
  partners: Partner[];
  onSelectPartner?: (partner: Partner) => void;
  selectedPartnerId?: string;
  onAddPartner?: () => void;
}

/**
 * 合作夥伴側邊欄
 * 顯示合作夥伴列表、搜尋、篩選、排序功能
 */
export function PartnerSidebar({
  partners,
  onSelectPartner,
  selectedPartnerId,
  onAddPartner,
}: PartnerSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"trust" | "rating" | "name">("trust");
  const [showFilters, setShowFilters] = useState(false);

  // 計算篩選和排序後的合作夥伴列表
  const filteredPartners = useMemo(() => {
    let result = searchPartners(partners, {
      search: searchQuery,
      category: selectedCategories.length > 0 ? selectedCategories : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      min_rating: minRating > 0 ? minRating : undefined,
      status: "active",
    });

    // 應用排序
    if (sortBy === "trust") {
      result = sortByRecommendation(result);
    } else if (sortBy === "rating") {
      result = result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "name") {
      result = result.sort((a, b) => a.name.localeCompare(b.name, "zh-TW"));
    }

    return result;
  }, [partners, searchQuery, selectedCategories, selectedTags, minRating, sortBy]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedTags([]);
    setMinRating(0);
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 border-r">
      {/* 標題和新增按鈕 */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">合作夥伴</h2>
        {onAddPartner && (
          <Button
            size="sm"
            variant="default"
            onClick={onAddPartner}
            title="新增合作夥伴"
          >
            +
          </Button>
        )}
      </div>

      {/* 搜尋框 */}
      <Input
        placeholder="搜尋合作夥伴..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-8"
      />

      {/* 篩選按鈕 */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="w-full justify-start"
      >
        {showFilters ? "隱藏篩選" : "顯示篩選"}
        {(selectedCategories.length > 0 ||
          selectedTags.length > 0 ||
          minRating > 0) && (
          <Badge variant="secondary" className="ml-2">
            {selectedCategories.length +
              selectedTags.length +
              (minRating > 0 ? 1 : 0)}
          </Badge>
        )}
      </Button>

      {/* 篩選面板 */}
      {showFilters && (
        <div className="space-y-3 border-t pt-3">
          {/* 排序選項 */}
          <div>
            <label className="text-sm font-medium block mb-2">排序</label>
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'trust' | 'rating' | 'name')}>
              <TabsList className="w-full">
                <TabsTrigger value="trust" className="flex-1 text-xs">
                  推薦度
                </TabsTrigger>
                <TabsTrigger value="rating" className="flex-1 text-xs">
                  評分
                </TabsTrigger>
                <TabsTrigger value="name" className="flex-1 text-xs">
                  名稱
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 評分篩選 */}
          <div>
            <label className="text-sm font-medium block mb-2">最低評分</label>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  size="sm"
                  variant={minRating === rating ? "default" : "outline"}
                  onClick={() => setMinRating(rating)}
                  className="flex-1 h-7 text-xs"
                >
                  {rating === 0 ? "全部" : rating}
                </Button>
              ))}
            </div>
          </div>

          {/* 分類篩選 */}
          <div>
            <label className="text-sm font-medium block mb-2">專業類別</label>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {DEFAULT_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2 p-1 cursor-pointer hover:bg-muted rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="w-3 h-3"
                  />
                  <span className="text-sm">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 標籤篩選 */}
          <div>
            <label className="text-sm font-medium block mb-2">常用標籤</label>
            <div className="flex flex-wrap gap-1">
              {COMMON_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* 清除篩選按鈕 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="w-full text-xs"
          >
            清除篩選
          </Button>
        </div>
      )}

      {/* 合作夥伴列表 */}
      <div className="flex-1 border-t pt-3 min-h-0 overflow-y-auto">
        <div className="space-y-2">
          {filteredPartners.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {partners.length === 0
                ? "暫無合作夥伴"
                : "沒有符合篩選條件的合作夥伴"}
            </div>
          ) : (
            filteredPartners.map((partner) => {
              const trustScore = calculateTrustScore(partner);
              return (
                <button
                  key={partner.id}
                  onClick={() => onSelectPartner?.(partner)}
                  className={cn(
                    "w-full text-left p-2 rounded border transition-colors hover:bg-muted",
                    selectedPartnerId === partner.id && "bg-muted border-primary"
                  )}
                >
                  {/* 夥伴名稱和信任度 */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm truncate flex-1">
                      {partner.name}
                    </span>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {trustScore}
                    </Badge>
                  </div>

                  {/* 評分和合作次數 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>⭐ {partner.rating}</span>
                    <span>合作 {partner.cooperation_count} 次</span>
                  </div>

                  {/* 分類標籤 */}
                  <div className="flex flex-wrap gap-1">
                    {partner.category.slice(0, 2).map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                    {partner.category.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{partner.category.length - 2}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 統計信息 */}
      <div className="border-t pt-2 text-xs text-muted-foreground">
        <div>顯示 {filteredPartners.length} / {partners.length} 個</div>
      </div>
    </div>
  );
}
