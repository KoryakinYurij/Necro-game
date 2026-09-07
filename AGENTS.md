# Agent Guidance

## Development operating system

This repository follows the Matt Pocock engineering-skill workflow.

Global skills are installed at `/home/fixedius/.agents/skills/`.
Each skill lives at `/home/fixedius/.agents/skills/<skill-name>/SKILL.md`.
When the correct workflow is unclear, read `/home/fixedius/.agents/skills/ask-matt/SKILL.md` before proposing the next step.

Treat skill files as process source of truth. This file routes to them; it does not duplicate them.

## Read before changing the project

Before planning or implementation, read:

1. `CONTEXT.md` for canonical game/domain vocabulary.
2. Relevant accepted records in `docs/adr/`.
3. The active GitHub spec or ticket, including blockers and comments.
4. `docs/agents/issue-tracker.md` when creating, resolving, or linking work.

`GAME_REVIEW.md` is historical audit/research. It may inform decisions, but it is not executable scope and must not override a newer spec or accepted ADR.

## Route work through the right skill

- Unsure what process fits → `/ask-matt`.
- Product/design idea in this repo that can be resolved conversationally → `/grill-with-docs`.
- Huge multi-session effort whose important decisions are still foggy → `/wayfinder`.
- Stable multi-session design ready to become build scope → `/to-spec`, then `/to-tickets`.
- Implementation-ready ticket → `/implement`; work one ticket at a time from the current dependency frontier.
- Difficult bug/regression → `/diagnosing-bugs`.
- External or primary-source investigation → `/research`.
- A design question needs something runnable/visible before deciding → `/prototype`; use `/handoff` when the prototype moves to another directory/harness.
- Codebase-health or architecture survey → `/improve-codebase-architecture`; use `/codebase-design` for the shape of a chosen module/seam.
- At a phase boundary, follow `/home/fixedius/.agents/skills/ask-matt/PHASE-BOUNDARIES.md` instead of compacting/clearing by habit.

Do not send tickets produced by `/to-tickets` through `/triage`; they are already agent-ready.

## How to guide the human developer

The project owner is learning software/game development while building this project. The agent owns process navigation.

- State the current phase and the next concrete decision/action in plain language.
- Recommend the appropriate skill when the phase changes; do not require the user to remember the skill graph.
- Explain important architecture/design choices briefly before asking for a human judgement.
- Ask the human for product taste, priorities, or irreversible trade-offs; investigate code facts and routine engineering facts yourself.
- Keep scope narrow: one decision ticket or one implementation ticket at a time unless the active skill explicitly calls for mapping a wider effort.
- Never silently expand a ticket because `GAME_REVIEW.md` contains adjacent ideas.
- Surface blockers early. If work is blocked by an unresolved Wayfinder decision, route to that decision instead of inventing an assumption.
- After a completed implementation ticket, report what changed, verification performed, and which GitHub tickets are now on the frontier.

## Current project workflow

The current exploration pivot is deliberately split into two tracks:

- GitHub spec **#1** and implementation tickets **#2–#9** prove the Exploration Thin Slice.
- Wayfinder map **#10** and its decision tickets define post-thin-slice product architecture.

Respect GitHub blocking edges. Post-thin-slice decisions must not be treated as implementation requirements before their blockers are resolved.
