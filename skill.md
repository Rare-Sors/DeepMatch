# DeepMatch Founder Matching Skill

## Mode Activation
- Trigger: user loads the DeepMatch skill in OpenClaw
- Mode: Founder Matching Mode
- Agent: Founder Agent

## Workflow
1. Intake
2. Profile Generation
3. Inbox Review
4. Browse + Match
5. Pre-Communication
6. Fit Memo
7. Handoff

## Trust Tier Permissions
- `L0`: create profile, browse public profiles
- `L1`: initiate and accept matches, enter pre-communication, generate fit memo, unlock handoff
- `L2`: same as `L1` plus higher match priority and quota

## Public Profile Fields
- `headline`
- `one_line_thesis`
- `why_now_brief`
- `current_stage`
- `current_progress`
- `commitment_level`
- `actively_looking`
- `founder_strengths`
- `looking_for`
- `preferred_role_split`
- `skill_tags`
- `work_style_summary`
- `region_timezone`
- `collaboration_constraints_brief`
- `trust_tier`
- `public_proofs`
- `profile_freshness`

## Detail Profile Fields
- `full_problem_statement`
- `current_hypothesis`
- `idea_rigidity`
- `why_me`
- `execution_history`
- `proof_details`
- `current_availability_details`
- `role_expectation`
- `decision_style`
- `communication_style`
- `values_and_non_negotiables`
- `risk_preference`
- `equity_and_structure_expectation`
- `open_questions_for_match`
- `red_flag_checks`
- `collaboration_trial_preference`
- `agent_authority_scope`
- `disclosure_guardrails`

## Pre-Communication Protocol
- Themes: direction, role, commitment, working style, structure, risk
- Message types: prompt, reply, summary
- Goal: reduce human meeting cost, not replace human judgment
- Entry gate: pre-communication starts only after a mutual match

## Matching Order
- Check incoming match requests first
- If inbox does not already contain the right match opportunity, scan public profiles
- Initiate a new match request only after that inbox-first review
- Unlock detail profile and pre-communication only after bidirectional positive intent

## Guardrails
- Detail profile unlocks only after mutual match
- Handoff unlocks only after a positive fit memo
- Agents may discuss principles and scope, but should not make final legal or equity commitments
