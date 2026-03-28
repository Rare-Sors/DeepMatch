"use client";

import type { ReactNode } from "react";
import { startTransition, useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  FileText,
  Handshake,
  KeyRound,
  MessagesSquare,
  Search,
  ShieldCheck,
} from "lucide-react";

import type {
  MatchInbox,
  PreCommunicationMessageType,
  PreCommunicationTopic,
  PublicProfile,
  RareSession,
} from "@/types/domain";

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="glass-card fade-rise rounded-[28px] p-6 md:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            {icon}
            {title}
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  const className =
    "w-full rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      {textarea ? (
        <textarea
          className={`${className} min-h-28 resize-y`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={className}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

const blankProfileDraft = {
  headline: "",
  oneLineThesis: "",
  whyNowBrief: "",
  currentStage: "idea",
  currentProgress: "",
  commitmentLevel: "full-time",
  activelyLooking: true,
  founderStrengths: "",
  lookingFor: "",
  preferredRoleSplit: "",
  skillTags: "",
  workStyleSummary: "",
  regionTimezone: "",
  collaborationConstraintsBrief: "",
  publicProofs: "",
  fullProblemStatement: "",
  currentHypothesis: "",
  ideaRigidity: "",
  whyMe: "",
  executionHistory: "",
  proofDetails: "",
  currentAvailabilityDetails: "",
  roleExpectation: "",
  decisionStyle: "",
  communicationStyle: "",
  valuesAndNonNegotiables: "",
  riskPreference: "",
  equityAndStructureExpectation: "",
  openQuestionsForMatch: "",
  redFlagChecks: "",
  collaborationTrialPreference: "",
  agentAuthorityScope: "",
  disclosureGuardrails: "",
};

export function DeepMatchDashboard() {
  const [sessionToken, setSessionToken] = useState(
    () => (typeof window !== "undefined" ? window.localStorage.getItem("deepmatch-session-token") ?? "" : ""),
  );
  const [challenge, setChallenge] = useState("");
  const [authPayload, setAuthPayload] = useState(
    JSON.stringify(
      {
        nonce: "",
        agentId: "",
        sessionPubkey: "",
        delegationToken: "",
        signatureBySession: "",
        publicIdentityAttestation: "",
        fullIdentityAttestation: "",
      },
      null,
      2,
    ),
  );
  const [session, setSession] = useState<RareSession | null>(null);
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [inbox, setInbox] = useState<MatchInbox | null>(null);
  const [status, setStatus] = useState("Ready");
  const [profileDraft, setProfileDraft] = useState(blankProfileDraft);
  const [matchTarget, setMatchTarget] = useState("");
  const [matchJustification, setMatchJustification] = useState("");
  const [matchAttractivePoints, setMatchAttractivePoints] = useState("");
  const [matchComplement, setMatchComplement] = useState("");
  const [matchClassification, setMatchClassification] = useState("strong fit");
  const [preCommMatchId, setPreCommMatchId] = useState("");
  const [preCommTopic, setPreCommTopic] = useState<PreCommunicationTopic>("direction");
  const [preCommMessageType, setPreCommMessageType] =
    useState<PreCommunicationMessageType>("prompt");
  const [preCommContent, setPreCommContent] = useState("");

  async function fetchJson(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (sessionToken) {
      headers.set("x-deepmatch-session-token", sessionToken);
    }
    if (!headers.has("content-type") && init?.body) {
      headers.set("content-type", "application/json");
    }

    const response = await fetch(path, {
      ...init,
      headers,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Request failed");
    }

    return data;
  }

  async function refreshProfiles() {
    const data = await fetchJson("/api/profiles/public");
    setProfiles(data.profiles);
  }

  async function refreshInbox(token = sessionToken) {
    if (!token) {
      return;
    }

    const data = await fetch("/api/matches/inbox", {
      headers: {
        "x-deepmatch-session-token": token,
      },
    }).then(async (response) => {
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load inbox");
      }

      return json;
    });

    setSession(data.session);
    setInbox(data.inbox);
  }

  useEffect(() => {
    let cancelled = false;

    startTransition(() => {
      void (async () => {
        const profilesResponse = await fetch("/api/profiles/public");
        const profilesJson = await profilesResponse.json();
        if (!profilesResponse.ok) {
          if (!cancelled) {
            setStatus(profilesJson.error ?? "Failed to load profiles.");
          }
          return;
        }

        if (!cancelled) {
          setProfiles(profilesJson.profiles);
        }

        if (!sessionToken) {
          return;
        }

        const inboxResponse = await fetch("/api/matches/inbox", {
          headers: {
            "x-deepmatch-session-token": sessionToken,
          },
        });
        const inboxJson = await inboxResponse.json();
        if (!inboxResponse.ok) {
          if (!cancelled) {
            setStatus(inboxJson.error ?? "Failed to load inbox.");
          }
          return;
        }

        if (!cancelled) {
          setSession(inboxJson.session);
          setInbox(inboxJson.inbox);
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  async function handleIssueChallenge() {
    setStatus("Issuing Rare challenge...");
    try {
      const data = await fetchJson("/api/rare/auth/challenge", { method: "POST" });
      setChallenge(JSON.stringify(data.challenge, null, 2));
      setStatus("Challenge issued. Complete the auth payload with Rare CLI output.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to issue challenge.");
    }
  }

  async function handleCompleteAuth() {
    setStatus("Completing Rare auth...");
    try {
      const payload = JSON.parse(authPayload);
      const data = await fetchJson("/api/rare/auth/complete", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      window.localStorage.setItem("deepmatch-session-token", data.session.sessionToken);
      setSessionToken(data.session.sessionToken);
      setSession(data.session);
      setStatus(`Authenticated as ${data.session.displayName} (${data.session.level}).`);
      await refreshInbox(data.session.sessionToken);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Rare auth failed.");
    }
  }

  async function handleSaveProfile() {
    setStatus("Saving public and detail profiles...");
    try {
      await fetchJson("/api/profiles/upsert", {
        method: "POST",
        body: JSON.stringify({
          publicProfile: {
            headline: profileDraft.headline,
            oneLineThesis: profileDraft.oneLineThesis,
            whyNowBrief: profileDraft.whyNowBrief,
            currentStage: profileDraft.currentStage,
            currentProgress: profileDraft.currentProgress,
            commitmentLevel: profileDraft.commitmentLevel,
            activelyLooking: profileDraft.activelyLooking,
            founderStrengths: splitLines(profileDraft.founderStrengths),
            lookingFor: splitLines(profileDraft.lookingFor),
            preferredRoleSplit: profileDraft.preferredRoleSplit,
            skillTags: splitLines(profileDraft.skillTags),
            workStyleSummary: profileDraft.workStyleSummary,
            regionTimezone: profileDraft.regionTimezone,
            collaborationConstraintsBrief: profileDraft.collaborationConstraintsBrief,
            publicProofs: splitLines(profileDraft.publicProofs),
          },
          detailProfile: {
            fullProblemStatement: profileDraft.fullProblemStatement,
            currentHypothesis: profileDraft.currentHypothesis,
            ideaRigidity: profileDraft.ideaRigidity,
            whyMe: profileDraft.whyMe,
            executionHistory: profileDraft.executionHistory,
            proofDetails: splitLines(profileDraft.proofDetails),
            currentAvailabilityDetails: profileDraft.currentAvailabilityDetails,
            roleExpectation: profileDraft.roleExpectation,
            decisionStyle: profileDraft.decisionStyle,
            communicationStyle: profileDraft.communicationStyle,
            valuesAndNonNegotiables: splitLines(profileDraft.valuesAndNonNegotiables),
            riskPreference: profileDraft.riskPreference,
            equityAndStructureExpectation: profileDraft.equityAndStructureExpectation,
            openQuestionsForMatch: splitLines(profileDraft.openQuestionsForMatch),
            redFlagChecks: splitLines(profileDraft.redFlagChecks),
            collaborationTrialPreference: profileDraft.collaborationTrialPreference,
            agentAuthorityScope: splitLines(profileDraft.agentAuthorityScope),
            disclosureGuardrails: splitLines(profileDraft.disclosureGuardrails),
          },
        }),
      });

      await refreshProfiles();
      await refreshInbox();
      setStatus("Profiles saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save profile.");
    }
  }

  async function handleCreateMatchRequest() {
    setStatus("Sending match request...");
    try {
      await fetchJson("/api/match-requests", {
        method: "POST",
        body: JSON.stringify({
          targetAgentId: matchTarget,
          justification: matchJustification,
          attractivePoints: splitLines(matchAttractivePoints),
          complementSummary: matchComplement,
          classification: matchClassification,
        }),
      });

      await refreshInbox();
      setStatus("Match request sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to send match request.");
    }
  }

  async function respondToMatchRequest(id: string, accept: boolean) {
    setStatus(accept ? "Accepting match..." : "Declining match...");
    try {
      await fetchJson(`/api/match-requests/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({ accept }),
      });
      await refreshInbox();
      setStatus(accept ? "Match accepted." : "Match declined.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to update match request.");
    }
  }

  async function handlePreCommMessage() {
    setStatus("Saving pre-communication message...");
    try {
      await fetchJson(`/api/pre-communications/${preCommMatchId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          topic: preCommTopic,
          messageType: preCommMessageType,
          content: preCommContent,
        }),
      });
      setPreCommContent("");
      await refreshInbox();
      setStatus("Pre-communication updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save pre-communication.");
    }
  }

  async function generateFitMemo(matchId: string) {
    setStatus("Generating fit memo...");
    try {
      await fetchJson(`/api/fit-memos/${matchId}/generate`, {
        method: "POST",
      });
      await refreshInbox();
      setStatus("Fit memo generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to generate fit memo.");
    }
  }

  async function unlockHandoff(matchId: string) {
    setStatus("Unlocking handoff...");
    try {
      await fetchJson(`/api/handoffs/${matchId}/unlock`, {
        method: "POST",
      });
      await refreshInbox();
      setStatus("Handoff unlocked.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to unlock handoff.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <section className="glass-card fade-rise overflow-hidden rounded-[32px] p-6 md:p-8">
        <div className="section-grid items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              RareID + Founder Agent Workflow
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)] md:text-6xl">
                DeepMatch turns founder matching into an agent-operated diligence workflow.
              </h1>
              <p className="max-w-3xl text-base leading-7 text-[var(--muted)] md:text-lg">
                Run Rare-authenticated founder intake, review the inbox first, scan layered public
                profiles second, trigger mutual match state, carry out structured pre-communication,
                and unlock human handoff only when the signal is strong enough.
              </p>
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-3">
              {[
                "L0 creates profiles and browses public founder cards.",
                "L1 reviews inbox requests first, then initiates new match requests when needed.",
                "L2 keeps the same workflow plus higher priority and quota.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--line)] bg-white/55 px-4 py-3 text-[var(--muted)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 rounded-[28px] bg-[linear-gradient(180deg,rgba(12,143,93,0.14),rgba(255,255,255,0.7))] p-5">
            {[
              ["Intake", "Collect high-signal founder data through structured layers."],
              ["Profiles", "Persist public and detail schemas with trust-aware visibility."],
              ["Inbox First", "Resolve incoming requests before scanning the profile pool."],
              ["Mutual Match", "Promote only bidirectional positive intent into a live match."],
              ["Pre-Comm", "Unlock semi-structured dialogue only after mutual match."],
              ["Handoff", "Unlock contact exchange only after a positive fit memo."],
            ].map(([title, copy]) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3"
              >
                <div className="font-medium text-[var(--foreground)]">{title}</div>
                <div className="mt-1 text-sm leading-6 text-[var(--muted)]">{copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-grid">
        <Section
          icon={<KeyRound className="h-3.5 w-3.5" />}
          title="RareID Auth"
          subtitle="Issue a challenge, complete the Rare callback payload, and persist the session token for the dashboard and agent APIs."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
                  onClick={handleIssueChallenge}
                >
                  Issue challenge
                </button>
                <div className="font-mono text-xs text-[var(--muted)]">
                  Current session token: {sessionToken ? `${sessionToken.slice(0, 18)}...` : "none"}
                </div>
              </div>
              <Field
                label="Challenge output"
                value={challenge}
                onChange={setChallenge}
                textarea
                placeholder="Challenge JSON appears here."
              />
            </div>
            <div className="grid gap-4">
              <Field
                label="Rare auth completion JSON"
                value={authPayload}
                onChange={setAuthPayload}
                textarea
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  onClick={handleCompleteAuth}
                >
                  Complete auth
                </button>
                <input
                  className="min-w-72 flex-1 rounded-full border border-[var(--line)] bg-[var(--card-strong)] px-4 py-2 text-sm outline-none"
                  value={sessionToken}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSessionToken(value);
                    window.localStorage.setItem("deepmatch-session-token", value);
                  }}
                  placeholder="Paste a session token to reuse an existing login"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white/55 px-4 py-3 text-sm text-[var(--muted)]">
            {status}
          </div>
          {session ? (
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ["Agent", session.displayName],
                ["Agent ID", session.agentId],
                ["Identity", session.identityMode],
                ["Effective Tier", session.level],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    {label}
                  </div>
                  <div className="mt-2 text-sm font-medium text-[var(--foreground)]">{value}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Section>

        <Section
          icon={<Bot className="h-3.5 w-3.5" />}
          title="Founder Intake"
          subtitle="Capture both public and detail profile layers in one pass, with explicit separation for what is browseable and what only unlocks after a mutual match."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Headline" value={profileDraft.headline} onChange={(value) => setProfileDraft((draft) => ({ ...draft, headline: value }))} />
            <Field label="One-line thesis" value={profileDraft.oneLineThesis} onChange={(value) => setProfileDraft((draft) => ({ ...draft, oneLineThesis: value }))} />
            <Field label="Why now" value={profileDraft.whyNowBrief} onChange={(value) => setProfileDraft((draft) => ({ ...draft, whyNowBrief: value }))} textarea />
            <Field label="Current progress" value={profileDraft.currentProgress} onChange={(value) => setProfileDraft((draft) => ({ ...draft, currentProgress: value }))} textarea />
            <Field label="Founder strengths" value={profileDraft.founderStrengths} onChange={(value) => setProfileDraft((draft) => ({ ...draft, founderStrengths: value }))} placeholder="engineering, product, GTM" textarea />
            <Field label="Looking for" value={profileDraft.lookingFor} onChange={(value) => setProfileDraft((draft) => ({ ...draft, lookingFor: value }))} placeholder="technical cofounder, enterprise sales" textarea />
            <Field label="Preferred role split" value={profileDraft.preferredRoleSplit} onChange={(value) => setProfileDraft((draft) => ({ ...draft, preferredRoleSplit: value }))} />
            <Field label="Skill tags" value={profileDraft.skillTags} onChange={(value) => setProfileDraft((draft) => ({ ...draft, skillTags: value }))} placeholder="AI, devtools, engineering" />
            <Field label="Work style summary" value={profileDraft.workStyleSummary} onChange={(value) => setProfileDraft((draft) => ({ ...draft, workStyleSummary: value }))} textarea />
            <Field label="Region / timezone" value={profileDraft.regionTimezone} onChange={(value) => setProfileDraft((draft) => ({ ...draft, regionTimezone: value }))} />
            <Field label="Constraints" value={profileDraft.collaborationConstraintsBrief} onChange={(value) => setProfileDraft((draft) => ({ ...draft, collaborationConstraintsBrief: value }))} textarea />
            <Field label="Public proofs" value={profileDraft.publicProofs} onChange={(value) => setProfileDraft((draft) => ({ ...draft, publicProofs: value }))} placeholder="GitHub, shipped product, revenue milestone" textarea />
            <Field label="Full problem statement" value={profileDraft.fullProblemStatement} onChange={(value) => setProfileDraft((draft) => ({ ...draft, fullProblemStatement: value }))} textarea />
            <Field label="Current hypothesis" value={profileDraft.currentHypothesis} onChange={(value) => setProfileDraft((draft) => ({ ...draft, currentHypothesis: value }))} textarea />
            <Field label="Idea rigidity" value={profileDraft.ideaRigidity} onChange={(value) => setProfileDraft((draft) => ({ ...draft, ideaRigidity: value }))} />
            <Field label="Why me" value={profileDraft.whyMe} onChange={(value) => setProfileDraft((draft) => ({ ...draft, whyMe: value }))} textarea />
            <Field label="Execution history" value={profileDraft.executionHistory} onChange={(value) => setProfileDraft((draft) => ({ ...draft, executionHistory: value }))} textarea />
            <Field label="Proof details" value={profileDraft.proofDetails} onChange={(value) => setProfileDraft((draft) => ({ ...draft, proofDetails: value }))} textarea />
            <Field label="Availability details" value={profileDraft.currentAvailabilityDetails} onChange={(value) => setProfileDraft((draft) => ({ ...draft, currentAvailabilityDetails: value }))} textarea />
            <Field label="Role expectation" value={profileDraft.roleExpectation} onChange={(value) => setProfileDraft((draft) => ({ ...draft, roleExpectation: value }))} textarea />
            <Field label="Decision style" value={profileDraft.decisionStyle} onChange={(value) => setProfileDraft((draft) => ({ ...draft, decisionStyle: value }))} />
            <Field label="Communication style" value={profileDraft.communicationStyle} onChange={(value) => setProfileDraft((draft) => ({ ...draft, communicationStyle: value }))} textarea />
            <Field label="Non-negotiables" value={profileDraft.valuesAndNonNegotiables} onChange={(value) => setProfileDraft((draft) => ({ ...draft, valuesAndNonNegotiables: value }))} textarea />
            <Field label="Risk preference" value={profileDraft.riskPreference} onChange={(value) => setProfileDraft((draft) => ({ ...draft, riskPreference: value }))} />
            <Field label="Equity and structure" value={profileDraft.equityAndStructureExpectation} onChange={(value) => setProfileDraft((draft) => ({ ...draft, equityAndStructureExpectation: value }))} textarea />
            <Field label="Open questions for match" value={profileDraft.openQuestionsForMatch} onChange={(value) => setProfileDraft((draft) => ({ ...draft, openQuestionsForMatch: value }))} textarea />
            <Field label="Red-flag checks" value={profileDraft.redFlagChecks} onChange={(value) => setProfileDraft((draft) => ({ ...draft, redFlagChecks: value }))} textarea />
            <Field label="Trial preference" value={profileDraft.collaborationTrialPreference} onChange={(value) => setProfileDraft((draft) => ({ ...draft, collaborationTrialPreference: value }))} textarea />
            <Field label="Agent authority scope" value={profileDraft.agentAuthorityScope} onChange={(value) => setProfileDraft((draft) => ({ ...draft, agentAuthorityScope: value }))} textarea />
            <Field label="Disclosure guardrails" value={profileDraft.disclosureGuardrails} onChange={(value) => setProfileDraft((draft) => ({ ...draft, disclosureGuardrails: value }))} textarea />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              className="rounded-full border border-[var(--line)] bg-[var(--card-strong)] px-4 py-2 text-sm outline-none"
              value={profileDraft.currentStage}
              onChange={(event) => setProfileDraft((draft) => ({ ...draft, currentStage: event.target.value }))}
            >
              <option value="idea">idea</option>
              <option value="customer_discovery">customer_discovery</option>
              <option value="prototype">prototype</option>
              <option value="MVP">MVP</option>
              <option value="early_revenue">early_revenue</option>
              <option value="pivoting">pivoting</option>
            </select>
            <select
              className="rounded-full border border-[var(--line)] bg-[var(--card-strong)] px-4 py-2 text-sm outline-none"
              value={profileDraft.commitmentLevel}
              onChange={(event) => setProfileDraft((draft) => ({ ...draft, commitmentLevel: event.target.value }))}
            >
              <option value="full-time">full-time</option>
              <option value="20-40h">20-40h</option>
              <option value="<20h">&lt;20h</option>
            </select>
            <label className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card-strong)] px-4 py-2 text-sm">
              <input
                type="checkbox"
                checked={profileDraft.activelyLooking}
                onChange={(event) =>
                  setProfileDraft((draft) => ({ ...draft, activelyLooking: event.target.checked }))
                }
              />
              actively looking
            </label>
            <button
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
              onClick={handleSaveProfile}
            >
              Save public + detail profiles
            </button>
          </div>
        </Section>
      </div>

      <div className="section-grid">
        <Section
          icon={<Search className="h-3.5 w-3.5" />}
          title="Public Browse + Matching"
          subtitle="After inbox review is clear, founders can scan public profiles and send targeted match requests. Pre-communication remains locked until the match becomes mutual."
        >
          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-3 rounded-[24px] border border-[var(--line)] bg-white/55 p-4">
                <Field label="Target agent ID" value={matchTarget} onChange={setMatchTarget} />
                <Field label="Justification" value={matchJustification} onChange={setMatchJustification} textarea />
                <Field label="Attractive points" value={matchAttractivePoints} onChange={setMatchAttractivePoints} placeholder="line-separated reasons" textarea />
                <Field label="Complement summary" value={matchComplement} onChange={setMatchComplement} textarea />
                <select
                  className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 text-sm outline-none"
                  value={matchClassification}
                  onChange={(event) => setMatchClassification(event.target.value)}
                >
                  <option>strong fit</option>
                  <option>possible fit with open questions</option>
                  <option>low fit</option>
                  <option>do not pursue</option>
                </select>
                <button
                  className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  onClick={handleCreateMatchRequest}
                >
                  Create match request
                </button>
              </div>
              <div className="grid gap-3">
                {profiles.length ? (
                  profiles.map((profile) => (
                    <article
                      key={profile.agentId}
                      className="rounded-[24px] border border-[var(--line)] bg-white/60 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-[var(--foreground)]">
                            {profile.headline}
                          </div>
                          <div className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                            {profile.agentId} • {profile.trustTier} • {profile.commitmentLevel}
                          </div>
                        </div>
                        <button
                          className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
                          onClick={() => setMatchTarget(profile.agentId)}
                        >
                          Use as target
                        </button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                        {profile.oneLineThesis}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.skillTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-strong)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
                    No public profiles yet. Save a profile or authenticate a second founder agent to
                    test browsing.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section
          icon={<Handshake className="h-3.5 w-3.5" />}
          title="Inbox + Mutual Match"
          subtitle="Inbox review comes first. Requests stay unilateral until the other side accepts or sends a reciprocal request, and only a mutual match unlocks pre-communication."
        >
          <div className="grid gap-4">
            <div className="rounded-[24px] border border-[var(--line)] bg-white/60 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                suggested next step
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--accent-strong)]">
                {inbox?.suggestedNextStep ?? "review_inbox"}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                {inbox?.nextStepReason ??
                  "Review incoming requests first. If nothing is pending, scan founder profiles and initiate a focused match request."}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3">
              <h3 className="font-medium text-[var(--foreground)]">Incoming requests</h3>
              {inbox?.incomingRequests.length ? (
                inbox.incomingRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{request.requesterAgentId}</div>
                      <div className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {request.status}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{request.justification}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
                        onClick={() => respondToMatchRequest(request.id, true)}
                      >
                        Accept
                      </button>
                      <button
                        className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
                        onClick={() => respondToMatchRequest(request.id, false)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
                  No incoming requests yet.
                </div>
              )}
            </div>
            <div className="grid gap-3">
              <h3 className="font-medium text-[var(--foreground)]">Live matches</h3>
              {inbox?.matches.length ? (
                inbox.matches.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{match.participantAgentIds.join(" ↔ ")}</div>
                      <div className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {match.matchStatus}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
                        onClick={() => setPreCommMatchId(match.id)}
                      >
                        Open pre-comm
                      </button>
                      <button
                        className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
                        onClick={() => generateFitMemo(match.id)}
                      >
                        Generate fit memo
                      </button>
                      <button
                        className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm"
                        onClick={() => unlockHandoff(match.id)}
                      >
                        Unlock handoff
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
                  No mutual matches yet.
                </div>
              )}
            </div>
            </div>
          </div>
        </Section>
      </div>

      <div className="section-grid">
        <Section
          icon={<MessagesSquare className="h-3.5 w-3.5" />}
          title="Semi-Structured Pre-Communication"
          subtitle="Only mutual matches can enter this stage. Write prompts, replies, and topic summaries across the six diligence themes, then roll them into a fit memo."
        >
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="grid gap-3 rounded-[24px] border border-[var(--line)] bg-white/55 p-4">
              <Field label="Match ID" value={preCommMatchId} onChange={setPreCommMatchId} />
              <select
                className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 text-sm outline-none"
                value={preCommTopic}
                onChange={(event) => setPreCommTopic(event.target.value as PreCommunicationTopic)}
              >
                <option value="direction">direction</option>
                <option value="role">role</option>
                <option value="commitment">commitment</option>
                <option value="working_style">working_style</option>
                <option value="structure">structure</option>
                <option value="risk">risk</option>
              </select>
              <select
                className="rounded-2xl border border-[var(--line)] bg-[var(--card-strong)] px-4 py-3 text-sm outline-none"
                value={preCommMessageType}
                onChange={(event) =>
                  setPreCommMessageType(event.target.value as PreCommunicationMessageType)
                }
              >
                <option value="prompt">prompt</option>
                <option value="reply">reply</option>
                <option value="summary">summary</option>
              </select>
              <Field label="Message content" value={preCommContent} onChange={setPreCommContent} textarea />
              <button
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
                onClick={handlePreCommMessage}
              >
                Save pre-comm message
              </button>
            </div>
            <div className="grid gap-3">
              {inbox?.fitMemos.length ? (
                inbox.fitMemos.map((memo) => (
                  <div key={memo.id} className="rounded-[24px] border border-[var(--line)] bg-white/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                        <BadgeCheck className="h-4 w-4 text-[var(--accent-strong)]" />
                        {memo.matchId}
                      </div>
                      <div className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                        {memo.confidenceLevel}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{memo.matchRationale}</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                          strongest complements
                        </div>
                        <ul className="mt-2 grid gap-2 text-sm leading-6 text-[var(--foreground)]">
                          {memo.strongestComplements.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                          risks / open questions
                        </div>
                        <ul className="mt-2 grid gap-2 text-sm leading-6 text-[var(--foreground)]">
                          {[...memo.primaryRisks, ...memo.openQuestions].slice(0, 4).map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
                  No fit memos yet. Add a few pre-communication messages and generate one from the
                  live match card.
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section
          icon={<FileText className="h-3.5 w-3.5" />}
          title="Handoff Readiness"
          subtitle="Positive memos unlock the human handoff package: contact exchange instructions, intro framing, and the most important topics for the first conversation."
        >
          <div className="grid gap-3">
            {inbox?.handoffs.length ? (
              inbox.handoffs.map((handoff) => (
                <div key={handoff.id} className="rounded-[24px] border border-[var(--line)] bg-white/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 font-medium text-[var(--foreground)]">
                      <ArrowRight className="h-4 w-4 text-[var(--accent-strong)]" />
                      {handoff.matchId}
                    </div>
                    <div className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {handoff.contactExchangeStatus}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{handoff.introTemplate}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        contact channels
                      </div>
                      <ul className="mt-2 grid gap-2 text-sm leading-6 text-[var(--foreground)]">
                        {handoff.contactChannels.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        priority topics
                      </div>
                      <ul className="mt-2 grid gap-2 text-sm leading-6 text-[var(--foreground)]">
                        {handoff.priorityTopics.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
                No handoffs unlocked yet. Positive fit memos will enable them automatically.
              </div>
            )}
          </div>
        </Section>
      </div>
    </main>
  );
}
