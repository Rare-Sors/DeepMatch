import { deepMatchStore } from "@/lib/store";
import { notFound, ok } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await context.params;
  const profile = await deepMatchStore.getPublicProfile(agentId);

  if (!profile) {
    return notFound("Public profile not found.");
  }

  return ok({ profile });
}
