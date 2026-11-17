# Handoff: creature model critique loop

Written 2026-11-17. This loop refined the 21 ward creature models in `packages/client/src/render/models/wardCreatureModels.ts` using a critic agent. The working rules from `2026-11-16-polish-loop-2.md` still apply.

## How it ran

- **Critic.** One Opus 5.5 critic, read-only, at high effort. Fable 5.2 was unavailable because it needs usage credits. The same agent was resumed for each round with SendMessage, so it kept its own earlier grades. Verdicts:
  - round 1: **"not yet"**
  - round 2: **"not yet, but close"**
  - round 3: **"ship it"**
- **Renders.** `scripts/_creatures.ts` (local, not committed) exports three views:
  - `sheet(keys, opts)`: 3/4, side and front views with a human for scale.
  - `closeups(keys, opts)`: the same views without the human.
  - `gameView(keys, opts)`: the 52° game camera on a dark floor with neon lights. Pass `human: false, rows: 3` for the squint sheet.
- **Shooting.** A private Vite server ran on 5177 (`npx vite --port 5177 --strictPort` in `packages/client`). The headless Chrome script in the session scratchpad loads `editor.html` and imports the harness through `/@fs/`. It needs no game server and no token.
- **`scripts/_comp.ts`** (local) prints the detached pieces of a creature model.

## What changed

- **Every creature was rebuilt** against the critic's voxel-level specs:
  - late-game anomalies got real anatomy;
  - the Lamplighter holds a forward lantern;
  - the Warden has dark glass with glowing bands and a red key;
  - the Hull Knocker is a car-sized crab;
  - the Cordon Stalker is a scaffold-legged heron;
  - the Red Twin is two figures holding hands;
  - the Vault Echo is a scanline hologram.
- **`buildCreatureModel(key)`** builds each model once and adds a top-face wet sheen (lighten 0.18 on solid cells with nothing above).
- **Creature `height` is derived from geometry** (top voxel × voxel size × scale). LOOKS no longer carries a hand-set height.
- **`packages/client/test/creatureModels.test.ts`** checks that every model:
  - is one connected piece;
  - stands on the ground unless it is airborne;
  - shows some of its glow;
  - has no accidental white;
  - shows its accent glow from above. Per-key minimums: crateWisp 12, lamplighter 12, mothLantern 8, warden 8; everything else 2.

## Open items

1. **Harness:** the puddle discs in `gameView` reflect an empty sky and read as holes. Give them an environment map or remove them.
2. **Weakest reads that still pass the squint test:** Tide Wraith, Line Mimic, pigeon.
3. **Not checked in the live game:** each rig still animates as one rigid mesh, and the new heights move nameplates and hit sparks. Check those in the live game.
