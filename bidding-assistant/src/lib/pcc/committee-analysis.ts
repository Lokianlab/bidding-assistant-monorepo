import type { EvaluationCommitteeMember } from "./types";

// ====== 評委交叉分析 ======

/** 單一標案的評委資料（分析用輸入） */
export interface TenderWithCommittee {
  title: string;
  agency: string;
  unitId: string;
  date: number;
  committee: EvaluationCommitteeMember[];
}

/** 評委在某案的出席紀錄 */
export interface CommitteeAppearance {
  tenderTitle: string;
  agency: string;
  unitId: string;
  date: number;
  attended: boolean;
}

/** 單一評委的彙整 profile */
export interface CommitteeMemberProfile {
  name: string;
  appearances: number;
  agencies: string[];
  attendanceRate: number;
  experience: string;
  status: string;
  tenders: CommitteeAppearance[];
}

/** 評委交叉分析結果 */
export interface CommitteeAnalysis {
  totalMembers: number;
  totalTenders: number;
  frequentMembers: CommitteeMemberProfile[];
}

/**
 * 分析多案的評委出現頻率、關聯機關、出席率。
 * 純函式，不碰 API——資料怎麼取由上層決定。
 */
export function analyzeCommittees(
  tenders: TenderWithCommittee[],
  minAppearances = 2,
): CommitteeAnalysis {
  const memberMap = new Map<string, {
    appearances: CommitteeAppearance[];
    experience: string;
    status: string;
    attended: number;
    latestDate: number;
  }>();

  for (const tender of tenders) {
    for (const member of tender.committee) {
      const name = member.name.trim();
      if (!name) continue;

      const existing = memberMap.get(name);
      const attended = member.attendance === "是";

      const appearance: CommitteeAppearance = {
        tenderTitle: tender.title,
        agency: tender.agency,
        unitId: tender.unitId,
        date: tender.date,
        attended,
      };

      if (existing) {
        existing.appearances.push(appearance);
        if (attended) existing.attended++;
        // 用最新日期的 experience 和 status（不依賴資料到達順序）
        if (tender.date > existing.latestDate) {
          existing.latestDate = tender.date;
          if (member.experience) existing.experience = member.experience;
          if (member.status) existing.status = member.status;
        }
      } else {
        memberMap.set(name, {
          appearances: [appearance],
          experience: member.experience ?? "",
          status: member.status ?? "",
          attended: attended ? 1 : 0,
          latestDate: tender.date,
        });
      }
    }
  }

  const allMembers = Array.from(memberMap.entries());

  const frequentMembers: CommitteeMemberProfile[] = allMembers
    .filter(([, data]) => data.appearances.length >= minAppearances)
    .map(([name, data]) => {
      const agencySet = new Set(data.appearances.map((a) => a.agency));
      return {
        name,
        appearances: data.appearances.length,
        agencies: Array.from(agencySet),
        attendanceRate: data.appearances.length > 0
          ? data.attended / data.appearances.length
          : 0,
        experience: data.experience,
        status: data.status,
        tenders: data.appearances.sort((a, b) => b.date - a.date),
      };
    })
    .sort((a, b) => b.appearances - a.appearances);

  return {
    totalMembers: allMembers.length,
    totalTenders: tenders.length,
    frequentMembers,
  };
}
