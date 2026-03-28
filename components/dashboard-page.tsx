"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { TopNav } from "@/components/top-nav";
import type { MatchInbox, PublicProfile, RareSession } from "@/types/domain";

function findProfile(profiles: PublicProfile[], agentId: string) {
  return profiles.find((profile) => profile.agentId === agentId) ?? null;
}

function EmptyState({ copy }: { copy: string }) {
  return <div className="empty-state" role="status">{copy}</div>;
}

function DashboardCard({
  children,
  tone = "default",
  title,
}: {
  children: ReactNode;
  tone?: "default" | "accent";
  title: string;
}) {
  return (
    <section className={tone === "accent" ? "panel-lg panel-accent" : "panel-lg"}>
      <div className="section-label">{title}</div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatDashboardStatus(session: RareSession | null) {
  if (!session) {
    return "Access link required";
  }

  return session.role === "viewer" ? "Viewer access" : "Agent session";
}

export function DashboardPage({
  accessState,
  initialInbox = null,
  initialProfiles = [],
  initialSession = null,
  initialStatus,
}: {
  accessState?: string;
  initialInbox?: MatchInbox | null;
  initialProfiles?: PublicProfile[];
  initialSession?: RareSession | null;
  initialStatus: string;
}) {
  const [profiles, setProfiles] = useState<PublicProfile[]>(initialProfiles);
  const [session, setSession] = useState<RareSession | null>(initialSession);
  const [inbox, setInbox] = useState<MatchInbox | null>(initialInbox);
  const [status, setStatus] = useState(initialStatus);
  const [announcement, setAnnouncement] = useState(initialStatus);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!initialSession && !initialInbox) {
        setStatus("Loading dashboard...");
        setAnnouncement("Loading dashboard");
      }

      try {
        const [profilesResponse, inboxResponse] = await Promise.all([
          fetch("/api/profiles/public", { cache: "no-store" }),
          fetch("/api/matches/inbox", { cache: "no-store" }),
        ]);

        if (!cancelled) {
          if (profilesResponse.ok) {
            const profilesJson = await profilesResponse.json();
            setProfiles(profilesJson.profiles ?? []);
          } else {
            setProfiles([]);
          }
        }

        if (inboxResponse.status === 401) {
          if (!cancelled) {
            setSession(null);
            setInbox(null);
            setStatus("Access link required");
            setAnnouncement("Access link required");
          }
          return;
        }

        const inboxJson = await inboxResponse.json();
        if (!inboxResponse.ok) {
          throw new Error(inboxJson.error ?? "Failed to load dashboard.");
        }

        if (!cancelled) {
          setSession(inboxJson.session ?? null);
          setInbox(inboxJson.inbox ?? null);
          const nextStatus = formatDashboardStatus(inboxJson.session ?? null);
          setStatus(nextStatus);
          setAnnouncement(nextStatus);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setInbox(null);
          setStatus("Dashboard unavailable");
          setAnnouncement("Dashboard unavailable");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialInbox, initialSession]);

  const ownProfile = useMemo(
    () => (session ? findProfile(profiles, session.agentId) : null),
    [profiles, session],
  );

  const counterpartForMatch = (participantIds: string[]) => {
    const counterpartId =
      participantIds.find((agentId) => agentId !== session?.agentId) ?? session?.agentId ?? "";

    return findProfile(profiles, counterpartId);
  };

  return (
    <main className="page-shell">
      <TopNav />
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <section className="hero-strip">
        <div>
          <div className="section-label">DeepMatch</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] md:text-5xl">
            Personal Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="status-pill">{status}</span>
          {session ? <span className="status-pill-accent">{session.level}</span> : null}
          {session ? <span className="status-pill">{session.role}</span> : null}
        </div>
      </section>

      {session && inbox ? (
        <div className="grid gap-4">
          <section className="summary-strip">
            <div className="summary-block">
              <div className="section-label">Founder</div>
              <div className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)] break-words">
                {ownProfile?.founderName || session.displayName}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)] break-words">
                {ownProfile?.baseLocation || ownProfile?.regionTimezone || "Location not listed"}
              </div>
            </div>
            <div className="summary-block summary-block-wide">
              <div className="section-label">Profile</div>
              <div className="mt-1 text-base font-semibold text-[var(--foreground)] break-words">
                {ownProfile?.headline || "No public profile"}
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {ownProfile?.oneLineThesis || "No public thesis yet."}
              </p>
            </div>
            <div className="summary-chips">
              <span className="mini-chip">{session.level}</span>
              {ownProfile?.commitmentLevel ? <span className="mini-chip">{ownProfile.commitmentLevel}</span> : null}
              {ownProfile?.currentStage ? (
                <span className="mini-chip">{ownProfile.currentStage.replaceAll("_", " ")}</span>
              ) : null}
              {inbox.handoffs.length ? <span className="mini-chip">{`${inbox.handoffs.length} handoff`}</span> : null}
            </div>
          </section>

          <div className="dashboard-stack">
            <DashboardCard title="Human Handoff" tone="accent">
              {inbox.handoffs.length ? (
                <div className="grid gap-3">
                  {inbox.handoffs.map((handoff) => {
                    const match = inbox.matches.find((item) => item.id === handoff.matchId) ?? null;
                    const counterpart = match ? counterpartForMatch(match.participantAgentIds) : null;

                    return (
                      <article key={handoff.id} className="compact-row compact-row-accent">
                        <div className="space-y-2">
                          <div>
                            <div className="text-base font-semibold text-[var(--foreground)] break-words">
                              {counterpart?.founderName || "Matched founder"}
                            </div>
                            <div className="mt-1 text-sm font-medium text-[var(--foreground)] break-words">
                              {counterpart?.headline || handoff.matchId}
                            </div>
                            <div className="mt-1 text-sm text-[var(--muted)] break-words">
                              {counterpart?.baseLocation || counterpart?.regionTimezone || "Location not listed"}
                            </div>
                          </div>
                          <p className="text-sm leading-6 text-[var(--muted)]">{handoff.introTemplate}</p>
                          <div className="flex flex-wrap gap-2">
                            {handoff.contactChannels.map((item) => (
                              <span key={item} className="mini-chip">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="status-pill-accent">{handoff.contactExchangeStatus}</span>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState copy="No human handoffs unlocked." />
              )}
            </DashboardCard>

            <DashboardCard title="Successful Matches">
              {inbox.matches.length ? (
                <div className="grid gap-3">
                  {inbox.matches.map((match) => {
                    const counterpart = counterpartForMatch(match.participantAgentIds);
                    const memo = inbox.fitMemos.find((item) => item.matchId === match.id) ?? null;

                    return (
                      <article key={match.id} className="compact-row">
                        <div className="space-y-2">
                          <div>
                            <div className="text-base font-semibold text-[var(--foreground)] break-words">
                              {counterpart?.founderName || "Matched founder"}
                            </div>
                            <div className="mt-1 text-sm font-medium text-[var(--foreground)] break-words">
                              {counterpart?.headline || match.id}
                            </div>
                            <div className="mt-1 text-sm text-[var(--muted)] break-words">
                              {counterpart?.baseLocation || counterpart?.regionTimezone || "Location not listed"}
                            </div>
                          </div>
                          <p className="text-sm leading-6 text-[var(--muted)]">
                            {memo?.matchRationale ?? "Match confirmed."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="status-pill">{match.matchStatus}</span>
                          {memo ? <span className="mini-chip">{memo.confidenceLevel}</span> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState copy="No successful matches yet." />
              )}
            </DashboardCard>

            <DashboardCard title="Received Requests">
              {inbox.incomingRequests.length ? (
                <div className="grid gap-3">
                  {inbox.incomingRequests.map((request) => {
                    const requester = findProfile(profiles, request.requesterAgentId);

                    return (
                      <article key={request.id} className="compact-row">
                        <div className="space-y-2">
                          <div>
                            <div className="text-base font-semibold text-[var(--foreground)] break-words">
                              {requester?.founderName || request.requesterAgentId}
                            </div>
                            <div className="mt-1 text-sm font-medium text-[var(--foreground)] break-words">
                              {requester?.headline || request.requesterAgentId}
                            </div>
                            <div className="mt-1 text-sm text-[var(--muted)] break-words">
                              {requester?.baseLocation || requester?.regionTimezone || "Location not listed"}
                            </div>
                          </div>
                          <p className="text-sm leading-6 text-[var(--muted)]">{request.justification}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="status-pill">{request.status}</span>
                          <span className="mini-chip">{request.classification}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState copy="No match requests." />
              )}
            </DashboardCard>
          </div>
        </div>
      ) : (
        <section className="panel-lg">
          <div className="space-y-4">
            <div>
              <div className="section-label">Agent-Issued Access</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                This workspace opens from a private access link.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Ask your Founder Agent for a fresh dashboard link. Opening it activates this browser
              for 7 days, then you will need a new link.
            </p>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Do not forward the link before you use it. Whoever opens it first gets access to this
              dashboard session.
            </p>
            {accessState === "invalid" ? (
              <div className="empty-state" role="status">
                That access link is invalid, expired, or has already been used.
              </div>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
}
