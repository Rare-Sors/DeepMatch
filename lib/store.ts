import { buildFitMemo } from "@/lib/precomm/fit-memo";
import {
  DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS,
  createDashboardAccessToken,
  readDashboardAccessToken,
} from "@/lib/dashboard-access";
import { isSupabaseConfigured, isUpstashConfigured } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { capTrustTierForIdentityMode, dailyMatchQuotaForTier, hasTier, priorityRankForTier } from "@/lib/permissions";
import { getSuggestedMatchingNextStep, shouldCreateMutualMatch } from "@/lib/matching/state-machine";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createTrustTierSnapshot } from "@/lib/trust-tier";
import { getUpstashRedis } from "@/lib/upstash/server";
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
  consumedDashboardAccessLinks: Map<
    string,
    {
      token: string;
      agentId: string;
      sessionToken: string;
      consumedAt: string;
      expiresAt: number;
    }
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

const DEFAULT_AGENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function ttlFromEpoch(expiresAt?: number, fallbackSeconds = DEFAULT_AGENT_SESSION_MAX_AGE_SECONDS) {
  if (!expiresAt) {
    return fallbackSeconds;
  }

  return Math.max(1, expiresAt - Math.floor(Date.now() / 1000));
}

function persistentSessionKey(sessionToken: string) {
  return `deepmatch:session:${sessionToken}`;
}

function persistentViewerSessionKey(agentId: string) {
  return `deepmatch:viewer-session:${agentId}`;
}

function persistentPendingDashboardLinkKey(agentId: string) {
  return `deepmatch:dashboard-link:${agentId}`;
}

function supportsPersistentSessions() {
  return isUpstashConfigured();
}

function supportsPersistentBusinessState() {
  return isSupabaseConfigured();
}

type AgentRow = {
  agent_id: string;
  display_name: string;
  identity_mode: "public" | "full";
  raw_level: "L0" | "L1" | "L2";
  effective_level: "L0" | "L1" | "L2";
  session_pubkey: string;
  last_seen_at: string;
};

type TrustTierRow = {
  agent_id: string;
  raw_level: "L0" | "L1" | "L2";
  effective_level: "L0" | "L1" | "L2";
  priority_rank: number;
  daily_match_quota: number;
  updated_at: string;
};

type PublicProfileRow = {
  agent_id: string;
  founder_name: string;
  base_location: string;
  education: string;
  experience_highlights: string[];
  headline: string;
  one_line_thesis: string;
  why_now_brief: string;
  current_stage: PublicProfile["currentStage"];
  current_progress: string;
  commitment_level: PublicProfile["commitmentLevel"];
  actively_looking: boolean;
  founder_strengths: string[];
  looking_for: string[];
  preferred_role_split: string;
  skill_tags: string[];
  work_style_summary: string;
  region_timezone: string;
  collaboration_constraints_brief: string;
  trust_tier: PublicProfile["trustTier"];
  public_proofs: string[];
  profile_freshness: string;
};

type DetailProfileRow = {
  agent_id: string;
  full_problem_statement: string;
  current_hypothesis: string;
  idea_rigidity: string;
  why_me: string;
  execution_history: string;
  proof_details: string[];
  current_availability_details: string;
  role_expectation: string;
  decision_style: string;
  communication_style: string;
  values_and_non_negotiables: string[];
  risk_preference: string;
  equity_and_structure_expectation: string;
  open_questions_for_match: string[];
  red_flag_checks: string[];
  collaboration_trial_preference: string;
  agent_authority_scope: string[];
  disclosure_guardrails: string[];
};

type MatchRequestRow = {
  id: string;
  requester_agent_id: string;
  target_agent_id: string;
  status: MatchRequest["status"];
  justification: string;
  attractive_points: string[];
  complement_summary: string;
  classification: MatchRequest["classification"];
  created_at: string;
  updated_at: string;
};

type MatchRow = {
  id: string;
  participant_agent_ids: [string, string];
  match_status: MatchRecord["matchStatus"];
  created_at: string;
  updated_at: string;
};

type PreCommunicationRow = {
  id: string;
  match_id: string;
  topic: PreCommunicationMessage["topic"];
  speaker_agent_id: string;
  message_type: PreCommunicationMessage["messageType"];
  content: string;
  created_at: string;
};

type FitMemoRow = {
  id: string;
  match_id: string;
  match_rationale: string;
  strongest_complements: string[];
  primary_risks: string[];
  open_questions: string[];
  human_meeting_recommendation: boolean;
  trial_project_recommendation: boolean;
  trial_project_suggestion: FitMemo["trialProjectSuggestion"] | null;
  confidence_level: FitMemo["confidenceLevel"];
  generated_at: string;
};

type HandoffRow = {
  id: string;
  match_id: string;
  contact_exchange_status: HandoffRecord["contactExchangeStatus"];
  contact_channels: string[];
  intro_template: string;
  priority_topics: string[];
  unlocked_at: string | null;
};

