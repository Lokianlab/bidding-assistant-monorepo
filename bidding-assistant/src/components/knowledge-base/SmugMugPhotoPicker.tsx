"use client";

/**
 * SmugMug 照片選擇器
 *
 * 功能：
 * 1. 選擇相簿（下拉）
 * 2. 瀏覽相簿中的照片（網格縮圖）
 * 3. 勾選/取消勾選照片
 * 4. 傳回選中的照片清單
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/lib/context/settings-context";
import type { ProjectPhoto } from "@/lib/knowledge-base/types";

interface SmugMugAlbum {
  albumKey: string;
  title: string;
  imageCount: number;
  webUri: string;
}

interface SmugMugImage {
  imageKey: string;
  title: string;
  caption: string;
  webUri: string;
  thumbnailUrl: string;
  archivedUri: string;
  fileName: string;
}

interface Props {
  /** 已選取的照片 */
  selected: ProjectPhoto[];
  /** 選取照片後回傳 */
  onChange: (photos: ProjectPhoto[]) => void;
  /** 目前綁定的 album key */
  albumKey?: string;
  /** album key 變更 */
  onAlbumKeyChange?: (key: string) => void;
}

export function SmugMugPhotoPicker({ selected, onChange, albumKey, onAlbumKeyChange }: Props) {
  const { settings } = useSettings();
  const sm = settings.connections.smugmug;
  const isConfigured = !!sm.apiKey && !!sm.accessToken;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [albums, setAlbums] = useState<SmugMugAlbum[]>([]);
  const [images, setImages] = useState<SmugMugImage[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [currentAlbumKey, setCurrentAlbumKey] = useState(albumKey || "");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(selected.map((p) => p.imageKey))
  );
  const [error, setError] = useState("");

  // API 呼叫輔助
  const callSmugMug = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      const res = await fetch("/api/smugmug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          apiKey: sm.apiKey,
          apiSecret: sm.apiSecret,
          accessToken: sm.accessToken,
          tokenSecret: sm.tokenSecret,
          nickname: sm.nickname,
          ...extra,
        }),
      });
      return res.json();
    },
    [sm]
  );

  // 開啟 dialog 時載入相簿
  useEffect(() => {
    if (!dialogOpen || !isConfigured || albums.length > 0) return;
    (async () => {
      setLoadingAlbums(true);
      setError("");
      try {
        const data = await callSmugMug("listAlbums", { nickname: sm.nickname });
        if (data.success) {
          setAlbums(data.albums);
        } else {
          setError(data.error || "無法載入相簿");
        }
      } catch {
        setError("網路錯誤");
      }
      setLoadingAlbums(false);
    })();
  }, [dialogOpen, isConfigured, albums.length, callSmugMug, sm.nickname]);

  // 切換相簿 → 載入照片
  useEffect(() => {
    if (!currentAlbumKey || !dialogOpen) return;
    (async () => {
      setLoadingImages(true);
      setError("");
      setImages([]);
      try {
        const data = await callSmugMug("listPhotos", { albumKey: currentAlbumKey, count: 100 });
        if (data.success) {
          setImages(data.images);
        } else {
          setError(data.error || "無法載入照片");
        }
      } catch {
        setError("網路錯誤");
      }
      setLoadingImages(false);
    })();
  }, [currentAlbumKey, dialogOpen, callSmugMug]);

  // 勾選/取消
  function toggleImage(img: SmugMugImage) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(img.imageKey)) {
        next.delete(img.imageKey);
      } else {
        next.add(img.imageKey);
      }
      return next;
    });
  }

  // 確認選取
  function handleConfirm() {
    const photos: ProjectPhoto[] = images
      .filter((img) => selectedKeys.has(img.imageKey))
      .map((img) => ({
        imageKey: img.imageKey,
        title: img.title || img.fileName || "",
        caption: img.caption || "",
        thumbnailUrl: img.thumbnailUrl || "",
        webUrl: img.webUri || "",
        largeUrl: img.archivedUri || "",
      }));
    // 也保留之前選的但不在當前相簿的照片
    const currentAlbumImageKeys = new Set(images.map((i) => i.imageKey));
    const keptFromOther = selected.filter(
      (p) => !currentAlbumImageKeys.has(p.imageKey) && selectedKeys.has(p.imageKey)
    );
    onChange([...keptFromOther, ...photos]);
    if (currentAlbumKey) onAlbumKeyChange?.(currentAlbumKey);
    setDialogOpen(false);
  }

  if (!isConfigured) {
    return (
      <p className="text-xs text-muted-foreground">
        尚未設定 SmugMug 連線，請先到{" "}
        <a href="/settings/connections" className="underline text-primary">
          外部連線設定
        </a>
        {" "}完成串接
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* 已選照片預覽 */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((photo) => (
            <div key={photo.imageKey} className="relative group">
              {photo.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- SmugMug CDN 域名動態，無法用 next/image remotePatterns 覆蓋
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.title}
                  className="w-20 h-20 object-cover rounded border"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center text-xs">
                  📷
                </div>
              )}
              <button
                type="button"
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                onClick={() => onChange(selected.filter((p) => p.imageKey !== photo.imageKey))}
                title="移除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        📷 從 SmugMug 選取照片 {selected.length > 0 && `(${selected.length})`}
      </Button>

      {/* 照片選擇對話框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>從 SmugMug 選取實績照片</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* 相簿選擇 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">選擇相簿</label>
            {loadingAlbums ? (
              <p className="text-sm text-muted-foreground">載入相簿中...</p>
            ) : (
              <Select
                value={currentAlbumKey}
                onValueChange={setCurrentAlbumKey}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇一個相簿" />
                </SelectTrigger>
                <SelectContent>
                  {albums.map((album) => (
                    <SelectItem key={album.albumKey} value={album.albumKey}>
                      {album.title} ({album.imageCount} 張)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 照片網格 */}
          {loadingImages ? (
            <p className="text-sm text-muted-foreground py-8 text-center">載入照片中...</p>
          ) : images.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedKeys.size} 張已選</Badge>
                <span className="text-xs text-muted-foreground">/ {images.length} 張</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {images.map((img) => {
                  const isSelected = selectedKeys.has(img.imageKey);
                  return (
                    <button
                      key={img.imageKey}
                      type="button"
                      className={`relative aspect-square overflow-hidden rounded border-2 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                      onClick={() => toggleImage(img)}
                      title={img.title || img.fileName}
                    >
                      {img.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- SmugMug CDN 域名動態，無法用 next/image remotePatterns 覆蓋
                        <img
                          src={img.thumbnailUrl}
                          alt={img.title || img.fileName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs">
                          📷
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : currentAlbumKey ? (
            <p className="text-sm text-muted-foreground py-8 text-center">此相簿沒有照片</p>
          ) : null}

          {/* 確認按鈕 */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirm}>
              確認選取 ({selectedKeys.size} 張)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
