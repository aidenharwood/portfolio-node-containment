# District Layouts and Viewer

**Status:** design approved in conversation, awaiting spec review
**Branch:** `world/district-layouts`, cut from `furnishing/world-dressing`
**Sub-project:** 1 of 2. Sub-project 2 (the interactive editor) gets its own spec once this one ships.

## Why

Districts are TypeScript modules that mix blueprint drawing, hand-listed fixtures, generated content and `furnish` calls. Nothing shows a district except the running game, whose camera is clamped close to the player. Authoring the Meridian Atrium meant working out coordinates by hand, writing throwaway ASCII dumps, and walking a character around to look. A layout that passed every check still looked wrong, and nobody could see that until the user played it.

## Goals

1. Each district's layout lives in one JSON file that people and tools can read and write safely.
2. A dev-only viewer shows a district as a 2D plan and a free-camera 3D view, with check failures marked on both.
3. Gameplay does not change: maps, instance ids, positions and dressing come out identical.
4. The format is ready for sub-project 2, an editor that changes everything: rooms, links, exits, pillars, patches, painted tiles and every placement.

## Non-goals

- Editing in the viewer (sub-project 2).
- Viewing a whole level of stitched districts at once; the viewer shows one district.
- Any change to rules, checks, content or gameplay.

## Who it serves

- **Claude** uses the viewer, deep links and the terminal plan to critique layouts before handing them over.
- **The user** uses the same viewer to review, and later the editor to change things directly.

## 1. The layout file

One file per district at `packages/shared/src/content/districts/layouts/<district-id>.json`.

```json
{
  "id": "meridian-atrium",
  "name": "Meridian Atrium",
  "subtitle": "Site Meridian — Central Hub",
  "tier": 1,
  "region": "meridian-core",
  "condition": "pristine",
  "ambience": { "darkness": 0.36, "tint": "#08141c", "fog": "#0c1c26" },
  "size": { "width": 126, "height": 104 },
  "steps": [
    { "kind": "room", "id": "plaza", "x": 32, "y": 22, "width": 62, "height": 50, "floor": "concrete", "shape": "octagon" },
    { "kind": "link", "from": "plaza", "to": "medbay", "width": 6 },
    { "kind": "exit", "id": "north", "room": "quarantine-gate", "side": "north", "width": 2, "gate": true, "floor": "door" },
    { "kind": "pillars", "room": "plaza", "everyX": 10, "everyY": 10, "inset": 6 }
  ],
  "tiles": [{ "x": 40, "y": 30, "tile": "hazard" }],
  "areas": [{ "room": "plaza", "name": "Atrium Plaza", "safe": true }],
  "anchors": { "transit": { "room": "lift-bay", "dx": 6, "dy": 24 } },
  "objects": [{ "id": "atrium-core", "object": "atrium-core", "at": { "room": "plaza", "dx": 29, "dy": 25 } }],
  "assemblies": [{ "id": "workshop-refinery", "install": "refinery", "at": { "room": "workshop", "dx": 0, "dy": 1 }, "facing": "east" }],
  "npcs": [{ "id": "atrium-ames", "npc": "staffer-ames", "at": { "room": "plaza", "dx": 29, "dy": 10 } }],
  "creatures": [],
  "lights": [{ "at": { "spot": { "room": "plaza", "dx": 29, "dy": 25 } }, "radius": 14, "color": "#9fd8ff", "intensity": 0.55 }],
  "decals": [{ "kind": "mosaic", "pattern": "compass", "at": { "room": "plaza", "dx": 27, "dy": 22 }, "width": 9, "height": 9 }],
  "setPieces": [{ "id": "atrium-plaza-ring-north", "prefab": "bench-ring", "at": { "room": "plaza", "dx": 28, "dy": 15 }, "facing": "south" }],
  "scatter": [{ "room": "plaza", "prefix": "plaza-litter", "pool": "litter", "count": 8 }],
  "dressing": { "plaza": { "theme": "civic", "density": "sparse", "composition": "radial" } },
  "furnish": { "cast": [], "landmarks": [], "decalSwaps": {} }
}
```

