# Furnishing audit and placement rules

An audit of the world's object types, models and hand-placed furnishings, made after every room was furnished by hand. It led to the placement rule set in `WORLD_DESIGN.md` (Placement), the catalogue behind it (`content/furnishingCatalogue.ts`) and its checks (`content/placementIntegrity.ts`).

## Types

- **Room themes.** 18 `DRESSING_THEMES`, which until now only chose the passers-by in safe rooms. 4 of 195 rooms named none (the Heart Bed, the Well, the two Verdant Fold creases). A theme now says what a room is for and which props belong in it, and a room that is two things says so with `also`.
- **Objects.** About 130 placeable props had no statement of how they stand or where they belong. Every one now has a profile: a mount (`wall`, `backed`, `free`, `seat`, `flat`), its home themes, and whether it comes in rows. A catalogue test keeps profiles and signatures pointing at real objects, and the content check refuses a placed prop with no profile.
- **Prefabs.** Roles beyond `focal`, `wall` and `bay` are no longer read by anything. Prefabs gain a `rows` flag for units meant to repeat (bunk rows, long tables, pews, shelving aisles, ward beds), so the repetition rule can tell a dormitory from a metronome.
- **Floors.** `ceramic` and `boards` had no rule for where they go; they now fit the room's theme. One room broke it (Vesper admissions, ceramic in an office), now terrazzo.
- **Condition and decals.** `condition` is only a label since the composer went. The seven condition decal kinds (wear, scorch, cracks, moss, water stain, salt crust, alien vein) have no uses; the only hand-placed decal in any layout is one mosaic. Left as is; see Open.

## Models

- All 186 object models are used. Models shared between objects are deliberate story variants (ten terminals, fifteen bulkheads, the rifts).
- **The desk drew its own chair.** 92 of 124 desks also had an `office-chair` placed at their working side, so they showed two chairs. The desk model is now a plain desk with its monitor (no chair, mug or notes), and the 32 desks that had no chair were given one; one sat on a cable run and was left without.
- **The pharmacy counter was a canteen counter.** Apothecary Lowe's dispensary used seven serving counters (warming trays, "something brown"). New `dispensing-counter`: dark oak, a brass rail and three jars.
- **The laundry pushed ledger trolleys.** New `linen-cart`: a canvas bin on castors.
- **Two shelter prefabs seated a bench in another bench's lap.** `platform-shelter` now seats them back to back; `shelter-stop` has one bench facing out from under the canopy, since a canopy's corner posts leave only its middle column free.

## Furnishings

The first run of the checks over the hand-furnished world found 553 problems:

| Rule | Found | Notes |
| ---- | ----: | ----- |
| Backs go against something | 404 | Single-sided bookcases, cabinets and sorting cases standing free in the middle of rooms, and ranges facing away from the wall they stood beside |
| Doorways stay clear | 88 | 31 once wide openings were judged by their gap instead of their edge |
| Props belong where they stand | 20 | Gas cylinders in an office and a barracks, ledger trolleys in a laundry, filing cabinets in a mine yard, serving counters in a pharmacy |
| Seats face something | 16 | The shelter benches above, and stools round the Ember Landing's slag ladle |
| A room shows what it is for | 11 | Mostly rooms whose theme was wrong (spans themed `cold`, a lift landing themed `camp`) |
| No metronome | 8 | 21 potted ferns every 8 tiles down the west boulevard, 10 planters every 16 down the east one, lamps every 16 across the Brine Pans |
| Every room has a purpose | 4 | |
| Catalogue, floors | 2 | |

All of them are fixed, and `findContentIssues` reports nothing. The larger reworks:

- **The Circuit's boulevards** are dressed by what they pass: luggage outside the dormitory and barracks, a vending alcove by the canteen, food drums by the mess hall, pallets and a lamp cart at the stores, ledger trolleys by the reading room, containers waiting at the freight link, banner masts flanking both Atrium gates and directory pylons at the junctions. Seating groups vary in kind and sit in irregular bays between the columns. The Chasm Promenade's benches face the glass.
- **The Drowned Stacks** are short back-to-back ranges at right angles to the walls, with cross aisles and two ranges collapsed into rubble, instead of two 52-long lines of bookcases.
- **The Vesper Pharmacy dispensary** has its oak counter, and its prescription cabinets line the rotunda's curved walls. In the stockroom, filing cabinets stand against the south faces of new rack runs.
- **The Hydroponics seed vault** has catalogue cabinets along its north wall, one back-to-back island and a reception desk by its open side.
- **The Brine Pans** have work lamps beside the carts and salt they light; **the Undercroft tunnel** gathers its pipework into manifolds; **the Sanatorium Rise** is a climb with four resting landings.
- Mixed rooms say so: Gardeners' Row (`garden`, also `dormitory`), the drivers' rest (`canteen`, also `dormitory`), the weighbridge (`mine`, also `office`), the Foreman's office (`office`, also `mine`).
- Smaller fixes were made by a script that tries moves of up to four tiles, turns, and keeps a change only when the checks improve without new overlaps: cabinets turned to back onto walls, pieces nudged off doorways, a ward's bed bay moved off its corridor opening, vending machines backed onto the colonnade.

## Open

- The checks hold the floor of quality, not the ceiling. Rooms that pass can still read as a grid; the Vesper stockroom and cold store repeat one bay layout between their pillars. They need a pass by eye.
- "A walking line two tiles wide between openings" is judgement, not checked; reachability is checked one tile wide.
- The condition decals are unused. Either place them by hand in decayed districts or retire the kinds.
- `npm run audit` (`world/audit.ts`) scores density against each district's median; it could score against the catalogue's themes instead.
