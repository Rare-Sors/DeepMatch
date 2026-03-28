import { RareApiClient } from "@rare-id/platform-kit-client";

const required = [
  "RARE_API_BASE_URL",
  "RARE_PLATFORM_AUD",
  "RARE_PLATFORM_ID",
  "RARE_PLATFORM_DOMAIN",
  "RARE_PLATFORM_CHALLENGE_ID",
  "RARE_PLATFORM_SIGNING_KID",
  "RARE_PLATFORM_SIGNING_PUBLIC_KEY_B64",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const rare = new RareApiClient({
  rareBaseUrl: process.env.RARE_API_BASE_URL,
});

const result = await rare.completePlatformRegister({
  challenge_id: process.env.RARE_PLATFORM_CHALLENGE_ID,
  platform_id: process.env.RARE_PLATFORM_ID,
  platform_aud: process.env.RARE_PLATFORM_AUD,
  domain: process.env.RARE_PLATFORM_DOMAIN,
  keys: [
    {
      kid: process.env.RARE_PLATFORM_SIGNING_KID,
      public_key: process.env.RARE_PLATFORM_SIGNING_PUBLIC_KEY_B64,
    },
  ],
});

console.log(JSON.stringify(result, null, 2));
