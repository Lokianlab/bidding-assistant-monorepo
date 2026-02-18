"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSettings } from "@/lib/context/settings-context";
import { getFeatureByRoute, isFeatureEnabled } from "./feature-registry";

/**
 * 路由守衛：包在 layout 的 children 外面
 * 如果使用者訪問被關閉的模組路由，顯示提示頁面
 */
export function FeatureGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { settings, hydrated } = useSettings();

  // 等 settings 載入完畢再判斷，避免閃一下
  if (!hydrated) return null;

  const feature = getFeatureByRoute(pathname);

  // 沒有對應 feature 的路由（如 /settings/*、/prompts）不受管控
  if (!feature) return <>{children}</>;

  const enabled = isFeatureEnabled(feature.id, settings.featureToggles ?? {});

  if (enabled) return <>{children}</>;

  // 模組被關閉 → 顯示提示
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <span className="text-6xl mb-4">{feature.icon}</span>
      <h2 className="text-2xl font-bold mb-2">
        「{feature.name}」模組已關閉
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        此功能目前未啟用。如需使用，請前往設定頁面開啟。
      </p>
      <Link
        href="/settings/modules"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        📦 前往功能模組管理
      </Link>
    </div>
  );
}
