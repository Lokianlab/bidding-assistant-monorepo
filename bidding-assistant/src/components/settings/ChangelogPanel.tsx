"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CHANGELOG, type ChangelogEntry } from "@/data/changelog";

const TYPE_CONFIG: Record<
  ChangelogEntry["changes"][number]["type"],
  { label: string; className: string }
> = {
  feature: {
    label: "新功能",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  fix: {
    label: "修復",
    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  improve: {
    label: "改進",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  breaking: {
    label: "破壞性",
    className: "bg-destructive text-white",
  },
};

export function ChangelogPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>更新日誌</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-8">
            {CHANGELOG.map((entry) => (
              <section key={entry.version}>
                {/* Version header */}
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="default" className="text-sm font-mono">
                    v{entry.version}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {entry.date}
                  </span>
                </div>

                <h3 className="text-base font-semibold mb-3">{entry.title}</h3>

                {/* Changes list */}
                <ul className="space-y-2">
                  {entry.changes.map((change, idx) => {
                    const config = TYPE_CONFIG[change.type];
                    return (
                      <li key={idx} className="flex items-start gap-2">
                        <Badge
                          variant="secondary"
                          className={`mt-0.5 shrink-0 text-[11px] ${config.className}`}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-sm">{change.description}</span>
                      </li>
                    );
                  })}
                </ul>

                {/* Divider (skip for last entry) */}
                {entry !== CHANGELOG[CHANGELOG.length - 1] && (
                  <div className="border-b mt-6" />
                )}
              </section>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
