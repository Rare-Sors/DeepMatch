type JsonRecord = Record<string, unknown>;

type StageValue =
  | "idea"
  | "customer_discovery"
  | "prototype"
  | "MVP"
  | "early_revenue"
  | "pivoting";

type CommitmentValue = "full-time" | "20-40h" | "<20h";

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return undefined;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function splitLegacyStringList(value: unknown, splitSingleChunkBySpace = false) {
  if (typeof value !== "string") {
    return undefined;
  }

  const source = value.trim();
  if (!source) {
    return undefined;
  }

  const normalized = source
    .replace(/\s+and\s+/gi, ",")
    .replace(/\s+or\s+/gi, ",");
  const chunks = normalized
    .split(/[,\n;/|，、]+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  if (chunks.length > 1) {
    return chunks;
  }

  if (splitSingleChunkBySpace) {
    const tokens = source.split(/\s+/).filter((token) => token.length > 0);
    if (tokens.length > 1) {
      return tokens;
    }
  }

  return [source];
}

function firstArray(...values: unknown[]) {
  for (const value of values) {
    const asArray = toStringArray(value);
    if (asArray) {
      return asArray;
    }

    const split = splitLegacyStringList(value);
    if (split) {
      return split;
    }
  }

  return undefined;
}

function firstArrayOrSpaceSplit(...values: unknown[]) {
  for (const value of values) {
    const asArray = toStringArray(value);
    if (asArray) {
      return asArray;
    }

    const split = splitLegacyStringList(value, true);
    if (split) {
      return split;
    }
  }

  return undefined;
}

function firstBoolean(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value !== "string") {
      continue;
    }

    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "y", "1"].includes(normalized)) {
      return true;
    }
    if (["false", "no", "n", "0"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

function normalizeStage(...values: unknown): StageValue | undefined {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const normalized = value.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
    if (normalized === "idea") {
      return "idea";
    }
    if (normalized === "customer_discovery" || normalized === "discovery") {
      return "customer_discovery";
    }
    if (normalized === "prototype") {
      return "prototype";
    }
    if (normalized === "mvp") {
      return "MVP";
    }
    if (normalized === "early_revenue" || normalized === "revenue") {
      return "early_revenue";
    }
    if (normalized === "pivoting" || normalized === "pivot") {
      return "pivoting";
    }
  }

  return undefined;
}

function normalizeCommitment(...values: unknown): CommitmentValue | undefined {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const source = value.trim().toLowerCase();
    const normalized = source.replaceAll(" ", "").replaceAll("-", "");

    if (["fulltime", "full", "100%"].includes(normalized) || source.includes("full-time")) {
      return "full-time";
    }
    if (["2040h", "2040", "parttime", "part"].includes(normalized) || source.includes("part-time")) {
      return "20-40h";
    }
    if (["<20h", "<20", "under20h", "under20"].includes(normalized)) {
      return "<20h";
    }

    const hourMatch = source.match(/(\d+)\s*h/);
    if (hourMatch) {
      const hours = Number.parseInt(hourMatch[1] ?? "", 10);
      if (!Number.isNaN(hours)) {
        if (hours >= 35) {
          return "full-time";
        }
        if (hours >= 20) {
          return "20-40h";
        }
        return "<20h";
      }
    }
  }

  return undefined;
}