Every `DistrictDefinition` field a district sets today has a home here. Optional district fields (`reachedOnlyByTram`, `deadEnd`, `recovery`) are optional keys.

### Steps

`steps` records the arguments of today's blueprint helpers (`room`, `link`, `exit`, `patch`, `pillars`, `hollow`, `track`) in order, one object per call, with `kind` naming the helper. `drawBlueprint` stays the only code that turns steps into a map.

### Painted tiles

`tiles` is a sparse list of `{ x, y, tile }` applied after the steps. It is how the editor paints single tiles. Migrated districts start with an empty list.

### Positions

Every placement takes an `at`, which is one of:

| Form | Meaning | Today's equivalent |
| ---- | ------- | ------------------ |
| `{ "room", "dx", "dy" }` | tile offset inside a room | `plan.at(room, dx, dy)` |
| `{ "spot": { "room", "dx", "dy" } }` | the tile's centre point | `plan.spot(room, dx, dy)` |
| `{ "exit": "north", "index": 0 }` | a tile of a district exit | `plan.exits.north.tiles[0]` |
| `{ "link": ["a", "b"], "index": 0 }` | a tile of a link | `plan.linkTile(a, b, index)` |
| `{ "x", "y" }` | absolute tile | literal points |

Room-relative is the default, so moving a room carries its contents. A room-relative position outside its room is an error.

### Generated content

- `scatter` replaces `scatterObjects(plan, room, prefix, pool, count, taken())`. `pool` names one of the pools exported by `populate.ts`: `litter`, `office-props`, `civic-props` or `industrial-props`. A district that scatters from any other list gets that list added to `populate.ts` as a named pool during migration. It is seeded exactly as today, from the prefix, and avoids every placement listed before it, so output is identical.
- `assemblies` entries with `install` replace `install(id, installationId, position, facing)`. Plain assembly placements keep `assembly`, `span` and `facing`.
- `setPieces` replace `setPiece(plan, room, prefab, dx, dy, facing, instanceId)`, with `id` as the instance id.

## 2. Loading and migrating

### Loading

`packages/shared/src/world/layout.ts` provides:

- `DISTRICT_LAYOUT_SCHEMA`: a zod schema for the file.
- `buildDistrict(layout: unknown, hooks?: DistrictHooks): DistrictDefinition`: parses the file, draws the blueprint, applies painted tiles, resolves positions, expands scatter and installations, builds areas, and calls `furnish` with the `dressing` and `furnish` settings.
- `anchorsOf(district)`: the resolved anchors, for modules that export them.
- `printLayout(layout): string`: the one fixed JSON format (two-space indent, keys in schema order, one placement per line). Sub-project 2's editor saves with it.

`hooks` takes the rare piece that is genuinely code, such as a computed placement. The test is whether the editor could ever produce it: if it could not, it stays a hook. The migration should leave hooks empty for nearly every district.

A bad file throws one error naming the district and the JSON path, for example `meridian-atrium: objects[12].at.room "plazza" is not a room`.

Each district module shrinks to:

```ts
import layout from './layouts/meridian-atrium.json' with { type: 'json' };
import { anchorsOf, buildDistrict } from '../../world/layout.ts';

export const MERIDIAN_ATRIUM = buildDistrict(layout);
export const ATRIUM_ANCHORS = anchorsOf(MERIDIAN_ATRIUM);
```

Exported names stay the same, so `gameContent.ts`, `worldObjects.ts` and the anchor imports do not change.

### Migrating

A one-off script, `scripts/migrate-layouts.ts`:

