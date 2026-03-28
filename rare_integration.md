# For Platform Integration (TypeScript)

This is the current TypeScript integration contract for a third-party platform using Rare.

## Goal

This document is optimized for coding agents such as Codex and Claude Code.

The expected outcome is:

- understand the Rare platform login model quickly
- add the minimum backend pieces correctly
- avoid confusing identity bootstrap with platform login
- ship a working public-login integration first

## Audience

This document is for platform engineers integrating Rare into a product backend.

It is not the runtime playbook for an agent operating on an already integrated platform.
Runtime agents should follow that platform's own auth and skill instructions.

## Coding-Agent Contract

If you are a coding agent integrating Rare into a platform, follow this contract:

1. Create a Rare platform kit with challenge, replay, and session stores.
2. Expose exactly two backend handlers first: `/auth/challenge` and `/auth/complete`.
3. Feed `kit.completeAuth(...)` the delegated login proof plus identity attestation.
4. Persist and reuse the returned platform `session_token`.
5. Only after login works, add delegated action verification and full-identity registration.

If you are not implementing backend auth handlers, this is the wrong document.

## If You Are Only Given This Document

Use this rule:

- if you are implementing backend auth handlers, keep reading
- if you are trying to operate an already integrated platform as an agent, stop here and use that platform's runtime auth instructions

Do not infer from this document that `rare register` is enough for platform access.

## Common Misreads To Avoid

- `rare register` creates or refreshes a Rare identity; it does not create a platform session
- `hosted_management_token` is not a platform `session_token`
- `/auth/challenge` and `/auth/complete` are platform integration endpoints, not the normal runtime path for an agent using an already integrated platform
- the normal runtime path for an agent is typically `rare login --aud <aud> --platform-url <platform>/api/rare`

## Three Different Things

| Command / Concept | Purpose | Reusable output |
|---|---|---|
| `rare register` | Create or refresh Rare identity | `agent_id`, maybe `hosted_management_token` |
| `rare login` | Log into a specific integrated platform | `session_token` |
| `kit.completeAuth(...)` | Platform backend verifies delegated login proof and issues its own session | platform-side `session_token` result |

Only the platform `session_token` is the normal runtime credential for platform API calls.

## Fast Path For Coding Agents

Implement this first:

- install `@rare-id/platform-kit-core`, `@rare-id/platform-kit-client`, `@rare-id/platform-kit-web`
- create `kit = createRarePlatformKit(...)`
- implement `POST /auth/challenge` with `kit.issueChallenge(aud)`
- implement `POST /auth/complete` with `kit.completeAuth(...)`
- store the returned `session_token`
- test with:

```bash
rare register --name alice
rare login --aud platform --platform-url http://127.0.0.1:8000/platform --public-only
```

Do not start with full identity, DNS registration, or negative event ingestion unless the task explicitly requires them.

## 10-Minute Quick Start

Start with public login first. It gives you local verification, session handling, and delegated action support without requiring Rare platform registration.

### 1) Install the SDK

```bash
pnpm add @rare-id/platform-kit-core @rare-id/platform-kit-client @rare-id/platform-kit-web
```

### 2) Configure the kit

```ts
import { RareApiClient } from "@rare-id/platform-kit-client";
import {
  InMemoryChallengeStore,
  InMemoryReplayStore,
  InMemorySessionStore,
  createRarePlatformKit,
} from "@rare-id/platform-kit-web";

const rare = new RareApiClient({
  rareBaseUrl: "https://api.rareid.cc",
});

const kit = createRarePlatformKit({
  aud: "platform",
  rareApiClient: rare,
  challengeStore: new InMemoryChallengeStore(),
  replayStore: new InMemoryReplayStore(),
  sessionStore: new InMemorySessionStore(),
  // Required when you verify hosted-signer delegations.
  // rareSignerPublicKeyB64: "<rare signer Ed25519 public x>",
});
```

Production uses `https://api.rareid.cc` and does not append `/rare`.

Local development depends on how you mount Rare Core:

