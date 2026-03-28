function readString(
  payload: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
}

function readEpoch(
  payload: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.floor(value);
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.floor(parsed);
      }
    }
  }

  return 0;
}

export interface AuthChallengeSeed {
  nonce?: unknown;
  aud?: unknown;
}

export interface AuthCompletePayloadShape {
  nonce: string;
  agentId: string;
  sessionPubkey: string;
  delegationToken: string;
  signatureBySession: string;
  publicIdentityAttestation?: string;
  fullIdentityAttestation?: string;
}

export function createAuthPayloadTemplate(
  challenge?: AuthChallengeSeed,
): AuthCompletePayloadShape {
  return {
    nonce: typeof challenge?.nonce === "string" ? challenge.nonce : "",
    agentId: "",
    sessionPubkey: "",
    delegationToken: "",
    signatureBySession: "",
    publicIdentityAttestation: "",
    fullIdentityAttestation: "",
  };
}

export function normalizeAuthCompletePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return {
    nonce: readString(payload, "nonce"),
    agentId: readString(payload, "agentId", "agent_id"),
    sessionPubkey: readString(payload, "sessionPubkey", "session_pubkey"),
    delegationToken: readString(payload, "delegationToken", "delegation_token"),
    signatureBySession: readString(
      payload,
      "signatureBySession",
      "signature_by_session",
    ),
    publicIdentityAttestation: readString(
      payload,
      "publicIdentityAttestation",
      "public_identity_attestation",
    ),
    fullIdentityAttestation: readString(
      payload,
      "fullIdentityAttestation",
      "full_identity_attestation",
    ),
  };
}

export function serializeRareChallenge(challenge: Record<string, unknown>) {
  const normalized = {
    nonce: readString(challenge, "nonce") ?? "",
    aud: readString(challenge, "aud") ?? "",
    issuedAt: readEpoch(challenge, "issuedAt", "issued_at"),
    expiresAt: readEpoch(challenge, "expiresAt", "expires_at"),
  };

  return {
    nonce: normalized.nonce,
    aud: normalized.aud,
    issued_at: normalized.issuedAt,
    expires_at: normalized.expiresAt,
    issuedAt: normalized.issuedAt,
    expiresAt: normalized.expiresAt,
    challenge: {
      ...normalized,
      issued_at: normalized.issuedAt,
      expires_at: normalized.expiresAt,
    },
  };
}

export function looksLikeRareRegisterResponse(
  payload: Record<string, unknown>,
) {
  const hasRegisterFields =
    typeof payload.agent_id === "string" &&
    typeof payload.hosted_management_token === "string";
  const hasAuthProof =
    typeof readString(payload, "sessionPubkey", "session_pubkey") === "string" ||
    typeof readString(payload, "delegationToken", "delegation_token") === "string" ||
    typeof readString(payload, "signatureBySession", "signature_by_session") === "string";

  return hasRegisterFields && !hasAuthProof;
}

export function parseAuthChallenge(
  rawChallenge: string,
): { nonce: string; aud: string } | null {
  if (!rawChallenge.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawChallenge);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const payload = parsed as Record<string, unknown>;
    const nested =
      payload.challenge && typeof payload.challenge === "object" && !Array.isArray(payload.challenge)
        ? (payload.challenge as Record<string, unknown>)
        : null;

    const nonce = readString(payload, "nonce") ?? readString(nested ?? {}, "nonce");
    const aud = readString(payload, "aud") ?? readString(nested ?? {}, "aud");
    if (!nonce || !aud) {
      return null;
    }

    return { nonce, aud };
  } catch {
    return null;
  }
}

export function buildRareLoginCommand({
  aud,
  platformUrl,
  publicOnly = false,
}: {
  aud: string;
  platformUrl: string;
  publicOnly?: boolean;
}) {
  const command = [
    "rare",
    "--platform-url",
    platformUrl,
    "login",
    "--aud",
    aud,
  ];

  if (publicOnly) {
    command.push("--public-only");
  }

  return command.join(" ");
}
