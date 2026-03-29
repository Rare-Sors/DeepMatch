import test from "node:test";
import { beforeEach } from "node:test";
import assert from "node:assert/strict";

import { NextRequest } from "next/server";

import {
  DASHBOARD_HEARTBEAT_REFRESH_WINDOW_SECONDS,
  DASHBOARD_SESSION_COOKIE,
  DASHBOARD_SESSION_MAX_AGE_SECONDS,
} from "../lib/dashboard-access.ts";
import { POST as heartbeatDashboardAccess } from "../app/api/dashboard-access-links/heartbeat/route.ts";
import { POST as upsertProfiles } from "../app/api/profiles/upsert/route.ts";
import { HttpError, errorResponse } from "../lib/http.ts";
import { getSuggestedMatchingNextStep, shouldCreateMutualMatch } from "../lib/matching/state-machine.ts";
import { buildFitMemo } from "../lib/precomm/fit-memo.ts";
import { capTrustTierForIdentityMode, hasTier } from "../lib/permissions.ts";
import { authorizeWrite } from "../lib/request-context.ts";
import { deepMatchStore } from "../lib/store.ts";
import { GET as consumeDashboardAccessLink } from "../app/dashboard/access/route.ts";
import { GET as getInbox } from "../app/api/matches/inbox/route.ts";
import type { MatchRecord, PreCommunicationMessage } from "../types/domain.ts";

beforeEach(() => {
  deepMatchStore.reset();
});

function buildProfilePayload(suffix: string) {
  return {
    publicProfile: {
      founderName: `Founder ${suffix}`,
      baseLocation: "Singapore",
      education: "NUS",
      experienceHighlights: ["Operator", "Builder"],
      headline: `Founder ${suffix} is building workflow software`,
      oneLineThesis: `Thesis ${suffix}`,
      whyNowBrief: `Why now ${suffix}`,
      currentStage: "prototype" as const,
      currentProgress: `Progress ${suffix}`,
      commitmentLevel: "full-time" as const,
      activelyLooking: true,
      founderStrengths: ["product"],
      lookingFor: ["engineering"],
      preferredRoleSplit: "Product plus engineering split.",
      skillTags: ["AI", "workflow"],
      workStyleSummary: "Direct and fast.",
      regionTimezone: "UTC+8",
      collaborationConstraintsBrief: "None.",
      publicProofs: ["prototype"],
    },
    detailProfile: {
      fullProblemStatement: `Problem ${suffix}`,
      currentHypothesis: `Hypothesis ${suffix}`,
      ideaRigidity: "problem-committed",
      whyMe: `Why me ${suffix}`,
      executionHistory: `Execution ${suffix}`,
      proofDetails: ["demo"],
      currentAvailabilityDetails: "Full-time.",
      roleExpectation: "Own product.",
      decisionStyle: "debate then commit",
      communicationStyle: "Direct.",
      valuesAndNonNegotiables: ["clarity"],
      riskPreference: "moderate",
      equityAndStructureExpectation: "standard vesting",
      openQuestionsForMatch: ["How fast can we ship?"],
      redFlagChecks: ["indefinite part-time"],
      collaborationTrialPreference: "2-week sprint",
      agentAuthorityScope: ["role split"],
      disclosureGuardrails: ["no sensitive details before handoff"],
    },
  };
}

function buildLegacyNestedProfilePayload() {
  return {
    publicProfile: {
      name: "Sid",
      intent: "ToA founder seeking cofounder",
      stage: "idea",
      progress: "exploring",
      commitment: "20-40h",
      strengths: "product storytelling execution",
      desiredCounterpart: "engineering or growth",
      roleSplit: "product lead",
      workStyle: "remote async",
      region: "Shanghai",
      constraints: "认同ToA方向",
      publicProofs: ["github.com/Rare-Sors"],
      freshness: "2026-03-29",
    },
    detailProfile: {
      identity: {
        name: "Sid",
        location: "Shanghai",
        timezone: "Asia/Shanghai",
        occupation: "TPM at AI Lab",
        currentFoundingStatus: "parttime exploration",
        nearTermAvailability: "3h weekdays",
      },
      ventureDirection: {
        problem: "ToA services for agents",
        whyNow: "agent economy emerging",
        stage: "idea",
        progress: "exploring",
        rigidity: "direction fixed",
      },
      capability: {
        strengths: ["product", "storytelling", "execution"],
        ownership: "product",
        missing: ["engineering", "growth marketing"],
        desiredCofounder: "strong engineer or growth marketer",
      },
      collaboration: {
        workRhythm: "remote async",
        decisionStyle: "fast validation",
        communicationDensity: "medium",
        conflictHandling: "stable",
      },
      constraints: {
        location: "Shanghai remote",
        time: "parttime",
        industry: "ToA",
        risk: "acceptable",
        equityExpectations: "open",
        nonNegotiables: ["认同ToA方向"],
      },
      credibility: {
        publicProofs: ["CirtusAI (Antler SG19)", "CtrlAI (OpenClaw)", "Rare Agent ID"],
        executionHistory: "multiple 0-1 projects",
      },
      experience: {
        education: ["Sichuan University"],
        workHistory: ["OKX", "Google", "ByteDance", "Kuaishou", "AI Lab"],
        pastProjects: ["LiveX blockchain ticketing"],
      },
      agentAuthorityScope: "full",
      disclosureGuardrails: "standard",
    },
  };
}

