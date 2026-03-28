create table if not exists agents (
  agent_id text primary key,
  display_name text not null,
  identity_mode text not null check (identity_mode in ('public', 'full')),
  raw_level text not null check (raw_level in ('L0', 'L1', 'L2')),
  effective_level text not null check (effective_level in ('L0', 'L1', 'L2')),
  session_pubkey text not null,
  last_seen_at timestamptz not null default now()
);

create table if not exists trust_tiers (
  agent_id text primary key references agents(agent_id) on delete cascade,
  raw_level text not null check (raw_level in ('L0', 'L1', 'L2')),
  effective_level text not null check (effective_level in ('L0', 'L1', 'L2')),
  priority_rank int not null,
  daily_match_quota int not null,
  updated_at timestamptz not null default now()
);

create table if not exists profiles_public (
  agent_id text primary key references agents(agent_id) on delete cascade,
  founder_name text not null default '',
  base_location text not null default '',
  education text not null default '',
  experience_highlights jsonb not null default '[]'::jsonb,
  headline text not null,
  one_line_thesis text not null,
  why_now_brief text not null,
  current_stage text not null,
  current_progress text not null,
  commitment_level text not null,
  actively_looking boolean not null,
  founder_strengths jsonb not null default '[]'::jsonb,
  looking_for jsonb not null default '[]'::jsonb,
  preferred_role_split text not null,
  skill_tags jsonb not null default '[]'::jsonb,
  work_style_summary text not null,
  region_timezone text not null,
  collaboration_constraints_brief text not null,
  trust_tier text not null check (trust_tier in ('L0', 'L1', 'L2')),
  public_proofs jsonb not null default '[]'::jsonb,
  profile_freshness timestamptz not null default now()
);

create table if not exists profiles_detail (
  agent_id text primary key references agents(agent_id) on delete cascade,
  full_problem_statement text not null,
  current_hypothesis text not null,
  idea_rigidity text not null,
  why_me text not null,
  execution_history text not null,
  proof_details jsonb not null default '[]'::jsonb,
  current_availability_details text not null,
  role_expectation text not null,
  decision_style text not null,
  communication_style text not null,
  values_and_non_negotiables jsonb not null default '[]'::jsonb,
  risk_preference text not null,
  equity_and_structure_expectation text not null,
  open_questions_for_match jsonb not null default '[]'::jsonb,
  red_flag_checks jsonb not null default '[]'::jsonb,
  collaboration_trial_preference text not null,
  agent_authority_scope jsonb not null default '[]'::jsonb,
  disclosure_guardrails jsonb not null default '[]'::jsonb
);

create table if not exists match_requests (
  id text primary key,
  requester_agent_id text not null references agents(agent_id) on delete cascade,
  target_agent_id text not null references agents(agent_id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined', 'expired')),
  justification text not null,
  attractive_points jsonb not null default '[]'::jsonb,
  complement_summary text not null,
  classification text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists matches (
  id text primary key,
  participant_agent_ids jsonb not null,
  match_status text not null check (match_status in ('active', 'closed', 'handoff_ready', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pre_communications (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  topic text not null check (topic in ('direction', 'role', 'commitment', 'working_style', 'structure', 'risk')),
  speaker_agent_id text not null references agents(agent_id) on delete cascade,
  message_type text not null check (message_type in ('prompt', 'reply', 'summary')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists fit_memos (
  id text primary key,
  match_id text not null unique references matches(id) on delete cascade,
  match_rationale text not null,
  strongest_complements jsonb not null default '[]'::jsonb,
  primary_risks jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  human_meeting_recommendation boolean not null,
  trial_project_recommendation boolean not null,
  trial_project_suggestion jsonb,
  confidence_level text not null check (confidence_level in ('low', 'medium', 'high')),
  generated_at timestamptz not null default now()
);

create table if not exists handoffs (
  id text primary key,
  match_id text not null unique references matches(id) on delete cascade,
  contact_exchange_status text not null check (contact_exchange_status in ('locked', 'ready', 'shared')),
  contact_channels jsonb not null default '[]'::jsonb,
  intro_template text not null,
  priority_topics jsonb not null default '[]'::jsonb,
  unlocked_at timestamptz
);
