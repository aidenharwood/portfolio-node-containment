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

## Not problems

- **Deep Concourse `north-span`, `south-span`, `west-span`, `east-span`: "one way in and nothing to do".** These are bridges over the chasm. Their far ends cross on walk-under deck spans, which the heuristic counts as void. They are walkways by design.
- **Meridian Below `the-well`: "28 walkable tiles and nothing in it".** The well is a round coolant pool. The 28 tiles are the corners of its rectangle outside the circle, and they belong to the hall around it.

## For you

These are judgement calls, so they are left unchanged.

1. **Meridian Atrium `plaza` is sparse**: 2.0 placements per 100 tiles against a district median of 11.2. You asked for this when the plaza was stripped back to the core, its compass and two bench rings. If you want a little more life, I suggest two `bench-curve` pairs or a few `potted-fern` at the far ends of the plaza, away from the routes. [View](http://localhost:5173/editor.html?district=meridian-atrium&room=plaza)
2. **Verdant Fold creases: "one way in and nothing to do".** They now hold planters but no reason to visit. I suggest a resource node (a herb or spore node from the Fold's crafting tier) in one of them, so a side pocket rewards a detour. [West](http://localhost:5173/editor.html?district=verdant-fold&room=west-crease) · [East](http://localhost:5173/editor.html?district=verdant-fold&room=east-crease)
3. **Service Concourse `container-stacks` and `salvage-lot`: dressed side rooms, one way in, nothing to do.** I suggest a scrap or salvage resource node in each, matching their names. [Stacks](http://localhost:5173/editor.html?district=service-concourse&room=container-stacks) · [Lot](http://localhost:5173/editor.html?district=service-concourse&room=salvage-lot)
4. **Verdance Concourse `irrigation-plant` and `compost-yard`: the same pattern.** I suggest a moss or soil node in the compost yard and a water valve or pump in the irrigation plant, perhaps tied to a Hydroponics side quest. [Plant](http://localhost:5173/editor.html?district=verdance-concourse&room=irrigation-plant) · [Yard](http://localhost:5173/editor.html?district=verdance-concourse&room=compost-yard)

None of these is a bug. Each is a room that looks finished but gives the player no reason to walk into it. Adding nodes or quest objects changes gameplay, so I have left those for you.

## Known limits of the heuristics

- Rooms shaped as octagons or circles are counted by their rectangle.
- Bridges made of deck objects are not seen as floor.
- The dark-room check trusts the client's wall sconces, so a failing-fixtures district can still read darker in play than the audit suggests.