export function normalizeProfileUpsertPayload(input: unknown) {
  const payload = asRecord(input);
  if (!payload) {
    return input;
  }

  const publicProfile = asRecord(payload.publicProfile) ?? {};
  const detailProfile = asRecord(payload.detailProfile) ?? {};
  const detailIdentity = asRecord(detailProfile.identity) ?? {};
  const detailDirection = asRecord(detailProfile.ventureDirection) ?? {};
  const detailCapability = asRecord(detailProfile.capability) ?? {};
  const detailCollaboration = asRecord(detailProfile.collaboration) ?? {};
  const detailConstraints = asRecord(detailProfile.constraints) ?? {};
  const detailCredibility = asRecord(detailProfile.credibility) ?? {};
  const detailExperience = asRecord(detailProfile.experience) ?? {};

  const derivedRoleExpectation = (() => {
    const ownership = firstString(detailCapability.ownership);
    const desired = firstString(detailCapability.desiredCofounder);

    if (ownership && desired) {
      return `Own ${ownership}; expect cofounder to cover ${desired}.`;
    }
    if (ownership) {
      return `Own ${ownership} scope and partner on remaining functions.`;
    }
    if (desired) {
      return `Looking for cofounder to cover ${desired}.`;
    }

    return undefined;
  })();

  const derivedCommunicationStyle = (() => {
    const rhythm = firstString(detailCollaboration.workRhythm);
    const density = firstString(detailCollaboration.communicationDensity);
    if (!rhythm && !density) {
      return undefined;
    }
    return [rhythm, density ? `communication density: ${density}` : undefined]
      .filter((item): item is string => Boolean(item))
      .join(", ");
  })();

  const derivedWhyMe = (() => {
    const occupation = firstString(detailIdentity.occupation);
    const strengths = firstArray(detailCapability.strengths, publicProfile.strengths);
    if (occupation && strengths && strengths.length > 0) {
      return `${occupation}; core strengths: ${strengths.join(", ")}.`;
    }
    if (occupation) {
      return occupation;
    }
    if (strengths && strengths.length > 0) {
      return `Core strengths: ${strengths.join(", ")}.`;
    }
    return undefined;
  })();

  return {
    ...payload,
    publicProfile: {
      ...publicProfile,
      founderName: firstString(publicProfile.founderName, publicProfile.name),
      baseLocation: firstString(
        publicProfile.baseLocation,
        detailIdentity.location,
        publicProfile.region,
      ),
      education: firstString(
        publicProfile.education,
        firstArray(detailExperience.education)?.[0],
      ),
      experienceHighlights:
        firstArray(publicProfile.experienceHighlights, detailExperience.pastProjects) ?? [],
      headline: firstString(
        publicProfile.headline,
        publicProfile.intent,
        detailDirection.problem,
        "Founder seeking aligned cofounder.",
      ),
      oneLineThesis: firstString(
        publicProfile.oneLineThesis,
        detailDirection.problem,
        publicProfile.intent,
        "Building in a high-potential problem space.",
      ),
      whyNowBrief: firstString(
        publicProfile.whyNowBrief,
        detailDirection.whyNow,
        "Market timing suggests this is a good moment to build.",
      ),
      currentStage:
        normalizeStage(publicProfile.currentStage, publicProfile.stage, detailDirection.stage) ?? "idea",
      currentProgress: firstString(
        publicProfile.currentProgress,
        publicProfile.progress,
        detailDirection.progress,
        "Exploring and validating the first version.",
      ),
      commitmentLevel:
        normalizeCommitment(
          publicProfile.commitmentLevel,
          publicProfile.commitment,
          detailConstraints.time,
          detailIdentity.nearTermAvailability,
          detailIdentity.currentFoundingStatus,
        ) ?? "20-40h",
      activelyLooking: firstBoolean(publicProfile.activelyLooking) ?? true,
      founderStrengths:
        firstArrayOrSpaceSplit(
          publicProfile.founderStrengths,
          publicProfile.strengths,
          detailCapability.strengths,
        ) ?? [],
      lookingFor:
        firstArray(
          publicProfile.lookingFor,
          publicProfile.desiredCounterpart,
          detailCapability.missing,
          detailCapability.desiredCofounder,
        ) ?? [],
      preferredRoleSplit: firstString(
        publicProfile.preferredRoleSplit,
        publicProfile.roleSplit,
        derivedRoleExpectation,
        "Role split to be confirmed during matching.",
      ),
      skillTags: firstArray(publicProfile.skillTags, detailConstraints.industry) ?? [],
      workStyleSummary: firstString(
        publicProfile.workStyleSummary,
        publicProfile.workStyle,
        detailCollaboration.workRhythm,
        "Collaborative and execution-oriented.",
      ),
      regionTimezone: firstString(
        publicProfile.regionTimezone,
        detailIdentity.timezone,
        publicProfile.region,
        "Timezone to be confirmed.",
      ),
      collaborationConstraintsBrief: firstString(
        publicProfile.collaborationConstraintsBrief,
        publicProfile.constraints,
        firstArray(detailConstraints.nonNegotiables)?.join(", "),
        "No special constraints provided.",
      ),
      publicProofs:
        firstArray(publicProfile.publicProofs, detailCredibility.publicProofs) ?? [],
    },
    detailProfile: {
      ...detailProfile,
      fullProblemStatement: firstString(
        detailProfile.fullProblemStatement,
        detailDirection.problem,
        publicProfile.oneLineThesis,
        "Detailed problem statement pending.",
      ),
      currentHypothesis: firstString(
        detailProfile.currentHypothesis,
        detailDirection.currentHypothesis,
        detailDirection.problem,
        "Initial hypothesis under active validation.",
      ),
      ideaRigidity: firstString(
        detailProfile.ideaRigidity,
        detailDirection.rigidity,
        "Open to iteration with evidence.",
      ),
      whyMe: firstString(detailProfile.whyMe, derivedWhyMe, "Relevant operator experience."),
      executionHistory: firstString(
        detailProfile.executionHistory,
        detailCredibility.executionHistory,
        firstArray(detailExperience.workHistory)?.join(", "),
        "Execution history shared during intake.",
      ),
      proofDetails:
        firstArray(detailProfile.proofDetails, detailCredibility.publicProofs, publicProfile.publicProofs) ??
        [],
      currentAvailabilityDetails: firstString(
        detailProfile.currentAvailabilityDetails,
        detailIdentity.nearTermAvailability,
        detailIdentity.currentFoundingStatus,
        detailConstraints.time,
        "Availability details pending.",
      ),
      roleExpectation: firstString(
        detailProfile.roleExpectation,
        derivedRoleExpectation,
        "Role expectations to be confirmed in pre-communication.",
      ),
      decisionStyle: firstString(
        detailProfile.decisionStyle,
        detailCollaboration.decisionStyle,
        "Debate then commit.",
      ),
      communicationStyle: firstString(
        detailProfile.communicationStyle,
        derivedCommunicationStyle,
        "Async-friendly and direct.",
      ),
      valuesAndNonNegotiables:
        firstArray(detailProfile.valuesAndNonNegotiables, detailConstraints.nonNegotiables) ?? [],
      riskPreference: firstString(
        detailProfile.riskPreference,
        detailConstraints.risk,
        "moderate",
      ),
      equityAndStructureExpectation: firstString(
        detailProfile.equityAndStructureExpectation,
        detailConstraints.equityExpectations,
        "Open to discuss equity and vesting.",
      ),
      openQuestionsForMatch: firstArray(detailProfile.openQuestionsForMatch) ?? [],
      redFlagChecks: firstArray(detailProfile.redFlagChecks) ?? [],
      collaborationTrialPreference: firstString(
        detailProfile.collaborationTrialPreference,
        "Open to a 1-4 week scoped trial.",
      ),
      agentAuthorityScope: firstArray(detailProfile.agentAuthorityScope) ?? [],
      disclosureGuardrails: firstArray(detailProfile.disclosureGuardrails) ?? [],
    },
  };
}
