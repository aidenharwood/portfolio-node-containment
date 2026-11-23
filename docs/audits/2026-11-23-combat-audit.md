# Combat, creatures and containment audit (2026-11-23)

Scope: the 31 creatures in `packages/shared/src/content/span/creatures.ts`, their placements across the 141 districts, bosses, containment, contracts and the three B1 levels. Everything here comes from the data and the shared combat maths. The scratch scripts load `GAME_CONTENT` and replay the `spanBalance.test.ts` duel model: an operative at Close Quarters = creature level, with `typicalFortitude`, a maul and bulwark plate from the highest ladder rung at or below that level, 1,000 seeded fights, then healing at 5% every 20 ticks with 300 ms ticks. Travel, food and multi-aggro are left out, so the paces below are upper bounds. `spanBalance.test.ts` passes (47/47).

## 1. Headline: combat XP no longer matches the XP curve

Two recent commits, `7cff0da` and `f0a6789` ("Update xp curve"), changed `experienceForLevel` (`character/skills.ts:88-93`). It went from `25n + 18n^2.4` with early easing and a cap of 55 to `12n² + 18n` with `SKILL_LEVEL_CAP = 200`. `killExperience` (`catalog/creatureKit.ts:44`) was tuned for the old curve and was not changed. The old curve needed about 258k XP for level 55. The new one needs 40k for level 58, 117k for 99 and 479k for 200.

Kills needed to gain one level against a level-matched creature (XP step ÷ kill XP):

| Creature (lvl) | Kill XP | Level step | Kills per level |
| - | - | - | - |
| lawn-rat (2) | 20 | 54 | 2.7 |
| furrow-eel (9) | 216 | 222 | 1.0 |
| thornback (17) | 686 | 414 | 0.6 |
| glass-hound (28) | 2,248 | 678 | 0.3 |
| hull-knocker (33) | 4,228 | 798 | 0.19 |
| glass-stalker (42) | 10,484 | 1,014 | 0.10 |
| null-stalker (56) | 21,512 | 1,350 | 0.06 |

From level 9 up, every on-level kill is worth more than a level. The model has the player farming the best non-boss creature they beat at least 95% of the time. Under it, one combat skill goes **1→58 in about 25 minutes of fighting, 1→99 in about 30 minutes and 1→200 in about 52 minutes** (cell-breaker at roughly 960k XP/h). Fortitude gets half of all of it (`combatMath.ts:162`). Containment is the slowest combat-adjacent skill: about 0.5 h to 50 and 5.8 h to 200, using rustlings at 1,236 XP per contain. This one constant undermines the "many hours" goal more than any amount of content can make up for.

The docs describe the old curve. `CONTRIBUTING.md:173` still cites `EASED_LEVEL_SPAN`, "level 10 costs about 2,700 XP" (it is now 1,134), crawlers, Cordon stalkers, a vault-echo at 52 and "the Warden at 54". `CONTRIBUTING.md:175` cites tide wraiths and cordon-stalkers. None of those ids exist now.

## 2. Threat curve, tiers 1–13

The tier floors are `[1,5,8,12,16,20,25,30,35,40,45,50,55]` (`crafting/tiers.ts`). Win rate, time to kill (TTK) and integrity lost come from the duel model at level parity.

| Tier | Region (districts) | Non-boss creatures (lvl) | Win/TTK/lost at parity | Boss |
| - | - | - | - | - |
| 1 | Kestrel (4, 2 empty) | drone 1, wisp 1, gull 1, rat 2 | 100% / 4–8 s / ≤10% | – |
| 2 | Kestrel (17) | hound 5, grounds-mite 6 | 100% / 13–15 s / 20% | – |
| 3 | Harrow (8) | magpie 8, furrow-eel 9 | 100% / 17–18 s / 35% | – |
| 4 | Harrow (4, 2 empty) | seed-mite 12, scarecoat 13 | 100% / 14–15 s | Keeper 15 (80%) |
| 5 | Harrow (9) | **thornback 17 only** | 100% / 19 s | – |
| 6 | Halcyon (14, 3 empty) | neon-moth 21, alley-crawler 22 | 100% / 15 s | – |
| 7 | Halcyon (13) | ad-wraith 26, glass-hound 28 | 100% / 18 s / 40–45% | Brightly 29 (85%) |
| 8 | Wreckfield (9) | rustling 31, hull-knocker 33 | 100% / 18–21 s | – |
| 9 | Wreckfield (11) | misprint 35, bilge-wraith 37 | 100% / 22–24 s / 47% | Cohort 39 (92%) |
| 10 | Steppe (12) | prism-hound 41, glass-stalker 42 | 97–99% / 22 s / 46–59% | – |
| 11 | Steppe (18) | red-twin 46, choir-echo 47 | 84–85% / 26 s / 70% | Precentor 49 (35%) |
| 12 | Spindle (7) | null-echo 52, cell-breaker 53 | 84–100% | – |
| 13 | Spindle (15) | **null-stalker 56 only** | 99% / 26 s / 53% | Warden 58 (20%) |