test("public identity caps L2 to L1", () => {
  assert.equal(capTrustTierForIdentityMode("L2", "public"), "L1");
  assert.equal(capTrustTierForIdentityMode("L2", "full"), "L2");
});

test("minimum trust tier checks are ordered correctly", () => {
  assert.equal(hasTier("L1", "L0"), true);
  assert.equal(hasTier("L0", "L1"), false);
  assert.equal(hasTier("L2", "L1"), true);
});

test("mutual positive intent creates matches", () => {
  assert.equal(
    shouldCreateMutualMatch({ status: "pending" }, { status: "pending" }),
    true,
  );
  assert.equal(
    shouldCreateMutualMatch({ status: "accepted" }, { status: "declined" }),
    false,
  );
});

test("matching workflow is inbox-first before scanning profiles", () => {
  assert.deepEqual(
    getSuggestedMatchingNextStep({
      incomingRequests: [{ status: "pending" }],
      matches: [],
    }).step,
    "review_inbox",
  );

  assert.deepEqual(
    getSuggestedMatchingNextStep({
      incomingRequests: [],
      matches: [{ matchStatus: "active" }],
    }).step,
    "start_pre_communication",
  );

  assert.deepEqual(
    getSuggestedMatchingNextStep({
      incomingRequests: [],
      matches: [{ matchStatus: "handoff_ready" }],
    }).step,
    "start_pre_communication",
  );

  assert.deepEqual(
    getSuggestedMatchingNextStep({
      incomingRequests: [],
      matches: [],
    }).step,
    "scan_profiles",
  );
});