function toAgentRecord(row: AgentRow): AgentRecord {
  return {
    agentId: row.agent_id,
    displayName: row.display_name,
    identityMode: row.identity_mode,
    rawLevel: row.raw_level,
    effectiveLevel: row.effective_level,
    sessionPubkey: row.session_pubkey,
    lastSeenAt: row.last_seen_at,
  };
}

function toTrustTierRecord(row: TrustTierRow): TrustTierRecord {
  return {
    agentId: row.agent_id,
    rawLevel: row.raw_level,
    effectiveLevel: row.effective_level,
    priorityRank: row.priority_rank,
    dailyMatchQuota: row.daily_match_quota,
    updatedAt: row.updated_at,
  };
}

function toPublicProfile(row: PublicProfileRow): PublicProfile {
  return {
    agentId: row.agent_id,
    founderName: row.founder_name || undefined,
    baseLocation: row.base_location || undefined,
    education: row.education || undefined,
    experienceHighlights: row.experience_highlights ?? [],
    headline: row.headline,
    oneLineThesis: row.one_line_thesis,
    whyNowBrief: row.why_now_brief,
    currentStage: row.current_stage,
    currentProgress: row.current_progress,
    commitmentLevel: row.commitment_level,
    activelyLooking: row.actively_looking,
    founderStrengths: row.founder_strengths ?? [],
    lookingFor: row.looking_for ?? [],
    preferredRoleSplit: row.preferred_role_split,
    skillTags: row.skill_tags ?? [],
    workStyleSummary: row.work_style_summary,
    regionTimezone: row.region_timezone,
    collaborationConstraintsBrief: row.collaboration_constraints_brief,
    trustTier: row.trust_tier,
    publicProofs: row.public_proofs ?? [],
    profileFreshness: row.profile_freshness,
  };
}

function toDetailProfile(row: DetailProfileRow): DetailProfile {
  return {
    agentId: row.agent_id,
    fullProblemStatement: row.full_problem_statement,
    currentHypothesis: row.current_hypothesis,
    ideaRigidity: row.idea_rigidity,
    whyMe: row.why_me,
    executionHistory: row.execution_history,
    proofDetails: row.proof_details ?? [],
    currentAvailabilityDetails: row.current_availability_details,
    roleExpectation: row.role_expectation,
    decisionStyle: row.decision_style,
    communicationStyle: row.communication_style,
    valuesAndNonNegotiables: row.values_and_non_negotiables ?? [],
    riskPreference: row.risk_preference,
    equityAndStructureExpectation: row.equity_and_structure_expectation,
    openQuestionsForMatch: row.open_questions_for_match ?? [],
    redFlagChecks: row.red_flag_checks ?? [],
    collaborationTrialPreference: row.collaboration_trial_preference,
    agentAuthorityScope: row.agent_authority_scope ?? [],
    disclosureGuardrails: row.disclosure_guardrails ?? [],
  };
}

