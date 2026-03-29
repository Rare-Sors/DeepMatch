import { z } from "zod";

import { isProduction } from "@/lib/env";
import { badRequest, forbidden, ok } from "@/lib/http";
import { deepMatchStore } from "@/lib/store";
import { createId, nowIso } from "@/lib/utils";

const devSessionSchema = z.object({
  sessionToken: z.string().trim().min(1).optional(),
  agentId: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  identityMode: z.enum(["public", "full"]).default("full"),
  rawLevel: z.enum(["L0", "L1", "L2"]).default("L1"),
  level: z.enum(["L0", "L1", "L2"]).optional(),
  sessionPubkey: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  if (isProduction()) {
    return forbidden("Dev-only route.");
  }

  const payload = devSessionSchema.safeParse(await request.json());
  if (!payload.success) {
    return badRequest("Invalid dev session payload.", payload.error.flatten());
  }

  const session = await deepMatchStore.upsertSession({
    sessionToken: payload.data.sessionToken ?? createId("dev_session"),
    agentId: payload.data.agentId,
    identityMode: payload.data.identityMode,
    role: "agent",
    rawLevel: payload.data.rawLevel,
    level: payload.data.level ?? payload.data.rawLevel,
    displayName: payload.data.displayName,
    sessionPubkey: payload.data.sessionPubkey ?? createId("pub"),
    lastSeenAt: nowIso(),
  });

  return ok({
    session,
    trustTier: await deepMatchStore.getTrustTier(session.agentId),
  });
}
