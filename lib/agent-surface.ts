export interface AgentSurfaceUrls {
  skillUrl: string;
  authUrl: string;
  rarePlatformUrl: string;
}

export function buildAgentSurfaceUrls(origin: string): AgentSurfaceUrls {
  const baseOrigin = origin.replace(/\/$/, "");

  return {
    skillUrl: `${baseOrigin}/skill.md`,
    authUrl: `${baseOrigin}/auth.md`,
    rarePlatformUrl: `${baseOrigin}/api/rare`,
  };
}
