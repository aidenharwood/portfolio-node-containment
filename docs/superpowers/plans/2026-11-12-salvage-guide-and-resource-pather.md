# Salvage Guide and Resource Pather Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players browse every salvage node by level and track one, so the existing guidance route leads to the nearest unspent node of that type.

**Architecture:** Two pure shared functions (`salvageGuide`, `resourceRouteGoals`) derive everything from content. On the client, a `GuidanceTracking` store replaces `QuestTracking` and holds one `GuidanceTarget` (a quest or a resource). `GuidanceRoute`, `ObjectiveTracker`, `WorldMap` and the scene markers in `gameScreen` choose their goals from that target. A new salvage guide window, opened from the Salvage skill tile, sets the target.

**Tech Stack:** TypeScript (erasable only), Node 24 `node:test`, Vite + Three.js client, npm workspaces.

**Spec:** `docs/superpowers/specs/2026-11-12-salvage-guide-and-resource-pather-design.md`

## Global Constraints

- No code comments. Erasable TypeScript only: no enums, namespaces or parameter properties. Imports use `.ts` extensions.
- The server does not change.
- New shared modules are exported from `packages/shared/src/index.ts`.
- New persistence key: `containment.guidance.<characterId>` (JSON). Legacy key read once: `containment.trackedQuest.<characterId>` (a bare quest id).
- Copy fixed by the spec: `Requires Lv N`, `Tracking ◆`, `Track`, `Salvage N · next unlock at M`, `Next: <via>`, `All nearby nodes respawning`, `No known route`, `View guide`.
- Every task ends with `npm run typecheck` and `npm test` passing.

## Review Focus

1. **A resource target must silence the quest fallback everywhere.** `trackedQuest(log, quests, null)` falls back to a default quest, so passing `null` while a resource is tracked brings quest markers back. Task 3 adds `questPreference()`, and Task 4 tests that the quest markers and beacons are empty under a resource target.
2. **A stale or hand-edited stored value.** Unknown object ids, unknown shapes and non-JSON strings must give `null`, not crash `bind`. Task 3 tests each case.
3. **Every instance of the tracked node depleted.** The route must still lead somewhere, and the tracker must say so. Task 1 tests `allDepleted`, and Task 5 renders it.
4. **A node type with no placements anywhere.** The guide row still renders, with "Not yet sighted" in place of locations, and tracking it gives "No known route". Task 2 tests the empty locations, and Task 5 covers the message.
5. **Tracking a quest from the quests tab while a resource is tracked.** The resource target must be replaced. Task 3 tests it.

---

### Task 1: `resourceRouteGoals` and the `GuidanceTarget` type

**Files:**
- Modify: `packages/shared/src/quests/questRoute.ts` (`objectGoals` and new function)
- Modify: `packages/shared/src/quests/questGuidance.ts` (add type)
- Create test: `packages/shared/test/resourceRoute.test.ts`

**Interfaces:**
- Produces:
  - `type GuidanceTarget = { readonly kind: 'quest'; readonly questId: QuestId } | { readonly kind: 'resource'; readonly objectId: WorldObjectId }` in `questGuidance.ts`
  - `interface ResourceGoals { readonly goals: RouteGoal[]; readonly allDepleted: boolean }`
  - `resourceRouteGoals(objectId: WorldObjectId, scene: RouteScene): ResourceGoals`

