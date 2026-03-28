import { RareApiClient } from "@rare-id/platform-kit-client";
import {
  InMemoryChallengeStore,
  InMemoryReplayStore,
  InMemorySessionStore,
  createRarePlatformKit,
} from "@rare-id/platform-kit-web";

import { env, isUpstashConfigured } from "@/lib/env";
import {
  UpstashChallengeStore,
  UpstashReplayStore,
  UpstashSessionStore,
} from "@/lib/rare/upstash-stores";

declare global {
  var __deepmatchRareKit:
    | ReturnType<typeof createRarePlatformKit>
    | undefined;
}

export function getRareKit() {
  if (!globalThis.__deepmatchRareKit) {
    const rare = new RareApiClient({
      rareBaseUrl: env.RARE_API_BASE_URL,
    });

    const stores = isUpstashConfigured()
      ? {
          challengeStore: new UpstashChallengeStore(),
          replayStore: new UpstashReplayStore(),
          sessionStore: new UpstashSessionStore(),
        }
      : {
          challengeStore: new InMemoryChallengeStore(),
          replayStore: new InMemoryReplayStore(),
          sessionStore: new InMemorySessionStore(),
        };

    globalThis.__deepmatchRareKit = createRarePlatformKit({
      aud: env.RARE_PLATFORM_AUD,
      rareApiClient: rare,
      ...stores,
    });
  }

  return globalThis.__deepmatchRareKit;
}
