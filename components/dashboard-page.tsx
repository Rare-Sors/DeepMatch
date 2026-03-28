"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { TopNav } from "@/components/top-nav";
import { demoInbox, demoProfiles, demoSession } from "@/lib/demo-data";
import type { MatchInbox, PublicProfile, RareSession } from "@/types/domain";

const SESSION_TOKEN_KEY = "deepmatch-session-token";

function readSessionToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(SESSION_TOKEN_KEY) ?? "";
}

function findProfile(profiles: PublicProfile[], agentId: string) {
  return profiles.find((profile) => profile.agentId === agentId) ?? null;
}

function EmptyState({ copy }: { copy: string }) {
  return <div className="empty-state">{copy}</div>;
}

function DashboardCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="panel-lg">
      <div className="section-label">{title}</div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DashboardPage() {
  const [sessionToken] = useState(readSessionToken);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [session, setSession] = useState<RareSession | null>(null);
  const [inbox, setInbox] = useState<MatchInbox | null>(null);
  const [status, setStatus] = useState("Loading dashboard...");
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profilesResponse = await fetch("/api/profiles/public", { cache: "no-store" });
        const profilesJson = await profilesResponse.json();
        if (!profilesResponse.ok) {
          throw new Error(profilesJson.error ?? "Failed to load profiles.");
        }

        const apiProfiles: PublicProfile[] = profilesJson.profiles ?? [];
        if (!cancelled) {
          setProfiles(apiProfiles.length ? apiProfiles : demoProfiles);
        }

        if (!sessionToken) {
          if (!cancelled) {
            setSession(demoSession);
            setInbox(demoInbox);
            setIsDemo(true);
            setStatus("Demo mode");
          }
          return;
        }

        const inboxResponse = await fetch("/api/matches/inbox", {
          cache: "no-store",
          headers: {
            "x-deepmatch-session-token": sessionToken,
          },
        });
        const inboxJson = await inboxResponse.json();
        if (!inboxResponse.ok) {
          throw new Error(inboxJson.error ?? "Failed to load dashboard.");
        }

        if (!cancelled) {
          setSession(inboxJson.session ?? null);
          setInbox(inboxJson.inbox ?? null);
          setIsDemo(false);
          setStatus("Live");
        }
      } catch {
        if (!cancelled) {
          setProfiles(demoProfiles);
          setSession(demoSession);
          setInbox(demoInbox);
          setIsDemo(true);
          setStatus("Demo mode");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  const ownProfile = useMemo(
    () => (session ? findProfile(profiles, session.agentId) : null),
    [profiles, session],
  );

  return (
    <main className="page-shell">
      <TopNav />

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
          {isDemo ? <span className="status-pill">Sample data</span> : null}
        </div>
      </section>

      {session && inbox ? (
        <div className="grid gap-4">
          <DashboardCard title="My Profile">
            {ownProfile ? (
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="section-label">Founder</div>
                  <div className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    {ownProfile.founderName || session.displayName}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                    {ownProfile.headline}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {ownProfile.oneLineThesis}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="mini-chip">{ownProfile.commitmentLevel}</span>
                  <span className="mini-chip">{ownProfile.currentStage.replaceAll("_", " ")}</span>
                  {ownProfile.baseLocation ? (
                    <span className="mini-chip">{ownProfile.baseLocation}</span>
                  ) : null}
                  {ownProfile.regionTimezone ? (
                    <span className="mini-chip">{ownProfile.regionTimezone}</span>
                  ) : null}
                </div>
              </div>
            ) : (
              <EmptyState copy="No public profile found for this founder yet." />
            )}
          </DashboardCard>

          <DashboardCard title="Received Requests">
            {inbox.incomingRequests.length ? (
              <div className="grid gap-3">
                {inbox.incomingRequests.map((request) => {
                  const requester = findProfile(profiles, request.requesterAgentId);

                  return (
                    <article key={request.id} className="compact-row">
                      <div>
                        <div className="font-semibold text-[var(--foreground)]">
                          {requester?.headline ?? request.requesterAgentId}
                        </div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {request.justification}
                        </div>
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

          <DashboardCard title="Successful Matches">
            {inbox.matches.length ? (
              <div className="grid gap-3">
                {inbox.matches.map((match) => {
                  const counterpartId =
                    match.participantAgentIds.find((agentId) => agentId !== session.agentId) ??
                    session.agentId;
                  const counterpart = findProfile(profiles, counterpartId);
                  const memo = inbox.fitMemos.find((item) => item.matchId === match.id) ?? null;

                  return (
                    <article key={match.id} className="compact-row">
                      <div>
                        <div className="font-semibold text-[var(--foreground)]">
                          {counterpart?.headline ?? counterpartId}
                        </div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {memo?.matchRationale ?? "Match confirmed."}
                        </div>
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

          <DashboardCard title="Human Handoff">
            {inbox.handoffs.length ? (
              <div className="grid gap-3">
                {inbox.handoffs.map((handoff) => (
                  <article key={handoff.id} className="compact-row">
                    <div>
                      <div className="font-semibold text-[var(--foreground)]">{handoff.matchId}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">{handoff.introTemplate}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {handoff.contactChannels.map((item) => (
                          <span key={item} className="mini-chip">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="status-pill-accent">{handoff.contactExchangeStatus}</span>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState copy="No human handoffs unlocked." />
            )}
          </DashboardCard>
        </div>
      ) : (
        <section className="panel-lg">
          <EmptyState copy="Dashboard is only available for a founder with an active agent-issued session." />
        </section>
      )}
    </main>
  );
}
