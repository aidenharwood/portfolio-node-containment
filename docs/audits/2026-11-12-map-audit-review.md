# Map audit review

This review goes with `2026-11-12-map-audit.md`, the findings `npm run audit` generates. Running the audit again replaces that file but leaves this one alone. The viewer links open the region editor (`npm run dev`).

## How the audit was done

- **Checks.** `findContentIssues`, which also covers the world-design and furnishing checks, reports nothing anywhere on the map.
- **Heuristics.** Every district was scored for empty rooms, density outliers, dark rooms, lone dead ends, people out of place, and exits that meet a neighbour of a different width.
  - The first run flagged 9 dark rooms and 18 dead ends that were the heuristics' fault, not the map's.
  - Every room inside an area gets wall sconces in play, so dark-room checking now counts those as light.
  - Rooms in the Deep Concourse and Meridian Below connect by shared floor rather than link steps, so dead-end checking now counts gaps in the floor along a room's edge.
- **Looking.**
  - Every level was viewed whole in the 2D plan: the main floor, the Deep, the Undercroft, Meridian Below, the Verdant Fold, the Dead Letter Office, the Calder Deeps, the Cold Ward and the Threshold. That covers all 31 districts.
  - The Atrium, the Circuit, the Salt Cathedral, the Verdant Fold and the Waterworks were also viewed in 3D under survey light.
  - The browser pane was hidden for most of this, which throttles the 3D view, so the 3D look is partial.

## Fixed

| District | Finding | Fix |
| -------- | ------- | --- |
| The Verdant Fold | `west-crease` and `east-crease`: 80 walkable tiles each, nothing in them | A `grove-planters` set-piece in the quiet end of each, mirrored (`verdant-fold-setPieces-1` and `-2`). Room dressing could not help: each crease opens onto the grove along most of its length, and the composer keeps clear of openings. Made in the editor and saved through it. |

## Second pass: landmarks and a full 3D look

Every district was shot whole in 2D and at its landmark in 3D with headless Chrome, which renders the 3D view fully even when the browser pane is hidden. That covers all 31 districts in both views.

| District | Finding | Fix |
| -------- | ------- | --- |
| Every district but the Atrium and the Verdant Fold | No landmark you could see from a distance | A focal set-piece in each, from 23 new landmark objects (`content/prefabs/landmark.ts`, models in `render/models/landmarkModels.ts`). The Atrium keeps its hand-composed plaza and the Fold its grove. |
| Calder Deeps, Salt Cathedral, Cold Ward, Vesper Pharmacy, Vesper Wards | Great halls repeated one pattern of pillars and four pools | The halls were reshaped: the Old Workings is a round cavern, the Cathedral nave has a north and a south chapel, and the Pharmacy surgery has two theatres and two recovery wards off it. |
| Service Concourse | Its gantry crane repeated the Service Yards' landmark | A Stack Tower: four containers stacked crosswise with a beacon on top. |
| The Cryovault | Its containment tank repeated Sector 2's | A Cryo Core: a blue-lit glass column of coolant with frosted feed pipes. |
| Porter's Lodge | Its brazier repeated the Calder Gatehouse's | A Ward Call Board: an oak board with a lamp for every bed and a brass bell. |
| Furnace Causeway | A third brazier | A Slag Ladle on its trunnions, still glowing. |
| Verdance Concourse | Its "landmark" was six planters, invisible from a distance | A Bell-Jar Orchard: one fruit tree under a brass-ribbed glass dome. |
| Deep Concourse | Its four turns copied the Circuit's four plaza landmarks, so the Deep read like the main floor | Four survey beacons, red, green, blue and amber, one per turn, so you can tell where you are on the ring by colour. |
| Salt Cathedral chapels | Each held the Founders' statue, a main-floor civic piece that is also Sector 3's landmark | A salt shrine of candles and offering sacks against each chapel's back wall. |
| Calder Gatehouse | Carpeted like the Vesper wing; Calder is rust and concrete | Concrete floor. |
| Porter's Lodge and Calder Gatehouse | 58×44 halls with about 3 placements per 100 tiles. The camp library had 7 prefabs, each limited to 3 per room, so no composition could fill them. | Bunks and mess tables added to the camp library (`bunk-block`, `bunk-pair`, `long-table`); this also furnishes the camp rooms in eight other districts. Each outpost got two themed set-pieces of its own: gurneys in the Lodge, salt sacks and mine carts in the Gatehouse. About 70 placements became about 170. |

Every landmark object now stands in one district only, apart from the four Circuit plazas, which each hold one of their own.

### Dead-end rooms

Twelve dressed side rooms had one way in and nothing to do. Each now holds a gathering node at the tier of its district, against the wall furthest from its door:

| District | Room | Node |
| -------- | ---- | ---- |
| The Verdant Fold (tier 2) | `west-crease`, `east-crease` | Strangler vine, spore bloom |
| Service Concourse (tier 1) | `container-stacks`, `salvage-lot` | Resin drum, scrap heap |
| Verdance Concourse (tier 1) | `irrigation-plant`, `compost-yard` | Moss bed, strangler vine |
| Salt Cathedral (tier 11) | `north-chapel`, `south-chapel` | Salt seam, geode cluster |
| Vesper Pharmacy (tier 13) | `theatre-one`, `theatre-two` | Tincture stills |
| Vesper Pharmacy (tier 13) | `recovery-one`, `recovery-two` | Physic cabinets |

The audit now reports four dead ends, all of them the Deep Concourse bridge spans below.

## Not problems

- **Deep Concourse `north-span`, `south-span`, `west-span`, `east-span`: "one way in and nothing to do".** These are bridges over the chasm. Their far ends cross on walk-under deck spans, which the heuristic counts as void. They are walkways by design.
- **Meridian Below `the-well`: "28 walkable tiles and nothing in it".** The well is a round coolant pool. The 28 tiles are the corners of its rectangle outside the circle, and they belong to the hall around it.

## For you

These are judgement calls, so they are left unchanged.

1. **Meridian Atrium `plaza` is sparse**: 2.0 placements per 100 tiles against a district median of 11.2. You asked for this when the plaza was stripped back to the core, its compass and two bench rings. If you want a little more life, I suggest two `bench-curve` pairs or a few `potted-fern` at the far ends of the plaza, away from the routes. [View](http://localhost:5173/editor.html?district=meridian-atrium&room=plaza)
2. **Porter's Lodge and Calder Gatehouse are still near copies of each other in plan**, mirrored across the tram line. Their landmarks, floors and set-pieces now differ, but a second room or a mezzanine in one of them would make each outpost recognisable from its shape alone.

Neither is a bug.

## Known limits of the heuristics

- Rooms shaped as octagons or circles are counted by their rectangle.
- Bridges made of deck objects are not seen as floor.
- The dark-room check trusts the client's wall sconces, so a failing-fixtures district can still read darker in play than the audit suggests.
