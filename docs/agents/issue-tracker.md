# Issue tracker: GitHub

Issues and specs for this repo live in GitHub Issues for `KoryakinYurij/Necro-game`.
Use the `gh` CLI from the repository clone.

## Conventions

- Specs are GitHub issues and act as the parent/context source for implementation tickets.
- `/to-tickets` publishes one issue per tracer-bullet ticket.
- Use `ready-for-agent` only when a ticket is self-contained and implementation-ready.
- Human validation or unresolved product decisions use `ready-for-human` or Wayfinder labels instead.
- Do not triage tickets produced by `/to-tickets`; they are already prepared.
- PRs are not an incoming triage surface for this project.

## Wayfinding operations

- A decision map is one issue labelled `wayfinder:map`.
- Decision tickets use `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- Prefer GitHub sub-issues and native dependencies when available.
- If the repository/API does not expose native relationships, put `Part of #<map>` and `Blocked by: #...` in issue bodies.
- A frontier ticket is open, unclaimed, and has no open blockers.
- Resolution is recorded on the decision ticket; the map only links a one-line gist.

## Source-of-truth rule

GitHub specs/tickets define current executable work. `GAME_REVIEW.md` remains research/history and must not silently override an accepted ADR or a newer spec.
