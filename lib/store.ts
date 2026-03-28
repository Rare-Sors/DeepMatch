import { buildFitMemo } from "@/lib/precomm/fit-memo";
import { HttpError } from "@/lib/http";
import { capTrustTierForIdentityMode, dailyMatchQuotaForTier, hasTier, priorityRankForTier } from "@/lib/permissions";
import { getSuggestedMatchingNextStep, shouldCreateMutualMatch } from "@/lib/matching/state-machine";
import { createTrustTierSnapshot } from "@/lib/trust-tier";
import { createId, nowIso } from "@/lib/utils";
import type {
  AgentRecord,
  DetailProfile,
  DetailProfileInput,
  FitMemo,
  HandoffRecord,
  MatchInbox,
  MatchRecord,
  MatchRequest,
  PreCommunicationMessage,
  ProfileUpsertInput,
  PublicProfile,
  PublicProfileInput,
  RareSession,
  TrustTierRecord,
} from "@/types/domain";

interface MemoryStoreState {
  sessions: Map<string, RareSession>;
  agents: Map<string, AgentRecord>;
  trustTiers: Map<string, TrustTierRecord>;
  publicProfiles: Map<string, PublicProfile>;
  detailProfiles: Map<string, DetailProfile>;
  matchRequests: Map<string, MatchRequest>;
  matches: Map<string, MatchRecord>;
  preCommunications: Map<string, PreCommunicationMessage[]>;
  fitMemos: Map<string, FitMemo>;
  handoffs: Map<string, HandoffRecord>;
}

declare global {
  var __deepmatchStore: MemoryStoreState | undefined;
}

