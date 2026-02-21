"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { useSettings } from "@/lib/context/settings-context";
import {
  FEATURE_REGISTRY,
  SECTION_LABELS,
  isFeatureEnabled,
  type FeatureDefinition,
} from "@/lib/modules/feature-registry";
import { CHANGELOG } from "@/data/changelog";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

/** 設定區塊（永遠顯示） */
const SETTINGS_ITEMS: NavItem[] = [
  { label: "操作指南", href: "/guide", icon: "📖" },
  { label: "輸出文件設定", href: "/settings/document", icon: "🔤" },
  { label: "外部連線", href: "/settings/connections", icon: "🔗" },
  { label: "公司資訊", href: "/settings/company", icon: "🏢" },
  { label: "功能模組管理", href: "/settings/modules", icon: "📦" },
  { label: "工作流程", href: "/settings/workflow", icon: "⚙️" },
  { label: "系統維護", href: "/settings/maintenance", icon: "🛠️" },
  { label: "提示詞編輯器", href: "/prompts", icon: "✏️" },
];

// ====== Context：讓其他元件讀取側欄狀態 ======
interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    } catch {}
  }, [collapsed]);

  // 手機版開啟時鎖住背景捲動
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

// ====== 漢堡按鈕（手機版用） ======
export function MobileMenuButton() {
  const { setMobileOpen } = useSidebar();
  return (
    <button
      onClick={() => setMobileOpen(true)}
      className="md:hidden p-2 rounded-md hover:bg-accent"
      aria-label="開啟選單"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

// ====== 動態導航項目產生 ======
function useNavSections() {
  const { settings } = useSettings();

  return useMemo(() => {
    const toggles = settings.featureToggles ?? {};
    // 按 section 分組
    const sectionOrder: FeatureDefinition["section"][] = ["core", "tools", "output"];
    const sections: { section: string; items: NavItem[] }[] = [];

    for (const sec of sectionOrder) {
      const features = FEATURE_REGISTRY.filter(
        (f) => f.section === sec && f.routes.length > 0 && isFeatureEnabled(f.id, toggles),
      );
      if (features.length === 0) continue;
      sections.push({
        section: SECTION_LABELS[sec],
        items: features.map((f) => ({
          label: f.name,
          href: f.routes[0],
          icon: f.icon,
        })),
      });
    }

    // 設定區塊永遠顯示
    sections.push({
      section: "設定",
      items: SETTINGS_ITEMS,
    });

    return sections;
  }, [settings.featureToggles]);
}

// ====== 側欄主元件 ======
export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const navSections = useNavSections();

  // 點擊導航項目後，手機版自動收起
  const handleNavClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Logo 區 */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div className={cn("overflow-hidden transition-all duration-200", collapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <h1 className="text-lg font-bold text-sidebar-primary-foreground whitespace-nowrap">
            全能標案助理
          </h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1 whitespace-nowrap">
            大員洛川顧問有限公司
          </p>
        </div>
        {/* 桌面版：收合/展開按鈕 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0 transition-colors"
          aria-label={collapsed ? "展開側欄" : "收合側欄"}
        >
          <svg className={cn("w-4 h-4 transition-transform duration-200", collapsed && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
          </svg>
        </button>
        {/* 手機版：關閉按鈕 */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          aria-label="關閉選單"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 導航 */}
      <nav className="flex-1 overflow-y-auto p-2">
        {navSections.map((group) => (
          <div key={group.section} className="mb-4">
            <p className={cn(
              "text-[10px] font-semibold text-sidebar-foreground/40 px-3 py-1 uppercase tracking-widest transition-all duration-200",
              collapsed ? "text-center text-[8px] px-0" : ""
            )}>
              {collapsed ? "•" : group.section}
            </p>
            {group.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md text-sm transition-colors",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
                  <span className={cn(
                    "transition-all duration-200 overflow-hidden whitespace-nowrap",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 底部 */}
      <div className={cn(
        "p-3 border-t border-sidebar-border text-xs text-sidebar-foreground/40 transition-all duration-200",
        collapsed ? "text-center" : ""
      )}>
        {collapsed ? `v${CHANGELOG[0]?.version?.split(".")[0] ?? "1"}` : `v${CHANGELOG[0]?.version ?? "1.0.0"}`}
      </div>
    </>
  );

  return (
    <>
      {/* ===== 桌面版側欄（固定） ===== */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* ===== 手機版側欄（overlay 抽屜） ===== */}
      {/* 背景遮罩 */}
      <div
        className={cn(
          "md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
      />
      {/* 抽屜 */}
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-200 shadow-xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