- if Rare Core is mounted at the root, use `http://127.0.0.1:8000`
- if Rare Core is mounted behind a platform prefix, use that exact prefix, for example `http://127.0.0.1:8000/rare`

`InMemory*Store` is only for local development. Production should use durable shared storage, typically Redis for challenge and replay state plus database-backed or Redis-backed session persistence.

### 3) Expose auth challenge and auth complete handlers

```ts
const challenge = await kit.issueChallenge("platform");

const login = await kit.completeAuth({
  nonce,
  agentId,
  sessionPubkey,
  delegationToken,
  signatureBySession,
  publicIdentityAttestation,
  fullIdentityAttestation,
});
```

This code is backend implementation detail.
It explains how a platform turns delegated Rare auth proof into its own session.
It is not the normal runtime instruction set for an agent using the platform.

### Minimal request/response shape

Your platform should accept an auth-complete payload conceptually equivalent to:

```json
{
  "nonce": "...",
  "agent_id": "...",
  "session_pubkey": "...",
  "delegation_token": "...",
  "signature_by_session": "...",
  "public_identity_attestation": "...",
  "full_identity_attestation": "..."
}
```

Your platform backend may translate those fields to SDK camelCase before calling `kit.completeAuth(...)`.

On success, the platform receives:

- `session_token`
- `agent_id`
- `identity_mode`
- `raw_level`
- `level`
- `display_name`
- `session_pubkey`

`level` is the effective platform level after SDK policy is applied.

### Naming map: wire format vs SDK

Coding agents commonly trip over this conversion. Use this mapping:

| Wire / JSON field | SDK field |
|---|---|
| `agent_id` | `agentId` |
| `session_pubkey` | `sessionPubkey` |
| `delegation_token` | `delegationToken` |
| `signature_by_session` | `signatureBySession` |
| `public_identity_attestation` | `publicIdentityAttestation` |
| `full_identity_attestation` | `fullIdentityAttestation` |

### 4) Validate the flow with Agent CLI

```bash
rare register --name alice
rare login --aud platform --platform-url http://127.0.0.1:8000/platform --public-only
```

Interpretation:

- `rare register` is identity bootstrap only
- `rare login` is what produces a platform session for normal runtime use
- the manual `completeAuth(...)` payload is mostly relevant to platform implementers and auth debugging

If you are running an agent against an already integrated platform, the practical runtime step is usually just:

```bash
rare login --aud <platform-aud> --platform-url <platform-base>/api/rare
```

Then reuse the returned `session_token` on platform API calls.

## Minimal Backend Skeleton

Use this as the implementation outline:

```ts
import { RareApiClient } from "@rare-id/platform-kit-client";
import {
  InMemoryChallengeStore,
  InMemoryReplayStore,
  InMemorySessionStore,
  createRarePlatformKit,
} from "@rare-id/platform-kit-web";

const rare = new RareApiClient({ rareBaseUrl: "https://api.rareid.cc" });

export const kit = createRarePlatformKit({
  aud: "platform",
  rareApiClient: rare,
  challengeStore: new InMemoryChallengeStore(),
  replayStore: new InMemoryReplayStore(),
  sessionStore: new InMemorySessionStore(),
});

export async function issueChallengeHandler() {
  return kit.issueChallenge("platform");
}

export async function completeAuthHandler(body: {
  nonce: string;
  agent_id: string;
  session_pubkey: string;
  delegation_token: string;
  signature_by_session: string;
  public_identity_attestation?: string;
  full_identity_attestation?: string;
}) {
  return kit.completeAuth({
    nonce: body.nonce,
    agentId: body.agent_id,
    sessionPubkey: body.session_pubkey,
    delegationToken: body.delegation_token,
    signatureBySession: body.signature_by_session,
    publicIdentityAttestation: body.public_identity_attestation,
    fullIdentityAttestation: body.full_identity_attestation,
  });
}
```

This is the minimum useful integration.

## Required Config And Storage

Every platform integration needs:

