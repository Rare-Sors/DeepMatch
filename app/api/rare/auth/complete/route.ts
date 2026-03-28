import { authCompleteSchema } from "@/lib/validation";
import { attachDashboardSessionCookie } from "@/lib/dashboard-access";
import {
  looksLikeRareRegisterResponse,
  normalizeAuthCompletePayload,
} from "@/lib/rare/auth-complete";
import { completeRareAuth, createRareSessionRecord } from "@/lib/rare/auth";
import { ok, badRequest, forbidden, serverError } from "@/lib/http";
import { publicIdentityAllowed } from "@/lib/env";
import { deepMatchStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return badRequest("Invalid Rare auth completion payload.");
    }

    if (looksLikeRareRegisterResponse(body as Record<string, unknown>)) {
      return badRequest(
        "Received Rare registration output, not a platform login payload. Run `rare --platform-url <your-app>/api/rare login --aud <your-aud>` and use that delegated auth flow instead.",
      );
    }

    const payload = authCompleteSchema.safeParse(
      normalizeAuthCompletePayload(body as Record<string, unknown>),
    );
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

    const response = ok({
      session,
      trustTier: deepMatchStore.getTrustTier(session.agentId),
    });

    return attachDashboardSessionCookie(response, session.sessionToken);
  } catch (error) {
    return serverError("Failed to complete Rare auth.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
