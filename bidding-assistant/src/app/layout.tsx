import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, SidebarProvider } from "@/components/layout/Sidebar";
import { Providers } from "@/components/layout/Providers";
import { FeatureGuard } from "@/lib/modules/FeatureGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "全能標案助理",
  description: "大員洛川顧問有限公司 — 標案管理與 AI 輔助系統",
};

// Force dynamic rendering — radix-ui@1.4.3 has SSR prerendering issues with Next.js 16
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <SidebarProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto">
                <FeatureGuard>{children}</FeatureGuard>
              </main>
            </div>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
