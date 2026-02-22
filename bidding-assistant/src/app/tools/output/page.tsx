import { DocumentWorkbench } from "@/components/output/DocumentWorkbench";

export const metadata = {
  title: "文件工作台 — 全能標案助理",
  description: "選範本、編章節、一鍵匯出建議書",
};

export default function OutputPage() {
  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">文件工作台</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          選擇範本、填入各章內容，匯出 Word 建議書。
          <a href="/tools/docx" className="ml-2 underline underline-offset-2">
            切換至簡易模式
          </a>
        </p>
      </div>
      <DocumentWorkbench />
    </div>
  );
}
