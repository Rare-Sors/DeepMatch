import { capTrustTierForIdentityMode, normalizeTrustTier } from "@/lib/permissions";
import { env } from "@/lib/env";
import { getRareKit } from "@/lib/rare/kit";
import { createTrustTierSnapshot } from "@/lib/trust-tier";
import { nowIso } from "@/lib/utils";
import type { RareSession } from "@/types/domain";

export interface RareActionEnvelope {
  action: string;
  actionPayload: Record<string, unknown>;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  signatureBySession: string;
}

export async function issueRareChallenge() {
  const kit = getRareKit();
  return kit.issueChallenge(env.RARE_PLATFORM_AUD as never);
}

export async function completeRareAuth(payload: Record<string, unknown>) {
  const kit = getRareKit();
  return kit.completeAuth(payload as never);
}

export async function verifyRareAction(sessionToken: string, envelope: RareActionEnvelope) {
  const kit = getRareKit();
  return kit.verifyAction({
    sessionToken,
    action: envelope.action,
    actionPayload: envelope.actionPayload,
    nonce: envelope.nonce,
    issuedAt: envelope.issuedAt,
    expiresAt: envelope.expiresAt,
    signatureBySession: envelope.signatureBySession,
  } as never);
}

export function createRareSessionRecord(result: Record<string, unknown>): RareSession {
  const rawLevel = normalizeTrustTier(result.raw_level as string | number | undefined);
  const identityMode = (result.identity_mode as "public" | "full" | undefined) ?? "public";
  const level = capTrustTierForIdentityMode(
    normalizeTrustTier(result.level as string | number | undefined),
    identityMode,
  );

  return {
    sessionToken: String(result.session_token ?? ""),
    agentId: String(result.agent_id ?? ""),
    identityMode,
    rawLevel,
    level,
    displayName: String(result.display_name ?? result.agent_id ?? "Unknown Founder"),
    sessionPubkey: String(result.session_pubkey ?? ""),
    lastSeenAt: nowIso(),
  };
}

export { createTrustTierSnapshot };