Gaps and flat spots:

- **Levels with no creature within 2 below them:** 3–4, 10–11, 18–20, 23–25, 43–45 and 57. Nothing at all exists past 58, although skills run to 200 and the mastery mantles require level 200 (`catalog/mastery.ts:40`).
- **Tiers with one non-boss type:** tier 5 (thornback, about 150 placements over 9 districts) and tier 13 (null-stalker). Tiers 2, 3, 6, 8, 10 and 12 have exactly two types.
- **Monotone districts:** all 17 tier-2 Kestrel districts have the same rat, hound and mite trio. The 12 tier-10 Steppe districts all have prism-hound and glass-stalker. The 9 tier-8 Wreckfield districts all have rustling and hull-knocker.
- **The difficulty step at tier 11 is too sharp.** Parity win rate falls from 97–100% (tiers 1–10) to 84% (red-twin, choir-echo and null-echo). It falls further to 35% for the Precentor and 20% for the Warden. Below tier 11, nothing threatens a geared player.
- **Defence plateaus.** `rimward` pins `defence: 66` on null-echo, cell-breaker and null-stalker (`creatures.ts:122-124`). That matches choir-echo (47) and sits only 2 above red-twin (46), so tier 12–13 creatures are no harder to hit than tier 11 ones.
- **Bosses barely outrank the creatures around them:** Keeper 15 against thornbacks 17 on the same ground, then Brightly +1, Cohort +2, Precentor +2 and Warden +2.

## 3. Bosses

| Boss | Where | Kill XP | Respawn | Mechanics | Unique |
| - | - | - | - | - | - |
| orchard-keeper (`:53`) | site-orchard, The Mother Rows | 1,342 | 300 t | root-snare, seedfall | lamplighter-lantern 10% |
| mr-brightly (`:70`) | gallowglass-undercity, The Studio | 4,427 | 360 t | jingle, static, focus-group | **none** |
| the-cohort (`:88`) | site-tallow, Parade Ground | 12,243 | 420 t | slam, march, roll-call, enrage | **none** |
| the-precentor (`:108`) | site-vesper, The Nave | 18,712 | 480 t | cantus, descant, chorus | **none** |
| warden-of-null (`:126`) | null-below, The Review | 22,216 | 600 t | lockdown, sentence, coolant, staff, enrage | wardens-key 5% |

- **Boss XP per hour is below that of trash, even before the respawn wait.** Keeper gives 37k/h against thornback's 54k, and Warden 576k/h (at a 20% win rate) against cell-breaker's 963k. Each boss gives 1.0–1.9× one kill of the creature next to it but takes 1.5–2× as long. Its loot is the region's common materials (culvert-trace and reed-bundle for the Keeper, for example). Three of the five bosses have no unique at all, so a boss is worth killing exactly once, for its quest.
- No contract targets a boss, and each boss appears in exactly one quest.
- Unused engine features: the `fire` and `salt` hazards (`encounters.ts` `HAZARD_KINDS`), `EncounterPhase.attack` and `.guard` (a boss could switch style or guard mid-fight, but none does) and `relentless`. Only the three late bosses use `size: 2`.
- The Precentor's examine says it lives "in the dark of Vesper Deep", but it is placed on the surface at site-vesper. The design spec (`2026-11-20-the-span-design.md:36-41`) lists five B1 levels: Kestrel Intake, Gallowglass Undercity, **Tallow Holding**, **Vesper Deep** and Null. `levels/below.ts:16-18` ships only three.

## 4. Drops and uniques

- Creatures with no drops: only training-drone, which is intended.
- There are 26 unique items in all. **Non-boss creatures with no unique:** sim-wisp, grounds-mite, crop-magpie, seed-mite, scarecoat, thornback, ad-wraith, misprint, prism-hound, null-echo and null-stalker. That is 11 of 26 non-boss creatures, and it includes the whole tier-5 and tier-13 rosters.
- Containment loot is always a bigger stack of the creature's own trace or common material. No containment profile has a rare roll, although `findContainmentIssues` allows a unique there if the creature also drops it normally.

## 5. Containment

