# Project Documentation Map

Necro uses different artifacts for different kinds of truth.

## Canonical project language

`CONTEXT.md` defines domain terms used by specs, tickets, tests, and implementation discussions.

## Durable decisions

`docs/adr/` contains only accepted decisions that are costly to reverse, non-obvious without context, and based on a real trade-off.

## Historical analysis

`GAME_REVIEW.md` is the comprehensive audit and design history that led to the current direction. It is valuable source material, but it is intentionally not the day-to-day execution plan.

## Current build contracts

Specs are GitHub issues. A spec describes one bounded feature or milestone and is the source used by `/to-tickets`.

Implementation tickets are GitHub issues created from an approved spec as dependency-ordered tracer bullets. Agents should implement one ticket in a fresh context rather than loading the entire review.

## Open strategic decisions

Large unresolved questions that need multiple sessions belong to a Wayfinder map and its decision tickets. When the map is clear, its decisions are collapsed into a new spec with `/to-spec` before implementation tickets are created.

## Current exploration artifacts

- Active thin-slice spec: GitHub issue `#1` — Exploration Thin Slice v0.1.
- Agent implementation chain: issues `#2` through `#8`, wired with native GitHub blocking dependencies.
- Human product gate: issue `#9` — GO / ITERATE / STOP playtest.
- Post-playtest decision map: issue `#10` — Milestone 2 exploration product architecture.
- Wayfinder decision tickets: child issues `#11` through `#21`; they are blocked until the thin-slice evidence exists.