test("fit memo captures complements, risks, and open questions", () => {
  const match: MatchRecord = {
    id: "match_1",
    participantAgentIds: ["agent_a", "agent_b"],
    matchStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const messages: PreCommunicationMessage[] = [
    {
      id: "msg_1",
      matchId: "match_1",
      topic: "direction",
      speakerAgentId: "agent_a",
      messageType: "prompt",
      content: "Why now for this AI workflow market, and what is the real wedge?",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg_2",
      matchId: "match_1",
      topic: "role",
      speakerAgentId: "agent_b",
      messageType: "reply",
      content: "I can own engineering while you lead GTM and customer discovery.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg_3",
      matchId: "match_1",
      topic: "risk",
      speakerAgentId: "agent_a",
      messageType: "summary",
      content: "Main risk: our full-time timing may be misaligned for the next 6 weeks.",
      createdAt: new Date().toISOString(),
    },
  ];

  const memo = buildFitMemo(match, messages);

  assert.equal(memo.matchId, "match_1");
  assert.equal(memo.strongestComplements.length > 0, true);
  assert.equal(memo.primaryRisks.length > 0, true);
  assert.equal(memo.openQuestions.length > 0, true);
});

test("simulated founder flow reaches mutual match, pre-comm, memo, and handoff", () => {
  const now = new Date().toISOString();

  const alice = deepMatchStore.upsertSession({
    sessionToken: "sim_alice",
    agentId: "sim_agent_alice",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Alice Agent",
    sessionPubkey: "pub_alice",
    lastSeenAt: now,
  });

  const bob = deepMatchStore.upsertSession({
    sessionToken: "sim_bob",
    agentId: "sim_agent_bob",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Bob Agent",
    sessionPubkey: "pub_bob",
    lastSeenAt: now,
  });

  deepMatchStore.upsertProfile(alice.agentId, {
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
  });

  deepMatchStore.upsertProfile(bob.agentId, {
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
  });

  const aliceInboxBefore = deepMatchStore.listInbox(alice.agentId);
  assert.equal(aliceInboxBefore.suggestedNextStep, "scan_profiles");

  const outbound = deepMatchStore.createMatchRequest(alice.agentId, {
    targetAgentId: bob.agentId,
    justification: "Strong engineering and GTM complement with aligned workflow thesis.",
    attractivePoints: ["AI systems depth", "full-time commitment"],
    complementSummary: "Alice covers product and GTM while Bob owns engineering.",
    classification: "strong fit",
  });

  const bobInbox = deepMatchStore.listInbox(bob.agentId);
  assert.equal(bobInbox.suggestedNextStep, "review_inbox");
  assert.equal(bobInbox.incomingRequests.length > 0, true);

  const mutual = deepMatchStore.respondToMatchRequest(outbound.request.id, bob.agentId, true);
  assert.ok(mutual?.match);

  const aliceInboxAfter = deepMatchStore.listInbox(alice.agentId);
  assert.equal(aliceInboxAfter.suggestedNextStep, "start_pre_communication");

  const details = deepMatchStore.getDetailProfilesForMatch(mutual!.match!.id, alice.agentId);
  assert.ok(details);
  assert.equal(details!.profiles.length, 2);

  deepMatchStore.addPreCommunicationMessage(
    mutual!.match!.id,
    alice.agentId,
    "direction",
    "prompt",
    "Why now for this workflow wedge, and what should the first beachhead be?",
  );
  deepMatchStore.addPreCommunicationMessage(
    mutual!.match!.id,
    bob.agentId,
    "role",
    "reply",
    "I can own engineering and reliability while you drive customer discovery and GTM.",
  );
  deepMatchStore.addPreCommunicationMessage(
    mutual!.match!.id,
    alice.agentId,
    "risk",
    "summary",
    "Main risk: we should validate decision cadence through a 2-week trial sprint.",
  );

  const memo = deepMatchStore.generateFitMemo(mutual!.match!.id, alice.agentId);
  assert.ok(memo);
  assert.equal(memo!.humanMeetingRecommendation, true);

  const handoff = deepMatchStore.unlockHandoff(mutual!.match!.id, alice.agentId);
  assert.ok(handoff);
  assert.equal(handoff!.contactExchangeStatus, "ready");
});

test("expired sessions are rejected by the local session store", () => {
  deepMatchStore.upsertSession({
    sessionToken: "expired_session",
    agentId: "expired_agent",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Expired Agent",
    sessionPubkey: "pub_expired",
    lastSeenAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) - 30,
  });

  assert.equal(deepMatchStore.getSession("expired_session"), undefined);
});

test("profile trust tier follows the latest agent level instead of an older session", () => {
  const now = new Date().toISOString();

  deepMatchStore.upsertSession({
    sessionToken: "old_public",
    agentId: "agent_upgrade",
    identityMode: "public",
    role: "agent",
    rawLevel: "L2",
    level: "L1",
    displayName: "Upgrade Agent",
    sessionPubkey: "pub_old",
    lastSeenAt: now,
  });

  deepMatchStore.upsertSession({
    sessionToken: "new_full",
    agentId: "agent_upgrade",
    identityMode: "full",
    role: "agent",
    rawLevel: "L2",
    level: "L2",
    displayName: "Upgrade Agent",
    sessionPubkey: "pub_new",
    lastSeenAt: now,
  });

  const result = deepMatchStore.upsertProfile("agent_upgrade", {
    publicProfile: {
      headline: "Founder upgrading to full identity",
      oneLineThesis: "Need a better governance signal",
      whyNowBrief: "Trust tier should reflect the active session.",
      currentStage: "idea",
      currentProgress: "Testing trust semantics.",
      commitmentLevel: "full-time",
      activelyLooking: true,
      founderStrengths: ["product"],
      lookingFor: ["engineering"],
      preferredRoleSplit: "Product plus GTM partner with technical cofounder.",
      skillTags: ["AI"],
      workStyleSummary: "Direct.",
      regionTimezone: "UTC+8",
      collaborationConstraintsBrief: "None.",
      publicProofs: ["prototype"],
    },
    detailProfile: {
      fullProblemStatement: "Profile tier drift after relogin.",
      currentHypothesis: "Use agent-level effective tier when persisting profiles.",
      ideaRigidity: "solution-flexible",
      whyMe: "I hit the bug.",
      executionHistory: "Test coverage.",
      proofDetails: ["failing repro"],
      currentAvailabilityDetails: "Full-time.",
      roleExpectation: "Own product.",
      decisionStyle: "data-first",
      communicationStyle: "concise",
      valuesAndNonNegotiables: ["clarity"],
      riskPreference: "moderate",
      equityAndStructureExpectation: "standard",
      openQuestionsForMatch: ["Does the tier stay fresh?"],
      redFlagChecks: ["stale session"],
      collaborationTrialPreference: "short sprint",
      agentAuthorityScope: ["profile save"],
      disclosureGuardrails: ["none"],
    },
  });

  assert.equal(result.publicProfile.trustTier, "L2");
});

