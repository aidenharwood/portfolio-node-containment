# Draw the Hinterland Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 42-square block-out beyond the Cordon with the Hinterland: one land plan drawn to the approved map, cut into land squares placed by grid, with every ward sealed except at its gates, every region given its outpost and Site, and each town, compound and crossing blocked out.

**Architecture:** `content/land/hinterland.json` is seeded from the approved map by a script that turns the SVG's shapes into land steps (`scripts/seedHinterland.ts`), then tuned in the editor's land layer. A second script (`scripts/cutHinterland.ts`) writes one starting layout per walkable square (split where a ward border crosses), which is then blocked out by hand, ward by ward. The overworld recipe keeps the Low Ward joined, pins it so that Terminus Square's origin is (128, 320), places the land squares with `placeLandSquares`, and sets `land`.

**Tech Stack:** TypeScript (erasable only) on Node 24, zod 3, `node:test`, Vite editor.

**Spec:** `docs/superpowers/specs/2026-11-19-hinterland-atlas-design.md` (all of "The land", "The land plan", "What happens to the block-out", build order step 4). Map: `docs/superpowers/specs/2026-11-19-hinterland-atlas.svg`. Previous plans: `2026-11-19-land-plan-engine.md`, `2026-11-19-client-scenery-and-land-editor.md`.

## Global Constraints

