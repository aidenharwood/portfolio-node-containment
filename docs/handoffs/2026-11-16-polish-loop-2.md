# Handoff: polish loop, part 2

Written 2026-11-17, after the polish-loop commits 2a78e29, b29d355 and the final polish commit on `main` (branch `world-rebuild`, fast-forwarded to `main`). It replaces `2026-11-16-polish-loop.md` for the open items; that file still holds the background on the earlier stretch.

## How we work

The working rules from `2026-11-16-polish-loop.md` still apply:

- Push procedure: commit on `world-rebuild`, fast-forward `main`, push.
- Never commit `scripts/_*`, `.claude/launch.json` or `docs/superpowers/specs/*.png`.
- After each batch, run `npm run typecheck`, `npm test` (624 tests) and `node scripts/_issues.ts`.
- One Fable 5.2 critic agent per round, read-only, at high effort. Apply its list and re-shoot until it says "ship it".
- Don't touch the owner's dev server on 7420 or 5173.

### Previews and screenshots (new)

- **`preview_start` hangs** when this session isn't open in a desktop window (the owner works over Remote Control). The Browser pane then runs as a hidden background page: the world never finishes loading, and screenshots crop wrongly at DPR 3.
- **Start the game preview directly** in the background: `node <old scratchpad>/gamePreview.mjs`. It serves client 5176 and server 7421 with a scratch DB. To stop it, kill the process tree that owns port 7421.
- **Shoot with headless Chrome over CDP** using `scripts/_shoot.mjs` (local, never committed). Its argument is a JSON plan of `{wait, js, shot}` steps, and PNGs go to the session scratchpad under `shots/`.
  - It needs `token.txt`, the preview's `containment.sessionToken` from localStorage, in the scratchpad.
  - It deploys the first character automatically.
  - SwiftShader is slow: wait about 60 s for chunks to load. The "LOADING" chip stays up regardless.
- **Galleries and character lineups:** `scripts/_galleryRun.ts` exports `show('weapons' | 'armour' | 'misc', size)` and `held(sets, {zoom, yaw})`. Import it in a step with `import('/@fs/<repo>/scripts/_galleryRun.ts')`. `scripts/_lineup.ts` renders `CharacterRig`s in their own WebGL canvas.
- **Moving the test character:**
  1. Stop the server.
  2. Run `node scripts/_move.mjs '{"districtId":"canal-basin","position":{"x":57,"y":31}}'`. The stored location uses **district** coordinates, `{districtId, position}`.
  3. Start the server again.
  - The tile must be walkable *including objects*, or the character drops to the Terminus spawn. `scripts/_canal.ts` finds such tiles.

## Done in this stretch

- **Item critic round 3 applied:**
  - The Resonator is held on a yoke across both hands (`RESONATOR_AXIS`), with a level aim and a crossbar on the icon.
  - The Focus shard is a bulge.
  - The cloth and metal ladders are spread apart: grey rag, oilskin mustard, darker steel, bluer vault glass.
  - Gauntlets carry their cuff trim.
  - The carbine has a magazine; the rifle has a long scope and a bipod.
  - Sprites are framed on projected vertices, with a contour drop-shadow in slots.
  - The sprite rim light is moved forward.
- **On-body armour** (`characterModel.ts`):
  - Bulwark: vambrace, tasset, knee cop, shin plate, toe cap.
  - Skirmisher: hood peak, right-leg holster.
  - Adept: bell cuffs, leaning cowl point, split skirt panels.
- **Fidelity round 1 applied:**
  - Ground AO on props, plus stepped footprint shadows under props from their bottom 4 voxel layers.
  - `EDGE_LIFT` 1.12.
  - Window light spill fills.
  - Running-bond paving with kerbs.
  - Parapet coping and roof tray.
  - Lit, fogged canal water.
- **Fidelity round 2 applied:**
  - Water goes through `receiveFieldLights` with the wet block opted out, a body glow, voxel-cell sampling, a specular clamp, a lower level and kerbed quays.
  - Puddles are flat mirrors; damp tilt is 0.2.
  - Roof tray and coping are softened.
  - Footprint shadows use three nested half-voxel quads.
  - Grounding is at y=0.
  - Paving joints, terrazzo panels, chips and brick joints are quieter.

## Open items

1. **Unverified:**
   - Lamp-lit canal glints. The specular is clamped to 1.2 and sampled per voxel cell, but no shot has a lamp beside open water.
   - The Terminus terrazzo panels (`tx/4` tone) have had no fresh shot.
2. **Albedo-aware light shoulder** and the optional low-pitch skyline ring were not attempted.
3. **Skipped renames:** Focus → Conduit and Plate → Cuirass. Doing them needs `RENAMED_WARD_ITEMS` entries.
4. **Panel drop shadows:** `.panel` uses `clip-path`, which clips its `box-shadow`.
5. **Hazard Shielding:** no Ward encounter defines a hazard mechanic yet.
6. **Gameplay critique:** the owner asked for a new session that critiques gameplay and fun factor in the same critic-loop style.

## Critic verdicts

- **Item critic** (Fable 5.2): round 3 "not yet", round 3b **"ship it"**. Its optional on-body nits (cowl taper, knee cop, bandolier, holster) are applied.
- **Fidelity critic** (Fable 5.2): round 2 "not yet", round 3 **"ship it"**. Its non-blocking follow-ups (wet opt-out for liquids, specular clamp, cell-sampled glints, lighter roof tray, damp tilt 0.2) are applied. Its last request, a Terminus terrazzo shot and a lamp-by-water shot, is open item 1.
