import test from "node:test";
import assert from "node:assert/strict";

import { getSuggestedMatchingNextStep, shouldCreateMutualMatch } from "../lib/matching/state-machine.ts";
import { buildFitMemo } from "../lib/precomm/fit-memo.ts";
import { capTrustTierForIdentityMode, hasTier } from "../lib/permissions.ts";
import { deepMatchStore } from "../lib/store.ts";
import type { MatchRecord, PreCommunicationMessage } from "../types/domain.ts";

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
    rawLevel: "L1",
    level: "L1",
    displayName: "Bob Agent",
    sessionPubkey: "pub_bob",
    lastSeenAt: now,
  });

  deepMatchStore.upsertProfile(alice.agentId, {
    publicProfile: {
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
