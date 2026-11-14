# Phase 3: the first region of the city

Part of `2026-11-13-world-rebuild-design.md`. The owner approved it on 2026-11-14 with one change: the overworld is open ground you can explore freely, as in RuneScape, not a set of connected rooms. The names are placeholders the owner can replace.

## The place in one paragraph

**Hollow Bay** is a port city that kept working after the anomalies came. The first region is **the Low Ward**: the old docks quarter around **Site Meridian**, the Directorate's oldest containment facility. A new operative arrives by train at Terminus Square. They live and trade among dockworkers, stallholders and tenants, and they work at Site Meridian. Its gate is a short walk across the canal. Above ground the Site holds intake and low-security containment, marked in amber. Beneath it are the high-security levels, marked in red, and every level down is harder. The Ward's east edge is the **Cordon**, a Directorate wall across the old shipyards. The anomalies are worst beyond it, and it is where the next region attaches.

## Plan in one sentence

A ring of streets around the canal basin, with Site Meridian on the island in the middle, the quiet quarters west and the rough ground east toward the Cordon.

```
                 N
   +-----------+-----------+-----------+
   | Tenements | Market Row| Scrapyards|
   |  (home)   | (shops)   |  (T1-2)   |
   +-----+-----+-----+-----+-----+-----+
   |Terminus   |  Canal Basin    | Shipyard|
   | Square    |  [Site Meridian | Fringe  |==> Cordon gate
   | (hub, rail)|   on the island]| (T2-3)  |    (reserved)
   +-----+-----+-----+-----+-----+-----+
   | Laundry & |  The Cut  (canal works) |
   |  Gardens  |       (T1)              |
   +-----------+-------------------------+
                         |
              Site Meridian, below ground:
              B1 Intake (amber, T2) -> B2 Secure Wing (red, T3-4) -> B3 the Vault (dungeon, boss)
```

## Open ground

Every overworld district is a 64×64 square of open ground. Its `ground` room fills the square and runs flush to every side that joins a neighbour, and the exit on that side spans the whole edge, so the city is one continuous surface. Roads, plazas, yards and parks are patches of `asphalt`, `paving`, `gravel` and `grass`. Buildings are `building` steps standing in the ground: a walled interior with doors. Only the levels below Site Meridian are rooms joined by links.

The squares sit on a grid, so the map in the plan above is literal: each cell is one square.

## Districts

All are on the overworld level at depth 0, unless marked as below ground. Each square joins its neighbours along whole edges.

| District | What it is | Tier | Skill filler | Landmark |
| -------- | ---------- | ---- | ------------ | -------- |
| `terminus-square` | **Home hub.** Rail terminus, square, locker office, general store, contract board, exchange post. All safe. | 0 | none | The station clock tower |
| `tenements` | Blockwork tenements around a courtyard, with three or four small homes you can enter. Residents with small problems. | 0 | none | The courtyard washing lines |
| `market-row` | A covered street market, a noodle bar and a pawnbroker. Specialist shops for each skill line. | 0 | none | The market canopy |
| `laundry-gardens` | Allotments and a steam laundry on wasteland. | 0–1 | biochemistry (growing and picking) | The rooftop greenhouse |
| `canal-basin` | Quays around a basin, and **Site Meridian**: the Directorate compound on the island, with its gatehouse, intake hall, Holding Block A and the headhouse lift. | 1 | salvage (dredging), containment (low-security cells) | The headframe |
| `the-cut` | Canal works south: locks, pump house, sluices. Small anomalous creatures in the culverts. | 1 | salvage, refining | The lock gates |
| `scrapyards` | Breakers' yards and a crusher. Scavengers and things living in the scrap. | 1–2 | salvage, engineering | The magnet crane |
| `shipyard-fringe` | Derelict slipways against the Cordon wall, where anomalies leak through. The roughest ground above street level. | 2–3 | salvage, research (anomaly traces) | A beached hull |
| `cordon-gate` | A sealed Directorate gate at the east edge. A dead end for now. | 3 | none | The gate |

Below ground, reached only by the headhouse lift:

| Level | What it is | Tier | Colour |
| ----- | ---------- | ---- | ------ |
| `meridian-b1` Intake | Processing, labs, low-security wards. Quest work starts here. | 2 | amber |
| `meridian-b2` Secure Wing | High-security cells, a breached wing. | 3–4 | red |
| `meridian-b3` the Vault | Dungeon floor with a boss at the far end. | 4 | red, cold |

Tier rises with distance from Terminus Square: west and north are safe, the canal and the Site are tier 1, east is tier 2–3, and down is tier 2–4. That satisfies rule 13 without exceptions.

