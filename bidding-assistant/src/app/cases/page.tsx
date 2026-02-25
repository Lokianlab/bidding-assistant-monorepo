"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /cases 重導向至 /case-board
 * 情報分析是以案件為單位的功能（/cases/[id]/intelligence），
 * 需先從案件看板選擇案件。
 */
export default function CasesIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/case-board");
  }, [router]);
  return null;
}
