# Agent Guidance

## Primary project sources

- `CONTEXT.md` defines the canonical game/domain vocabulary.
- `docs/adr/` records durable architectural and product decisions.
- `GAME_REVIEW.md` is a historical audit and design source, not the execution source of truth.
- Current specs and implementation tickets live in GitHub Issues.
- Open, multi-session design decisions are tracked through Wayfinder issues.

## Agent skills

### Issue tracker

GitHub Issues in `KoryakinYurij/Necro-game`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical Matt Pocock triage roles. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo: read root `CONTEXT.md` and relevant ADRs before planning or implementation. See `docs/agents/domain.md`.

## Execution rule

Do not turn the whole `GAME_REVIEW.md` into one implementation effort. Work from the active spec and its dependency-ordered tickets; resolve Wayfinder decisions separately when they are on the frontier.
