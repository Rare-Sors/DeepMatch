import { dailyMatchQuotaForTier, priorityRankForTier } from "@/lib/permissions";
import { nowIso } from "@/lib/utils";
import type { RareSession } from "@/types/domain";

export function createTrustTierSnapshot(session: RareSession) {
  return {
    agentId: session.agentId,
    rawLevel: session.rawLevel,
    effectiveLevel: session.level,
    priorityRank: priorityRankForTier(session.level),
    dailyMatchQuota: dailyMatchQuotaForTier(session.level),
    updatedAt: nowIso(),
  };
}
