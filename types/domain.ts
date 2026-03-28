export type TrustTier = "L0" | "L1" | "L2";
export type IdentityMode = "public" | "full";
export type SessionRole = "agent" | "viewer";
export type CommitmentLevel = "full-time" | "20-40h" | "<20h";
export type CurrentStage =
  | "idea"
  | "customer_discovery"
  | "prototype"
  | "MVP"
  | "early_revenue"
  | "pivoting";
export type MatchRequestStatus = "pending" | "accepted" | "declined" | "expired";
export type MatchStatus = "active" | "closed" | "handoff_ready" | "rejected";
export type MatchingNextStep = "review_inbox" | "scan_profiles" | "start_pre_communication";
export type FitClassification =
  | "strong fit"
  | "possible fit with open questions"
  | "low fit"
  | "do not pursue";
export type PreCommunicationTopic =
  | "direction"
  | "role"
  | "commitment"
  | "working_style"
  | "structure"
  | "risk";
export type PreCommunicationMessageType = "prompt" | "reply" | "summary";
export type ContactExchangeStatus = "locked" | "ready" | "shared";

export interface RareSession {
  sessionToken: string;
  agentId: string;
  identityMode: IdentityMode;
  role: SessionRole;
  rawLevel: TrustTier;
  level: TrustTier;
  displayName: string;
  sessionPubkey: string;
  lastSeenAt: string;
  expiresAt?: number;
}

export interface DashboardAccessLink {
  token: string;
  agentId: string;
  createdAt: string;
  expiresAt: number;
}

export interface AgentRecord {
  agentId: string;
  displayName: string;
  identityMode: IdentityMode;
  rawLevel: TrustTier;
  effectiveLevel: TrustTier;
  sessionPubkey: string;
  lastSeenAt: string;
}

export interface TrustTierRecord {
  agentId: string;
  rawLevel: TrustTier;
  effectiveLevel: TrustTier;
  priorityRank: number;
  dailyMatchQuota: number;
  updatedAt: string;
}

export interface PublicProfileInput {
  founderName?: string;
  baseLocation?: string;
  education?: string;
  experienceHighlights?: string[];
  headline: string;
  oneLineThesis: string;
  whyNowBrief: string;
  currentStage: CurrentStage;
  currentProgress: string;
  commitmentLevel: CommitmentLevel;
  activelyLooking: boolean;
  founderStrengths: string[];
  lookingFor: string[];
  preferredRoleSplit: string;
  skillTags: string[];
  workStyleSummary: string;
  regionTimezone: string;
  collaborationConstraintsBrief: string;
  publicProofs: string[];
}

export interface PublicProfile extends PublicProfileInput {
  agentId: string;
  trustTier: TrustTier;
  profileFreshness: string;
}

export interface DetailProfileInput {
  fullProblemStatement: string;
  currentHypothesis: string;
  ideaRigidity: string;
  whyMe: string;
  executionHistory: string;
  proofDetails: string[];
  currentAvailabilityDetails: string;
  roleExpectation: string;
  decisionStyle: string;
  communicationStyle: string;
  valuesAndNonNegotiables: string[];
  riskPreference: string;
  equityAndStructureExpectation: string;
  openQuestionsForMatch: string[];
  redFlagChecks: string[];
  collaborationTrialPreference: string;
  agentAuthorityScope: string[];
  disclosureGuardrails: string[];
}

export interface DetailProfile extends DetailProfileInput {
  agentId: string;
}

export interface ProfileUpsertInput {
  publicProfile: PublicProfileInput;
  detailProfile: DetailProfileInput;
}

export interface MatchRequest {
  id: string;
  requesterAgentId: string;
  targetAgentId: string;
  status: MatchRequestStatus;
  justification: string;
  attractivePoints: string[];
  complementSummary: string;
  classification: FitClassification;
  createdAt: string;
  updatedAt: string;
}

export interface MatchRecord {
  id: string;
  participantAgentIds: [string, string];
  matchStatus: MatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PreCommunicationMessage {
  id: string;
  matchId: string;
  topic: PreCommunicationTopic;
  speakerAgentId: string;
  messageType: PreCommunicationMessageType;
  content: string;
  createdAt: string;
}

export interface TrialProject {
  duration: string;
  scope: string;
  objectives: string[];
  acceptanceCriteria: string[];
}

export interface FitMemo {
  id: string;
  matchId: string;
  matchRationale: string;
  strongestComplements: string[];
  primaryRisks: string[];
  openQuestions: string[];
  humanMeetingRecommendation: boolean;
  trialProjectRecommendation: boolean;
  trialProjectSuggestion?: TrialProject;
  confidenceLevel: "low" | "medium" | "high";
  generatedAt: string;
}

export interface HandoffRecord {
  id: string;
  matchId: string;
  contactExchangeStatus: ContactExchangeStatus;
  contactChannels: string[];
  introTemplate: string;
  priorityTopics: string[];
  unlockedAt?: string;
}

export interface MatchInbox {
  suggestedNextStep: MatchingNextStep;
  nextStepReason: string;
  incomingRequests: MatchRequest[];
  outgoingRequests: MatchRequest[];
  matches: MatchRecord[];
  fitMemos: FitMemo[];
  handoffs: HandoffRecord[];
}
