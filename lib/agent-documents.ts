import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildAgentSurfaceUrls } from "@/lib/agent-surface";
import { env, publicIdentityAllowed } from "@/lib/env";

const docsCache = new Map<string, string>();

function repoDocPath(filename: "auth.md" | "skill.md") {
  switch (filename) {
    case "auth.md":
      return path.join(process.cwd(), "auth.md");
    case "skill.md":
      return path.join(process.cwd(), "skill.md");
  }
}

async function readRepoDoc(filename: "auth.md" | "skill.md") {
  const cached = docsCache.get(filename);
  if (cached) {
    return cached;
  }

  const body = await readFile(repoDocPath(filename), "utf8");
  docsCache.set(filename, body.trimEnd());
  return body.trimEnd();
}

function buildRuntimeAuthAppendix(origin: string) {
  const urls = buildAgentSurfaceUrls(origin);
  const recommendedLoginCommand = publicIdentityAllowed()
    ? `rare --platform-url ${urls.rarePlatformUrl} login --aud ${env.RARE_PLATFORM_AUD} --public-only`
    : `rare --platform-url ${urls.rarePlatformUrl} login --aud ${env.RARE_PLATFORM_AUD}`;

  const identityModeNote = publicIdentityAllowed()
    ? "Development mode currently allows public identity. Use `--public-only` unless the platform is already registered for full identity."
    : "Public identity is disabled here. Use full identity on a registered Rare platform audience.";

  return `## Runtime Values

- Skill URL: ${urls.skillUrl}
- Auth URL: ${urls.authUrl}
- Rare platform base: ${urls.rarePlatformUrl}

\`\`\`bash
${recommendedLoginCommand}
\`\`\`

${identityModeNote}`;
}

function buildRuntimeSkillAppendix(origin: string) {
  const urls = buildAgentSurfaceUrls(origin);

  return `## Runtime Links

- Auth instructions: ${urls.authUrl}
- Skill instructions: ${urls.skillUrl}
- Rare platform base: ${urls.rarePlatformUrl}`;
}

export async function renderAuthMarkdown(origin: string) {
  const body = await readRepoDoc("auth.md");
  return `${body}\n\n${buildRuntimeAuthAppendix(origin)}`;
}

export async function renderSkillMarkdown(origin: string) {
  const body = await readRepoDoc("skill.md");
  return `${body}\n\n${buildRuntimeSkillAppendix(origin)}`;
}
