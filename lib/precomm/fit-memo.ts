import { excerpt } from "@/lib/utils";
import type {
  FitMemo,
  MatchRecord,
  PreCommunicationMessage,
  PreCommunicationTopic,
  TrialProject,
} from "@/types/domain";

const topicLabels: Record<PreCommunicationTopic, string> = {
  direction: "Direction fit",
  role: "Role fit",
  commitment: "Commitment fit",
  working_style: "Working style fit",
  structure: "Structure fit",
  risk: "Risk and red flags",
};

function summarizeTopic(topic: PreCommunicationTopic, messages: PreCommunicationMessage[]) {
  const relevant = messages.filter((message) => message.topic === topic);
  if (!relevant.length) {
    return null;
  }

  const latest = relevant[relevant.length - 1];

  return `${topicLabels[topic]}: ${excerpt(latest.content, 110)}`;
}

function collectOpenQuestions(messages: PreCommunicationMessage[]) {
  return messages
    .filter((message) => message.content.includes("?"))
    .slice(0, 4)
    .map((message) => excerpt(message.content, 100));
}

function collectRisks(messages: PreCommunicationMessage[]) {
  return messages
    .filter((message) =>
      /(risk|uncertain|concern|constraint|red flag|misalign|not sure)/i.test(message.content),
    )
    .slice(0, 4)
    .map((message) => excerpt(message.content, 100));
}

function suggestTrialProject(messages: PreCommunicationMessage[]): TrialProject | undefined {
  const mentionsTrial = messages.some((message) => /(trial|pilot|sprint|prototype)/i.test(message.content));
  if (!mentionsTrial) {
    return undefined;
  }

  return {
    duration: "2 weeks",
    scope: "Run a tightly scoped founder collaboration sprint around the riskiest open question.",
    objectives: [
      "Validate delivery cadence",
      "Observe decision-making under ambiguity",
      "Test communication density and ownership split",
    ],
    acceptanceCriteria: [
      "Shared weekly plan with visible owners",
      "One shipped artifact or customer-facing output",
      "Mutual retrospective on collaboration quality",
    ],
  };
}

export function buildFitMemo(match: MatchRecord, messages: PreCommunicationMessage[]): Omit<FitMemo, "id" | "generatedAt"> {
  const topicSummaries = (Object.keys(topicLabels) as PreCommunicationTopic[])
    .map((topic) => summarizeTopic(topic, messages))
    .filter(Boolean) as string[];

  const strongestComplements = topicSummaries.slice(0, 3);
  const primaryRisks = collectRisks(messages);
  const openQuestions = collectOpenQuestions(messages);
  const trialProjectSuggestion = suggestTrialProject(messages);
  const confidenceLevel =
    topicSummaries.length >= 4 && primaryRisks.length <= 2 ? "high" : topicSummaries.length >= 2 ? "medium" : "low";

  return {
    matchId: match.id,
    matchRationale:
      topicSummaries[0] ??
      "Both founders expressed enough positive intent to continue evaluation through structured pre-communication.",
    strongestComplements,
    primaryRisks,
    openQuestions,
    humanMeetingRecommendation: confidenceLevel !== "low" && primaryRisks.length < 4,
    trialProjectRecommendation: Boolean(trialProjectSuggestion),
    trialProjectSuggestion,
    confidenceLevel,
  };
}
