# Salvage guide and resource pather

## Goal

Help players answer two questions: "what can I salvage at my level, and what comes next?" and "where do I go to find it?". A level-ordered salvage guide answers the first. Tracking a resource node from that guide answers the second by reusing the quest helper's route line, which leads to the nearest unspent node of that type, crossing levels by tram where needed.

## Decisions

- One tracker drives the route line. It follows either a quest or a resource node type, never both. Tracking one replaces the other.
- The guide lives behind the Salvage tile in the Skills tab.
- Nothing is hidden. Every node type is listed with its level, yield, experience and every place it appears, whether or not the player has been there. Transit planning still only uses stations the player has discovered and passages they have opened, as the quest helper does today.
- Tracking is a client-side preference, like quest tracking. The server does not change: gathering is already validated there.

## Shared (`packages/shared`)

### `salvageGuide(content)`

New module `src/gathering/salvageGuide.ts`. Pure, derived entirely from content, so new nodes appear without extra work.

```ts
interface SalvageGuideLocation {
  readonly levelId: LevelId;
  readonly levelName: string;
  readonly districtId: DistrictId | null;
  readonly districtName: string;
  readonly count: number;
}

interface SalvageGuideEntry {
  readonly objectId: WorldObjectId;
  readonly name: string;
  readonly verb: string;
  readonly level: number;
  readonly itemId: ItemId;
  readonly experience: number;
  readonly locations: readonly SalvageGuideLocation[];
}

function salvageGuide(content: GameContent): SalvageGuideEntry[];
```

- Includes every world object with an interaction whose `gather.skill` is `'salvage'`.
- Locations come from every level's object placements of that object id, grouped by level and district (`layout.districtAt(position)`), in level order and then by district name. A placement outside any district (`districtAt` returns `undefined`) is grouped under the level alone, with the district name left empty.
- Entries are sorted by `level`, then `name`.
- Node types with no placements are still listed, with an empty `locations`.

### `resourceRouteGoals(objectId, scene)`

Added to `src/quests/questRoute.ts` next to `routeGoals`. It returns an adjacent `RouteGoal` for every placement of `objectId` in `scene.level` whose instance is not in `scene.depletedInstances`. If every placement is depleted, it returns all of them so the route still leads somewhere while they respawn, and the caller can tell this case apart from the normal one:

```ts
interface ResourceGoals {
  readonly goals: RouteGoal[];
  readonly allDepleted: boolean;
}

function resourceRouteGoals(objectId: WorldObjectId, scene: RouteScene): ResourceGoals;
```

The existing `objectGoals` helper is refactored to share the placement filter.

### `GuidanceTarget`

New type in `src/quests/questGuidance.ts`:

```ts
type GuidanceTarget =
  | { readonly kind: 'quest'; readonly questId: QuestId }
  | { readonly kind: 'resource'; readonly objectId: WorldObjectId };
```

## Client (`packages/client`)

### Tracking state

`state/questTracking.ts` becomes `state/guidanceTracking.ts` (`GuidanceTracking`).

- It holds `target: GuidanceTarget | null`, keeps `get questId()` (the quest id when the target is a quest, otherwise `null`) and adds `get resourceId()`.
- `trackQuest(questId)` and `trackResource(objectId)` each replace the current target. `untrack()` clears it.
- Persistence uses the new key `containment.guidance.<characterId>`, holding JSON. On `bind`, if that key is missing it reads the legacy `containment.trackedQuest.<characterId>` value as a quest target. A malformed value or an unknown object id gives `null`.
- With a `null` target the current behaviour is kept: `trackedQuest(..., null)` falls back to the default active quest. With a resource target the quest fallback is suppressed everywhere: route, objective tracker and world map.

Every current `QuestTracking` user (`gameScreen`, `objectiveTracker`, `questsTab`, `worldMap`) switches to `GuidanceTracking`. The quests tab's "Track" calls `trackQuest`.

### Route

`GuidanceRoute.current(now, target)` takes the tracking object instead of a preferred quest id. `plan` builds its goal lists through one function:

- quest target or null: `routeGoals(trackedQuest(...), scene, content)`, as today;
- resource target: `resourceRouteGoals(objectId, scene).goals`, for the current level and for every other level when building transit targets.

Everything after goal selection stays as it is: region filtering, preferring the local district, sticky nearest goal, `planTransit` and `via`. A new `get exhausted(): boolean` reports `allDepleted` for the current level so the HUD can say that the nodes are respawning.

`gameScreen` invalidates the route when the tracking target changes, as it already does on quest changes.

### Salvage guide panel

New `hud/salvageGuide.ts`, opened by clicking the Salvage tile in `skillsTab.ts`. Other tiles keep their tooltip behaviour. For Salvage, the tooltip gains a "View guide" button, and clicking the tile opens the guide directly.

- It is a floating window that uses the existing panel and window styles (like the crafting and storage windows), with a close button and Escape to close.
- Rows follow `salvageGuide` order. Each row shows the node name, `Lv N`, the item icon and name, XP per gather, and a compact location list ("Service Yards · Undercroft (3)").
- Rows the player can gather are styled normally. Locked rows are dimmed with "Requires Lv N". The row for the player's next unlock is highlighted, and a header line reads "Salvage 12 · next unlock at 16".
- Each row has a Track button that becomes "Tracking ◆" for the current target. Clicking a tracked row's button untracks it. Locked nodes can still be tracked.
- When the panel opens, it scrolls to the player's highest unlocked row.

### Objective tracker

With a resource target, `ObjectiveTracker` renders a resource block instead of the quest block:

- the title is the node name, with "Lv N" (in a warning colour if locked);
- one line shows the yield item and how many the player carries, for example "Ferrous Slag ×7";
- a status line shows one of: `Next: <via>` (the transit hop), "All nearby nodes respawning" (when `exhausted`), or "No known route" (when the route is empty and no transit was found);
- an untrack button (×) calls `untrack()`, after which the tracker falls back to the default quest.

### World map

`objectiveDistrictIds` returns the districts of every placement of the tracked node when the target is a resource, using `salvageGuide` locations. The existing district highlighting and level picker markers then work unchanged.

## Edge cases

| Case | Behaviour |
| --- | --- |
| Tracked object id no longer exists in content | Target cleared on bind, falls back to the default quest |
| All instances on this level depleted | Route goes to the nearest one anyway; the tracker says they are respawning |
| Node only on undiscovered or unreachable levels | No route line; the tracker says "No known route" |
| Player tracks a quest from the quests tab | The resource target is replaced |
| Player levels past the tracked node | Tracking stays until changed; the guide highlights the new next unlock |

## Testing

- `shared/test/salvageGuide.test.ts`: every gatherable salvage object in `GAME_CONTENT` appears exactly once; entries are ordered by level; locations sum to the placement count; unplaced nodes are listed with no locations.
- `shared/test/questRoute.test.ts` (new or extended): `resourceRouteGoals` skips depleted instances, sets `allDepleted` and returns every placement when all are depleted, and returns adjacent goals.
- Client: a unit test for `GuidanceTracking` covering legacy key migration, a JSON round trip and malformed values, if the client test setup supports `localStorage`; otherwise the parsing is pulled out into a pure function and tested.
- Manual check in the browser: open the guide from Skills, track Slag Heap from the hub, follow the route across a level, deplete a node and watch it move on, then track a quest and confirm the resource target is replaced.
- `npm run typecheck` and `npm test` pass.

## Out of scope

- Server-side changes, shared tracking state, and minimap markers for nodes.
- Guides for other skills. Only salvage has gather nodes. The skill filter is a single check inside `salvageGuide`, so making it a parameter later is a small change.
