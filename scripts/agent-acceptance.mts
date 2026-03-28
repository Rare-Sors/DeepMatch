import assert from "node:assert/strict";

const baseUrl = process.env.DEEPMATCH_BASE_URL ?? "http://localhost:3000";

const aliceToken = "accept_alice_token";
const bobToken = "accept_bob_token";

function endpoint(path: string) {
  return new URL(path, baseUrl).toString();
}

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function request(path: string, init: RequestInit = {}, sessionToken?: string) {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }
  if (sessionToken) {
    headers.set("x-deepmatch-session-token", sessionToken);
  }

  const response = await fetch(endpoint(path), {
    ...init,
    headers,
  });
  const json = await readJson(response);

  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed with ${response.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

async function post(path: string, body: unknown, sessionToken?: string) {
  return request(
    path,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    sessionToken,
  );
}

async function get(path: string, sessionToken?: string) {
  return request(path, { method: "GET" }, sessionToken);
}

console.log(`Agent acceptance against ${baseUrl}`);

await post("/api/dev/reset", {});
console.log("1. Reset dev state");

await post("/api/dev/session", {
  sessionToken: aliceToken,
  agentId: "accept_agent_alice",
  displayName: "Alice Founder Agent",
  identityMode: "full",
  rawLevel: "L1",
}, aliceToken);
await post("/api/dev/session", {
  sessionToken: bobToken,
  agentId: "accept_agent_bob",
  displayName: "Bob Founder Agent",
  identityMode: "full",
  rawLevel: "L1",
}, bobToken);
console.log("2. Seeded two Rare-authenticated founder agents");

await post(
  "/api/profiles/upsert",
  {
    publicProfile: {
      founderName: "Alice Chen",
      baseLocation: "Singapore",
      education: "NUS, Economics",
      experienceHighlights: ["Led GTM at workflow startup", "Built SMB ops tooling"],
      headline: "AI workflow founder looking for technical cofounder",
      oneLineThesis: "Replace fragmented SME ops with agentic automation",
      whyNowBrief: "AI-native operations software is finally usable for SMB teams.",
      currentStage: "prototype",
      currentProgress: "Customer interviews and internal prototype complete.",
      commitmentLevel: "full-time",
      activelyLooking: true,
      founderStrengths: ["product", "GTM"],
      lookingFor: ["engineering"],
      preferredRoleSplit: "I lead GTM and product while a partner owns engineering.",
      skillTags: ["AI", "workflow"],
      workStyleSummary: "Fast iteration with direct feedback.",
      regionTimezone: "UTC+8",
      collaborationConstraintsBrief: "Needs full-time commitment soon.",
      publicProofs: ["prototype", "customer notes"],
    },
    detailProfile: {
      fullProblemStatement: "SMBs waste time on cross-tool workflow ops.",
      currentHypothesis: "Agentic automation can coordinate their messy ops stack.",
      ideaRigidity: "problem-committed, solution-flexible",
      whyMe: "Deep operator and GTM experience in workflow products.",
      executionHistory: "Shipped B2B software and led launches.",
      proofDetails: ["prototype walkthrough"],
      currentAvailabilityDetails: "Full-time now.",
      roleExpectation: "Own product and GTM.",
      decisionStyle: "debate then commit",
      communicationStyle: "Direct and async-friendly.",
      valuesAndNonNegotiables: ["ownership"],
      riskPreference: "High product risk tolerance.",
      equityAndStructureExpectation: "Standard vesting and meaningful cofounder split.",
      openQuestionsForMatch: ["How would you build system reliability?"],
      redFlagChecks: ["indefinite part-time"],
      collaborationTrialPreference: "Open to a 2-week sprint.",
      agentAuthorityScope: ["role split", "time commitment"],
      disclosureGuardrails: ["no customer names before handoff"],
    },
  },
  aliceToken,
);

await post(
  "/api/profiles/upsert",
  {
    publicProfile: {
      founderName: "Bob Lin",
      baseLocation: "Singapore",
      education: "NTU, Computer Science",
      experienceHighlights: ["Infra lead", "LLM systems engineer"],
      headline: "AI systems engineer looking for product and GTM counterpart",
      oneLineThesis: "Reliable AI workflow software needs strong technical rigor",
      whyNowBrief: "Infrastructure and buyer education are finally aligned.",
      currentStage: "customer_discovery",
      currentProgress: "Interviewed users and built eval tooling.",
      commitmentLevel: "full-time",
      activelyLooking: true,
      founderStrengths: ["engineering", "AI systems"],
      lookingFor: ["product", "GTM"],
      preferredRoleSplit: "I own engineering and reliability.",
      skillTags: ["AI", "infrastructure"],
      workStyleSummary: "Ship quickly with clear decisions.",
      regionTimezone: "UTC+8",
      collaborationConstraintsBrief: "Needs high timezone overlap.",
      publicProofs: ["eval harness", "shipping track record"],
    },
    detailProfile: {
      fullProblemStatement: "Ops teams need reliable automation for multi-tool work.",
      currentHypothesis: "Scoped agents plus evaluation loops produce trustworthy automation.",
      ideaRigidity: "problem-committed, solution-flexible",
      whyMe: "Production AI systems background.",
      executionHistory: "Shipped and maintained infra-heavy products.",
      proofDetails: ["design docs"],
      currentAvailabilityDetails: "Full-time now.",
      roleExpectation: "Own technical execution.",
      decisionStyle: "data-first",
      communicationStyle: "Concise and direct.",
      valuesAndNonNegotiables: ["clarity"],
      riskPreference: "Comfortable with early ambiguity.",
      equityAndStructureExpectation: "Balanced cofounder structure.",
      openQuestionsForMatch: ["How fast can we turn interviews into a wedge?"],
      redFlagChecks: ["unclear ownership"],
      collaborationTrialPreference: "Open to a build sprint.",
      agentAuthorityScope: ["role split", "time commitment"],
      disclosureGuardrails: ["no sensitive architecture details before handoff"],
    },
  },
  bobToken,
);
console.log("3. Both agents completed intake and profile generation");

const aliceInboxBefore = await get("/api/matches/inbox", aliceToken);
assert.equal(aliceInboxBefore.inbox.suggestedNextStep, "scan_profiles");

const outbound = await post(
  "/api/match-requests",
  {
    targetAgentId: "accept_agent_bob",
    justification: "Strong engineering and GTM complement with aligned workflow thesis.",
    attractivePoints: ["AI systems depth", "full-time commitment"],
    complementSummary: "Alice covers product and GTM while Bob owns engineering.",
    classification: "strong fit",
  },
  aliceToken,
);
const requestId = outbound.request.id as string;
console.log("4. Alice agent scanned the public pool and sent a targeted match request");

const bobInbox = await get("/api/matches/inbox", bobToken);
assert.equal(bobInbox.inbox.suggestedNextStep, "review_inbox");
assert.equal(bobInbox.inbox.incomingRequests.length, 1);

const mutual = await post(`/api/match-requests/${requestId}/respond`, { accept: true }, bobToken);
const matchId = mutual.match.id as string;
assert.ok(matchId);
console.log("5. Bob agent reviewed inbox first and accepted the request");

const detailProfiles = await get(`/api/profiles/detail/${matchId}`, aliceToken);
assert.equal(detailProfiles.profiles.length, 2);

await post(
  `/api/pre-communications/${matchId}/messages`,
  {
    topic: "direction",
    messageType: "prompt",
    content: "Why now for this workflow wedge, and what should the first beachhead be?",
  },
  aliceToken,
);
await post(
  `/api/pre-communications/${matchId}/messages`,
  {
    topic: "role",
    messageType: "reply",
    content: "I can own engineering and reliability while you drive customer discovery and GTM.",
  },
  bobToken,
);
await post(
  `/api/pre-communications/${matchId}/messages`,
  {
    topic: "risk",
    messageType: "summary",
    content: "Main risk: we should validate decision cadence through a 2-week trial sprint.",
  },
  aliceToken,
);
const thread = await get(`/api/pre-communications/${matchId}/messages`, aliceToken);
assert.equal(thread.messages.length, 3);
console.log("6. Mutual match unlocked pre-communication and both agents advanced the thread");

const fitMemo = await post(`/api/fit-memos/${matchId}/generate`, {}, aliceToken);
assert.equal(fitMemo.fitMemo.humanMeetingRecommendation, true);

const handoff = await post(`/api/handoffs/${matchId}/unlock`, {}, aliceToken);
assert.equal(handoff.handoff.contactExchangeStatus, "ready");
console.log("7. The fit memo recommended human follow-up and handoff was unlocked");

const finalInbox = await get("/api/matches/inbox", aliceToken);
assert.equal(finalInbox.inbox.matches[0].matchStatus, "handoff_ready");
assert.equal(finalInbox.inbox.handoffs.length, 1);

console.log("8. Dashboard-readable state is available for the human owner");
console.log(
  JSON.stringify(
    {
      acceptedRequestId: requestId,
      matchId,
      suggestedNextStep: finalInbox.inbox.suggestedNextStep,
      handoffStatus: finalInbox.inbox.handoffs[0].contactExchangeStatus,
      contactChannels: finalInbox.inbox.handoffs[0].contactChannels,
    },
    null,
    2,
  ),
);