- a unique platform audience string `aud`
- a Rare API base URL
- a challenge store with one-time nonce consumption
- a replay store with atomic claim semantics
- a session store for issued platform sessions

Hosted-signer delegations require the Rare signer public key:

- `rareSignerPublicKeyB64`

If you only verify self-hosted delegations, that extra signer key is not required.

## Definition Of Done For The First Integration

Treat the first pass as complete when all of these are true:

- `/auth/challenge` returns a nonce-bearing challenge
- `/auth/complete` returns `session_token`
- `rare login --aud <aud> --platform-url <platform>/api/rare --public-only` succeeds
- your backend stores sessions and accepts the returned `session_token`
- replay checks are active for challenge nonces and delegation tokens

## Verification Red Lines

These checks are mandatory:

- challenge nonces must be one-time use
- `delegation_token` must pass `typ`, `aud`, `scope`, `exp`, and replay checks
- identity attestation must pass signature and expiry checks
- identity triad must match exactly:

```text
auth_complete.agent_id == delegation.agent_id == attestation.sub
```

- signed actions must be verified against the delegated session public key, not the long-term identity key
- full identity mode requires the token payload `aud` to match your platform `aud`
- unknown claims must be ignored for forward compatibility

These are protocol rules, not optional heuristics.

## Public vs Full Identity

### Public identity

Use this mode when:

- you want the fastest rollout
- you do not need Rare platform registration yet

Behavior:

- agents authenticate with public attestation
- the SDK still verifies delegation and identity locally
- public identity mode caps effective governance to `L1`

### Full identity

Use this mode when:

- you want Rare to bind the identity token to your platform `aud`
- you want raw `L0` / `L1` / `L2` governance without the public-mode cap

Prerequisite:

- your platform must complete Rare platform registration first

The SDK prefers full identity when a valid full attestation is present and falls back to public identity when only public attestation can be verified.

## Verify Signed Actions

After login, verify each delegated action with the platform session:

```ts
const verified = await kit.verifyAction({
  sessionToken,
  action,
  actionPayload,
  nonce,
  issuedAt,
  expiresAt,
  signatureBySession,
});
```

This checks:

- session validity
- detached signature by the delegated session key
- nonce replay protection
- signed TTL window

Only accept the action if verification succeeds.

## Register As A Rare Platform For Full Mode

### 1) Ask Rare for a DNS challenge

```ts
const challenge = await rare.issuePlatformRegisterChallenge({
  platform_aud: "platform",
  domain: "platform.example.com",
});
```

### 2) Publish the TXT record

Use:

- `challenge.txt_name`
- `challenge.txt_value`

### 3) Complete platform registration

```ts
await rare.completePlatformRegister({
  challenge_id: challenge.challenge_id,
  platform_id: "platform-prod",
  platform_aud: "platform",
  domain: "platform.example.com",
  keys: [
    {
      kid: "platform-signing-key-1",
      public_key: "<base64-ed25519-public-key>",
    },
  ],
});
```

After activation, agents can request full attestation for your `aud`.

## Report Negative Agent Events

Rare accepts signed platform event tokens at:

```text
POST /v1/identity-library/events/ingest
```

```ts
await kit.ingestNegativeEvents({
  platformId: "platform-prod",
  kid: "platform-signing-key-1",
  privateKeyPem,
  jti: crypto.randomUUID(),
  events: [
    {
      event_id: "ev-1",
      agent_id: "<agent_id>",
      category: "spam",
      severity: 3,
      outcome: "post_removed",
      occurred_at: Math.floor(Date.now() / 1000),
    },
  ],
});
```

Allowed v1 categories:

- `spam`
- `fraud`
- `abuse`
- `policy_violation`

Rare enforces replay protection on `(iss, jti)` and idempotency on `(iss, event_id)`.

## Recommended Production Rollout

1. Ship public login first.
2. Add signed action verification and replay protection.
3. Move off in-memory stores.
4. Register the platform with Rare DNS verification.
5. Enforce full-attestation-only policy if your risk model requires it.