function toMatchRequest(row: MatchRequestRow): MatchRequest {
  return {
    id: row.id,
    requesterAgentId: row.requester_agent_id,
    targetAgentId: row.target_agent_id,
    status: row.status,
    justification: row.justification,
    attractivePoints: row.attractive_points ?? [],
    complementSummary: row.complement_summary,
    classification: row.classification,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMatchRecord(row: MatchRow): MatchRecord {
  return {
    id: row.id,
    participantAgentIds: row.participant_agent_ids,
    matchStatus: row.match_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPreCommunicationMessage(row: PreCommunicationRow): PreCommunicationMessage {
  return {
    id: row.id,
    matchId: row.match_id,
    topic: row.topic,
    speakerAgentId: row.speaker_agent_id,
    messageType: row.message_type,
    content: row.content,
    createdAt: row.created_at,
  };
}

function toFitMemo(row: FitMemoRow): FitMemo {
  return {
    id: row.id,
    matchId: row.match_id,
    matchRationale: row.match_rationale,
    strongestComplements: row.strongest_complements ?? [],
    primaryRisks: row.primary_risks ?? [],
    openQuestions: row.open_questions ?? [],
    humanMeetingRecommendation: row.human_meeting_recommendation,
    trialProjectRecommendation: row.trial_project_recommendation,
    trialProjectSuggestion: row.trial_project_suggestion ?? undefined,
    confidenceLevel: row.confidence_level,
    generatedAt: row.generated_at,
  };
}

function toHandoffRecord(row: HandoffRow): HandoffRecord {
  return {
    id: row.id,
    matchId: row.match_id,
    contactExchangeStatus: row.contact_exchange_status,
    contactChannels: row.contact_channels ?? [],
    introTemplate: row.intro_template,
    priorityTopics: row.priority_topics ?? [],
    unlockedAt: row.unlocked_at ?? undefined,
  };
}

function fromPublicProfile(profile: PublicProfile): PublicProfileRow {
  return {
    agent_id: profile.agentId,
    founder_name: profile.founderName ?? "",
    base_location: profile.baseLocation ?? "",
    education: profile.education ?? "",
    experience_highlights: profile.experienceHighlights ?? [],
    headline: profile.headline,
    one_line_thesis: profile.oneLineThesis,
    why_now_brief: profile.whyNowBrief,
    current_stage: profile.currentStage,
    current_progress: profile.currentProgress,
    commitment_level: profile.commitmentLevel,
    actively_looking: profile.activelyLooking,
    founder_strengths: profile.founderStrengths,
    looking_for: profile.lookingFor,
    preferred_role_split: profile.preferredRoleSplit,
    skill_tags: profile.skillTags,
    work_style_summary: profile.workStyleSummary,
    region_timezone: profile.regionTimezone,
    collaboration_constraints_brief: profile.collaborationConstraintsBrief,
    trust_tier: profile.trustTier,
    public_proofs: profile.publicProofs,
    profile_freshness: profile.profileFreshness,
  };
}

function fromDetailProfile(profile: DetailProfile): DetailProfileRow {
  return {
    agent_id: profile.agentId,
    full_problem_statement: profile.fullProblemStatement,
    current_hypothesis: profile.currentHypothesis,
    idea_rigidity: profile.ideaRigidity,
    why_me: profile.whyMe,
    execution_history: profile.executionHistory,
    proof_details: profile.proofDetails,
    current_availability_details: profile.currentAvailabilityDetails,
    role_expectation: profile.roleExpectation,
    decision_style: profile.decisionStyle,
    communication_style: profile.communicationStyle,
    values_and_non_negotiables: profile.valuesAndNonNegotiables,
    risk_preference: profile.riskPreference,
    equity_and_structure_expectation: profile.equityAndStructureExpectation,
    open_questions_for_match: profile.openQuestionsForMatch,
    red_flag_checks: profile.redFlagChecks,
    collaboration_trial_preference: profile.collaborationTrialPreference,
    agent_authority_scope: profile.agentAuthorityScope,
    disclosure_guardrails: profile.disclosureGuardrails,
  };
}

function fromMatchRequest(request: MatchRequest): MatchRequestRow {
  return {
    id: request.id,
    requester_agent_id: request.requesterAgentId,
    target_agent_id: request.targetAgentId,
    status: request.status,
    justification: request.justification,
    attractive_points: request.attractivePoints,
    complement_summary: request.complementSummary,
    classification: request.classification,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
  };
}

function fromMatchRecord(match: MatchRecord): MatchRow {
  return {
    id: match.id,
    participant_agent_ids: match.participantAgentIds,
    match_status: match.matchStatus,
    created_at: match.createdAt,
    updated_at: match.updatedAt,
  };
}

function fromPreCommunicationMessage(message: PreCommunicationMessage): PreCommunicationRow {
  return {
    id: message.id,
    match_id: message.matchId,
    topic: message.topic,
    speaker_agent_id: message.speakerAgentId,
    message_type: message.messageType,
    content: message.content,
    created_at: message.createdAt,
  };
}

function fromFitMemo(memo: FitMemo): FitMemoRow {
  return {
    id: memo.id,
    match_id: memo.matchId,
    match_rationale: memo.matchRationale,
    strongest_complements: memo.strongestComplements,
    primary_risks: memo.primaryRisks,
    open_questions: memo.openQuestions,
    human_meeting_recommendation: memo.humanMeetingRecommendation,
    trial_project_recommendation: memo.trialProjectRecommendation,
    trial_project_suggestion: memo.trialProjectSuggestion ?? null,
    confidence_level: memo.confidenceLevel,
    generated_at: memo.generatedAt,
  };
}

function fromHandoffRecord(handoff: HandoffRecord): HandoffRow {
  return {
    id: handoff.id,
    match_id: handoff.matchId,
    contact_exchange_status: handoff.contactExchangeStatus,
    contact_channels: handoff.contactChannels,
    intro_template: handoff.introTemplate,
    priority_topics: handoff.priorityTopics,
    unlocked_at: handoff.unlockedAt ?? null,
  };
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
        agentAuthorityScope: [
          "Role split",
          "Time commitment",
          "Equity principles",
        ],
        disclosureGuardrails: [
          "No customer names",
          "No revenue projections",
          "No technical architecture details until after trial",
        ],
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
        agentAuthorityScope: [
          "Technical requirements",
          "Role split",
          "Timeline",
        ],
        disclosureGuardrails: [
          "No customer names",
          "No detailed revenue model until after trial",
        ],
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
        agentAuthorityScope: [
          "Equity",
          "Role split",
          "Technical roadmap",
        ],
        disclosureGuardrails: [
          "No customer names",
          "No detailed financials until after trial",
        ],
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
      dashboardAccessLinks: new Map(),
      consumedDashboardAccessLinks: new Map(),
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

async function persistSession(session: RareSession) {
  if (!supportsPersistentSessions()) {
    return;
  }

  const redis = getUpstashRedis();
  if (!redis) {
    return;
  }

  await redis.set(persistentSessionKey(session.sessionToken), session, {
    ex: ttlFromEpoch(session.expiresAt),
  });

  if (session.role === "viewer") {
    await redis.set(persistentViewerSessionKey(session.agentId), session, {
      ex: ttlFromEpoch(session.expiresAt),
    });
  }
}

async function getPersistentSession(sessionToken: string) {
  if (!supportsPersistentSessions()) {
    return null;
  }

  const redis = getUpstashRedis();
  if (!redis) {
    return null;
  }

  return (await redis.get<RareSession>(persistentSessionKey(sessionToken))) ?? null;
}

async function getPersistentLatestViewerSession(agentId: string) {
  if (!supportsPersistentSessions()) {
    return null;
  }

  const redis = getUpstashRedis();
  if (!redis) {
    return null;
  }

  return (await redis.get<RareSession>(persistentViewerSessionKey(agentId))) ?? null;
}

async function persistPendingDashboardLink(link: DashboardAccessLink) {
  if (!supportsPersistentSessions()) {
    return;
  }

  const redis = getUpstashRedis();
  if (!redis) {
    return;
  }

  await redis.set(persistentPendingDashboardLinkKey(link.agentId), link, {
    ex: ttlFromEpoch(link.expiresAt, DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS),
  });
}

async function getPersistentPendingDashboardLink(agentId: string) {
  if (!supportsPersistentSessions()) {
    return null;
  }

  const redis = getUpstashRedis();
  if (!redis) {
    return null;
  }

  return (await redis.get<DashboardAccessLink>(persistentPendingDashboardLinkKey(agentId))) ?? null;
}

async function clearPersistentPendingDashboardLink(agentId: string, token?: string) {
  if (!supportsPersistentSessions()) {
    return;
  }

  const redis = getUpstashRedis();
  if (!redis) {
    return;
  }

  if (!token) {
    await redis.del(persistentPendingDashboardLinkKey(agentId));
    return;
  }

  const current = await redis.get<DashboardAccessLink>(persistentPendingDashboardLinkKey(agentId));
  if (current?.token === token) {
    await redis.del(persistentPendingDashboardLinkKey(agentId));
  }
}

async function upsertPersistentAgentAndTrustTier(session: RareSession) {
  if (!supportsPersistentBusinessState()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const snapshot = createTrustTierSnapshot(session);

  const { error: agentError } = await supabase.from("agents").upsert({
    agent_id: session.agentId,
    display_name: session.displayName,
    identity_mode: session.identityMode,
    raw_level: session.rawLevel,
    effective_level: session.level,
    session_pubkey: session.sessionPubkey,
    last_seen_at: session.lastSeenAt,
  });
  if (agentError) {
    throw new Error(`Failed to persist agent: ${agentError.message}`);
  }

  const { error: trustError } = await supabase.from("trust_tiers").upsert({
    agent_id: snapshot.agentId,
    raw_level: snapshot.rawLevel,
    effective_level: snapshot.effectiveLevel,
    priority_rank: snapshot.priorityRank,
    daily_match_quota: snapshot.dailyMatchQuota,
    updated_at: snapshot.updatedAt,
  });
  if (trustError) {
    throw new Error(`Failed to persist trust tier: ${trustError.message}`);
  }
}

async function getPersistentAgent(agentId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to read agent: ${error.message}`);
  }

  return data ? toAgentRecord(data) : null;
}

async function getPersistentTrustTier(agentId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("trust_tiers")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to read trust tier: ${error.message}`);
  }

  return data ? toTrustTierRecord(data) : null;
}

async function listPersistentPublicProfiles() {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("profiles_public").select("*");
  if (error) {
    throw new Error(`Failed to list public profiles: ${error.message}`);
  }

  return (data ?? []).map((row) => toPublicProfile(row as PublicProfileRow));
}

async function getPersistentPublicProfile(agentId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles_public")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to read public profile: ${error.message}`);
  }

  return data ? toPublicProfile(data as PublicProfileRow) : null;
}

async function getPersistentDetailProfile(agentId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles_detail")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to read detail profile: ${error.message}`);
  }

  return data ? toDetailProfile(data as DetailProfileRow) : null;
}

async function listPersistentMatchRequestsForAgent(agentId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const [{ data: incoming, error: incomingError }, { data: outgoing, error: outgoingError }] =
    await Promise.all([
      supabase.from("match_requests").select("*").eq("target_agent_id", agentId),
      supabase.from("match_requests").select("*").eq("requester_agent_id", agentId),
    ]);

  if (incomingError) {
    throw new Error(`Failed to list incoming match requests: ${incomingError.message}`);
  }
  if (outgoingError) {
    throw new Error(`Failed to list outgoing match requests: ${outgoingError.message}`);
  }

  return {
    incoming: (incoming ?? []).map((row) => toMatchRequest(row as MatchRequestRow)),
    outgoing: (outgoing ?? []).map((row) => toMatchRequest(row as MatchRequestRow)),
  };
}

async function listPersistentMatches() {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("matches").select("*");
  if (error) {
    throw new Error(`Failed to list matches: ${error.message}`);
  }

  return (data ?? []).map((row) => toMatchRecord(row as MatchRow));
}

async function getPersistentMatch(matchId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (error) {
    throw new Error(`Failed to read match: ${error.message}`);
  }

  return data ? toMatchRecord(data as MatchRow) : null;
}

async function getPersistentMatchRequest(requestId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("match_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to read match request: ${error.message}`);
  }

  return data ? toMatchRequest(data as MatchRequestRow) : null;
}

async function listPersistentPreCommunicationMessages(matchId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("pre_communications")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Failed to list pre-communication messages: ${error.message}`);
  }

  return (data ?? []).map((row) => toPreCommunicationMessage(row as PreCommunicationRow));
}

async function getPersistentFitMemo(matchId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("fit_memos")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to read fit memo: ${error.message}`);
  }

  return data ? toFitMemo(data as FitMemoRow) : null;
}

