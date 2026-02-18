"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/dashboard/helpers";
import {
  pagesToCalendarEvents,
  groupEventsByMonth,
  getDeadlineUrgency,
  getUrgencyColor,
} from "@/lib/case-board/helpers";
import type { NotionPage } from "@/lib/dashboard/types";

interface CaseCalendarViewProps {
  pages: NotionPage[];
  onPageClick: (page: NotionPage) => void;
}

export function CaseCalendarView({ pages, onPageClick }: CaseCalendarViewProps) {
  const events = pagesToCalendarEvents(pages);
  const grouped = groupEventsByMonth(events);
  const sortedMonths = Object.keys(grouped).sort();

  // Build a map of id → NotionPage for click handling
  const pageMap = new Map(pages.map((p) => [p.id, p]));

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        沒有截標期限資料
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedMonths.map((monthKey) => {
        const monthEvents = grouped[monthKey].sort(
          (a, b) => a.date.localeCompare(b.date),
        );
        const [year, month] = monthKey.split("-");
        return (
          <div key={monthKey}>
            <h3 className="font-semibold text-sm mb-3">
              {year} 年 {Number(month)} 月
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {monthEvents.length} 件
              </Badge>
            </h3>
            <div className="space-y-2">
              {monthEvents.map((event) => {
                const urgency = getDeadlineUrgency(event.daysLeft);
                const urgencyColor = getUrgencyColor(urgency);
                const page = pageMap.get(event.id);
                return (
                  <Card
                    key={event.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      page ? "" : "opacity-60"
                    }`}
                    onClick={() => page && onPageClick(page)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* 日期 */}
                      <div className="text-center min-w-[48px]">
                        <div className="text-lg font-bold leading-tight">
                          {event.date.split("-")[2]}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {event.date.split("-")[1]} 月
                        </div>
                      </div>
                      {/* 內容 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {event.agency && (
                            <span className="text-xs text-muted-foreground truncate">
                              {event.agency}
                            </span>
                          )}
                          {event.budget && (
                            <span className="text-xs font-mono text-muted-foreground">
                              ${fmt(event.budget)}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* 狀態 */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {event.status && (
                          <Badge variant="outline" className="text-[10px]">
                            {event.status}
                          </Badge>
                        )}
                        <Badge className={`text-[10px] ${urgencyColor}`}>
                          {event.daysLeft !== null
                            ? event.daysLeft > 0
                              ? `${event.daysLeft} 天`
                              : event.daysLeft === 0
                                ? "今天"
                                : "已逾期"
                            : "—"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