- 12 creatures are containable: safe ×3, euclid ×5 and keter ×4. Containment XP is `integrity × 12` (`containment.ts:29`).
- **The ladder stops early.** The last non-boss containable needs level 35 (red-twin). Above that only the Precentor (45) and the Warden (50) are left. No creature at tiers 10, 12 or 13 except the Warden is containable (prism-hound, glass-stalker, null-echo, cell-breaker and null-stalker are not).
- **Higher-level creatures pay less per hour.** Rustling (required level 25) gives about 86k containment XP per hour. That beats bilge-wraith (70k) and red-twin (69k), so nothing pays a player to move on from tier 8.
- **Seals no longer exist in the data.** No item has the `seal` kind, and `findContainmentIssues` does not check for one. `ARCHITECTURE.md:206,209` still describes "spends the seal" and an integrity check that every tier has a seal. Containment has no consumable and nothing to craft for it.
- Contain contracts stop at tier 9 (wraith-seal). There are contain quests at tiers 1, 2, 4, 6, 9 and 11.

## 6. Placements, contracts and basements

- Every creature is placed somewhere (none unused). All boss placements stand in a `multiCombat` area, and the encounter checks pass.
- misprint is placed only at site-tallow (8) and as Cohort summons. courtyard-gull is placed only at kestrel-lake.
- There are 37 contracts. Combat contracts stop at tier 12 (daily null-rounds), and weeklies stop at tier 8 (fringe-sweep, an id left over from the old world). **No contract covers tier 5, tier 11 or tier 13**, nor seed-mite, thornback, ad-wraith, misprint, red-twin, choir-echo or cell-breaker.
- No quest uses lawn-rat, courtyard-gull, feral-hound, crop-magpie, alley-crawler, rustling, prism-hound, glass-stalker or cell-breaker.
- The spec puts feral hound in the Terraces and scrap crawlers in the Wreckfield. In the data, hounds are only in Kestrel and there are no crawlers in the Wreckfield.

The three basements, from `levels/below.ts` with `capacity: 120`:

| Level | Tier | Size | Rooms | Creatures | Notes |
| - | - | - | - | - | - |
| kestrel-intake | 2 | 64×48 | 6 | 4 sim-wisp + 1 grounds-mite | Three of the six areas are safe. Story space, not a dungeon. |
| gallowglass-undercity | 7 | 64×48 | 6 | 4 ad-wraith, 4 glass-hound, Brightly | One area is multi-combat (The Studio). |
| null-below | 13 | 80×64 | 5 | 6 null-echo, Warden | North and South Ward hold only echoes. No cell-breakers or stalkers. |

All three are single districts with no connectors. None has an elite, a key-gated wing or a reason to come back after the quest.

## 7. Proposed content (data the engine already supports)

Every entry below is `beast()` data in `span/creatures.ts`, placed through layout JSON `creatures`. Each obeys the existing checks: creature tier at or below district tier, a single summon target that is neither boss nor containable, telegraph caps, and `multiCombat` when the creature has area mechanics.

**Level-gap fillers** (one or two per gap, reusing models):

- Kestrel t2: `drill-sentry` (trainingDrone, lvl 3, ranged, dart) and `seam-boar` (strayDog, lvl 4, aggressive, skirmisher).
- Harrow t3: `ditch-leech` (siltEel, lvl 10, melee, aggressive, containable safe at 8).
- Harrow t5: `windpump-wight` (lineMimic, lvl 18, psionic, warden, euclid at 16) and `barn-crawler` (scrapCrawler, lvl 19, melee, bulwark). These break up the thornback-only tier.
- Halcyon t6–7: `holo-shill` (vaultEcho, lvl 24, psionic) and `vent-moth` (mothLantern, lvl 25, ranged, warden, safe).
- Wreckfield t8: `ballast-crab` (hullKnocker, lvl 30, melee, skirmisher).
- Steppe t10: `shard-wisp` (crateWisp, lvl 44, psionic, euclid at 40). This fills 43–45 and gives tier 10 something containable.
- Spindle t12–13: `coolant-wraith` (tideWraith, lvl 54, ranged, warden, keter at 48) and `clerk-of-null` (lineMimic, lvl 57, psionic, euclid at 52). This raises the Spindle's containment ceiling.

**Elites and rare spawns.** Place one per region, as a single instance with `respawnTicks: 1500–3000`, `integrity` at about 2.5× standard, a 1–2% unique and one or two mechanics (`telegraph` and `summon` only). Each needs its own small `multiCombat` room.

- `thornback-matriarch` (lvl 19, at seed-fields): summons thornback, uses a `body` slam.
- `the-old-tag` (crop-magpie, lvl 11, at haycut): a `cone` volley.
- `chrome-crawler` (lvl 27, at night-market): uses the `fire` hazard.
- `the-bosun` (rustling, lvl 36, at reactor-scar): uses the `salt` hazard.
- `prism-alpha` (lvl 45, at the-lens): summons prism-hound.
- `null-auditor` (lvl 57, at sealed-ground): `line`, then a phase `attack` swap from psionic to ranged.

