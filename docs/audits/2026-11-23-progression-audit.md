# Progression, skills, gear and economy audit (2026-11-23)

Scope: everything a player can level, earn, craft, buy or chase in the shipped Span content. This is read-only and judged from code and data only. Numbers come from `GAME_CONTENT`, dumped by a scratch script and modelled at 300 ms per tick (`packages/server/src/config.ts:23`).

Model assumptions:
- **Gathering:** gather chance `0.5 + 0.04·(L − node)`, up to 0.95. Depletion follows `depletionChance`, plus 15 ticks of walking for each node cycle. Materials stack to 100, so there are no bank trips. A 0.5 "practical" factor is applied on top.
- **Crafting:** the player gathers and refines every input. Bought bread is the one exception.
- **Combat:** the best non-boss creature that costs at most 80% of integrity per kill, using level-gated best-in-slot gear from `loadout()`. This is idealized, so the figures below are doubled for practical play.
- **Containment:** melee wear-down, then the contain.

## 1. Headline: the XP curve no longer matches the content

- `SKILL_LEVEL_CAP = 200` and `experienceForLevel = 12n² + 18n` (`packages/shared/src/character/skills.ts:88,92`). Level 99 costs 117,012 XP and level 200 costs 478,794.
- Commits `f0a6789` and `7cff0da` (18 Nov) replaced the old `25n + 18n^2.4` curve, eased and capped at 55. The old curve cost 2.4× more at level 10, 5.6× at 30 and 7.2× at 55. **Nothing else was retuned:** kill XP, quest pay and contract pay all stayed the same.
- Content stops early. The last gathering node is at 50 (`content/catalog/nodes.ts`), the last recipe at 54 (biochemistry) and the last gear gate at 50 (all three combat lines). The strongest creature is level 58 (`warden-of-null`). Mastery mantles need 200 (`content/catalog/mastery.ts`). **91.6% of the XP to cap (levels 59–200) unlocks nothing.**
- **Kill XP is huge next to the curve.** `killExperience` (`content/catalog/creatureKit.ts:44`) is built for a steep curve. A null-stalker kill pays 21,512 style XP, plus 912 for damage, plus 1.35× from `rimward` (`span/creatures.ts:6`). That is about 15 level-steps at level 58. **About 20 null-stalker kills take a style from 58 to 200.**
- **Quest XP alone maxes combat.** `questPay` multiplies by `questLevelShare` = 1 + (L − 10)/15 (`catalog/questPay.ts:9`), which is 4.2× at level 58. Summed over all 40 quests:

| XP type | Total quest XP | Level it buys on its own |
|---|---|---|
| Style XP | 875,200 | 200 |
| Fortitude | 314,640 | 162 |
| Research | 305,200 | 159 |
| Containment | 138,250 | 107 |

`end-of-file` alone pays 234,900 style XP (`span/quests/farSpan.ts:242`), and `the-review` pays 176,100 (`farSpan.ts:228`).

### Estimated hours to milestones

Hours use the best method at each level, simulated level by level (practical figures):

| Skill | 10 | 30 | 50 | 60 | 99 | 200 | Best method (from level) |
|---|---|---|---|---|---|---|---|
| Close Quarters | <0.1 | 0.2 | 0.25 | 0.25 | 0.3 | 0.5 | mites → crawlers (17) → hull knockers (34) → bilge wraiths (47) → cell-breakers (70) |
| Marksmanship | 0.1 | 0.2 | 0.25 | 0.25 | 0.35 | 0.55 | … rustlings (33) → glass stalkers (49) → null stalkers (70) |
| Psionics | 0.1 | 0.15 | 0.2 | 0.25 | 0.25 | 0.45 | … glass hounds (23) → red twins (51) → null echoes (77) |
| Fortitude | rides on combat (about 0.75× the style level) | | | | | | |
| Containment | 0.1 | 0.2 | 0.3 | 0.4 | 0.8 | 2.0 | scarecoat (10) → glass hound (19) → rustling/bilge wraith (40+) → red twin |
| Salvage | 0.1 | 0.4 | 0.8 | 0.9 | 1.6 | 4.9 | highest node |
| Research | 0.1 | 0.4 | 0.8 | 1.0 | 1.8 | 5.6 | traces; repeat Study never wins (global 300-tick cooldown, `combat/study.ts:11`) |
| Biochemistry | 0.1 | 0.5 | 0.8 | 1.0 | 1.7 | 5.1 | gathering; cooking loses once you count the gathering time |
| Refining | 0.4 | 1.4 | 2.2 | 2.6 | 4.5 | 13.7 | self-supplied plating |
| Engineering | 0.2 | 0.7 | 1.3 | 1.5 | 2.6 | 7.9 | psi foci (lowest plate cost per XP) |

