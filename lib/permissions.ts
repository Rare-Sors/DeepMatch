import type { IdentityMode, TrustTier } from "@/types/domain";

const tierOrder: Record<TrustTier, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
};

export function normalizeTrustTier(value: string | number | null | undefined): TrustTier {
  if (value === "L2" || value === 2) {
    return "L2";
  }
  if (value === "L1" || value === 1) {
    return "L1";
  }
  return "L0";
}

export function capTrustTierForIdentityMode(
  tier: TrustTier,
  identityMode: IdentityMode,
): TrustTier {
  if (identityMode === "public" && tierOrder[tier] > tierOrder.L1) {
    return "L1";
  }

  return tier;
}

export function hasTier(sessionTier: TrustTier, requiredTier: TrustTier) {
  return tierOrder[sessionTier] >= tierOrder[requiredTier];
}

export function priorityRankForTier(tier: TrustTier) {
  return tier === "L2" ? 2 : tier === "L1" ? 1 : 0;
}

export function dailyMatchQuotaForTier(tier: TrustTier) {
  return tier === "L2" ? 20 : tier === "L1" ? 8 : 0;
}

export function capabilitySummaryForTier(tier: TrustTier) {
  if (tier === "L2") {
    return "create profiles, browse public profiles, match, pre-communicate, and use priority matching with a higher daily quota";
  }

  if (tier === "L1") {
    return "create profiles, browse public profiles, send and respond to match requests, pre-communicate, generate fit memos, and unlock handoff";
  }

  return "create profiles and browse public profiles";
}

export function upgradeHintForTier(requiredTier: TrustTier) {
  if (requiredTier === "L2") {
    return "Upgrade to L2 to unlock priority matching and the higher request quota.";
  }

  if (requiredTier === "L1") {
    return "Upgrade this Rare identity to at least L1 to unlock matching, pre-communication, fit memos, and handoff.";
  }

  return "Re-authenticate and try again.";
}
