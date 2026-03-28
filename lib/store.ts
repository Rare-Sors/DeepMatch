import { buildFitMemo } from "@/lib/precomm/fit-memo";
import { HttpError } from "@/lib/http";
import { capTrustTierForIdentityMode, dailyMatchQuotaForTier, hasTier, priorityRankForTier } from "@/lib/permissions";
import { getSuggestedMatchingNextStep, shouldCreateMutualMatch } from "@/lib/matching/state-machine";
import { createTrustTierSnapshot } from "@/lib/trust-tier";
import { createId, nowIso } from "@/lib/utils";
import type {
  AgentRecord,
  DashboardAccessLink,
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
  dashboardAccessLinks: Map<
    string,
    DashboardAccessLink
  >;
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

function getState(): MemoryStoreState {
  if (!globalThis.__deepmatchStore) {
    globalThis.__deepmatchStore = {
      sessions: new Map(),
      agents: new Map(),
      trustTiers: new Map(),
      dashboardAccessLinks: new Map(),
      publicProfiles: new Map(),
      detailProfiles: new Map(),
      matchRequests: new Map(),
      matches: new Map(),
      preCommunications: new Map(),
      fitMemos: new Map(),
      handoffs: new Map(),
    };
  }

  return globalThis.__deepmatchStore;
}

function isSessionExpired(session: RareSession) {
  return typeof session.expiresAt === "number" && session.expiresAt <= Math.floor(Date.now() / 1000);
}

function listValidDashboardAccessLinks(agentId: string) {
  const now = Math.floor(Date.now() / 1000);
  const state = getState();
  const links: DashboardAccessLink[] = [];

  for (const [token, link] of state.dashboardAccessLinks.entries()) {
    if (link.agentId !== agentId) {
      continue;
    }

    if (link.expiresAt <= now) {
      state.dashboardAccessLinks.delete(token);
      continue;
    }

    links.push(link);
  }

  return links.sort((left, right) => right.expiresAt - left.expiresAt);
}

function getLatestViewerSession(agentId: string) {
  const sessions = [...getState().sessions.values()]
    .filter((session) => session.agentId === agentId && session.role === "viewer" && !isSessionExpired(session))
    .sort((left, right) => (right.expiresAt ?? 0) - (left.expiresAt ?? 0));

  return sessions[0] ?? null;
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
    const existingAgent = state.agents.get(normalizedSession.agentId);
    state.agents.set(normalizedSession.agentId, {
      agentId: normalizedSession.agentId,
      displayName: normalizedSession.displayName,
      identityMode: normalizedSession.identityMode,
      rawLevel: normalizedSession.rawLevel,
      effectiveLevel: normalizedSession.level,
      sessionPubkey:
        normalizedSession.role === "viewer"
          ? existingAgent?.sessionPubkey ?? normalizedSession.sessionPubkey
          : normalizedSession.sessionPubkey,
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

  createDashboardAccessLink(agentId: string, expiresInSeconds: number) {
    const state = getState();
    if (!state.agents.has(agentId)) {
      return null;
    }

    for (const link of listValidDashboardAccessLinks(agentId)) {
      state.dashboardAccessLinks.delete(link.token);
    }

    const token = createId("dlink");
    const record = {
      token,
      agentId,
      createdAt: nowIso(),
      expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };

    state.dashboardAccessLinks.set(token, record);
    return record;
  },

  consumeDashboardAccessLink(token: string, sessionDurationSeconds: number) {
    const state = getState();
    const record = state.dashboardAccessLinks.get(token);
    if (!record) {
      return null;
    }

    if (record.expiresAt <= Math.floor(Date.now() / 1000)) {
      state.dashboardAccessLinks.delete(token);
      return null;
    }

    const agent = state.agents.get(record.agentId);
    const trustTier = state.trustTiers.get(record.agentId);
    if (!agent || !trustTier) {
      state.dashboardAccessLinks.delete(token);
      return null;
    }

    state.dashboardAccessLinks.delete(token);

    return this.upsertSession({
      sessionToken: createId("viewer"),
      agentId: record.agentId,
      identityMode: agent.identityMode,
      role: "viewer",
      rawLevel: trustTier.rawLevel,
      level: trustTier.effectiveLevel,
      displayName: agent.displayName,
      sessionPubkey: "",
      lastSeenAt: nowIso(),
      expiresAt: Math.floor(Date.now() / 1000) + sessionDurationSeconds,
    });
  },

  getLatestDashboardAccessLink(agentId: string) {
    return listValidDashboardAccessLinks(agentId)[0] ?? null;
  },

  heartbeatDashboardAccess(
    agentId: string,
    {
      accessLinkTtlSeconds,
      refreshWindowSeconds,
      sessionDurationSeconds,
    }: {
      accessLinkTtlSeconds: number;
      refreshWindowSeconds: number;
      sessionDurationSeconds: number;
    },
  ) {
    const viewerSession = getLatestViewerSession(agentId);
    const pendingLink = this.getLatestDashboardAccessLink(agentId);
    const now = Math.floor(Date.now() / 1000);
    const refreshAt = now + refreshWindowSeconds;

    if (viewerSession?.expiresAt && viewerSession.expiresAt > refreshAt) {
      return {
        status: "not_due" as const,
        viewerSession,
        accessLink: null,
        sessionDurationSeconds,
      };
    }

    if (pendingLink) {
      return {
        status: "already_pending" as const,
        viewerSession,
        accessLink: pendingLink,
        sessionDurationSeconds,
      };
    }

    const accessLink = this.createDashboardAccessLink(agentId, accessLinkTtlSeconds);
    if (!accessLink) {
      return null;
    }

    return {
      status: "created" as const,
      viewerSession,
      accessLink,
      sessionDurationSeconds,
    };
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