All ten skills reach 99 in about 14 hours of pure skilling and reach 200 in about 41 hours. Questing adds an estimated 6–10 hours: 40 quests, mostly talkTo/enterArea, with kill counts of 1–6. **For combat, the "many hours" today come only from travel and the story, not from progression.** The pacing test `packages/shared/test/spanBalance.test.ts` only compares styles with each other, so it cannot catch this.

**Stale docs:** `CONTRIBUTING.md:173` still describes `EASED_LEVEL_SPAN`, "level 10 costs about 2,700 XP" and creature ids that no longer exist (silt-eel, tide-wraith, cordon-stalker, vault-echo, moth-lantern, scrap-magpie).

## 2. Training coverage by skill (from `skillGuides`)

| Skill | Training levels | Gaps and notes |
|---|---|---|
| Salvage | nodes at 1, 5, 10, 15, 20, 25, 30, 35, 40, 44, 50 | Good to 50. Nothing from 51 to 200. |
| Research | traces at 1, 10, 20, 30, 40, 50; first study of 31 creatures (1–58) | First studies are one-offs (integrity × 12). Repeat study gives 20% on a global 90 s cooldown, about 22k/h at best, which is never competitive. |
| Biochemistry | gathering at 1, 10, 20, 30, 40, 50; recipes at 1–54 | Recipe gap 32 → 42. The allotment bed is placed only once. |
| Refining | 1, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50 | Level 1–8 has only scrap plating (8 XP, about 2.3k/h practical, which is the slowest early band in the game). |
| Engineering | 1, 8, 10, 12, 20, 30, 40, 50 | Only the survey loupe sits between 12 and 20. About 26 near-identical recipes per tier (159 total). |
| Containment | 1, 6, 10, 15, 21, 25, 35, 45, 50 | 25–35 offers only rustling, bilge wraith and Mr Brightly. |
| Combat (×3) | gear at 1/10/20/30/40/50; creatures to 58 | Fortitude has no gear or unlocks except the mantle at 200. |

There are no gathering tools, so gather speed is a fixed 4 ticks and only success chance scales. Gear never touches non-combat skills except insight/analysis for Research.

## 3. Gear, creature tiers and regions

Each region's tier band, creature levels and gear rung:

| Region | Tiers | Creature levels | Gear rung |
|---|---|---|---|
| Kestrel | 1–2 | 1–6 | scrap (1) |
| Harrow | 3–5 | 8–17 | ferro (10) |
| Halcyon | 6–7 | 21–29 | plasteel (20) |
| Wreckfield | 8–9 | 31–39 | duralloy (30) |
| Glass Steppe | 10–11 | 41–49 | sinter (40) |
| Spindle | 12–13 | 52–58 | vault-glass (50) |

Gear rungs line up with regions with no dead zone below 58. Above 58 nothing exists. There are 183 equipment items. Every crafted tier has 8 weapons plus 3 armour lines of 6 pieces, and they differ only by stats. Shops sell gear up to duralloy (`hallam-breakers`). Sinter and vault-glass are craft-only, which is good for Engineering demand.

Drop tables:
- **Creature uniques:** 13 in `catalog/uniques.ts`, mostly 1% drops, with `wardens-key` at 5% and `lamplighter-lantern` at 10% from `orchard-keeper`. With 30–60 s kills, the whole set is roughly 10–15 hours of chasing. That is currently the game's best long-tail, but nothing records it.
- **Bosses without a unique:** `mr-brightly`, `the-cohort` and `the-precentor` drop only generic materials. Eight non-boss creatures from level 12 up have no rare drop: seed-mite, thornback, scarecoat, ad-wraith, misprint, prism-hound, null-echo and null-stalker.

## 4. Recipe chains

