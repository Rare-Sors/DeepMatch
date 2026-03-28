import type { MatchRecord, MatchRequest, MatchRequestStatus, MatchingNextStep } from "@/types/domain";

export function isPositiveRequest(status: MatchRequestStatus) {
  return status === "pending" || status === "accepted";
}

export function shouldCreateMutualMatch(
  request: Pick<MatchRequest, "status">,
  reverseRequest?: Pick<MatchRequest, "status">,
) {
  return isPositiveRequest(request.status) && isPositiveRequest(reverseRequest?.status ?? "expired");
}

export function getSuggestedMatchingNextStep(args: {
  incomingRequests: Pick<MatchRequest, "status">[];
  matches: Pick<MatchRecord, "matchStatus">[];
}): {
  step: MatchingNextStep;
  reason: string;
} {
  const hasPendingIncoming = args.incomingRequests.some((request) => request.status === "pending");
  if (hasPendingIncoming) {
    return {
      step: "review_inbox",
      reason:
        "Review incoming match requests first so the agent resolves existing intent before scanning for new founders.",
    };
  }

  const hasLiveMatch = args.matches.some(
    (match) => match.matchStatus === "active" || match.matchStatus === "handoff_ready",
  );
  if (hasLiveMatch) {
    return {
      step: "start_pre_communication",
      reason:
        "A mutual match already exists, so the next step is structured pre-communication rather than sending more cold requests.",
    };
  }

  return {
    step: "scan_profiles",
    reason:
      "No pending inbox work is blocking the agent, so it can now scan public founder profiles and initiate a targeted match request.",
  };
}