1. Wraps the blueprint helpers, `plan.at`, `plan.spot`, `plan.linkTile`, `plan.exits`, `install`, `scatterObjects`, `setPiece` and `furnish` so that each call records its arguments.
2. Imports each district as it is today and writes the recorded calls as a layout file with room-relative positions.
3. Rebuilds every district from its file and requires a deep-equal match with the old `DistrictDefinition`: map, rooms, exits, anchors, areas, objects with instance ids, assemblies, NPCs, creatures, lights, decals, landmarks and dressing log.

Any district that does not match exactly stops the migration. When all 38 match, the old district code, the recording wrappers and the script are deleted in the same change.

## 3. The viewer

A dev-only page, `packages/client/editor.html`, served by Vite beside the game at `/editor.html`. It imports the layout files directly, so it needs no game server or login, and Vite hot-reloads it when a layout changes. It is left out of the production build.

### 2D plan (left)

A canvas showing:

- tiles coloured by kind (floor kinds, wall, door, hazard, track, void), room outlines and ids;
- every object at its true footprint, with a tick for its facing and the width and height swapped for `east`/`west`, coloured by kind: fixture, dressing, set-piece, quest or service;
- set-piece groups outlined once and labelled with the prefab;
- NPCs and creatures as dots, lights as radius rings, decals in their paint colours, anchors, exits and links.

Each layer can be toggled. Hovering a tile shows its absolute and room-relative coordinates (`61,47 · plaza +29,+25`) and what stands there. Pan and zoom are free.

### 3D view (right)

The game's own level and voxel renderer, fed the same district, so models, decals and lights match play. The camera orbits freely with no zoom limit. A "game angle" button snaps to the player's camera. Clicking the 2D plan points the 3D camera at that tile.

### Issues panel

The viewer runs `findWorldDesignIssues`, `findFurnishingIssues` and `findContentIssues` in the browser, and lists the ones that concern the shown district. Issues that name a tile are marked on both views. Clicking an issue moves both views to it.

### Deep links

The view state lives in the URL: `?district=meridian-atrium&room=plaza&view=3d&yaw=45&pitch=50&zoom=0.4&layers=objects,decals`. Opening the link restores the view exactly. Claude opens these in the browser pane to screenshot views; the user can share the view they are looking at.

### Terminal plan

`npm run plan -- <district> [room]` prints the ASCII plan (tiles, objects, NPCs, litter) with rulers, then the issues for that district or room.

## 4. Errors

- A malformed layout fails at load with the district id and JSON path, in tests, on the server and in the viewer.
- In the viewer, the failing district shows its error where the plan would be, and other districts still open.
- Issues from the checks are shown, never thrown, in the viewer.

## 5. Testing

- **Schema and content:** every layout file passes the schema, and `findContentIssues` stays empty.
- **Round trip:** for every layout, `printLayout(parse(file))` equals the file byte for byte.
- **Positions:** each `at` form resolves correctly; an unknown room, unknown exit and an out-of-room offset each fail with the JSON path.
- **Migration equivalence:** during migration only, every rebuilt district deep-equals the old one.
- **Viewer (client tests):** the plan draws a 3×2 object at the right footprint in all four facings; a view state written to a URL reads back identically.
- **In the browser pane:** the 3D view and plan are checked by eye on the Atrium, the Circuit and one deep district.

`npm run typecheck` and `npm test` pass at every commit.

## 6. Documentation

- `ARCHITECTURE.md`: districts are JSON layouts built by `buildDistrict`.
- `CONTRIBUTING.md`: how to change a layout and view it.
- `WORLD_DESIGN.md`, "Adding a district": write the layout file, open it in the viewer, clear the issues panel.

## Sub-project 2 preview

The editor adds selection, dragging and rotation of any placement or set-piece; adding and deleting; drawing and resizing rooms, links, exits, pillars and patches; tile painting; undo; and a dev-server endpoint that writes the layout with `printLayout`. Checks rerun on every change. It is specified separately after this ships.