- **Inputs:** every material has a source and a use (0 orphans). The only items without a source are the commendation, which comes from contracts, and the 10 mantles, which come from `grantMasteryMantles` at the contract board (`catalog/cityKit.ts:48`). Every chain resolves to nodes, drops or shops.
- **Outputs:** consumables scale sensibly from `smoked-eel` (heal 8) to `bloom-chowder` (heal 40). At Fortitude 58 the player has 252 integrity, so the best food heals 16%. Food matters less late than the 5%-per-20-ticks regeneration does.
- **Refining kits** (15 recipes, 10-minute stat boosts) are the only refined product that is not plating.
- **Engineering multiplies value:** 2 vault-residue (sells for 35 each) become 1 plating (sells for 100), which becomes a vault-glass baton (sells for 400). That turns 70 scrip of input into 400.

## 5. Economy

- **Sources:** quest scrip totals 10,530. Contracts pay 45 × tier per daily and 220 × tier per weekly (`content/contracts.ts:26`). Loot sells at 0.5 of value. Expected loot value per kill is 5 (alley crawler), 14 (hull knocker), 30 (glass stalker) and 37–38 (null stalker, cell-breaker). The craft-and-sell loop above makes roughly 100k scrip per hour (practical) at Engineering 50.
- **Sinks:** buying every piece of equipment any shop sells costs **9,860 scrip in total**. After that the only sinks are food and medicine (≤ 220) and the player market, which has no fee or tax (`economy/market.ts`). **Scrip has nothing to buy after about hour 5.**
- **Commendations:** 3–7 per daily and 12–21 per weekly. The `contracts-office` shop (`catalog/services.ts:16`) tops out at `hull-plate` (4 commendations) and `plasteel-plating`, which is tier 8 material. **From the Wreckfield onward, commendations buy nothing useful.**

## 6. Contracts (the only repeatable system)

There are 37 contracts: 29 daily and 8 weekly. By objective: 14 defeat, 12 gather, 6 craft and 5 contain. The board offers 3 daily and 2 weekly, weighted to the top two tiers.

| Gap | Detail |
|---|---|
| Tier coverage | No tier 5, 11 or 13 dailies. Only one daily each at tier 10 (`prism-cull`) and tier 12 (`null-rounds`), so an endgame board is 2 relevant dailies plus a tier 9 filler. |
| Weeklies | None above tier 9. None for the Glass Steppe or the Spindle. |
| Creatures with no contract | 13: all 5 bosses, plus seed-mite, thornback, ad-wraith, misprint, red-twin, choir-echo and cell-breaker. |
| Skill caps on contracts | Containment stops at 25 (`wraith-seal`), Research at 20, Biochemistry at 10, Engineering at scrap gear (`kit-order`), Refining at plasteel and kits. |
| Rewards | XP is `levelStepAt(tierFloor) × 0.5` (daily) or `× 2` (weekly), so at most 603 or 1,692. That is less than one late kill. Scrip has no use (section 5). |

**Net: contracts are a 5–10 minutes-a-day chore with nothing to work towards.**

## 7. Missing long-tail systems

None of the following exist in `shared/src` or `server/src`: a collection log, achievement diaries, slayer-style assignments with streaks, boss kill counts, minigames, titles, pets, or gear upkeep. The `studied:<creature>` flags and the client bestiary tab (`client/src/hud/tabs/bestiaryTab.ts`) are the only completion tracker. Quest points exist (`Condition` `questPoints`), but only 4 quests award more than the default.

## 8. Prioritized refinements

### Fix

1. **Re-anchor the XP economy (biggest lever).**
   - Pick a cap the content supports. Either:
     - (a) `SKILL_LEVEL_CAP = 99` with a steeper curve. For example, the old `25n + 18n^2.4`, uncapped, gives about 1.08M at 99. At the late gather rates (about 70k/h practical) that is 15–25 hours per skill to 99, or
     - (b) keep 200 but grow content (Grow item 1).
   - Then cut late kill XP. Drop the 3.5%-per-level threat term and the `rimward` 1.35×, or lower `VETERAN_LEVEL_CAP` from 44 to about 30, so one kill is worth 1–3 level-steps, not 15.
   - Files: `character/skills.ts`, `catalog/creatureKit.ts`, `span/creatures.ts`, `test/spanBalance.test.ts`. Size: S in code, M in retuning and tests.
