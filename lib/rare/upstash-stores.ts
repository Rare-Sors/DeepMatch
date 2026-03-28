import { Redis } from "@upstash/redis";
import type {
  AuthChallenge,
  ChallengeStore,
  PlatformSession,
  ReplayStore,
  SessionStore,
} from "@rare-id/platform-kit-web";

import { env } from "@/lib/env";

function getRedis() {
  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function ttlFromEpoch(expiresAt: number) {
  const seconds = Math.max(1, expiresAt - Math.floor(Date.now() / 1000));
  return seconds;
}

export class UpstashChallengeStore implements ChallengeStore {
  async set(challenge: AuthChallenge): Promise<void> {
    const redis = getRedis();
    await redis.set(`rare:challenge:${challenge.nonce}`, challenge, {
      ex: ttlFromEpoch(challenge.expiresAt),
    });
  }

  async consume(nonce: string): Promise<AuthChallenge | null> {
    const redis = getRedis();
    const key = `rare:challenge:${nonce}`;
    const challenge = await redis.get<AuthChallenge>(key);
    if (!challenge) {
      return null;
    }

    await redis.del(key);
    return challenge;
  }
}

export class UpstashReplayStore implements ReplayStore {
  async claim(key: string, expiresAt: number): Promise<boolean> {
    const redis = getRedis();
    const result = await redis.set(`rare:replay:${key}`, "1", {
      nx: true,
      ex: ttlFromEpoch(expiresAt),
    });

    return result === "OK";
  }
}

export class UpstashSessionStore implements SessionStore {
  async save(session: PlatformSession): Promise<void> {
    const redis = getRedis();
    await redis.set(`rare:session:${session.sessionToken}`, session, {
      ex: ttlFromEpoch(session.expiresAt),
    });
  }

  async get(sessionToken: string): Promise<PlatformSession | null> {
    const redis = getRedis();
    return (await redis.get<PlatformSession>(`rare:session:${sessionToken}`)) ?? null;
  }
}
