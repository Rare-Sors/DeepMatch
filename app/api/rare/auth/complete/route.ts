import { authCompleteSchema } from "@/lib/validation";
import { completeRareAuth, createRareSessionRecord } from "@/lib/rare/auth";
import { ok, badRequest, forbidden, serverError } from "@/lib/http";
import { publicIdentityAllowed } from "@/lib/env";
import { deepMatchStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = authCompleteSchema.safeParse(await request.json());
    if (!payload.success) {
      return badRequest("Invalid Rare auth completion payload.", payload.error.flatten());
    }

    const result = await completeRareAuth({
      nonce: payload.data.nonce,
      agentId: payload.data.agentId,
      sessionPubkey: payload.data.sessionPubkey,
      delegationToken: payload.data.delegationToken,
      signatureBySession: payload.data.signatureBySession,
      publicIdentityAttestation: payload.data.publicIdentityAttestation,
      fullIdentityAttestation: payload.data.fullIdentityAttestation,
    });

    const session = createRareSessionRecord(result as unknown as Record<string, unknown>);
    if (session.identityMode === "public" && !publicIdentityAllowed()) {
      return forbidden("Public identity is disabled outside development mode.");
    }

    deepMatchStore.upsertSession(session);

    return ok({
      session,
      trustTier: deepMatchStore.getTrustTier(session.agentId),
    });
  } catch (error) {
    return serverError("Failed to complete Rare auth.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
