---
status: accepted
---

# Require deterministic, order-independent world generation

For a given expedition seed and world coordinate, generated world content must be reproducible and must not depend on which neighboring area the player visited first. This gives the project reproducible bugs, stable world identities, reliable tests, and a future path to lightweight run-state persistence.

## Considered Options

- Consume one global random stream as areas are visited.
- Derive local generation from the expedition seed and stable spatial identity.

We chose the second option because visit-order-dependent worlds would make debugging, persistence, and replay of a reported seed unreliable.