## How it is built (RuneScape principles)

- **Towns have residents.** Every safe district has named people, each with a line of examine text and something to say. About a third of them have a small problem, which phase 4 can turn into a quest.
- **Small enclosed interiors.** Each building is one indoor room, about 5×4 to 10×8, with a door onto the street. That covers shops, homes, the laundry, the pump house and the gatehouse. Streets are wide, and interiors are small and full.
- **Filler serves skills.** Every hostile or work district has at least one gathering spot that some skill uses, placed where the story says it would be: dredging spots on the quays, scrap heaps in the yards, plots in the allotments.
- **Examine text on everything** placed.
- **Quests change the place.** Phase 4 writes them. This phase leaves named rooms and fixed ids where they will happen: the Site gatehouse, the B1 intake desk, the Cordon gate and the tenement homes.
- **Open, not boxed.** You can walk anywhere on the ground. Roads, yards and parks are painted on it and buildings stand in it, with one back alley per square that rewards a look.

## Engine and kit work this needs

- **WORLD_DESIGN.md rewrite.** Replace the old facility's shape language and reserved ground with the city's: the street and building shapes, the floors (`asphalt` and `paving` outside; `terrazzo`, `boards` and `ceramic` inside), and the Cordon as reserved ground.
- **The level plan.** Replace Ground Zero with the ten overworld districts on `overworld` and add three levels under the Site. Ground Zero stays only as a test fixture.
- **More kit.** Water edges for the canal (quay walls, mooring posts, a bridge), scrap heaps, allotment plots, a crane, a hull, the clock tower, a gatehouse and a lift headhouse. These are drawn to the phase 2 art direction.
- **Tram.** One short line from Terminus Square to the canal basin, with the terminal rules as they stand. Walking stays the main way around.
- **Names.** Change the engine strings that say "Site Meridian" where they mean the city, such as the welcome line and the map title, to "Hollow Bay".

## Status

**Step 1 (built).** The `building` blueprint step. Terminus Square has the station, the general store, the locker office with the exchange post, the Directorate response post with the contract board, the noodle bar, and the clock tower in a paved square. The Tenements have a rooming house, six homes, a bakery, the Drowned Lamp pub, a washing-line courtyard, a back alley and a small park.

**Step 2 (built).**
- Market Row has a covered market hall full of stalls, four shops on the street (pawnbroker, tools, apothecary, radio), a stall yard and a car park.
- The Canal Basin has quays, a harbour office and a chandlery around the basin, and a bridge to the island.
- **Site Meridian** is a walled compound on the island, not its own square, so it really stands in the middle of the basin. It holds the gatehouse, the intake hall, Holding Block A with two amber cells, and the headhouse with the switched-off lift. Its headframe is the landmark.
- A `building` may now set an `edge`, so a compound is an outdoor yard walled with a barrier or fence.
- The four squares form a loop, so none is a dead end.
- New kit: market stall, headframe, mooring post, lift door.
- There are 23 named residents. Seven run shops, and their shelves are empty until phase 4.

**Step 3 (built).** Five more squares complete the surface. The grid is three wide and three deep, with the Cordon gate east of the Fringe.
- **Laundry & Gardens** (tier 1): Doherty's Steam Laundry and its chimney (the landmark), 36 allotment beds, Agnes's shed and a pond.
- **The Cut** (tier 1): a canal with a lock (the landmark), two bridges, the lock cottage and the pump house.
- **The Scrapyards** (tier 2): Hallam's Breakers, the crusher shed, ten scrap heaps and the magnet crane (the landmark).
- **The Shipyard Fringe** (tier 3, breached): slipways, a beached hull (the landmark), the slipway shed and the Directorate watch hut.
- **The Cordon** (tier 3, a dead end): the sealed Cordon gate at the end of a road, and the Cordon post.

The open ground of the Cut, the Scrapyards, the Fringe and the Cordon is hostile; their buildings are safe. New kit: allotment bed, washer, chimney, scrap heap, magnet crane, beached hull, lock gate and Cordon gate. There are 30 named residents.

## Order of work

1. Rewrite WORLD_DESIGN.md, then do Terminus Square and the Tenements end to end: layout, interiors, dressing and residents as named stand-ins. Walk them in the game.
2. Market Row, the Canal Basin and the Site compound above ground.
3. The Cut, the Scrapyards, the Shipyard Fringe and the Cordon gate.
4. The three levels below the Site.

Each step ends with the checks green, and the owner walks it before the next step starts.

## Out of scope

Quests, dialogue, items, creatures and recipes beyond stand-ins are phase 4. Creature homes and gathering nodes are placed with the existing placeholders, so the density and safety checks already hold.
