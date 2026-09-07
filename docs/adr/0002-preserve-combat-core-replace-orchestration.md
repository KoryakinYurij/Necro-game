---
status: accepted
---

# Preserve the combat core and replace run orchestration

The exploration pivot will reuse the existing movement, camera, weapons, summons, enemies, projectiles, damage, boss primitives, and render pipeline while replacing the time-driven Arena Director with Exploration Orchestration. Rewriting the combat engine would add large risk without answering the product question the pivot is meant to test.

## Consequences

The legacy core should expose narrow adapters needed by exploration instead of absorbing another large layer of exploration logic through brittle text patches. Arena Mode may remain temporarily as a control/regression reference, but new exploration behavior must not depend on its timers.