- [ ] **Step 1: Write failing tests.** Build a `RouteScene` fixture by hand: `level: { areas: [], npcs: [], creatures: [], objects: [three placements] }`, where two placements are `slag-heap` (instances `a` at {2,2}, `b` at {9,4}) and one is `scrap-heap` (`c`). Use empty `npcPositions` and `creatures`.
  - `'returns an adjacent goal for each live placement of the node'`: `goals` deep-equals `[{ point: {x:2,y:2}, arriveAdjacent: true }, { point: {x:9,y:4}, arriveAdjacent: true }]` and `allDepleted === false`.
  - `'skips depleted instances'`: `depletedInstances = new Set(['a'])` gives only `b` and `allDepleted === false`.
  - `'falls back to every placement when all are depleted'`: `new Set(['a','b'])` gives both goals and `allDepleted === true`.
  - `'returns nothing for a node not on the level'`: `'strangler-vine'` gives `{ goals: [], allDepleted: false }`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/resourceRoute.test.ts`. Expected: FAIL, `resourceRouteGoals` is not exported.
- [ ] **Step 3: Implement.** Extract a `placementsOf(ids: ReadonlySet<WorldObjectId>, scene)` helper that returns the matching placements. `objectGoals` and `resourceRouteGoals` both use it. `resourceRouteGoals` filters out depleted placements; if that leaves none but some placements exist, it returns all of them with `allDepleted: true`. Add `GuidanceTarget` to `questGuidance.ts`.
- [ ] **Step 4: Run** the test file again, then `npm test`. Expected: PASS, and the existing quest route tests are unchanged.
- [ ] **Step 5: Commit** with the message `Add resource route goals and the guidance target type`.

### Task 2: `salvageGuide`

**Files:**
- Create: `packages/shared/src/crafting/salvageGuide.ts`
- Modify: `packages/shared/src/index.ts` (export)
- Create test: `packages/shared/test/salvageGuide.test.ts`

**Interfaces:**
- Produces: `SalvageGuideLocation`, `SalvageGuideEntry` and `salvageGuide(content: GameContent): SalvageGuideEntry[]`, exactly as typed in the spec (`districtId: DistrictId | null`, `districtName: string`, which is `''` when the placement is outside any district).
- Also produces `salvageSourceOf(definition: WorldObjectDefinition): GatheringSource | undefined`, which returns the first interaction's `gather` when its skill is `'salvage'`. Task 3 uses it to validate stored ids.

- [ ] **Step 1: Write failing tests** against `GAME_CONTENT`:
  - `'lists every salvage node exactly once'`: the set of `objectId`s equals the set of world object ids that have a `gather.skill === 'salvage'` interaction, and the lengths match.
  - `'orders entries by level then name'`: each adjacent pair satisfies `a.level < b.level || (a.level === b.level && a.name <= b.name)`. Also `entries[0].level === 1`, and the `slag-heap` entry has `level: 10`, `itemId: 'ferrous-slag'` and `experience: 48`.
  - `'location counts add up to the placements'`: for each entry, the sum of `count` equals the number of `ObjectPlacement`s with that `objectId` across `GAME_CONTENT.levels`.
  - `'keeps nodes with no placements'`: call `salvageGuide` on a copy of `GAME_CONTENT` whose `worldObjects` map has an extra salvage node `'test-node'` and whose levels don't place it. The entry exists and its `locations` is `[]`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/shared/test/salvageGuide.test.ts`. Expected: FAIL, the module is missing.
- [ ] **Step 3: Implement** in `salvageGuide.ts`. Group placements by `levelId` and then by `level.layout.districtAt(position) ?? null`. Look up `districtName` in `content.districts`. Levels follow the iteration order of `content.levels`, and districts are sorted by name inside each level. `verb` is the gather interaction's `verb`. Export it from `index.ts`.
- [ ] **Step 4: Run** the test file and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Derive a level-ordered salvage guide from content`.

### Task 3: `GuidanceTracking` replaces `QuestTracking`

**Files:**
- Create: `packages/client/src/state/guidanceTracking.ts`
- Delete: `packages/client/src/state/questTracking.ts`
- Modify: `packages/client/src/hud/objectiveTracker.ts`, `packages/client/src/hud/tabs/questsTab.ts`, `packages/client/src/hud/worldMap.ts`, `packages/client/src/screens/gameScreen.ts` (rename the type, and change `tracking.track(...)` to `trackQuest(...)` in `questsTab.ts:54`)
- Create test: `packages/client/test/guidanceTracking.test.ts`

**Interfaces:**
- Consumes: `GuidanceTarget` (Task 1) and `salvageSourceOf` (Task 2).
- Produces:
  - `parseGuidanceTarget(stored: string | null, legacy: string | null, isResource: (id: string) => boolean): GuidanceTarget | null`, a pure exported function.
  - `class GuidanceTracking` with `bind(characterId)`, `get target(): GuidanceTarget | null`, `get questId(): QuestId | null`, `get resourceId(): WorldObjectId | null`, `questPreference(): QuestId | null | false` (`false` when a resource is tracked, meaning "show no quest guidance"), `trackQuest(questId)`, `trackResource(objectId)`, `untrack()` and `onChange(listener)`.
  - The client-wide default resolver is `isResource = (id) => { const d = GAME_CONTENT.worldObjects.get(id); return d !== undefined && salvageSourceOf(d) !== undefined; }`.

- [ ] **Step 1: Write failing tests**, all using `parseGuidanceTarget` and the class with a stub `localStorage` set on `globalThis`:
  - `'reads a stored quest or resource target'`: `'{"kind":"quest","questId":"scrap-run"}'` gives the quest target, and `'{"kind":"resource","objectId":"slag-heap"}'` with `isResource = id => id === 'slag-heap'` gives the resource target.
  - `'migrates the legacy tracked quest'`: `stored = null` with `legacy = 'scrap-run'` gives `{ kind: 'quest', questId: 'scrap-run' }`.
  - `'rejects malformed or unknown values'`: `'not json'`, `'{"kind":"resource","objectId":"nope"}'`, `'{"kind":"x"}'` and `'[]'` all give `null`, with `legacy = null`.
  - `'tracking a quest replaces a resource and the reverse'`: call `trackResource('slag-heap')` then `trackQuest('scrap-run')`. `resourceId` is `null`, `questId` is `'scrap-run'`, the stored JSON matches, and `questPreference()` is `'scrap-run'`. After `trackResource` again, `questPreference()` is `false`. After `untrack()`, `questPreference()` is `null`.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/client/test/guidanceTracking.test.ts`. Expected: FAIL, the module is missing.
