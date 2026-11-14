# Phase 2: the look of the city and the first model kit

Part of `2026-11-13-world-rebuild-design.md`. The owner said "go", so the choices below are mine and stand until the owner overrides them.

## The look in one line

A working city at permanent dusk: wet asphalt and old brick lit by sodium street lamps and shop neon, with the Directorate's facilities standing out as clean pale compounds banded in signal orange.

## Rules

1. **Two visual languages.** The city is warm, worn and improvised: brick, blockwork, corrugated cladding, sodium orange, shop neon in magenta, cyan and acid green. The Directorate is cold, clean and deliberate: off-white panels, signal-orange bands, black lettering, cyan task light. You can tell from across a street which one you are looking at.
2. **Security reads in colour.** Low-security containment uses amber; high security uses red. Deeper levels lose the warm city colours entirely.
3. **Light comes from things.** Outdoor districts sit under a dusk sky. Light comes from lamps, lit windows, signs and vending machines, so every street light is a placed object that casts light.
4. **Chunky silhouettes.** Each model is built from a few large blocks at 16 voxels a tile. You should be able to name it from its outline alone. Detail is limited to one or two accents, such as a lit panel, a stripe or a sign, and never noise.
5. **Height tells you importance.** Street furniture is below head height, lamps and poles stand about 2.5 tiles tall, and walls are 2 tiles. Landmarks are the only things taller than walls.
6. **Buildings are rooms.** A building is an indoor room beside a street. Its wall material decides how it looks from the street and from inside.

## Palette

| Role | Colour |
| ---- | ------ |
| Asphalt / wet asphalt | `#2c2e30` / `#3a3b3c` |
| Brick | `#6e3b2e` with `#4f2a20` mortar |
| Blockwork | `#5a5f63` |
| Cladding | `#3e5560`, ribbed |
| Directorate panel | `#d8d6cc` with `#e86a1c` band |
| Sodium lamp | `#ffb35a` |
| Lit window | `#ffd08a` |
| Neon | magenta `#ff4fa8`, cyan `#4fe3ff`, acid `#b6ff4f` |
| Containment: low / high | amber `#e8a21c` / red `#d8322a` |

## Engine work

- **Wall materials.** There are new wall tiles: `brick`, `blockwork` and `cladding`. A room may name its `wall` material. The wall between a building and a street takes the building's material. `wall` itself stays the Directorate panel.
- **Facades.** A wall face that looks onto open ground is painted as an exterior: it has a plinth, a material texture, and lit or dark windows at a regular spacing. A face looking onto a room is painted as an interior finish with a skirting and a dado line. The Directorate panel's exterior is pale with an orange band.

## The first kit

| Group | Models |
| ----- | ------ |
| Street | street lamp, bollard, bench, litter bin, vending machine, dumpster, street tree in a planter, utility pole, parked car (2×1), food stall (2×1), checkpoint barrier, steam vent |
| Wall-mounted | neon sign, shop awning, security camera, notice board, Directorate sign |
| Interior | counter, shelving, table, chair, bed, storage locker |
| Containment | containment cell (2×2), keycard reader |

Ground Zero becomes a short street that shows the kit: a brick shopfront with a shopkeeper behind a counter, a blockwork tenement entrance, a Directorate checkpoint, and the street furniture in use. It is a test bench, not the overworld. Phase 3 lays out the real city.

## Status

Built: the wall materials and facades, a `paving` tile for pavements, the 25 kit models (`client/src/render/models/cityModels.ts`) with their objects (`shared/src/content/seed/cityKit.ts`), the dressing themes `street`, `shop`, `home` and `containment`, dusk lighting where the sky tints the sun, and Ground Zero as a kit test bench. It passes every content check.

Checked in the game: at first the dusk was too bright, because the ambient light kept the floor meant for buried interiors and the sodium lamps reached about 10 tiles each. Now a dark sky cuts the ambient and key light (`DUSK_AMBIENT_CUT`, `DUSK_KEY_CUT`), lamps light a pool of about 4 tiles, and paving is a darker grey. The asphalt reads dark, with lamp light pooled under each lamp.

The owner approved the direction. Phase 3 is `2026-11-14-first-region-design.md`.
