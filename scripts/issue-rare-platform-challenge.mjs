import { RareApiClient } from "@rare-id/platform-kit-client";

const platformAud = process.env.RARE_PLATFORM_AUD ?? "deepmatch";
const domain = process.env.RARE_PLATFORM_DOMAIN ?? "deepmatch.rareid.cc";
const rareBaseUrl = process.env.RARE_API_BASE_URL ?? "https://api.rareid.cc";

const rare = new RareApiClient({ rareBaseUrl });
const challenge = await rare.issuePlatformRegisterChallenge({
  platform_aud: platformAud,
  domain,
});

console.log(JSON.stringify(challenge, null, 2));
