# The overworld: a city above the facilities

> **Superseded** by `2026-11-13-world-rebuild-design.md`. The premise here (an open city with containment facilities, security rising with depth) carries over; the Cordon slice it describes was removed with the rest of the old world. The outdoor tiles, room edges and sky ambience it introduced remain in the engine.

## Intent

The two-arm world is correct and soulless. Every space is a room carved out of rock, so nothing feels like going inside, nothing feels like going down, and the space between places is a quota. This design moves the lived-in world above ground into an open city and keeps the underground for the facilities' deeper, higher-security levels. It starts as one vertical slice, built story-first, to prove the method before the rest of the world is redrawn to it.

The premise below is the owner's: an open, somewhat dystopian, cyberpunk-but-functional overworld where the containment facilities are the focal points. Details filled in for the slice are marked as proposals.

## Premise

**The overworld is a city.** It is dense, worn and lit by signage, but it works: trains run, shops open, people go to work. Facilities are what you navigate by. Each one is a walled compound with its own character, and the bigger it is, the more of it is underground.

**Security rises as you go down.** Street level holds the amenities and low-security containment: annexes, holding yards and intake. The deeper levels of a facility, and the harder facilities further out, hold the higher-security work. The existing underground world (the Atrium and everything below it) becomes the deep levels of Site Meridian, the facility at the heart of this part of the city.

**At some point, anomalies started showing up.** Nobody knows why. The Directorate's answer was to wall off the worst districts and contain what it could.

**Proposal for the slice: the Meridian Cordon.** Site Meridian stands inside the Cordon, a district walled off by the Directorate after the first anomalies. The player arrives on the last train in, and the gate seals behind it. The Cordon wall is the edge of the playable world, and later content opens gates through it into the rest of the city.

**Proposal: Sector 2 and Annex Two.** Sector 2 was sealed last cycle with Dr. Mira Halvorsen's team inside. It lies under **Annex Two**, a low-security containment annex in the Cordon, and the knocking comes up through the annex floor. The street can hear it at night.

## Goals

1. New operatives start at street level, on the open ground of the Cordon.
2. The overworld is open ground with buildings and facilities standing in it: asphalt, concrete, gravel, grass and water, bounded by cordon barriers and chain-link rather than rock. Buildings are enclosed and joined to the street by doors.
3. Going down is a deliberate act that raises the stakes: the Site Meridian headhouse lift to Intake, and the sealed stair under Annex Two to Sector 2.
4. The opening and The Knocking are written as moments in places, with people who have a stake in them.

## Non-goals

- Redrawing the underground. The two-arm world stays as built and becomes Site Meridian's deep levels. Sector 2 keeps its Hydroponics bulkhead and gains the stair from above.
- Rewriting the tutorial (Orientation Protocol to Cleared for Transit). It still runs in the Intake Wing.
- Elevation. The grid stays flat; barriers and fences are drawn as edge tiles.

## The slice

A new floor level, **the Meridian Cordon** (`meridian-cordon`, depth 1), with three districts:

| District | What it is | Notes |
| -------- | ---------- | ----- |
| `cordon-gate` | The rail terminus at the Cordon wall, the checkpoint and the plaza outside. | Arrival. Dead end against the sealed gate. |
| `meridian-ward` | A city block round a square: the lodging block, a canteen, the company store, a clinic, the Response post and the Site Meridian headhouse. | The street-level home outpost. |
| `annex-two` | A fenced low-security containment annex with the stair down to Sector 2. | Dead end. Where the knocking is loudest. |

### Opening: Last Train In

A new main quest before Orientation Protocol, in the Induction questline.

1. Step off the train and clear the checkpoint.
2. Watch the Cordon gate seal behind the train.
3. Find your billet in the ward.
4. Take the headhouse lift down to the Intake Wing. Orientation Protocol starts there.

### The Knocking, rewritten

Step ids and order are kept so the rest of the story holds. Kade now sends the player back up to street level. The second step moves from Archivist Sel to **Tomas Halvorsen**, Mira's brother, who stands at the Annex Two fence every night and knocks back. Sector 2 is entered down the stair inside Annex Two. The log still goes to Sel, who still reveals Sector 3.

## Engine

- **Outdoor tiles:** `grass`, `dirt`, `gravel` and `asphalt` (walkable), `water` (liquid), and the edge tiles `barrier`, `fence`, `rock` and `trees` (wall structure).
- **Edges:** where the blueprint walls a void tile, it uses `wall` if any neighbouring floor is indoors, and otherwise the room's `edge` (`barrier` by default). So a building on a street gets walls and the street's outer edge becomes a cordon barrier or a fence.
- **Daylight:** a district's ambience may set `sky`, a colour drawn as the background and used to brighten the key light, so open ground reads as outdoors.

## Approaches considered

| Approach | Trade-off |
| -------- | --------- |
| **Slice first (chosen).** Build the surface and the opening beside the existing world. | Proves the feel cheaply; the underground is reused unchanged. |
| Redraw everything to the surface plan at once. | A fourth whole-world rebuild before knowing whether the method works. |
| Put the surface on the main floor. | One level is one flat grid; surface and underground would be side by side, not above and below. |

## Status after the first pass

Built: the outdoor tiles and edges, daylight, the `meridian-cordon` level with its three districts, Last Train In, the Knocking routed through Tomas and the annex stair, and the cages between the Ward, Intake and the Atrium. The Cordon districts sit in the `meridian-core` region so the Atrium stays the home hub and the main floor stays the overworld for the existing checks; moving the overworld to the Cordon is a later step.

Not done, and the real work: the Cordon is still rectangles dressed with facility props. Most of the prefab and furniture library was made for interiors of a buried complex and does not suit open streets. Next:

1. **A street kit.** New props with plain, readable silhouettes: street lamps, neon and shop signs, awnings, market stalls, parked and burnt-out vehicles, bollards, cable poles and overhead wires, dumpsters, street trees in grates, rain puddles, steam vents, security cameras, checkpoint barriers. Prefabs built from them: a market row, a bus stop, a food stall, a shopfront.
2. **A RuneScape-minded layout pass.** Streets that bend and narrow, buildings of different sizes with small interiors, a back alley or two that rewards a look, and filler that serves skills (scrap yards to salvage, rooftop gardens to tend, a canal to dredge).
3. **Residents.** Named people in the Ward with something to say and a small problem of their own, and examine text on everything.
