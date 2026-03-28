import { z } from "zod";

import type {
  CommitmentLevel,
  CurrentStage,
  FitClassification,
  MatchRequestStatus,
  MatchStatus,
  PreCommunicationMessageType,
  PreCommunicationTopic,
  TrustTier,
} from "@/types/domain";

const trustTierEnum = z.enum(["L0", "L1", "L2"] satisfies TrustTier[]);
const currentStageEnum = z.enum(
  ["idea", "customer_discovery", "prototype", "MVP", "early_revenue", "pivoting"] satisfies CurrentStage[],
);
const commitmentLevelEnum = z.enum(["full-time", "20-40h", "<20h"] satisfies CommitmentLevel[]);
const fitClassificationEnum = z.enum(
  [
    "strong fit",
    "possible fit with open questions",
    "low fit",
    "do not pursue",
  ] satisfies FitClassification[],
);
const preCommTopicEnum = z.enum(
  ["direction", "role", "commitment", "working_style", "structure", "risk"] satisfies PreCommunicationTopic[],
);
const preCommMessageTypeEnum = z.enum(
  ["prompt", "reply", "summary"] satisfies PreCommunicationMessageType[],
);

const stringArrayBase = z.array(z.string().trim().min(1));
const stringArray = stringArrayBase.default([]);

export const actionEnvelopeSchema = z
  .object({
    action: z.string().trim().min(1),
    actionPayload: z.record(z.string(), z.unknown()).default({}),
    nonce: z.string().trim().min(1),
    issuedAt: z.number().int(),
    expiresAt: z.number().int(),
    signatureBySession: z.string().trim().min(1),
  })
  .optional();

export const authCompleteSchema = z.object({
  nonce: z.string().trim().min(1),
  agentId: z.string().trim().min(1),
  sessionPubkey: z.string().trim().min(1),
  delegationToken: z.string().trim().min(1),
  signatureBySession: z.string().trim().min(1),
  publicIdentityAttestation: z.string().trim().optional(),
  fullIdentityAttestation: z.string().trim().optional(),
});

export const profileUpsertSchema = z.object({
  actionVerification: actionEnvelopeSchema,
  publicProfile: z.object({
    founderName: z.string().trim().default(""),
    baseLocation: z.string().trim().default(""),
    education: z.string().trim().default(""),
    experienceHighlights: stringArray,
    headline: z.string().trim().min(1),
    oneLineThesis: z.string().trim().min(1),
    whyNowBrief: z.string().trim().min(1),
    currentStage: currentStageEnum,
    currentProgress: z.string().trim().min(1),
    commitmentLevel: commitmentLevelEnum,
    activelyLooking: z.boolean(),
    founderStrengths: stringArray,
    lookingFor: stringArray,
    preferredRoleSplit: z.string().trim().min(1),
    skillTags: stringArray,
    workStyleSummary: z.string().trim().min(1),
    regionTimezone: z.string().trim().min(1),
    collaborationConstraintsBrief: z.string().trim().min(1),
    publicProofs: stringArray,
  }),
  detailProfile: z.object({
    fullProblemStatement: z.string().trim().min(1),
    currentHypothesis: z.string().trim().min(1),
    ideaRigidity: z.string().trim().min(1),
    whyMe: z.string().trim().min(1),
    executionHistory: z.string().trim().min(1),
    proofDetails: stringArray,
    currentAvailabilityDetails: z.string().trim().min(1),
    roleExpectation: z.string().trim().min(1),
    decisionStyle: z.string().trim().min(1),
    communicationStyle: z.string().trim().min(1),
    valuesAndNonNegotiables: stringArray,
    riskPreference: z.string().trim().min(1),
    equityAndStructureExpectation: z.string().trim().min(1),
    openQuestionsForMatch: stringArray,
    redFlagChecks: stringArray,
    collaborationTrialPreference: z.string().trim().min(1),
    agentAuthorityScope: stringArray,
    disclosureGuardrails: stringArray,
  }),
});

export const matchRequestSchema = z.object({
  actionVerification: actionEnvelopeSchema,
  targetAgentId: z.string().trim().min(1),
  justification: z.string().trim().min(1),
  attractivePoints: stringArrayBase.min(1),
  complementSummary: z.string().trim().min(1),
  classification: fitClassificationEnum,
});

export const matchResponseSchema = z.object({
  actionVerification: actionEnvelopeSchema,
  accept: z.boolean(),
});

export const preCommunicationMessageSchema = z.object({
  actionVerification: actionEnvelopeSchema,
  topic: preCommTopicEnum,
  messageType: preCommMessageTypeEnum,
  content: z.string().trim().min(1),
});

export const trustTierSchema = trustTierEnum;

export const matchRequestStatusSchema = z.enum(
  ["pending", "accepted", "declined", "expired"] satisfies MatchRequestStatus[],
);

export const matchStatusSchema = z.enum(
  ["active", "closed", "handoff_ready", "rejected"] satisfies MatchStatus[],
);
