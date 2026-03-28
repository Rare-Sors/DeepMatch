import { issueRareChallenge } from "@/lib/rare/auth";
import { ok, serverError } from "@/lib/http";

export async function POST() {
  try {
    const challenge = await issueRareChallenge();
    return ok({ challenge });
  } catch (error) {
    return serverError("Failed to issue Rare challenge.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