- `CLAUDE.md`, `WORLD_DESIGN.md`, `ARCHITECTURE.md` and `CONTRIBUTING.md` hold. No code comments, erasable TypeScript, `.ts` imports. `npm run typecheck` and `npm test` pass at the end of every task. No exemptions to any check.
- **Map to tiles:** one SVG unit is `64 / 60` tiles. SVG `(x, y)` is tile `(round(x × 64 / 60), round(y × 64 / 60))`. The plan is 12 × 10 squares of 64 (768 × 640). Square `(c, r)` is SVG `60c … 60c + 60`, `60r … 60r + 60`.
- **The Low Ward does not change** except the Cut's east edge, which opens onto the river's water. Its nine squares sit at columns 2–5, rows 4–6, with Terminus Square at (2, 5).
- **Ids:** `gatehouse-yard` is the crossroads square (6, 5). `dry-dock-four` (0, 3), `brinehouse` (2, 7), `the-spire` (5, 0), `cathedral-close` (8, 5), `bellows` (9, 1), `site-fathom` (8, 8) and `the-lantern` (11, 9) are the Site squares (take the square holding each Site marker on the map; move a Site within one square if its ward's land demands it, and say so). Region ids stay; `the-blight` is new. No other old id is kept.
- **Anti-goal checks are judgement, not tests:** after every task that changes land, render the plan with `scripts/landPicture.ts` (Task 2) with the grid hidden, look at it, and fix any land that follows square edges.
- Stage files by name only. Never stage `.claude/settings.json`, `.claude/launch.json`, `scripts/_ids.ts`, `scripts/_ascii.ts`, `docs/handoffs/2026-11-18-ui-audit.md`, or HUD, screens or styles files you did not change. Commit messages are plain sentences and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push after each task.

## Decisions this plan makes

- **Seeded from the map, not typed.** The approved SVG already holds the coast, the cover shapes, the river, the cliffs, the roads, the towns, the Sites and the gates as paths. The seed script samples those paths into polygons and lines, so the land follows the approved drawing. After seeding, the JSON is the source and the editor edits it; the script is kept for the record and is not re-run over hand edits.
- **Cover tiles:** moor is `grass` with `dirt` patches; overgrown suburbs are `paving` broken by `grass`; the Great Wood is `grass` with clumps of `trees` and walkable rides between them; marsh is `grass` with `water` pools; the Blight is `soil` with `rust` scars; mountains and fells are `rock`; beaches are `gravel`. Roads are `asphalt` near towns and `gravel` or `dirt` beyond.
- **Heights:** sea, bay, river mouth and delta 0; the valley and the moors 1–2; the ridge top (the Heights) 6, cliff-bound west and south; the gorge's river 1 between cliffs; Ironside 3–4; Gallows Hill 4; the Blight road's ledge 4 above the moor at 2; the crater rim 5 around the lake at 1; mountains and fells 10–15 as `rock`.
- **Borders seal by land:** sea, river, creek, cliffs, Old Town's wall and the mountains. Every gap is a gate with a door. `findSealedWardIssues` and `findLandIssues` decide.
- **Starting layouts are generated once** by `scripts/cutHinterland.ts`, then owned by hand. Each has the land's `ground` area, a placeholder name, its ward's region and tier, and enough props to pass the dressing checks. Squares with no walkable land have no district; slivers under 40 walkable tiles are given to the neighbouring square's ward by redrawing the ward shape, or turned to rock or sea.
- **Tier inside a ward:** squares touching the ward's entry gate take the ward's lower tier, the rest its higher tier. The Blight is 28.

---

### Task 1: A safe mask for the server

The open item from the land plan engine handoff, done before the level grows to 768 × 640.

**Files:** Modify `packages/server/src/world/levelInstance.ts`. Test: its existing test file (search for `isSafe(` under `packages/server/test`).

- [ ] **Step 1:** Write a test that, on the shipped overworld and on `fx-wilds`, `isSafe` and `areasAt` give the same answers as the current filter-based code for every tile (keep a copy of the old logic in the test as the oracle).
- [ ] **Step 2:** Build once per instance a `Uint8Array` safe mask and a per-tile index of area lists (an `Int32Array` into a table of unique area lists), from `layout.districtAt` and the areas' rects, using `isSafeIn` for each tile. `isSafe` and `areasAt` read them and allocate nothing.
- [ ] **Step 3:** Run the tests, `npm run typecheck`, `npm test`. Run `npm run bench:tick` and record the result before and after.
- [ ] **Step 4:** Commit "Look up safety and areas from a per-tile mask built once per level instance".

### Task 2: Seed the land from the approved map

**Files:** Create `scripts/seedHinterland.ts`, `scripts/landPicture.ts`. Modify `packages/shared/src/content/land/hinterland.json`. Test: `packages/shared/test/hinterland.test.ts`.

- [ ] **Step 1: The picture script.** `node scripts/landPicture.ts <land-id> <out.png> [--grid] [--wards]` draws a land plan from `GAME_CONTENT.lands` to a PNG (one pixel per tile, height-shaded, ward borders and gates optional), writing PNG with `node:zlib`. Use the editor's tile colours.
- [ ] **Step 2: The seed script.** `node scripts/seedHinterland.ts` reads the SVG, samples path commands (`M`, `L`, `H`, `V`, `C`, `Z`) at about one point per two tiles, converts to tiles, simplifies collinear points, and writes `hinterland.json` with `printLandPlan`. Order of steps, later winning:
  1. Base: `rock` at height 10 over the whole plan (the fells).
  2. Open land: a polygon inset 6–14 tiles from the edges, wandering, as `grass` at height 2, leaving the closing bands of the spec: sea cliffs north-west, fells along the ridge's north, mountains north-east, ash fells east.
  3. Sea: the `.water` path as `water` at 0, and the bay.
  4. Cover: the `moor`, `overgrown`, `high`, `marsh`, `woods`, `blight` and `mount` pattern fills as the cover tiles above, with heights as above.
  5. Water: the river (width 7), the delta channels (3), the creek (5), the crater lake.
  6. Cliffs: each `.cliff1` path as a `rise` boundary: raise the high side (the ridge, Gallows Hill, the Blight road's ledge, the gorge's walls) so the drop is at least two steps there; never draw `cliff` tiles.
  7. Ramps where the map's roads climb (the Viaduct's approach, Gallows Hill's ramp from the postern, the Blight road from Ironside, the crater rim).
  8. Towns: the `town`, `industry`, `flooded` and `dense` fills as `paving`, `gravel` and `concrete` grounds; Old Town's wall as a `brick` line (width 3) round its circle, with the river passing through water gates that stay water.
  9. Roads: each `.rd` path as a line (width 5 near towns, 3 beyond).
  10. Wards: one polygon per ward from the spec's table, drawn so its edges run along the borders (river, creek, cliffs, wall, sea). The Low Ward's squares are ward `low-ward` (its region id; check `SEED_REGIONS`).
  11. Gates: each `.gate` rect, two tiles wide across its border, as `door` tiles, ids as the spec's crossing names in kebab-case (`the-incline`, `west-gate`, `causeway`, `viaduct`, `floodgate`, `seawall`, `blight-road`, `crater-rim`). The Cordon gate and the sluice are the Low Ward's joined exits, not land gates.
- [ ] **Step 3: Test** (`hinterland.test.ts`): the plan draws; `findLandPlanIssues` is empty; walkable land never meets the edge; flood-filling each ward's walkable tiles with gate tiles closed never enters another ward's tiles (write this flood on the land alone if no existing helper does it); every gate joins exactly the two wards the spec's crossing table names; the Low Ward's nine squares' land is ward `low-ward` and its outer edge matches its fences (walkable land of another ward never touches a Low Ward square except at the Cordon gate and the sluice).
- [ ] **Step 4:** Render with and without the grid and look at both. Fix square-shaped land. Commit "Seed the Hinterland's land from the approved map".

### Task 3: Cut the squares and switch the overworld

One commit, because the old squares, their outposts and the overworld recipe change together.

**Files:** Create `scripts/cutHinterland.ts`, one layout per new square under `content/districts/layouts/`, `content/districts/hinterland.ts` (replacing `hollowBay.ts`). Modify `content/districts/layouts/index.ts`, `content/levels/overworld.ts`, `content/seed/hollowBay.ts` (rename to `seed/hinterland.ts` if cleaner), `content/gameContent.ts`, `content/levels/shippedContext.ts`, the Cut's layout (east edge). Delete the 35 old layouts whose ids are not kept.

- [ ] **Step 1:** `cutHinterland.ts` reads the land, finds each square's walkable wards, and writes a starting layout per (square, ward): id (kebab-case placeholder name from what the map shows there, or a kept id), name, subtitle `Hinterland, <region name>`, tier, region, condition (`overgrown` for suburbs and woods, `flooded` for the delta and the Drowned Quarter, `alien` for the Blight, `breached` otherwise), ambience by ward, `square` (with `split: true` where shared), areas `[{ room: 'ground', name }]`, a `start` anchor on its label tile, and dressing: ground theme `camp` (or the theme that fits) with three kinds of prop placed on walkable tiles away from gates. It never overwrites an existing file unless told `--force`.
- [ ] **Step 2:** The overworld recipe: `land: context.landOf('hinterland')`; districts = the Low Ward joined as now (minus the old squares), pinned with `pinPlacements` so Terminus Square's origin is (128, 320), plus `placeLandSquares` of the new squares. Remove the old exits to `gatehouse-yard` and `sluice-end` from the join list; the Cordon gate's and the Cut's exits meet land squares.
- [ ] **Step 3:** Outposts and regions: for each region, put its outpost (a safe building with a storage locker, the quartermaster, an exchange mailbox and a contract board, moved from `seed/hollowBay.ts`) into its outpost square as the spec's table names it, and add `the-blight` with a camp outpost at the crater rim. Add the Site squares' Directorate compounds with headhouse and holding block as the old Site squares had them (copy their building steps and set-pieces across, moving positions onto the new land). Put a two-leaf door on each land gate's tiles, in the gentler ward's square.
- [ ] **Step 4:** Add the flag `ward-open:the-blight` where the gates' flags are declared, and grant it with the Last Light chapter's reward if that chapter exists in content; otherwise leave it closed and note it.
- [ ] **Step 5:** Run `npm run typecheck` and `npm test` and fix every issue in content, never in checks. Render the land with `--wards`. Run `npm run bench:tick`; if `capacity` needs changing, say so rather than change it.
- [ ] **Step 6:** Commit "Cut the Hinterland into land squares and place them on the overworld in place of the block-out".

### Tasks 4–11: Block out each ward

One task per ward, in chapter order: Old Shipyards, Tidemarsh, the Heights, Old Town, Ironside, Drowned Quarter, the Lantern, the Blight. Each is done in the editor or by editing the ward's layouts, then the land where its towns need it.

For each ward:

- [ ] **Step 1:** Re-read the spec's rows for the ward (town, wild land, Site, outpost, crossings, sightlines).
- [ ] **Step 2:** The town: roads and squares as land or layout patches, building shells (`building` steps with doors facing the roads), sized as the spec says (Old Shipyards about 4 squares, Tidemarsh 1, Heights 3, Old Town 3 inside the wall, Ironside 3, Drowned Quarter 2, Lantern a hamlet). One landmark per town square, as a `focal` set-piece named in `furnish.landmarks`.
- [ ] **Step 3:** The Site compound, the outpost and each crossing: compound walls with a gate, the headhouse, the holding block; the crossing's structure (funicular station, viaduct ends, causeway, floodgate, seawall path, rim gap) as buildings and land.
- [ ] **Step 4:** The wild land: break up any open ground over 1,500 tiles with cover, rises and paths so it is not a flat field; keep the sightlines clear.
- [ ] **Step 5:** Names: replace placeholder names with real ones in the spirit of the spec (ids are forever once committed, so choose the id with the name now if the placeholder id is poor, before anything else refers to it).
- [ ] **Step 6:** `npm run typecheck`, `npm test`, render the land, commit "Block out <ward>" and push.

### Task 12: Story, docs and handoff

- [ ] **Step 1:** Gate Duty and Last Light are not in content yet (only the `ward-open:*` flags in `seed/hollowBay.ts` are). Update the atlas spec's chapter notes where they are written so that Gate Duty holds the crossroads by Forward Post Four and Last Light's reward grants `ward-open:the-blight`. No new quests.
- [ ] **Step 2:** `WORLD_DESIGN.md`: rewrite the status note, "What the world should feel like" and the Wards section for the Hinterland, and note where per-square rules change for land squares. `ARCHITECTURE.md`: the overworld is a land plan with the Low Ward pinned into it. Mark `2026-11-18-hollow-bay-atlas.md`'s city diagram, ward tables and gate table as replaced.
- [ ] **Step 3:** `npm run typecheck`, `npm test`, `npm run bench:tick`. Write `docs/handoffs/<date>-hinterland-drawn.md` with the commits, the picture, open judgement calls, and step 5 next (the walk). Commit and push.