test("daily match quota is enforced for L1 agents", () => {
  const now = new Date().toISOString();

  deepMatchStore.upsertSession({
    sessionToken: "quota_owner",
    agentId: "quota_owner",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Quota Owner",
    sessionPubkey: "pub_quota_owner",
    lastSeenAt: now,
  });

  for (let index = 0; index < 9; index += 1) {
    const targetAgentId = `quota_target_${index}`;
    deepMatchStore.upsertSession({
      sessionToken: `quota_session_${index}`,
      agentId: targetAgentId,
      identityMode: "full",
      role: "agent",
      rawLevel: "L1",
      level: "L1",
      displayName: targetAgentId,
      sessionPubkey: `pub_${targetAgentId}`,
      lastSeenAt: now,
    });
  }

  for (let index = 0; index < 8; index += 1) {
    const result = deepMatchStore.createMatchRequest("quota_owner", {
      targetAgentId: `quota_target_${index}`,
      justification: "Quota test",
      attractivePoints: ["signal"],
      complementSummary: "Complementary skills.",
      classification: "strong fit",
    });
    assert.equal(result.request.targetAgentId, `quota_target_${index}`);
  }

  assert.throws(
    () =>
      deepMatchStore.createMatchRequest("quota_owner", {
        targetAgentId: "quota_target_8",
        justification: "Quota test",
        attractivePoints: ["signal"],
        complementSummary: "Complementary skills.",
        classification: "strong fit",
      }),
    /Daily match quota of 8 reached/,
  );
});

test("http errors map to the original status code instead of becoming 500s", async () => {
  const response = errorResponse(
    new HttpError(
      403,
      "Sending a match request requires L1 access. Current trust tier: L0.",
      { currentTier: "L0", requiredTier: "L1" },
    ),
    "fallback",
  );
  const json = await response.json();

  assert.equal(response.status, 403);
  assert.equal(json.error, "Sending a match request requires L1 access. Current trust tier: L0.");
  assert.deepEqual(json.details, { currentTier: "L0", requiredTier: "L1" });
});

test("dashboard access links can be reopened before expiry and keep the same viewer session", () => {
  deepMatchStore.upsertSession({
    sessionToken: "issuer_session",
    agentId: "issuer_agent",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Issuer Agent",
    sessionPubkey: "pub_issuer",
    lastSeenAt: new Date().toISOString(),
  });

  const link = deepMatchStore.createDashboardAccessLink("issuer_agent", 60);
  assert.ok(link);

  const viewer = deepMatchStore.consumeDashboardAccessLink(
    link!.token,
    DASHBOARD_SESSION_MAX_AGE_SECONDS,
  );
  assert.ok(viewer);
  assert.equal(viewer!.role, "viewer");
  assert.equal(
    viewer!.expiresAt! > Math.floor(Date.now() / 1000) + DASHBOARD_SESSION_MAX_AGE_SECONDS - 5,
    true,
  );

  const reopened = deepMatchStore.consumeDashboardAccessLink(link!.token, 60);
  assert.ok(reopened);
  assert.equal(reopened!.sessionToken, viewer!.sessionToken);
});

test("viewer sessions cannot perform write actions", async () => {
  const session = deepMatchStore.upsertSession({
    sessionToken: "viewer_session",
    agentId: "viewer_agent",
    identityMode: "full",
    role: "viewer",
    rawLevel: "L1",
    level: "L1",
    displayName: "Viewer Agent",
    sessionPubkey: "",
    lastSeenAt: new Date().toISOString(),
  });

  const request = new NextRequest("http://localhost/api/match-requests", {
    method: "POST",
    headers: {
      cookie: `${DASHBOARD_SESSION_COOKIE}=${session.sessionToken}`,
    },
  });

  await assert.rejects(
    () => authorizeWrite(request, session, "L0"),
    /Dashboard viewer sessions are read-only/,
  );
});

