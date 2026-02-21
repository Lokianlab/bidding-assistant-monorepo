"use client";

interface Issue {
  severity: "error" | "warning";
  message: string;
  context?: string;
}

interface IssueListProps {
  issues: Issue[];
  /** 為空時顯示的訊息 */
  emptyMessage?: string;
}

const SEVERITY_STYLE: Record<string, { icon: string; text: string; bg: string }> = {
  error: { icon: "❌", text: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
  warning: { icon: "⚠️", text: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
};

export function IssueList({ issues, emptyMessage = "沒有發現問題" }: IssueListProps) {
  if (issues.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {issues.map((issue, i) => {
        const style = SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.warning;
        return (
          <li key={i} className={`rounded-md p-3 ${style.bg}`}>
            <div className={`text-sm font-medium ${style.text}`}>
              {style.icon} {issue.message}
            </div>
            {issue.context && (
              <div className="mt-1 text-xs text-muted-foreground">
                {issue.context}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
