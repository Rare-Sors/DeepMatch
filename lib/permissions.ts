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
