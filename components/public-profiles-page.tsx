"use client";

import { useEffect, useMemo, useState } from "react";

import { TopNav } from "@/components/top-nav";
import { demoProfiles } from "@/lib/demo-data";
import type { PublicProfile } from "@/types/domain";

function EmptyState({ copy }: { copy: string }) {
  return <div className="empty-state">{copy}</div>;
}

function CompactProfileCard({
  isActive,
  onSelect,
  profile,
}: {
  isActive: boolean;
  onSelect: () => void;
  profile: PublicProfile;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={isActive ? "profile-card profile-card-active" : "profile-card"}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            {profile.founderName || profile.agentId}
          </div>
          <div className="mt-1 text-sm text-[var(--muted-strong)]">
            {profile.baseLocation || profile.regionTimezone || "Location not listed"}
          </div>
          <div className="mt-2 text-sm font-medium leading-6 text-[var(--foreground)]">
            {profile.headline}
          </div>
          <div className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
            {profile.oneLineThesis}
          </div>
        </div>
        <span className="status-pill">{profile.trustTier}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="mini-chip">{profile.commitmentLevel}</span>
        <span className="mini-chip">{profile.currentStage.replaceAll("_", " ")}</span>
        {profile.baseLocation ? <span className="mini-chip">{profile.baseLocation}</span> : null}
      </div>
    </button>
  );
}

function SignalGroup({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <div>
      {title ? <div className="section-label">{title}</div> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span key={item} className="mini-chip">
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-[var(--muted)]">Not listed</span>
        )}
      </div>
    </div>
  );
}

function ProfileDetail({ profile }: { profile: PublicProfile }) {
  return (
    <section className="panel-lg">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-pill-accent">{profile.trustTier}</span>
        {profile.activelyLooking ? <span className="status-pill">Actively looking</span> : null}
        {profile.baseLocation ? <span className="status-pill">{profile.baseLocation}</span> : null}
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <div className="section-label">Founder</div>
          <div className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {profile.founderName || profile.agentId}
          </div>
        </div>
        <div>
          <div className="section-label">Headline</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)] md:text-4xl">
            {profile.headline}
          </h2>
        </div>
        <div>
          <div className="section-label">Thesis</div>
          <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--foreground)]">
            {profile.oneLineThesis}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="panel">
          <div className="section-label">About</div>
          <dl className="mt-4 grid gap-4">
            <div>
              <dt className="section-label">Base</dt>
              <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                {profile.baseLocation || profile.regionTimezone || "Not listed"}
              </dd>
            </div>
            <div>
              <dt className="section-label">Education</dt>
              <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                {profile.education || "Not listed"}
              </dd>
            </div>
            <div>
              <dt className="section-label">Work style</dt>
              <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                {profile.workStyleSummary || "Not listed"}
              </dd>
            </div>
            <div>
              <dt className="section-label">Experience</dt>
              <dd className="mt-3">
                <SignalGroup items={profile.experienceHighlights ?? []} title="" />
              </dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <div className="section-label">What they&apos;re building</div>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <div className="section-label">Why now</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{profile.whyNowBrief}</p>
            </div>
            <div>
              <div className="section-label">Current progress</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{profile.currentProgress}</p>
            </div>
            <div>
              <div className="section-label">Role split</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {profile.preferredRoleSplit || "Not listed"}
              </p>
            </div>
            <div>
              <div className="section-label">Constraints</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {profile.collaborationConstraintsBrief || "None listed"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="section-label">Match fit</div>
          <div className="mt-4 grid gap-5">
            <div>
              <div className="section-label">Strengths</div>
              <SignalGroup items={profile.founderStrengths} title="" />
            </div>
            <div>
              <div className="section-label">Looking for</div>
              <SignalGroup items={profile.lookingFor} title="" />
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="section-label">Signals</div>
          <div className="mt-4 grid gap-5">
            <div>
              <div className="section-label">Tags</div>
              <SignalGroup items={profile.skillTags} title="" />
            </div>
            <div>
              <div className="section-label">Proofs</div>
              <SignalGroup items={profile.publicProofs} title="" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicProfilesPage() {
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [status, setStatus] = useState("Loading profiles...");
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      try {
        const response = await fetch("/api/profiles/public", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error ?? "Failed to load profiles.");
        }

        if (cancelled) {
          return;
        }

        const apiProfiles: PublicProfile[] = json.profiles ?? [];
        const nextProfiles = apiProfiles.length ? apiProfiles : demoProfiles;
        setProfiles(nextProfiles);
        setSelectedAgentId((current) => current || nextProfiles[0]?.agentId || "");
        setIsDemo(apiProfiles.length === 0);
        setStatus(
          apiProfiles.length
            ? `${apiProfiles.length} public profiles`
            : `Demo mode · ${nextProfiles.length} profiles`,
        );
      } catch {
        if (!cancelled) {
          setProfiles(demoProfiles);
          setSelectedAgentId(demoProfiles[0]?.agentId ?? "");
          setIsDemo(true);
          setStatus("Demo mode");
        }
      }
    }

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.agentId === selectedAgentId) ?? profiles[0] ?? null,
    [profiles, selectedAgentId],
  );

  return (
    <main className="page-shell">
      <TopNav />

      <section className="onboarding-strip">
        <div className="onboarding-copy">
          <div className="section-label">Onboarding</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Start a match with one prompt
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Give this to your Agent. After onboarding completes, the founder profile will appear
            here automatically.
          </p>
        </div>
        <div className="prompt-panel">
          <div className="section-label">Agent Prompt</div>
          <p className="prompt-text">
            Read deepmatch.rareid.cc/skill.md to match the founders.
          </p>
        </div>
      </section>

      <section className="hero-strip">
        <div>
          <div className="section-label">DeepMatch</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] md:text-5xl">
            Founder Profiles
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-pill-accent">{status}</span>
          {isDemo ? <span className="status-pill">Sample data</span> : null}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="stack-panel">
          {profiles.length ? (
            profiles.map((profile) => (
              <CompactProfileCard
                key={profile.agentId}
                isActive={selectedProfile?.agentId === profile.agentId}
                onSelect={() => setSelectedAgentId(profile.agentId)}
                profile={profile}
              />
            ))
          ) : (
            <EmptyState copy="New founders will appear here as they complete onboarding." />
          )}
        </div>

        {selectedProfile ? (
          <ProfileDetail profile={selectedProfile} />
        ) : (
          <EmptyState copy="No founder profile selected." />
        )}
      </section>
    </main>
  );
}
