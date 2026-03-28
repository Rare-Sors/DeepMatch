import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRareLoginCommand,
  createAuthPayloadTemplate,
  looksLikeRareRegisterResponse,
  normalizeAuthCompletePayload,
  parseAuthChallenge,
} from "../lib/rare/auth-complete.ts";

test("normalizeAuthCompletePayload accepts snake_case login payloads", () => {
  const normalized = normalizeAuthCompletePayload({
    nonce: "nonce_123",
    agent_id: "agent_123",
    session_pubkey: "session_pubkey_123",
    delegation_token: "delegation_token_123",
    signature_by_session: "signature_123",
    public_identity_attestation: "public_attestation_123",
  });

  assert.deepEqual(normalized, {
    nonce: "nonce_123",
    agentId: "agent_123",
    sessionPubkey: "session_pubkey_123",
    delegationToken: "delegation_token_123",
    signatureBySession: "signature_123",
    publicIdentityAttestation: "public_attestation_123",
    fullIdentityAttestation: undefined,
  });
});

test("looksLikeRareRegisterResponse detects register output without auth proof", () => {
  assert.equal(
    looksLikeRareRegisterResponse({
      agent_id: "agent_123",
      hosted_management_token: "hosted_token_123",
    }),
    true,
  );

  assert.equal(
    looksLikeRareRegisterResponse({
      agent_id: "agent_123",
      hosted_management_token: "hosted_token_123",
      session_pubkey: "session_pubkey_123",
    }),
    false,
  );
});

test("createAuthPayloadTemplate seeds nonce from issued challenge", () => {
  assert.deepEqual(createAuthPayloadTemplate({ nonce: "nonce_123" }), {
    nonce: "nonce_123",
    agentId: "",
    sessionPubkey: "",
    delegationToken: "",
    signatureBySession: "",
    publicIdentityAttestation: "",
    fullIdentityAttestation: "",
  });
});

test("parseAuthChallenge extracts aud and nonce from challenge JSON", () => {
  assert.deepEqual(
    parseAuthChallenge(JSON.stringify({ nonce: "nonce_123", aud: "deepmatch" })),
    {
      nonce: "nonce_123",
      aud: "deepmatch",
    },
  );

  assert.equal(parseAuthChallenge(""), null);
});

test("buildRareLoginCommand generates platform login command", () => {
  assert.equal(
    buildRareLoginCommand({
      aud: "deepmatch",
      platformUrl: "http://127.0.0.1:3000/api/rare",
      publicOnly: true,
    }),
    "rare login --aud deepmatch --platform-url http://127.0.0.1:3000/api/rare --public-only",
  );
});