function seedTestCandidates(state: MemoryStoreState) {
  // 只在开发环境且数据为空时加载
  if (process.env.NODE_ENV === "production" || state.publicProfiles.size > 0) {
    return;
  }

  const candidates = [
    {
      agentId: "candidate_alex_001",
      public: {
        headline: "AI infrastructure founder looking for product-minded cofounder",
        oneLineThesis: "Building developer tools to make LLM deployment 10x easier",
        whyNowBrief: "LLM adoption is exploding but deployment is still painful",
        currentStage: "prototype" as const,
        currentProgress: "Built internal prototype, 5 design partners testing, 2 signed LOIs",
        commitmentLevel: "full-time" as const,
        activelyLooking: true,
        founderStrengths: ["engineering", "infrastructure", "devtools"],
        lookingFor: ["product", "GTM", "customer development"],
        preferredRoleSplit: "I own engineering + architecture, looking for someone to own product + early sales",
        skillTags: ["AI", "devtools", "infrastructure", "B2B"],
        workStyleSummary: "Fast iteration, ship weekly, high autonomy, async-first",
        regionTimezone: "San Francisco, PST",
        collaborationConstraintsBrief: "Must be able to go full-time within 2 months, prefer SF Bay Area",
        trustTier: "L1" as const,
        publicProofs: ["GitHub: 10k+ stars on open source project", "Ex-engineer at Databricks"],
      },
      detail: {
        fullProblemStatement: "Engineering teams waste 40% of time on LLM deployment issues - prompt versioning, model switching, cost tracking",
        currentHypothesis: "Developer-first platform with git-like workflow for prompts, automatic A/B testing",
        ideaRigidity: "Problem-committed, solution-flexible. Strong conviction on problem but open to pivoting on implementation",
        whyMe: "Spent 3 years at Databricks building ML infrastructure, saw this pain firsthand across 100+ customers",
        executionHistory: "Led team of 5 at Databricks, shipped 3 major features used by Fortune 500. Built open source tool with 10k stars",
        proofDetails: ["GitHub: github.com/alexchen/llm-deploy (10k stars)", "Databricks: Senior Engineer 2021-2024"],
        currentAvailabilityDetails: "Left Databricks 2 months ago, have 12 months runway, working full-time on this",
        roleExpectation: "Cofounder owns product roadmap, customer development, early sales. I own all technical decisions. Equal partnership",
        decisionStyle: "Data-informed but founder instinct first. Debate openly, commit fully, move fast",
        communicationStyle: "Async-first (Notion + Slack), sync 2x/week for strategic decisions. Direct feedback, no sugarcoating",
        valuesAndNonNegotiables: ["Full-time commitment within 2 months", "High trust, no micromanagement", "Customer-obsessed"],
        riskPreference: "High market risk OK, low execution risk. Want to move fast but ship quality",
        equityAndStructureExpectation: "50/50 split, 4-year vesting with 1-year cliff. Open to trial project first (4 weeks)",
        openQuestionsForMatch: ["How do you approach customer development?", "What's your GTM strategy for developer tools?"],
        redFlagChecks: ["Part-time mindset", "No customer empathy", "Can't handle ambiguity"],
        collaborationTrialPreference: "4-week trial: jointly interview 20 potential customers, define MVP scope, build landing page",
        agentAuthorityScope: "Can discuss role split, time commitment, equity principles. Cannot commit to final terms",
        disclosureGuardrails: "No customer names, no revenue projections, no technical architecture details until after trial",
      },
    },
    {
      agentId: "candidate_sarah_002",
      public: {
        headline: "Healthcare product leader looking for technical cofounder to fix patient data access",
        oneLineThesis: "Patients should own their medical records, not hospitals",
        whyNowBrief: "New interoperability regulations (TEFCA) just went live - 6-month window before incumbents adapt",
        currentStage: "customer_discovery" as const,
        currentProgress: "Talked to 40 patients and 12 doctors, validated pain point, building waitlist (200 signups)",
        commitmentLevel: "20-40h" as const,
        activelyLooking: true,
        founderStrengths: ["product", "healthcare domain", "customer development"],
        lookingFor: ["engineering", "technical architecture", "security/compliance"],
        preferredRoleSplit: "I lead product + customer + regulatory, need someone to own all technical execution",
        skillTags: ["healthcare", "B2C", "data", "compliance"],
        workStyleSummary: "Customer-first, weekly sprints, high communication, collaborative decision-making",
        regionTimezone: "New York, EST",
        collaborationConstraintsBrief: "Currently employed, can go full-time in 3 months if traction is strong",
        trustTier: "L1" as const,
        publicProofs: ["Ex-PM at Oscar Health", "Shipped HIPAA-compliant features to 1M+ users"],
      },
      detail: {
        fullProblemStatement: "Patients can't access their own medical records easily. When they switch doctors, records don't follow",
        currentHypothesis: "Consumer app that aggregates records from all providers, makes them searchable",
        ideaRigidity: "Solution-defined but open to iteration. Core insight is strong but implementation details flexible",
        whyMe: "5 years in healthcare tech, deep understanding of regulations and provider workflows",
        executionHistory: "Led 3 product launches at Oscar Health, each reaching 100k+ users. Navigated FDA, HIPAA, state regulations",
        proofDetails: ["Oscar Health: Senior PM 2020-2025", "Shipped: medication adherence feature (500k users)"],
        currentAvailabilityDetails: "Currently employed, working nights/weekends (20h/week). Can go full-time in 3 months if we hit $10k MRR",
        roleExpectation: "Cofounder owns all technical: architecture, security, compliance implementation. I own product, customer, regulatory",
        decisionStyle: "Customer data first, then founder intuition. Collaborative - want to debate options before deciding",
        communicationStyle: "High-touch, daily standups, weekly planning. Need frequent alignment given regulatory complexity",
        valuesAndNonNegotiables: ["Patient-first (no selling data)", "Full-time within 3 months", "Regulatory compliance is non-negotiable"],
        riskPreference: "Medium risk tolerance. Healthcare is regulated so can't move too fast, but window is closing",
        equityAndStructureExpectation: "50/50 split, 4-year vesting. Open to founder vesting starting after both full-time",
        openQuestionsForMatch: ["Have you built HIPAA-compliant systems?", "Comfortable with healthcare regulations?"],
        redFlagChecks: ["Move fast and break things mentality (dangerous in healthcare)", "No patience for compliance"],
        collaborationTrialPreference: "2-week trial: build technical proof-of-concept for FHIR data ingestion",
        agentAuthorityScope: "Can discuss technical requirements, role split, timeline. Cannot commit to equity terms",
        disclosureGuardrails: "No customer names, no detailed revenue model until after trial",
      },
    },
    {
      agentId: "candidate_marcus_003",
      public: {
        headline: "Serial founder (1 exit) looking for technical cofounder for fintech infrastructure",
        oneLineThesis: "SMBs need better cash flow management tools - current solutions are built for enterprises",
        whyNowBrief: "Banking APIs finally mature (Plaid, Stripe), AI can automate forecasting, SMB digitization accelerated",
        currentStage: "early_revenue" as const,
        currentProgress: "MVP live, 15 paying customers ($3k MRR), 90% retention, manual processes need automation",
        commitmentLevel: "full-time" as const,
        activelyLooking: true,
        founderStrengths: ["GTM", "sales", "fundraising", "operations"],
        lookingFor: ["engineering", "product", "technical leadership"],
        preferredRoleSplit: "I own sales, fundraising, ops. Need cofounder to own product + engineering + technical hiring",
        skillTags: ["fintech", "B2B", "SaaS", "SMB"],
        workStyleSummary: "Execution-focused, high urgency, weekly OKRs, data-driven decisions",
        regionTimezone: "Austin, CST",
        collaborationConstraintsBrief: "Must be full-time immediately, prefer Austin or remote with overlap",
        trustTier: "L2" as const,
        publicProofs: ["Exited previous startup to Intuit ($8M)", "Current MRR: $3k", "15 paying customers"],
      },
      detail: {
        fullProblemStatement: "SMBs (1-50 employees) struggle with cash flow - 60% fail due to cash issues, not lack of customers",
        currentHypothesis: "AI-powered cash flow forecasting + automated AR/AP management. Integrates with bank + accounting software",
        ideaRigidity: "Solution-defined, already have paying customers. Open to expanding scope but core product is validated",
        whyMe: "Sold previous fintech startup to Intuit, know the space deeply. Strong sales skills - closed 15 customers in 2 months",
        executionHistory: "Founded CashTrack (sold to Intuit 2023), grew to $2M ARR before exit. Before that: sales leader at Stripe",
        proofDetails: ["Exit: CashTrack acquired by Intuit for $8M (2023)", "Current: $3k MRR, 15 customers, 90% retention"],
        currentAvailabilityDetails: "Full-time since January 2026, have 18 months runway from F&F round",
        roleExpectation: "Cofounder is technical co-CEO: owns product roadmap, engineering, technical hiring. I own sales, marketing, fundraising",
        decisionStyle: "Fast decisions, data-driven when possible, founder instinct when not. Bias to action over analysis",
        communicationStyle: "High-frequency, daily syncs, real-time Slack. Need tight alignment given early stage",
        valuesAndNonNegotiables: ["Full-time immediately", "High urgency / execution speed", "Customer revenue > vanity metrics"],
        riskPreference: "High risk tolerance - already have customers so execution risk is lower. Willing to bet big on growth",
        equityAndStructureExpectation: "40/60 split (me 40%, cofounder 60% given later entry), 4-year vesting. Already incorporated",
        openQuestionsForMatch: ["Can you join immediately?", "Comfortable being technical co-CEO vs pure CTO?"],
        redFlagChecks: ["Can't commit full-time", "Perfectionist (need to ship fast)", "Not comfortable with sales/customer conversations"],
        collaborationTrialPreference: "1-week trial: review current codebase, propose technical roadmap, jointly pitch to 2 customers",
        agentAuthorityScope: "Can discuss equity, role split, technical roadmap. Cannot commit to final terms without lawyer review",
        disclosureGuardrails: "No customer names, no detailed financials until after trial",
      },
    },
  ];

  candidates.forEach(({ agentId, public: pub, detail }) => {
    state.publicProfiles.set(agentId, { agentId, ...pub, profileFreshness: nowIso() });
    state.detailProfiles.set(agentId, { agentId, ...detail });
  });

  console.log(`✅ Seeded ${candidates.length} test candidates`);
}

