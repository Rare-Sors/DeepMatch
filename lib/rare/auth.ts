import { env } from "@/lib/env";
import { getRareKit } from "@/lib/rare/kit";
import { createTrustTierSnapshot } from "@/lib/trust-tier";

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

export { createTrustTierSnapshot };