2. **Stop quest XP scaling super-linearly.** Clamp `questLevelShare` (for example at 2) or lower the `styleQuestPay` weights of 30–40 on `the-review` and `end-of-file`, so the story pays around 3–5 levels at the end and not 100+. Files: `catalog/questPay.ts`, `span/quests/farSpan.ts`. Size: S.
3. **Make commendations useful past tier 8.** Add sinter and vault-glass plating, `red-mesh`, `bloom-silk`, `overdrive-kit-5` (and the optics and tuning equivalents), `bloom-elixir` and `red-salve` to `contracts-office`, gated by `requires` if listings support it. Files: `catalog/services.ts`. Size: S, data only.
4. **Fill contract tier holes.** Add daily tiers 5, 11 and 13 and weeklies for the Steppe and Spindle. Add contain contracts for `red-twin` (35) and `warden-of-null` (50), research/biochemistry gather contracts at 30, 40 and 50, and engineering craft contracts per tier. That takes contracts from 37 to about 65. File: `content/contracts.ts`. Size: S–M, data only.
5. **Add a scrip sink.** Either a market listing fee or tax of 1–2% (`economy/market.ts` plus the server market controller; small engine change) or high-priced cosmetic stock (Grow item 5). Also lower engineered gear `value` so selling crafts is not a 4× faucet. Size: S.
6. **Update `CONTRIBUTING.md:173-175`** to the current curve, cap and creature ids. Size: S.
7. **Fix weak early bands.** Add a refining recipe at level 4–5 (for example copper wire into induction coil at a lower tier, or rag into cloth). Place another allotment bed in Kestrel. Add an engineering recipe between 12 and 20. Files: `catalog/items.ts` (`WARD_RECIPES`) and `districts/layouts`. Size: S.

### Grow

1. **If the cap stays above 60, add tiers 60, 70 and 80.** That means nodes and traces (3 per tier per skill), one plating and one cloth, a gear rung of 26 recipes from `weaponVariants` and the gear kit, and 3–4 creatures in post-Spindle districts or the basements. Size: L (one new region per 10 levels, built to `WORLD_DESIGN.md`).
2. **Collection log and achievement diaries.** Add one `Condition` variant `{ type: 'flagCount'; prefix: string; atLeast: number }`, plus a server hook that sets `obtained:<itemId>` on the first drop of any item rarer than "standard". Then, as data only:
   - a collection log (the client lists `obtained:`, `studied:` and `defeated:` flags), and
   - **six region diaries × three tiers (18 "diary" quests)** made of existing objectives (defeat/contain/gather/craft/enterArea/reach). They reward region capes (new `back` gear), a `teleport` effect item and commendations.

   Files: `rules/conditions.ts` and `span/quests/diaries.ts`. Size: M.
3. **Directorate assignments (slayer-like).** Add a third `ContractCadence`, `'assignment'`, re-rolled when completed and not on a timer. The objective is "defeat N of one creature family", with N from 15 to 60, weighted by combat level. Track a streak with a flag counter, and pay bonus commendations every 10th assignment. Unlock a "Studied weakness" perk shop item and assignment-only drops, such as the boss uniques below. Files: `contracts/contract.ts`, `contractLedger.ts`, `content/contracts.ts`. Size: M.
4. **Boss rare drops and kill counts.**
   - Give `mr-brightly`, `the-cohort` and `the-precentor` a unique each (2–3%) plus a 1/200 cosmetic "pet" or cosmetic item.
   - Give `orchard-keeper` and `warden-of-null` a second unique.
   - Add a 1/500 "anomalous" tier to every non-boss creature (cosmetic or recolour). Uniques are ~13 now; this takes them to ~45.
   - Files: `span/creatures.ts`, `catalog/uniques.ts`. Size: S–M, data only.
5. **Sinks with status.** Sell dyes, recolour mantles and titles for 50k–1M scrip and 200–2,000 commendations. Add a gear "recalibration" recipe that consumes high-tier plating, so materials keep flowing. Files: `catalog/services.ts` and `catalog/items.ts`. Size: S–M.
6. **Make repeat Study competitive.** Change the 300-tick cooldown from global (`researchController.ts:67` uses `lastNoteTick`) to per creature, or raise `REPEAT_STUDY_SHARE`, so Research has a combat-adjacent method. Size: S.
7. **A minigame.** For example, a Training Yard wave defence in `kestrel-b1` that reuses `encounter` mechanics, a points shop and a leaderboard. Size: L (engine).