function getState(): MemoryStoreState {
  if (!globalThis.__deepmatchStore) {
    globalThis.__deepmatchStore = {
      sessions: new Map(),
      agents: new Map(),
      trustTiers: new Map(),
      publicProfiles: new Map(),
      detailProfiles: new Map(),
      matchRequests: new Map(),
      matches: new Map(),
      preCommunications: new Map(),
      fitMemos: new Map(),
      handoffs: new Map(),
    };

    // 自动加载测试数据
    seedTestCandidates(globalThis.__deepmatchStore);
  }

  return globalThis.__deepmatchStore;
}

function isSessionExpired(session: RareSession) {
  return typeof session.expiresAt === "number" && session.expiresAt <= Math.floor(Date.now() / 1000);
}

function getAgentEffectiveLevel(agentId: string) {
  const state = getState();
  return (
    state.agents.get(agentId)?.effectiveLevel ??
    state.trustTiers.get(agentId)?.effectiveLevel ??
    "L0"
  );
}

function getDailyMatchQuota(agentId: string) {
  const state = getState();
  return (
    state.trustTiers.get(agentId)?.dailyMatchQuota ??
    dailyMatchQuotaForTier(getAgentEffectiveLevel(agentId))
  );
}

function countOutgoingRequestsOnDate(agentId: string, isoDate: string) {
  return [...getState().matchRequests.values()].filter(
    (request) => request.requesterAgentId === agentId && request.createdAt.startsWith(isoDate),
  ).length;
}

