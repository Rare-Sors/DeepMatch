import { isProduction } from "@/lib/env";
import { forbidden, ok } from "@/lib/http";
import { deepMatchStore } from "@/lib/store";

export async function POST() {
  if (isProduction()) {
    return forbidden("Dev-only route.");
  }

  await deepMatchStore.reset();
  return ok({ reset: true });
}
