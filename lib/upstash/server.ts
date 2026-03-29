import { Redis } from "@upstash/redis";

import { env, isUpstashConfigured } from "@/lib/env";

export function getUpstashRedis() {
  if (!isUpstashConfigured()) {
    return null;
  }

  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}
