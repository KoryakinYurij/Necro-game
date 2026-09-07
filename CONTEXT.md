# Necro Game Context

Necro is an exploration/action roguelite about a necromancer choosing routes, risks, fights, and places of power inside procedural expeditions.

## Language

**Expedition**:
One playable run through a generated world, from spawn until death or a future successful exit condition.
_Avoid_: Match, session, arena round

**Exploration Loop**:
The repeating player-facing cycle of choosing a direction, discovering a meaningful opportunity or threat, deciding whether to engage, resolving it, receiving a reward, and choosing what to pursue next.
_Avoid_: Wave loop, survival loop

**Arena Mode**:
The legacy time-driven survivor ruleset kept temporarily as a regression/control reference during migration.
_Avoid_: Main mode, classic mode

**Exploration Mode**:
The target ruleset in which space and player choice determine when meaningful encounters occur.
_Avoid_: Open-world mode

**Encounter**:
A local combat opportunity tied to a place in the expedition and able to remain dormant, become active, and become cleared.
_Avoid_: Wave, global spawn

**Point of Interest (POI)**:
A meaningful location that creates a route, risk, interaction, or reward decision; it is gameplay content rather than decoration.
_Avoid_: Prop, landmark when no gameplay decision is attached

**Danger**:
The spatially communicated risk of pursuing an encounter, POI, or region, expressed primarily through enemy composition and reward tier rather than elapsed time.
_Avoid_: Difficulty timer

**Spatial Progression**:
Growth or route value that comes from where the player chooses to go and what world content they complete.
_Avoid_: Time scaling

**Build Progression**:
Power and playstyle changes that affect the current expedition only.
_Avoid_: Meta progression

**Meta Progression**:
Persistent progression that survives between expeditions.
_Avoid_: Run upgrades

**Arena Director**:
The legacy orchestration that advances pressure through elapsed time, global threat, waves, timed events, timed bosses, biome timing, and finale timing.
_Avoid_: Encounter Director

**Exploration Orchestration**:
The target orchestration that decides what world opportunities exist and activates combat because of player movement or interaction rather than a global timer.
_Avoid_: Global spawner

**Cleared**:
A run-local terminal state meaning an encounter or POI has been completed and its one-time reward cannot be earned again in that expedition.
_Avoid_: Despawned
