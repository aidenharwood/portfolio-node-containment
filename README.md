# Containment Online

A browser-based, point-and-click sci-fi MMO about containment. You are a fresh recruit of Intake Cohort 41 in the Meridian Directorate's Containment Service, posted to Site Kestrel at the far end of **the Span**. The Span is a precursor ring-habitat arc, and its builders, the Quiet, left it full of sealed reliquaries. The world is fully 3D voxels with a freely orbiting camera. You click to walk, hover for bubbles, right-click for every option, and train skills that level from XP. You carry a 28-slot inventory and an eleven-slot loadout.

## Quick start

Requires **Node 24+**.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Vite client proxies `/ws` to the game server on port 7420.

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Game server (auto-restart) and Vite client together             |
| `npm test`          | All unit and integration tests, using Node's built-in runner    |
| `npm run typecheck` | Strict TypeScript across all three packages                     |
| `npm run build`     | Production client bundle in `packages/client/dist`              |
| `npm start`         | Game server only; also serves the built client on port 7420     |

**Controls:**

- Left-click to walk or to do the default action. Hover anything interactive to see its bubble; right-click for every option.
- Drag, middle-drag or Q/E to rotate the camera. Use the arrow keys to tilt, scroll to zoom, and Home to reset.
- 1–8 (or F1–F8) switch the side panel tabs. M opens the world map. Enter opens chat. Hotkeys are ignored while you are typing in a text field; Escape leaves the field.

Environment variables for the server: `GAME_SERVER_PORT` (default 7420), `DATABASE_PATH` (default `data/containment.sqlite`) and `CLIENT_DIST_PATH`. For the client dev server, `GAME_SERVER_URL` sets the proxy target.

## What exists today

- **Auth:** scrypt-hashed passwords. Session tokens are stored as SHA-256 hashes and expire after 14 days. Failed logins are throttled.
- **Character creation:** cosmetic only. There are no classes or attributes, and everything is earned by training skills. A live 3D voxel preview shows the character, and everything equipped appears on the body exactly as its icon shows.
- **Combat:** server-authoritative and tick-based. Melee beats ranged, ranged beats psionic, and psionic beats melee. Creatures have aggro and leash ranges, loot and respawns, and can be footprinted 2×2. Bosses run data-driven encounters with telegraphs, summons, hazards, phases and enrage. Anomalous specimens can be **contained** instead of killed once you have worn them down and trained enough Containment.
- **Gathering and crafting:** gear and medicine are crafted from gathered stock. The refinery makes plating, the fabricator gear, the synthesiser medicine and the cooker food. Six gear ladders (scrap, ferro, plasteel, duralloy, sinter, vault-glass) follow the regions spinward, and each region's nodes and creatures supply the ladder you wear there.
- **Economy and services:** every region has an outpost with a quartermaster, a storage locker, a contract board and an exchange mailbox. Kestrel Commons holds the player exchange. Daily and weekly contracts pay scrip, XP and commendations.
- **Crowds:** levels overflow into layers, combat is single-way outside multi-combat areas, everyone who damages a creature gets credit, and respawns speed up when a layer is busy.
- **The Span:** one overworld of 1024 × 384 tiles in 96 land squares, with three facility levels below ground. Six regions run west to east, each sealed from the next by a Seam bulkhead with three open gates:
  - **Kestrel Reach** (tiers 1–2): Site Kestrel, SC-V, Secure; Kestrel Commons; the Recruit Lines.
  - **Harrow Terraces** (3–5): Harrowgate and Site Orchard, SC-II, Strained.
  - **Halcyon** (6–7): a neon arcology under the Aurelian Spire; Site Gallowglass, SC-III, Breached, and its undercity.
  - **The Wreckfield** (8–9): Rustwater in the shadow of the crashed colony ship *Meridian*; Site Tallow, SC-IV, Overrun.
  - **The Glass Steppe** (10–11): the pilgrim Choir and Site Vesper, SC-IV, Lost.
  - **The Spindle** (12–13): Last Post, and Site Null, SC-V, Inverted, with Null Below.
- **Story:** six acts, and a side questline in every settlement.
  - *Intake*: kit, the yard, your first containment, the oath. Your file has a PREVIOUS INTAKE field.
  - *Strain*: Site Orchard's seed stock walks out of the vault. Put down the Orchard Keeper.
  - *Breach*: dead screens, ad-wraiths, the Gallowglass undercity and Mr Brightly.
  - *Overrun*: retake Site Tallow, find your own name on its casualty board, and face the Cohort.
  - *Lost*: Site Vesper went quiet. Break the hymn and defeat the Precentor.
  - *Inverted*: at Site Null the cells are on the outside. Face the Warden of Null, then choose to re-seal it or sign out of the Roster.
- **Guidance:** one tracked quest draws a walking route, objective markers and a transit plan through the lifts. The world map is fully charted.

## Repository layout

```
packages/
  shared/   Domain rules, content data and the network protocol. No I/O; both server and client import it.
  server/   Node game server: persistence, auth, world simulation, gameplay controllers.
  client/   Vite + Three.js client: screens, voxel renderer, HUD.
scripts/    Dev tooling
```

Read [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit, and [CONTRIBUTING.md](CONTRIBUTING.md) for conventions and recipes, such as adding an item, an NPC, a quest or a district.
