# Domain Docs

This repository uses a single domain context.

## Before planning or implementation

1. Read root `CONTEXT.md` for canonical game vocabulary.
2. Read ADRs in `docs/adr/` that touch the work area.
3. Treat accepted ADRs as stronger than older recommendations in `GAME_REVIEW.md`.
4. If a spec intentionally contradicts an ADR, call that out explicitly instead of silently overriding it.

## Writing rules

- `CONTEXT.md` is a glossary only: no implementation details, tickets, or scratch notes.
- ADRs are only for hard-to-reverse, non-obvious decisions made after a real trade-off.
- Current implementation scope belongs in GitHub spec issues.
- Tracer-bullet execution work belongs in GitHub tickets.
- Unresolved multi-session product/architecture questions belong in a Wayfinder map.

## Layout

```text
/
├── CONTEXT.md
├── docs/adr/
├── docs/agents/
└── src/
```