- [ ] **Step 3: Implement** `guidanceTracking.ts`. `bind` reads both keys inside `try`/`catch`. Writes go only to the new key, and `untrack` removes it. Swap every `QuestTracking` import for `GuidanceTracking` and keep behaviour identical for now; consumers still read `questId`.
- [ ] **Step 4: Run** the test file, then `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Track a quest or a resource through one guidance target`.

### Task 4: The route and scene markers follow the target

**Files:**
- Modify: `packages/client/src/state/guidanceRoute.ts`
- Modify: `packages/client/src/screens/gameScreen.ts:87-90`, `:170-192` and `:486-487`
- Create test: `packages/client/test/guidanceGoals.test.ts`

**Interfaces:**
- Consumes: `resourceRouteGoals` (Task 1) and `GuidanceTracking` (Task 3).
- Produces:
  - `guidanceGoals(target: GuidanceTarget | null, log: QuestLog, scene: RouteScene): ResourceGoals`, exported from `guidanceRoute.ts`. For a quest target or `null`, it returns `{ goals: routeGoals(trackedQuest(log, GAME_CONTENT.quests, target?.questId ?? null), …), allDepleted: false }`, or empty goals when there is no tracked quest. For a resource target, it returns `resourceRouteGoals`.
  - `GuidanceRoute.current(now: number, target: GuidanceTarget | null): readonly TilePoint[]`
  - `GuidanceRoute.exhausted: boolean` (the `allDepleted` of the last plan on the current level)
  - `GuidanceRoute.unreachable: boolean` (true when the last plan found no path and no transit while a target was set)

- [ ] **Step 1: Write failing tests** for `guidanceGoals` with the hand-built scene from Task 1:
  - `'a resource target routes to its placements'`: the goals equal the two `slag-heap` points.
  - `'a resource target ignores the quest log'`: pass a `QuestLog` with `scrap-run` active at its `stock` stage (it gathers `scrap-alloy`, so its goals are `scrap-heap` placements; build it with the `questProgress.ts` helpers). With a resource target for `slag-heap` the goals still equal the `slag-heap` points.
  - `'a null target falls back to the default quest'`: with that log and `null`, the goals include the `scrap-heap` placement point.
- [ ] **Step 2: Run** `node --test --no-warnings=ExperimentalWarning packages/client/test/guidanceGoals.test.ts`. Expected: FAIL. (If the module pulls in Three.js or the DOM, move `guidanceGoals` to `state/guidanceGoals.ts` and import it into `guidanceRoute.ts`.)
- [ ] **Step 3: Implement.** `plan` calls `guidanceGoals` for the current level and, with an empty scene, for every other level when it builds `targets`. Set `exhausted` and `unreachable` in `plan`. In `gameScreen`, pass `guidanceTracking.target` to `current`. When `questPreference()` is `false`, set `npcMarkers`, `objectiveBeacons` and `objectiveCreatures` to empty and `objectiveObjects` to `new Set([resourceId])`, so the tracked node type is highlighted the way quest objects are. Otherwise pass `questPreference()` where `questTracking.questId` is passed today.
- [ ] **Step 4: Run** the test file, `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Route guidance to the tracked resource node`.

### Task 5: The objective tracker shows a resource target

**Files:**
- Modify: `packages/client/src/hud/objectiveTracker.ts`
- Modify: `packages/client/src/screens/gameScreen.ts` (`objectives.update` and `setVia` calls)
- Modify: `packages/client/src/styles/hud.css` (`.objective-resource`, `.objective-locked`, `.objectives-untrack`)

**Interfaces:**
- Consumes: `GuidanceTracking.resourceId`, `GuidanceRoute.exhausted`/`.unreachable` and `countItem` (shared `gear/inventory.ts`).
- Produces: `ObjectiveTracker.update(self: SelfState)`, which takes the whole self state instead of the quest log because it needs the inventory and skills, and `ObjectiveTracker.setRoute(via: string | null, exhausted: boolean, unreachable: boolean)`, which replaces `setVia`.