test("dashboard access route sets a cookie and inbox route accepts it", async () => {
  deepMatchStore.upsertSession({
    sessionToken: "agent_source",
    agentId: "cookie_agent",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Cookie Agent",
    sessionPubkey: "pub_cookie",
    lastSeenAt: new Date().toISOString(),
  });

  const link = deepMatchStore.createDashboardAccessLink("cookie_agent", 60);
  assert.ok(link);

  const consumeResponse = await consumeDashboardAccessLink(
    new NextRequest(`http://localhost/dashboard/access?token=${link!.token}`),
  );

  assert.equal(consumeResponse.status, 307);
  assert.equal(consumeResponse.headers.get("location"), "http://localhost/dashboard");

  const cookieHeader = consumeResponse.headers.get("set-cookie");
  assert.ok(cookieHeader);
  const cookiePair = cookieHeader.split(";", 1)[0];

  const inboxResponse = await getInbox(
    new NextRequest("http://localhost/api/matches/inbox", {
      headers: {
        cookie: cookiePair,
      },
    }),
  );
  const inboxJson = await inboxResponse.json();

  assert.equal(inboxResponse.status, 200);
  assert.equal(inboxJson.session.agentId, "cookie_agent");
  assert.equal(inboxJson.session.role, "viewer");
});

test("dashboard access route tolerates repeated opens for the same token", async () => {
  deepMatchStore.upsertSession({
    sessionToken: "agent_repeat_open",
    agentId: "repeat_open_agent",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Repeat Open Agent",
    sessionPubkey: "pub_repeat_open",
    lastSeenAt: new Date().toISOString(),
  });

  const link = deepMatchStore.createDashboardAccessLink("repeat_open_agent", 60);
  assert.ok(link);

  const first = await consumeDashboardAccessLink(
    new NextRequest(`http://localhost/dashboard/access?token=${link!.token}`),
  );
  const second = await consumeDashboardAccessLink(
    new NextRequest(`http://localhost/dashboard/access?token=${link!.token}`),
  );

  assert.equal(first.status, 307);
  assert.equal(second.status, 307);
  assert.equal(first.headers.get("location"), "http://localhost/dashboard");
  assert.equal(second.headers.get("location"), "http://localhost/dashboard");
  assert.ok(first.headers.get("set-cookie"));
  assert.ok(second.headers.get("set-cookie"));
});

test("first onboarding profile upsert returns an initial dashboard link", async () => {
  const session = deepMatchStore.upsertSession({
    sessionToken: "onboarding_agent",
    agentId: "onboarding_agent",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Onboarding Agent",
    sessionPubkey: "pub_onboarding",
    lastSeenAt: new Date().toISOString(),
  });

  const response = await upsertProfiles(
    new NextRequest("http://localhost/api/profiles/upsert", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${DASHBOARD_SESSION_COOKIE}=${session.sessionToken}`,
      },
      body: JSON.stringify(buildProfilePayload("onboarding")),
    }),
  );
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(typeof json.dashboardAccess?.accessUrl, "string");
  assert.match(json.dashboardAccess.accessUrl, /\/dashboard\/access\?token=/);

  const secondResponse = await upsertProfiles(
    new NextRequest("http://localhost/api/profiles/upsert", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${DASHBOARD_SESSION_COOKIE}=${session.sessionToken}`,
      },
      body: JSON.stringify(buildProfilePayload("onboarding-update")),
    }),
  );
  const secondJson = await secondResponse.json();

  assert.equal(secondResponse.status, 200);
  assert.equal(secondJson.dashboardAccess, null);
});

