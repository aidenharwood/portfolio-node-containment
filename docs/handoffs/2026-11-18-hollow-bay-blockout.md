# Handoff: Hollow Bay blocked out beyond the Cordon

Written 2026-11-18. The owner asked for the world to grow from the Low Ward's "small settlement" into a vast city with several containment facilities, starting with the empty world and a plan for its content.

## What landed

- **The plan:** `docs/superpowers/specs/2026-11-18-hollow-bay-atlas.md`, with the assembled map in `2026-11-18-hollow-bay-atlas.svg`.
  - Seven wards ring the bay. The north shore runs from the Cordon gate: the Old Shipyards (tiers 14–15), the Heights (18–19) and Ironside (22–23). The south shore runs from a new sluice gate at the Cut: the Tidemarsh (16–17), Old Town (20–21) and the Drowned Quarter (24–25). Both shores meet at the Lantern (26–27), and the Hollow (28) lies under the bay.
  - Each ward has a Site: Caisson, the Brinehouse, the Spire, the Ossuary, Bellows, Fathom and the Lantern.
  - The plan also sets the tier ladder to 200, a gear material per ward, the story chapters from Gate Duty to Hollow Bay, the square-by-square content, and the build order.
- **The empty city:** 42 new 64×64 squares on the overworld, which grows from 256×192 to 640×512 tiles.
  - Layouts are in `content/districts/layouts/*.json`, loaded by `content/districts/hollowBay.ts`. They are wired in `levels/overworld.ts` and `levels/shippedContext.ts`, and the layout index lists every file.
  - `content/seed/hollowBay.ts` holds the regions, seven quartermasters with stand-in shops and dialogue, and the `market-mailbox` (collect only).
  - It also holds seven landmark props, eight gate leaf doors and seven dormant Site lifts.
  - The Cordon gate is now a real two-leaf gate that opens when The Heart is complete. The Cut has a sluice gate on its south edge, opened by `ward-open:tidemarsh`. Every other ward gate opens on `ward-open:<region>`, and nothing grants those flags yet.
- **Client models** (`render/models/cityModels.ts`): `gateLeaf`, `gantryCrane`, `windpump`, `directorateSpire`, `bellTower`, `coolingTower`, `divingBell` and `lighthouse`. Checked in the editor's 3D view: the lighthouse, the Spire and the cooling towers.
- **Docs:** `WORLD_DESIGN.md` has a Wards section and new reserved ground. The world structure note in `ARCHITECTURE.md` and the tier note in `CONTRIBUTING.md` are current again.
- **Test:** `client/test/ambienceBlend.test.ts` found the Fringe at fixed level coordinates. It now asks the layout, because the Heights moved every origin 128 tiles south.

`findContentIssues` reports nothing, `npm run typecheck` is clean, and all 793 tests pass.

## How the block-out was made

The dressing is a first pass from a one-off generator script kept outside the repo, because `WORLD_DESIGN.md` says nothing in the repo composes rooms.
- It drew ground, exits and gate exits from the ward grid, then roads, water, compounds and buildings.
- It dressed each building from a recipe for its kind, turned to face its door, and dressed the streets with lamps, benches, trees, mooring posts and the ward's props, kept clear of doors and walls.
- Every layout passes every check, but the dressing is plain. Re-dress each ward by hand in the editor when its content lands.

## Open

1. **The Old Shipyards come next.** In order:
   - grow `TIER_LEVEL_FLOORS` to 60 and 70, after pinning `depletionChance` so existing nodes keep their depletion;
   - build Site Caisson's three levels and wire `caisson-lift`;
   - write the Gate Duty chapter (Mercer and Voss);
   - add the ward's creatures, spots and keelplate gear;
   - re-dress the six squares by hand.
2. **Empty ground after The Heart.** A player who finishes The Heart can walk into the Old Shipyards, and it is empty for now. Gate the Cordon gate on a flag instead if that matters before Gate Duty ships.
3. **Capacity.** Re-run `npm run bench:tick` on the 640×512 overworld before raising `capacity`.
4. **The Bay Line** tram and the ferries across the bay are planned, not built.
5. **Landmarks.** Each ward has its Site landmark. The other squares still need one each.
