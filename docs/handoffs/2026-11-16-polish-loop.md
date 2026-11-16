# Handoff: graphics, items and atmosphere polish loop

Written 2026-11-16, after commit 793cd34 on `main` (branch `world-rebuild`, fast-forwarded to `main`).

## How we work

- The owner approves pushes to `main`. They asked to commit and push regularly, and to clear context often, using handoff documents like this one.
- Push procedure:
  1. `git add -A`, then unstage `scripts/_*.ts`, `.claude/launch.json` and `docs/superpowers/specs/*.png`.
  2. Commit with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.
  3. `git checkout main && git merge --ff-only world-rebuild && git push origin main && git checkout world-rebuild`.
- Every change runs `npm run typecheck` and `npm test` (624 tests), plus `node scripts/_issues.ts` for content. Layout JSON edits need `node scripts/_print.ts` first.
- **Critic loop:**
  - One Fable 5.2 agent at high effort reviews screenshots and code read-only and returns a prioritised list.
  - Apply the list, re-shoot, and send round 2 to the same agent with SendMessage.
  - Stop when it says "ship it".
  - If Fable hits its weekly limit, use an Opus critic and say so.
- **Don't touch the owner's dev server** (7420 and 5173).
- **Previews:**
  - `game-preview` (5176 client, 7421 server, scratch database) and `kit-preview` (5175 editor) are in `.claude/launch.json`. Both point at scripts in the session scratchpad, which may be gone; recreate them if so.
  - `game-preview` spawns the server with `GAME_SERVER_PORT=7421`, a scratch `DATABASE_PATH` and `GAME_SERVER_URL`, plus `npx vite --port 5176` in `packages/client`.
- **Moving the test character:**
  - Stop the preview, edit the `characters.record` JSON in the scratch SQLite (location as `{levelId, position}` in level coordinates), then start it again.
  - `locate(GAME_CONTENT, districtId, point)` converts district coordinates to level coordinates.
  - Unwalkable tiles fall back to the Terminus spawn.
- **Item gallery:**
  1. In the game tab, import `/@fs/<repo>/packages/shared/src/index.ts` and `/src/render/items/itemSprites.ts`.
  2. Render `itemIconUrl(item)` for each item into a fixed overlay grid.
- **Live server:** 192.168.1.245 was off the network on 2026-11-15 (Cloudflare 523). The owner parked this.

## Done in this stretch

- **Medicine boosts:** a buff bar, boosts persisted across logout, and food and medicine split.
- **Weather:** rain, drizzle, mist, embers, ash, spores, dust and sparks, set per district in layout ambience. Plus height fog, wet sheen, light cones and lightning.
- **Renderer:**
  - MSAA through the composer, plus a finishing pass: grade, light sharpen, vignette, dither.
  - Bloom keyed on peak channel; `EMISSIVE_GAIN` 1.15.
  - Contact shadows and actor fill.
  - Wall facing shade; shadow texel snapping.
  - Floor grime, macro variation and terrazzo chips.
- **HUD:**
  - Tab strip with type tokens.
  - Journal state pips and locked main quests.
  - Slot states.
  - World map fill and hatching.
  - Settings toggles.
  - Roster vacant cards.
- **Containment licences removed.** Containment now needs only the Containment level.
- **Storyline:** Rent Day now opens the Site Meridian storyline. The quest helper counts shopkeepers as item sources (the Noodle Run bread).
- **Items:**
  - The psionic Focus (trace-shard clamp) and Resonator (hooped pylon) are rebuilt as icons and as held models in `characterModel.ts` `HELD_GEAR`.
  - 14 new icon shapes.
  - Armour lines differ by motif in gloves, trousers, boots, hood and cowl.
  - Skirmisher has no glow.
  - Dark tiers brightened.

## Open items, in priority order

1. **Item critic, round 3 not yet run.**
   - The round 2 fixes are applied: grips, the larger Resonator, alloy cloth colours, bowl and dish colours, hood and cowl detail, eel thickness, hand-leaf colours.
   - Re-shoot the galleries and ask the critic for a verdict. The held weapons on a character are still unchecked.
2. **On-body armour.** Bulwark gauntlets, greaves and boots differ from the other lines only by small trim in `characterModel.ts`. The critic's spec:
   - Bulwark: vambrace, tasset, knee cop, toe cap, shin plate.
   - Skirmisher: hood peak, right-leg holster.
   - Adept: bell cuffs, leaning cowl point, split skirt panels.
3. **Fidelity critic items not yet applied** (from the round 1 list):
   - **Ground props:** set `groundY` side-face AO in `voxelMesher.ts`, plus an instanced voxel-stepped shadow quad per object footprint in `chunkView.ts`.
   - **Convex edge lift:** `EDGE_LIFT` 1.12 in the mesher, and halve the wall cap rim.
   - **Window light spill:** `litWindowGlow` shared between `levelVoxels.ts` and `wallLights.ts`, with a FillLight on the outdoor tile at intensity 0.3, radius 2.2.
   - **Paving:** running bond, per-slab tone, and kerbs where paving meets asphalt.
   - **Wall-top parapet:** coping joint and roofing tray.
   - **Albedo-aware light shoulder:** check indoors before keeping.
   - **Skyline ring for low pitch:** optional.
   - **Canal water:** `liquidSurface.ts` is unlit and fogless, so it doesn't reflect neon.
4. **Fidelity critic round 2.** Run it after item 3, with the new Market Row and Cordon shots.
5. **Skipped renames** (would change item IDs; add `RENAMED_WARD_ITEMS` entries if done):
   - Focus → Conduit
   - Plate → Cuirass
6. **Panel drop shadows:** `.panel` uses `clip-path`, which clips its `box-shadow`. Needs a different technique.
7. **Hazard Shielding:** it now reduces hazard damage, but no encounter in the Ward defines a hazard mechanic yet.