test("profile upsert accepts legacy nested payload and normalizes it", async () => {
  const session = deepMatchStore.upsertSession({
    sessionToken: "legacy_payload_agent",
    agentId: "legacy_payload_agent",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Legacy Payload Agent",
    sessionPubkey: "pub_legacy_payload",
    lastSeenAt: new Date().toISOString(),
  });

  const response = await upsertProfiles(
    new NextRequest("http://localhost/api/profiles/upsert", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${DASHBOARD_SESSION_COOKIE}=${session.sessionToken}`,
      },
      body: JSON.stringify(buildLegacyNestedProfilePayload()),
    }),
  );
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.publicProfile.headline, "ToA founder seeking cofounder");
  assert.equal(json.publicProfile.currentStage, "idea");
  assert.deepEqual(json.publicProfile.founderStrengths, [
    "product",
    "storytelling",
    "execution",
  ]);
  assert.equal(json.detailProfile.fullProblemStatement, "ToA services for agents");
  assert.equal(json.detailProfile.currentHypothesis, "ToA services for agents");
  assert.deepEqual(json.detailProfile.agentAuthorityScope, ["full"]);
});

test("heartbeat returns not_due when the current viewer session is still healthy", async () => {
  const agent = deepMatchStore.upsertSession({
    sessionToken: "heartbeat_agent_not_due",
    agentId: "heartbeat_agent_not_due",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Heartbeat Agent",
    sessionPubkey: "pub_heartbeat_1",
    lastSeenAt: new Date().toISOString(),
  });

  deepMatchStore.upsertSession({
    sessionToken: "heartbeat_viewer_not_due",
    agentId: agent.agentId,
    identityMode: "full",
    role: "viewer",
    rawLevel: "L1",
    level: "L1",
    displayName: agent.displayName,
    sessionPubkey: "",
    lastSeenAt: new Date().toISOString(),
    expiresAt:
      Math.floor(Date.now() / 1000) + DASHBOARD_HEARTBEAT_REFRESH_WINDOW_SECONDS + 3600,
  });

  const response = await heartbeatDashboardAccess(
    new NextRequest("http://localhost/api/dashboard-access-links/heartbeat", {
      method: "POST",
      headers: {
        cookie: `${DASHBOARD_SESSION_COOKIE}=${agent.sessionToken}`,
      },
    }),
  );
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.status, "not_due");
  assert.equal(json.dashboardAccess, null);
});

test("heartbeat reuses a pending link when the viewer session is near expiry", async () => {
  const agent = deepMatchStore.upsertSession({
    sessionToken: "heartbeat_agent_pending",
    agentId: "heartbeat_agent_pending",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Heartbeat Pending Agent",
    sessionPubkey: "pub_heartbeat_2",
    lastSeenAt: new Date().toISOString(),
  });

  deepMatchStore.upsertSession({
    sessionToken: "heartbeat_viewer_pending",
    agentId: agent.agentId,
    identityMode: "full",
    role: "viewer",
    rawLevel: "L1",
    level: "L1",
    displayName: agent.displayName,
    sessionPubkey: "",
    lastSeenAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 120,
  });

  const pendingLink = deepMatchStore.createDashboardAccessLink(agent.agentId, 600);
  assert.ok(pendingLink);

  const response = await heartbeatDashboardAccess(
    new NextRequest("http://localhost/api/dashboard-access-links/heartbeat", {
      method: "POST",
      headers: {
        cookie: `${DASHBOARD_SESSION_COOKIE}=${agent.sessionToken}`,
      },
    }),
  );
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.status, "already_pending");
  assert.match(json.dashboardAccess.accessUrl, new RegExp(`${pendingLink!.token}$`));
  assert.equal(json.dashboardAccess.viewerSessionExpiresAt > Math.floor(Date.now() / 1000), true);
});

test("heartbeat creates a new link when the dashboard session is expiring and no link is pending", async () => {
  const agent = deepMatchStore.upsertSession({
    sessionToken: "heartbeat_agent_create",
    agentId: "heartbeat_agent_create",
    identityMode: "full",
    role: "agent",
    rawLevel: "L1",
    level: "L1",
    displayName: "Heartbeat Create Agent",
    sessionPubkey: "pub_heartbeat_3",
    lastSeenAt: new Date().toISOString(),
  });

  deepMatchStore.upsertSession({
    sessionToken: "heartbeat_viewer_create",
    agentId: agent.agentId,
    identityMode: "full",
    role: "viewer",
    rawLevel: "L1",
    level: "L1",
    displayName: agent.displayName,
    sessionPubkey: "",
    lastSeenAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 60,
  });

  const response = await heartbeatDashboardAccess(
    new NextRequest("http://localhost/api/dashboard-access-links/heartbeat", {
      method: "POST",
      headers: {
        cookie: `${DASHBOARD_SESSION_COOKIE}=${agent.sessionToken}`,
      },
    }),
  );
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.status, "created");
  assert.match(json.dashboardAccess.accessUrl, /\/dashboard\/access\?token=/);
});