async function getPersistentHandoff(matchId: string) {
  if (!supportsPersistentBusinessState()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("handoffs")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to read handoff: ${error.message}`);
  }

  return data ? toHandoffRecord(data as HandoffRow) : null;
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

function getReusableDashboardSessionByToken(token: string) {
  const now = Math.floor(Date.now() / 1000);
  const state = getState();
  const consumed = state.consumedDashboardAccessLinks.get(token);
  if (!consumed) {
    return null;
  }

  if (consumed.expiresAt <= now) {
    state.consumedDashboardAccessLinks.delete(token);
    return null;
  }

  const session = state.sessions.get(consumed.sessionToken);
  if (!session) {
    state.consumedDashboardAccessLinks.delete(token);
    return null;
  }

  if (isSessionExpired(session)) {
    state.sessions.delete(session.sessionToken);
    state.consumedDashboardAccessLinks.delete(token);
    return null;
  }

  return session;
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
  async upsertSession(session: RareSession) {
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
    await persistSession(normalizedSession);
    await upsertPersistentAgentAndTrustTier(normalizedSession);
    return normalizedSession;
  },

  async getSession(sessionToken: string) {
    const persistentSession = await getPersistentSession(sessionToken);
    if (persistentSession) {
      if (isSessionExpired(persistentSession)) {
        return undefined;
      }

      return persistentSession;
    }

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

  async createDashboardAccessLink(agentId: string, expiresInSeconds: number) {
    const state = getState();
    const agent = (await getPersistentAgent(agentId)) ?? state.agents.get(agentId) ?? null;
    const trustTier =
      (await getPersistentTrustTier(agentId)) ?? state.trustTiers.get(agentId) ?? null;
    if (!agent || !trustTier) {
      return null;
    }

    for (const link of listValidDashboardAccessLinks(agentId)) {
      state.dashboardAccessLinks.delete(link.token);
    }

    const token = createDashboardAccessToken({
      agentId,
      identityMode: agent.identityMode,
      rawLevel: trustTier.rawLevel,
      level: trustTier.effectiveLevel,
      displayName: agent.displayName,
      viewerSessionId: createId("viewer"),
      expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });
    const record = {
      token,
      agentId,
      createdAt: nowIso(),
      expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };

    state.dashboardAccessLinks.set(token, record);
    await persistPendingDashboardLink(record);
    return record;
  },

  async consumeDashboardAccessLink(token: string, sessionDurationSeconds: number) {
    const signedClaims = readDashboardAccessToken(token);
    if (signedClaims) {
      const existingViewerSession = await this.getSession(signedClaims.viewerSessionId);
      if (existingViewerSession?.role === "viewer") {
        await clearPersistentPendingDashboardLink(existingViewerSession.agentId, token);
        return existingViewerSession;
      }

      const viewerSession = {
        sessionToken: signedClaims.viewerSessionId,
        agentId: signedClaims.agentId,
        identityMode: signedClaims.identityMode,
        role: "viewer" as const,
        rawLevel: signedClaims.rawLevel,
        level: signedClaims.level,
        displayName: signedClaims.displayName,
        sessionPubkey: "",
        lastSeenAt: nowIso(),
        expiresAt: Math.floor(Date.now() / 1000) + sessionDurationSeconds,
      };

      await this.upsertSession(viewerSession);
      await clearPersistentPendingDashboardLink(viewerSession.agentId, token);
      return viewerSession;
    }

    const reusableSession = getReusableDashboardSessionByToken(token);
    if (reusableSession) {
      return reusableSession;
    }

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

    const viewerSession = await this.upsertSession({
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

    state.consumedDashboardAccessLinks.set(token, {
      token,
      agentId: record.agentId,
      sessionToken: viewerSession.sessionToken,
      consumedAt: nowIso(),
      expiresAt: record.expiresAt,
    });

    await clearPersistentPendingDashboardLink(record.agentId, token);
    return viewerSession;
  },

  async getLatestDashboardAccessLink(agentId: string) {
    const persistentLink = await getPersistentPendingDashboardLink(agentId);
    if (persistentLink && persistentLink.expiresAt > Math.floor(Date.now() / 1000)) {
      return persistentLink;
    }

    return listValidDashboardAccessLinks(agentId)[0] ?? null;
  },

  async heartbeatDashboardAccess(
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
    const viewerSession =
      (await getPersistentLatestViewerSession(agentId)) ?? getLatestViewerSession(agentId);
    const pendingLink = await this.getLatestDashboardAccessLink(agentId);
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

    const accessLink = await this.createDashboardAccessLink(agentId, accessLinkTtlSeconds);
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

  async upsertProfile(agentId: string, input: ProfileUpsertInput) {
    const state = getState();
    const level =
      (await getPersistentTrustTier(agentId))?.effectiveLevel ?? getAgentEffectiveLevel(agentId);
    const publicProfile = createPublicProfile(agentId, level, input.publicProfile);
    const detailProfile = createDetailProfile(agentId, input.detailProfile);

    state.publicProfiles.set(agentId, publicProfile);
    state.detailProfiles.set(agentId, detailProfile);

    if (supportsPersistentBusinessState()) {
      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase is not available.");
      }

      const { error: publicError } = await supabase.from("profiles_public").upsert(fromPublicProfile(publicProfile));
      if (publicError) {
        throw new Error(`Failed to persist public profile: ${publicError.message}`);
      }

      const { error: detailError } = await supabase.from("profiles_detail").upsert(fromDetailProfile(detailProfile));
      if (detailError) {
        throw new Error(`Failed to persist detail profile: ${detailError.message}`);
      }
    }

    return {
      publicProfile,
      detailProfile,
    };
  },

  async listPublicProfiles() {
    const persistentProfiles = await listPersistentPublicProfiles();
    const profiles = persistentProfiles ?? [...getState().publicProfiles.values()];

    return profiles.sort((left, right) =>
      priorityRankForTier(right.trustTier) - priorityRankForTier(left.trustTier) ||
      right.profileFreshness.localeCompare(left.profileFreshness),
    );
  },

  async getPublicProfile(agentId: string) {
    return (await getPersistentPublicProfile(agentId)) ?? getState().publicProfiles.get(agentId) ?? null;
  },

  async getDetailProfilesForMatch(matchId: string, viewerAgentId: string) {
    const match = (await getPersistentMatch(matchId)) ?? getState().matches.get(matchId) ?? null;
    if (!match) {
      return null;
    }

    if (!match.participantAgentIds.includes(viewerAgentId)) {
      return null;
    }

    if (supportsPersistentBusinessState()) {
      const profiles = await Promise.all(
        match.participantAgentIds.map((agentId) => getPersistentDetailProfile(agentId)),
      );

      return {
        match,
        profiles: profiles.filter(Boolean) as DetailProfile[],
      };
    }

    return {
      match,
      profiles: match.participantAgentIds
        .map((agentId) => getState().detailProfiles.get(agentId))
        .filter(Boolean) as DetailProfile[],
    };
  },

  async createMatchRequest(
    requesterAgentId: string,
    payload: Omit<MatchRequest, "id" | "requesterAgentId" | "status" | "createdAt" | "updatedAt">,
  ) {
    if (supportsPersistentBusinessState()) {
      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase is not available.");
      }

      const requests = await listPersistentMatchRequestsForAgent(requesterAgentId);
      const existing =
        requests?.outgoing.find(
          (request) =>
            request.requesterAgentId === requesterAgentId &&
            request.targetAgentId === payload.targetAgentId &&
            request.status !== "expired",
        ) ?? null;
      if (existing) {
        const matches = await listPersistentMatches();
        return {
          request: existing,
          match:
            matches?.find((match) => {
              const participants = new Set(match.participantAgentIds);
              return participants.has(requesterAgentId) && participants.has(payload.targetAgentId);
            }) ?? null,
        };
      }

      const trustTier = await this.getTrustTier(requesterAgentId);
      const dailyQuota = trustTier?.dailyMatchQuota ?? dailyMatchQuotaForTier("L0");
      if (dailyQuota <= 0) {
        throw new HttpError(403, "This account cannot create match requests.");
      }

      const now = nowIso();
      const requestsToday =
        requests?.outgoing.filter((request) => request.createdAt.startsWith(now.slice(0, 10))).length ?? 0;
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

      const { error: insertError } = await supabase.from("match_requests").insert(fromMatchRequest(request));
      if (insertError) {
        throw new Error(`Failed to persist match request: ${insertError.message}`);
      }

      const reverseRequest =
        (await listPersistentMatchRequestsForAgent(payload.targetAgentId))?.outgoing.find(
          (candidate) => candidate.targetAgentId === requesterAgentId,
        ) ?? null;
      if (shouldCreateMutualMatch(request, reverseRequest)) {
        request.status = "accepted";
        request.updatedAt = nowIso();
        await supabase
          .from("match_requests")
          .update({ status: "accepted", updated_at: request.updatedAt })
          .eq("id", request.id);

        if (reverseRequest) {
          reverseRequest.status = "accepted";
          reverseRequest.updatedAt = nowIso();
          await supabase
            .from("match_requests")
            .update({ status: "accepted", updated_at: reverseRequest.updatedAt })
            .eq("id", reverseRequest.id);
        }

        const existingMatch =
          (await listPersistentMatches())?.find((candidate) => {
            const participants = new Set(candidate.participantAgentIds);
            return participants.has(requesterAgentId) && participants.has(payload.targetAgentId);
          }) ?? null;
        const match =
          existingMatch ??
          {
            id: createId("match"),
            participantAgentIds: [requesterAgentId, payload.targetAgentId].sort() as [string, string],
            matchStatus: "active",
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };

        if (!existingMatch) {
          const { error: matchError } = await supabase.from("matches").insert(fromMatchRecord(match));
          if (matchError) {
            throw new Error(`Failed to persist match: ${matchError.message}`);
          }
        }

        return { request, match };
      }

      return { request, match: null };
    }

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

  async respondToMatchRequest(requestId: string, responderAgentId: string, accept: boolean) {
    if (supportsPersistentBusinessState()) {
      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase is not available.");
      }

      const request = await getPersistentMatchRequest(requestId);
      if (!request || request.targetAgentId !== responderAgentId) {
        return null;
      }

      request.status = accept ? "accepted" : "declined";
      request.updatedAt = nowIso();

      const { error: updateError } = await supabase
        .from("match_requests")
        .update({ status: request.status, updated_at: request.updatedAt })
        .eq("id", request.id);
      if (updateError) {
        throw new Error(`Failed to update match request: ${updateError.message}`);
      }

      let match: MatchRecord | null = null;
      if (accept) {
        const existingMatches = await listPersistentMatches();
        match =
          existingMatches?.find((candidate) => {
            const participants = new Set(candidate.participantAgentIds);
            return participants.has(request.requesterAgentId) && participants.has(request.targetAgentId);
          }) ?? null;

        if (!match) {
          match = {
            id: createId("match"),
            participantAgentIds: [request.requesterAgentId, request.targetAgentId].sort() as [string, string],
            matchStatus: "active",
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
          const { error: matchError } = await supabase.from("matches").insert(fromMatchRecord(match));
          if (matchError) {
            throw new Error(`Failed to persist match: ${matchError.message}`);
          }
        }
      }

      return { request, match };
    }

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

  async listInbox(agentId: string): Promise<MatchInbox> {
    if (supportsPersistentBusinessState()) {
      const requests = await listPersistentMatchRequestsForAgent(agentId);
      const matches =
        (await listPersistentMatches())?.filter((match) => match.participantAgentIds.includes(agentId)) ?? [];
      const matchIds = new Set(matches.map((match) => match.id));
      const nextStep = getSuggestedMatchingNextStep({
        incomingRequests: requests?.incoming ?? [],
        matches,
      });

      const [fitMemos, handoffs] = await Promise.all([
        Promise.all([...matchIds].map((matchId) => getPersistentFitMemo(matchId))),
        Promise.all([...matchIds].map((matchId) => getPersistentHandoff(matchId))),
      ]);

      return {
        suggestedNextStep: nextStep.step,
        nextStepReason: nextStep.reason,
        incomingRequests: requests?.incoming ?? [],
        outgoingRequests: requests?.outgoing ?? [],
        matches,
        fitMemos: fitMemos.filter(Boolean) as FitMemo[],
        handoffs: handoffs.filter(Boolean) as HandoffRecord[],
      };
    }

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

  async addPreCommunicationMessage(
    matchId: string,
    speakerAgentId: string,
    topic: PreCommunicationMessage["topic"],
    messageType: PreCommunicationMessage["messageType"],
    content: string,
  ) {
    if (supportsPersistentBusinessState()) {
      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase is not available.");
      }

      const match = await getPersistentMatch(matchId);
      if (!match || !match.participantAgentIds.includes(speakerAgentId)) {
        return null;
      }

      const message: PreCommunicationMessage = {
        id: createId("msg"),
        matchId,
        speakerAgentId,
        topic,
        messageType,
        content,
        createdAt: nowIso(),
      };

      const { error: messageError } = await supabase
        .from("pre_communications")
        .insert(fromPreCommunicationMessage(message));
      if (messageError) {
        throw new Error(`Failed to persist pre-communication message: ${messageError.message}`);
      }

      match.updatedAt = nowIso();
      await supabase.from("matches").update({ updated_at: match.updatedAt }).eq("id", match.id);
      const messages = (await listPersistentPreCommunicationMessages(matchId)) ?? [message];

      return { match, message, messages };
    }

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

  async listPreCommunicationMessages(matchId: string, viewerAgentId: string) {
    const persistentMatch = await getPersistentMatch(matchId);
    const match = persistentMatch ?? getState().matches.get(matchId) ?? null;
    if (!match || !match.participantAgentIds.includes(viewerAgentId)) {
      return null;
    }

    if (persistentMatch) {
      return await listPersistentPreCommunicationMessages(matchId);
    }

    return getState().preCommunications.get(matchId) ?? [];
  },

  async generateFitMemo(matchId: string, viewerAgentId: string) {
    const persistentMatch = await getPersistentMatch(matchId);
    const match = persistentMatch ?? getState().matches.get(matchId) ?? null;
    if (!match || !match.participantAgentIds.includes(viewerAgentId)) {
      return null;
    }

    const messages = persistentMatch
      ? ((await listPersistentPreCommunicationMessages(matchId)) ?? [])
      : (getState().preCommunications.get(matchId) ?? []);
    const memoBase = buildFitMemo(match, messages);
    const memo: FitMemo = {
      id: createId("memo"),
      generatedAt: nowIso(),
      ...memoBase,
    };

    if (supportsPersistentBusinessState()) {
      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase is not available.");
      }

      const { error: memoError } = await supabase.from("fit_memos").upsert(fromFitMemo(memo));
      if (memoError) {
        throw new Error(`Failed to persist fit memo: ${memoError.message}`);
      }

      if (memo.humanMeetingRecommendation) {
        match.matchStatus = "handoff_ready";
        match.updatedAt = nowIso();
        await supabase
          .from("matches")
          .update({ match_status: match.matchStatus, updated_at: match.updatedAt })
          .eq("id", match.id);
      }

      return memo;
    }

    getState().fitMemos.set(matchId, memo);
    if (memo.humanMeetingRecommendation) {
      match.matchStatus = "handoff_ready";
      match.updatedAt = nowIso();
      getState().matches.set(match.id, match);
    }

    return memo;
  },

  async unlockHandoff(matchId: string, viewerAgentId: string) {
    const persistentMatch = await getPersistentMatch(matchId);
    const persistentMemo = await getPersistentFitMemo(matchId);
    const match = persistentMatch ?? getState().matches.get(matchId) ?? null;
    const memo = persistentMemo ?? getState().fitMemos.get(matchId) ?? null;

    if (!match || !memo || !match.participantAgentIds.includes(viewerAgentId)) {
      return null;
    }

    if (!memo.humanMeetingRecommendation) {
      return null;
    }

    if (supportsPersistentBusinessState()) {
      const existing = await getPersistentHandoff(matchId);
      if (existing) {
        return existing;
      }

      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase is not available.");
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

      const { error: handoffError } = await supabase.from("handoffs").insert(fromHandoffRecord(handoff));
      if (handoffError) {
        throw new Error(`Failed to persist handoff: ${handoffError.message}`);
      }

      match.matchStatus = "handoff_ready";
      match.updatedAt = nowIso();
      await supabase
        .from("matches")
        .update({ match_status: match.matchStatus, updated_at: match.updatedAt })
        .eq("id", match.id);

      return handoff;
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

  async hasMinimumTier(sessionToken: string, minimumTier: RareSession["level"]) {
    const session = await this.getSession(sessionToken);
    return Boolean(session && hasTier(session.level, minimumTier));
  },

  async getTrustTier(agentId: string) {
    return (await getPersistentTrustTier(agentId)) ?? getState().trustTiers.get(agentId) ?? null;
  },

  async syncAgentLevel(agentId: string, level: RareSession["level"]) {
    const state = getState();
    const agent = state.agents.get(agentId) ?? (await getPersistentAgent(agentId)) ?? null;
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

    await upsertPersistentAgentAndTrustTier({
      sessionToken: "",
      agentId,
      identityMode: agent.identityMode,
      role: "agent",
      rawLevel: agent.rawLevel,
      level: normalizedLevel,
      displayName: agent.displayName,
      sessionPubkey: agent.sessionPubkey,
      lastSeenAt: updatedAt,
    });

    return trustTier;
  },

  async reset() {
    globalThis.__deepmatchStore = undefined;
  },
};