function createPublicProfile(agentId: string, level: string, input: PublicProfileInput): PublicProfile {
  return {
    agentId,
    ...input,
    trustTier: level as PublicProfile["trustTier"],
    profileFreshness: nowIso(),
  };
}

function createDetailProfile(agentId: string, input: DetailProfileInput): DetailProfile {
  return {
    agentId,
    ...input,
  };
}

function findReverseRequest(requesterAgentId: string, targetAgentId: string) {
  return [...getState().matchRequests.values()].find(
    (request) =>
      request.requesterAgentId === targetAgentId &&
      request.targetAgentId === requesterAgentId,
  );
}

function findMatchByParticipants(agentA: string, agentB: string) {
  return [...getState().matches.values()].find((match) => {
    const participants = new Set(match.participantAgentIds);
    return participants.has(agentA) && participants.has(agentB);
  });
}

function createMutualMatch(agentA: string, agentB: string) {
  const existing = findMatchByParticipants(agentA, agentB);
  if (existing) {
    return existing;
  }

  const now = nowIso();
  const match: MatchRecord = {
    id: createId("match"),
    participantAgentIds: [agentA, agentB].sort() as [string, string],
    matchStatus: "active",
    createdAt: now,
    updatedAt: now,
  };

  getState().matches.set(match.id, match);
  return match;
}