- [ ] **Step 1: Implement the resource block.** Show the node name with `Lv N`, styled `.objective-locked` when `levelForExperience(self.skills.salvage) < N`. Show `<item name> ×<countItem>`. The status line shows the first that applies: `No known route` when `unreachable`, `All nearby nodes respawning` when `exhausted`, `Next: <via>` when `via` is set. Add a × button with the aria-label `Stop tracking` that calls `untrack()`. A null or quest target renders exactly as today.
- [ ] **Step 2: Verify in the browser.** Run `npm run dev` through `preview_start`, sign in with a dev character, and set the target from the console through the tracking instance (or wait for Task 7). Confirm the block renders, × clears it, and the quest block comes back.
- [ ] **Step 3: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 4: Commit** with the message `Show the tracked resource in the objective tracker`.

### Task 6: The world map highlights districts holding the tracked node

**Files:**
- Modify: `packages/client/src/hud/worldMap.ts:170-175`

**Interfaces:**
- Consumes: `salvageGuide` (Task 2) and `GuidanceTracking.resourceId`/`questPreference()`.

- [ ] **Step 1: Implement.** In `objectiveDistrictIds`, when `resourceId` is set, return the `districtId`s (not `null`) from that entry's `locations`. Compute `salvageGuide(GAME_CONTENT)` once at module level. Otherwise use `questPreference()` in place of `questId`, and when it is `false` return an empty set.
- [ ] **Step 2: Verify in the browser.** Track `slag-heap`, open the map, and confirm the Undercroft districts are highlighted and the level picker marks the right level.
- [ ] **Step 3: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 4: Commit** with the message `Highlight districts holding the tracked node on the world map`.

### Task 7: Salvage guide window

**Files:**
- Create: `packages/client/src/hud/salvageGuideWindow.ts`
- Modify: `packages/client/src/hud/tabs/skillsTab.ts` (Salvage tile click and the tooltip button)
- Modify: `packages/client/src/screens/gameScreen.ts` (construct the window and pass an `openSalvageGuide` callback to `createSkillsTab`)
- Modify: `packages/client/src/styles/hud.css` (`.salvage-guide*`)

**Interfaces:**
- Consumes: `salvageGuide` (Task 2), `GuidanceTracking` (Task 3) and `itemIconUrl` (`render/items/itemSprites.ts`).
- Produces: `class SalvageGuideWindow` with `constructor(tracking: GuidanceTracking)`, `readonly element`, `show(salvageLevel: number)`, `hide()` and `update(salvageLevel: number)`. Also `createSkillsTab(openSalvageGuide: () => void): PanelTab`.

- [ ] **Step 1: Implement the window.** Follow the structure of `storageWindow.ts` and `craftingWindow.ts`: panel classes, a close button, and Escape to close. The header reads `Salvage N · next unlock at M`, or `Salvage N · all nodes unlocked`. Each row shows the name, `Lv N`, the item icon and name, `+X xp`, and locations formatted as `"<district name> · <level name> (<count>)"` joined with `, ` (the district part is dropped when the name is empty; with no locations the row says `Not yet sighted`). Locked rows get `.locked` and `Requires Lv N`. The row of the lowest locked node gets `.next`. The button text is `Track` or `Tracking ◆`; it toggles between `trackResource(objectId)` and `untrack()`, and it re-renders on `tracking.onChange`. On `show`, scroll the highest unlocked row into view.
- [ ] **Step 2: Wire up the Skills tab.** In `skillsTab.ts`, clicking the `salvage` tile calls `openSalvageGuide()` instead of pinning the tooltip, and the Salvage tooltip gets a `View guide` button that does the same. Other tiles don't change.
- [ ] **Step 3: Verify in the browser.** Open Skills, click Salvage, and check the ordering, dimmed locked rows and highlighted next unlock. Track Slag Heap and check the route line, the tracker block, and the map highlighting. Track a quest from the quests tab and confirm the guide button goes back to `Track`. Check at mobile width with `resize_window`, then reset.
- [ ] **Step 4: Run** `npm run typecheck` and `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with the message `Add the salvage guide window behind the Salvage skill`.

### Task 8: End-to-end check

- [ ] **Step 1:** Run `npm run typecheck` and `npm test`. Expected: both pass.
- [ ] **Step 2:** In the browser, from the hub, track Slag Heap and follow the route across a tram hop (the tracker shows `Next: …`). Gather a node until it depletes and watch the route move to the next instance. Reload the page and confirm the tracked resource persists. Take a screenshot of the route and tracker as proof.
- [ ] **Step 3:** Commit any fixes with the message `Polish salvage guide tracking`.
