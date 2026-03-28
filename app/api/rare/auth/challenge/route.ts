import { issueRareChallenge } from "@/lib/rare/auth";
import { serializeRareChallenge } from "@/lib/rare/auth-complete";
import { ok, serverError } from "@/lib/http";

export async function POST() {
  try {
    const challenge = await issueRareChallenge();
    return ok(serializeRareChallenge(challenge as unknown as Record<string, unknown>));
  } catch (error) {
    return serverError("Failed to issue Rare challenge.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