**Boss refinements.**

- Raise each boss to about +4 levels over the trash around it. The Keeper is the obvious case: move it to 19, or move it to tier-4 ground.
- Pay boss kill XP at 3–4× a neighbour kill.
- Add uniques for Brightly (10%, plus a 4% anomalous drop), the Cohort and the Precentor (`catalog/uniques.ts`).
- Use `EncounterPhase.attack` and `.guard` so that the Cohort switches from bulwark to skirmisher at 50% and the Precentor from psionic to ranged at 33%. That makes players swap gear mid-fight.
- Add a weekly boss contract per region (`defeat [boss] x3`) and a "contain a keter" weekly.

**Dungeons** (new layout JSON plus one line in `levels/below.ts` each):

- `tallow-holding` (T9, Tallow Holding B1): move the Cohort here. Misprint and bilge-wraith cells, plus `the-bosun`.
- `vesper-deep` (T11, Vesper Deep B1): move the Precentor here, as its examine text already says. Choir-echo and red-twin naves, with a `salt` hazard corridor.
- `orchard-seed-vault` (T5, B1): seed-mites, a windpump-wight and a matriarch room.
- Fill the north and south wards of `null-below` with cell-breakers and stalkers, and give `kestrel-intake` a Print Room pack of misprint-lite drones so the tutorial floor teaches multi-combat.

## 8. Prioritised refinements

### Fix

1. **Rebalance combat XP against the new curve.** Today 1→200 takes under an hour per combat skill. Choose one of two options. Either scale `killExperience` so that an on-level kill is about 1/25–1/40 of `experienceForLevel(L+1) − experienceForLevel(L)`, which gives roughly 20–35 h per combat skill to 58. Or revert the curve. Add a pacing test in `spanBalance.test.ts` (hours to 58 between N and M) so this cannot drift silently again. Files: `catalog/creatureKit.ts`, `character/skills.ts`, `test/spanBalance.test.ts`, and the quest `grantExperience` amounts in `span/quests/*`. Size: M.
2. **Decide what levels 59–200 are for.** Nothing exists past creature level 58 or containment level 50, yet mantles require 200. Either lower `SKILL_LEVEL_CAP` to around 60–70 or plan tier 14+ content. Files: `character/skills.ts`, `catalog/mastery.ts`. Size: S to decide, L to fill.
3. **Fix the stale docs:** `CONTRIBUTING.md:173-175` (curve, creature ids, bands), `ARCHITECTURE.md:206,209` (seals) and the spec's creature table and B1 list (`2026-11-20-the-span-design.md:36-56`). Size: S.
4. **Make bosses worth repeating.** Raise boss XP to 3–4× a neighbour kill, add uniques for Brightly, the Cohort and the Precentor, and move the Keeper above the thornbacks around it. Files: `span/creatures.ts`, `catalog/uniques.ts`. Size: S–M.
5. **Make containment pay more as it climbs.** Scale containment XP by class (for example safe ×1, euclid ×1.5, keter ×2.5) so red-twin beats rustling. Make one or two tier-10/12/13 creatures containable. Size: S.
6. **Move the Precentor to Vesper Deep** (or reword its examine) and rename the `fringe-sweep` contract. Size: S.

### Grow

1. **Level-gap creatures (10) and per-region elites (6), as in §7.** This turns 2-type tiers into 3–4 types and gives every region a rare chase. Files: `span/creatures.ts`, `catalog/uniques.ts`, layouts. Size: M.
2. **Tallow Holding and Vesper Deep B1 levels, plus an Orchard seed vault, with the Cohort and the Precentor moved into them.** Files: `levels/below.ts`, new `districts/layouts/*.json`, `scripts/span/below.ts`. Size: L.
3. **Contracts for tiers 5, 11 and 13, weekly sweeps for tiers 10–13, boss weeklies, and contain contracts past tier 9.** File: `content/contracts.ts`. About 12 entries. Size: S.
4. **Uniques for the 11 non-boss creatures without one**, at 1–2%. These give long-tail drop hunting, which is the main source of OSRS hours. Size: M.
5. **Use the idle encounter features**: phase style and guard swaps, and the `fire` and `salt` hazards, on the new elites and the reworked bosses. Size: S.
6. **Quests for the nine creatures with none**, such as a Rustwater rustling cull or a Steppe prism-hound survey, chained into the existing side questlines. Size: M.
7. **Re-populate the basements** (null-below wards, kestrel-intake Print Room) so each B1 has a reason to come back. Size: S.
