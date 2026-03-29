import { deepMatchStore } from "@/lib/store";
import { ok } from "@/lib/http";

export async function GET() {
  return ok({
    profiles: await deepMatchStore.listPublicProfiles(),
  });
}
