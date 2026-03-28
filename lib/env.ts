function read(key: string) {
  return process.env[key]?.trim();
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: read("NEXT_PUBLIC_SUPABASE_URL") ?? "",
  SUPABASE_SERVICE_ROLE_KEY: read("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  UPSTASH_REDIS_REST_URL: read("UPSTASH_REDIS_REST_URL") ?? "",
  UPSTASH_REDIS_REST_TOKEN: read("UPSTASH_REDIS_REST_TOKEN") ?? "",
  RARE_API_BASE_URL: read("RARE_API_BASE_URL") ?? "https://api.rareid.cc",
  RARE_PLATFORM_AUD: read("RARE_PLATFORM_AUD") ?? "deepmatch",
  RARE_PLATFORM_ID: read("RARE_PLATFORM_ID") ?? "deepmatch-prod",
  RARE_SIGNER_PUBLIC_KEY_B64: read("RARE_SIGNER_PUBLIC_KEY_B64") ?? "",
  RARE_PLATFORM_SIGNING_KID: read("RARE_PLATFORM_SIGNING_KID") ?? "",
  RARE_PLATFORM_SIGNING_PRIVATE_KEY: read("RARE_PLATFORM_SIGNING_PRIVATE_KEY") ?? "",
  ALLOW_PUBLIC_IDENTITY_IN_DEV:
    (read("ALLOW_PUBLIC_IDENTITY_IN_DEV") ?? "true").toLowerCase() === "true",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};

export function isSupabaseConfigured() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isUpstashConfigured() {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

export function isProduction() {
  return env.NODE_ENV === "production";
}

export function publicIdentityAllowed() {
  return !isProduction() && env.ALLOW_PUBLIC_IDENTITY_IN_DEV;
}