export const deepMatchStore = {
  upsertSession(session: RareSession) {
    const state = getState();
    const normalizedLevel = capTrustTierForIdentityMode(session.level, session.identityMode);
    const normalizedSession: RareSession = {
      ...session,
      level: normalizedLevel,
      lastSeenAt: nowIso(),
    };

    state.sessions.set(normalizedSession.sessionToken, normalizedSession);
    state.agents.set(normalizedSession.agentId, {
      agentId: normalizedSession.agentId,
      displayName: normalizedSession.displayName,
      identityMode: normalizedSession.identityMode,
      rawLevel: normalizedSession.rawLevel,
      effectiveLevel: normalizedSession.level,
      sessionPubkey: normalizedSession.sessionPubkey,
      lastSeenAt: normalizedSession.lastSeenAt,
    });

    const snapshot = createTrustTierSnapshot(normalizedSession);
    state.trustTiers.set(snapshot.agentId, snapshot);
    return normalizedSession;
  },

  getSession(sessionToken: string) {
    const state = getState();
    const session = state.sessions.get(sessionToken);
    if (!session) {
      return undefined;
    }

    if (isSessionExpired(session)) {
      state.sessions.delete(sessionToken);
      return undefined;
    }

    return session;
  },

  upsertProfile(agentId: string, input: ProfileUpsertInput) {
    const state = getState();
    const level = getAgentEffectiveLevel(agentId);
    const publicProfile = createPublicProfile(agentId, level, input.publicProfile);
    const detailProfile = createDetailProfile(agentId, input.detailProfile);

    state.publicProfiles.set(agentId, publicProfile);
    state.detailProfiles.set(agentId, detailProfile);

    return {
      publicProfile,
      detailProfile,
    };
  },

  listPublicProfiles() {
    return [...getState().publicProfiles.values()].sort((left, right) =>
      priorityRankForTier(right.trustTier) - priorityRankForTier(left.trustTier) ||
      right.profileFreshness.localeCompare(left.profileFreshness),
    );
  },

  getPublicProfile(agentId: string) {
    return getState().publicProfiles.get(agentId) ?? null;
  },

  getDetailProfilesForMatch(matchId: string, viewerAgentId: string) {
    const match = getState().matches.get(matchId);
    if (!match) {
      return null;
    }

    if (!match.participantAgentIds.includes(viewerAgentId)) {
      return null;
    }

    return {
      match,
      profiles: match.participantAgentIds
        .map((agentId) => getState().detailProfiles.get(agentId))
        .filter(Boolean) as DetailProfile[],
    };
  },

  createMatchRequest(
    requesterAgentId: string,
    payload: Omit<MatchRequest, "id" | "requesterAgentId" | "status" | "createdAt" | "updatedAt">,
  ) {
    const state = getState();
    const now = nowIso();
    const existing = [...state.matchRequests.values()].find(
      (request) =>
        request.requesterAgentId === requesterAgentId &&
        request.targetAgentId === payload.targetAgentId &&
        request.status !== "expired",
    );

    if (existing) {
      return { request: existing, match: findMatchByParticipants(requesterAgentId, payload.targetAgentId) };
    }

    const dailyQuota = getDailyMatchQuota(requesterAgentId);
    if (dailyQuota <= 0) {
      throw new HttpError(403, "This account cannot create match requests.");
    }

    const requestsToday = countOutgoingRequestsOnDate(requesterAgentId, now.slice(0, 10));
    if (requestsToday >= dailyQuota) {
      throw new HttpError(403, `Daily match quota of ${dailyQuota} reached.`);
    }

    const request: MatchRequest = {
      id: createId("mreq"),
      requesterAgentId,
      targetAgentId: payload.targetAgentId,
      status: "pending",
      justification: payload.justification,
      attractivePoints: payload.attractivePoints,
      complementSummary: payload.complementSummary,
      classification: payload.classification,
      createdAt: now,
      updatedAt: now,
    };

    state.matchRequests.set(request.id, request);

    const reverseRequest = findReverseRequest(requesterAgentId, payload.targetAgentId);
    if (shouldCreateMutualMatch(request, reverseRequest)) {
      request.status = "accepted";
      request.updatedAt = nowIso();
      if (reverseRequest) {
        reverseRequest.status = "accepted";
        reverseRequest.updatedAt = nowIso();
        state.matchRequests.set(reverseRequest.id, reverseRequest);
      }

      return {
        request,
        match: createMutualMatch(requesterAgentId, payload.targetAgentId),
      };
    }

    return { request, match: null };
  },

  respondToMatchRequest(requestId: string, responderAgentId: string, accept: boolean) {
    const state = getState();
    const request = state.matchRequests.get(requestId);
    if (!request || request.targetAgentId !== responderAgentId) {
      return null;
    }

    request.status = accept ? "accepted" : "declined";
    request.updatedAt = nowIso();
    state.matchRequests.set(request.id, request);

    return {
      request,
      match: accept ? createMutualMatch(request.requesterAgentId, request.targetAgentId) : null,
    };
  },

  listInbox(agentId: string): MatchInbox {
    const state = getState();
    const incomingRequests = [...state.matchRequests.values()].filter(
      (request) => request.targetAgentId === agentId,
    );
    const outgoingRequests = [...state.matchRequests.values()].filter(
      (request) => request.requesterAgentId === agentId,
    );
    const matches = [...state.matches.values()].filter((match) =>
      match.participantAgentIds.includes(agentId),
    );
    const matchIds = new Set(matches.map((match) => match.id));
    const nextStep = getSuggestedMatchingNextStep({
      incomingRequests,
      matches,
    });

    return {
      suggestedNextStep: nextStep.step,
      nextStepReason: nextStep.reason,
      incomingRequests,
      outgoingRequests,
      matches,
      fitMemos: [...state.fitMemos.values()].filter((memo) => matchIds.has(memo.matchId)),
      handoffs: [...state.handoffs.values()].filter((handoff) => matchIds.has(handoff.matchId)),
    };
  },

  addPreCommunicationMessage(
    matchId: string,
    speakerAgentId: string,
    topic: PreCommunicationMessage["topic"],
    messageType: PreCommunicationMessage["messageType"],
    content: string,
  ) {
    const match = getState().matches.get(matchId);
    if (!match || !match.participantAgentIds.includes(speakerAgentId)) {
      return null;
    }

    const messages = getState().preCommunications.get(matchId) ?? [];
    const message: PreCommunicationMessage = {
      id: createId("msg"),
      matchId,
      speakerAgentId,
      topic,
      messageType,
      content,
      createdAt: nowIso(),
    };

    messages.push(message);
    getState().preCommunications.set(matchId, messages);
    match.updatedAt = nowIso();
    getState().matches.set(match.id, match);

    return {
      match,
      message,
      messages,
    };
  },

  listPreCommunicationMessages(matchId: string, viewerAgentId: string) {
    const match = getState().matches.get(matchId);
    if (!match || !match.participantAgentIds.includes(viewerAgentId)) {
      return null;
    }

    return getState().preCommunications.get(matchId) ?? [];
  },

  generateFitMemo(matchId: string, viewerAgentId: string) {
    const match = getState().matches.get(matchId);
    if (!match || !match.participantAgentIds.includes(viewerAgentId)) {
      return null;
    }

    const memoBase = buildFitMemo(match, getState().preCommunications.get(matchId) ?? []);
    const memo: FitMemo = {
      id: createId("memo"),
      generatedAt: nowIso(),
      ...memoBase,
    };

    getState().fitMemos.set(matchId, memo);
    if (memo.humanMeetingRecommendation) {
      match.matchStatus = "handoff_ready";
      match.updatedAt = nowIso();
      getState().matches.set(match.id, match);
    }

    return memo;
  },

  unlockHandoff(matchId: string, viewerAgentId: string) {
    const match = getState().matches.get(matchId);
    const memo = getState().fitMemos.get(matchId);

    if (!match || !memo || !match.participantAgentIds.includes(viewerAgentId)) {
      return null;
    }

    if (!memo.humanMeetingRecommendation) {
      return null;
    }

    const existing = getState().handoffs.get(matchId);
    if (existing) {
      return existing;
    }

    const handoff: HandoffRecord = {
      id: createId("handoff"),
      matchId,
      contactExchangeStatus: "ready",
      contactChannels: [
        "Mutually agreed email exchange",
        "External calendar link sharing",
      ],
      introTemplate:
        "DeepMatch intro: both founders have completed structured pre-communication and should use the first meeting to validate conviction, role split, and trial scope.",
      priorityTopics: [
        "Decision rights and ownership boundaries",
        "Full-time timing and commitment window",
        "Trial project structure or first 30-day plan",
      ],
      unlockedAt: nowIso(),
    };

    getState().handoffs.set(matchId, handoff);
    match.matchStatus = "handoff_ready";
    match.updatedAt = nowIso();
    getState().matches.set(match.id, match);

    return handoff;
  },

  hasMinimumTier(sessionToken: string, minimumTier: RareSession["level"]) {
    const session = this.getSession(sessionToken);
    return Boolean(session && hasTier(session.level, minimumTier));
  },

  getTrustTier(agentId: string) {
    return getState().trustTiers.get(agentId) ?? null;
  },

  syncAgentLevel(agentId: string, level: RareSession["level"]) {
    const state = getState();
    const agent = state.agents.get(agentId);
    if (!agent) {
      return null;
    }

    const normalizedLevel = capTrustTierForIdentityMode(level, agent.identityMode);
    const updatedAt = nowIso();

    for (const session of state.sessions.values()) {
      if (session.agentId !== agentId) {
        continue;
      }

      session.level = normalizedLevel;
      session.lastSeenAt = updatedAt;
      state.sessions.set(session.sessionToken, session);
    }

    agent.effectiveLevel = normalizedLevel;
    agent.lastSeenAt = updatedAt;
    state.agents.set(agentId, agent);

    const trustTier: TrustTierRecord = {
      agentId,
      rawLevel: agent.rawLevel,
      effectiveLevel: normalizedLevel,
      priorityRank: priorityRankForTier(normalizedLevel),
      dailyMatchQuota: dailyMatchQuotaForTier(normalizedLevel),
      updatedAt,
    };
    state.trustTiers.set(agentId, trustTier);

    const publicProfile = state.publicProfiles.get(agentId);
    if (publicProfile) {
      publicProfile.trustTier = normalizedLevel;
      publicProfile.profileFreshness = updatedAt;
      state.publicProfiles.set(agentId, publicProfile);
    }

    return trustTier;
  },

  reset() {
    globalThis.__deepmatchStore = undefined;
  },
};
