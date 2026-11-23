# Quests and story audit, 2026-11-23

Scope: all 40 quests in 12 questlines, 58 NPCs, 58 dialogues (328 nodes), read from the code alone. I counted and estimated everything with scripts run against `GAME_CONTENT`. Paths are relative to `packages/shared/src/content` unless they say otherwise.

## 1. Structure at a glance

| Questline | Kind | Quests | Rec. level | Est. minutes |
| - | - | - | - | - |
| act-one-intake | main | 2 | 1 | 14 |
| kestrel-errands | side | 4 | 2–8 | 20 |
| act-two-strain | main | 3 | 8–15 | 21 |
| harrow-errands | side | 4 | 8–16 | 23 |
| act-three-breach | main | 3 | 20–27 | 26 |
| halcyon-errands | side | 4 | 20–25 | 27 |
| act-four-overrun | main | 3 | 30–36 | 19 |
| rustwater-jobs | side | 4 | 30–34 | 21 |
| act-five-lost | main | 3 | 40–46 | 25 |
| choir-alms | side | 3 | 41–46 | 17 |
| act-six-inverted | main | 4 | 50–58 | 20 |
| last-post-errands | side | 3 | 50–55 | 15 |

- **Chain.** The 18 main quests form one linear chain. Each act's opener is offered by a hub NPC (reeve-halvard, scav-boss-mags, cantor-ysolde, captain-halloran) and gated on the previous act's last quest; the rest follow through `followUpQuestId`. Each region has 3–4 side quests, each offered by one NPC in that region's settlement.
- **Steps and objectives.** There are 134 steps with 149 objectives. The quest engine (`quests/questDefinition.ts`) supports 12 objective types, and all 12 are used. In objective counts:

  | talkTo | enterArea | defeat | reach | signal (hand-in) | interactWith | contain | gather | obtainItem | equip | craft | useItem |
  | - | - | - | - | - | - | - | - | - | - | - | - |
  | 50 | 20 | 17 | 13 | 12 | 10 | 7 | 5 | 3 | 2 | 2 | 1 |

  **Talking and handing in make up 62 of 149 objectives (42%).** Every `defeat` and `contain` is "N of creature X". There are no escort, timed, puzzle, multi-choice or repeatable quests.
- **Conditions and effects.** All 10 `Condition` types exist, but quests and dialogue use only a few:
  - `questCompleted`, `questNotStarted` and `hasItem`, plus `skillLevel` and `combatLevel` on 4 offers.
  - `hasFlag`/`lacksFlag` only for the three clearances and the ending.
  - **`questPoints` is never used** as a condition, although quests award 45 QP in total.
  - Among effects, `teleport`, `discoverStation` and `grantMasteryMantles` never appear in a quest reward.
- **Branching.** There is exactly one choice in the game, in `end-of-file`: `registrar-lune-null#q1-choice` sets `ending:resealed` or `ending:signed-out`. Only Vale's and Lune's dialogue reads those flags afterwards, and no quest, reward or world state differs between the two endings.
- **Completability.** Every check passes:
  - Every NPC, creature, object and area that an objective names is placed.
  - Every hand-in signal (12) is emitted by an option that both checks for and takes the right items.
  - Every quest item has a source: hale-seed-tin, tam-parcel and pike-envelope from dialogue; kit-rook-tags from the `rook-kit-bag` in site-tallow, gated on the active step; silence-bell and drone-governor from recipes whose inputs are all obtainable.
  - **No objective is unreachable.**

## 2. Time estimate

Method:
- Walking: 1 tile per 300 ms tick (`server/src/world/world.ts:223`), which is 200 tiles a minute. Distance is the straight line between district centres (64-tile squares) × 1.4 for detours. Each objective goes to the nearest district that holds its target, and quests in a chain start where the previous one ended.
- Actions: talk 1 min, hand-in 0.75, interact 0.5, normal kill 0.6, contain 1.2, boss 5, gather or obtain 0.5 per item, craft 4.

| | Minutes |
| - | - |
| All 40 quests (active play) | **≈ 248** (main 128, side 120) |
| First walk between the six hubs (Kestrel → Harrowgate → Neon Row → Rustwater → Choir → Last Post), before trams | 11 |
| Grinding needed to clear every `reach` gate on the main path | ≈ 30 |

The typical quest is short:
- A side quest averages **5.6 min** and 2.3 steps. A main quest averages 7.1 min.
- The longest quests are dead-air (10.5), the-last-hymn (10.6) and report-for-intake (9.6).

**In total, quests give about 4.5–5.5 hours of play**, even allowing double for reading and fights. The six regions are close to even: Kestrel 34, Harrow 44, Halcyon 52, Wreckfield 40, Steppe 42, Spindle 35 minutes. On their own, the quests are well short of "many hours".

**Coverage is thin.** Only 25 districts are named by a fixed quest target. That leaves **116 of 138 overworld districts (84%)** that no quest sends you to, except as "kill or gather X anywhere":

| Region | Districts | With a fixed quest target | With any NPC |
| - | - | - | - |
| Kestrel | 21 | 4 | 4 |
| Harrow | 21 | 5 | 3 |
| Halcyon | 27 | 5 | 5 |
| Wreckfield | 20 | **2** | 2 |
| Glass Steppe | 30 | 5 | **1** |
| Spindle | 22 | 3 | 2 |

**Unused NPCs and creatures:**
- 13 of 58 NPCs have no quest. Each has a single dialogue node and is mostly a shopkeeper: warden-achebe, lift-warden-ama, quartermaster-okonkwo, storekeeper-pim, smith-keane, publican-dorrit, doctor-amsel, ripperdoc-sato, tinker-ash, vendor-lin, arcade-keeper-mo, noodle-cook-han, bartender-reza.
- 9 of 31 creatures appear in no quest: lawn-rat, courtyard-gull, feral-hound, crop-magpie, alley-crawler, rustling, prism-hound, glass-stalker, cell-breaker.

**Skills with no quests:**
- **Refining has no quest objective and no quest reward at all.**
- Marksmanship has none either (style XP goes to whatever weapon you hold).
- Psionics is rewarded once (the-last-hymn) and Salvage four times.

## 3. Findings: fix

### F1. Quest XP from Act IV onward is ~10× too high, which turns 7 gates into dead steps

`catalog/questPay.ts` pays `levelStep(level) × share × weight`, but the two halves of the story use very different weights:
- `span/quests/spinward.ts` (Acts II–III and the side quests up to Halcyon) uses weights 1–3, for example `styleQuestPay(28, 3)` at line 133.
- `span/quests/farSpan.ts` uses weights 6–40: `questPay('fortitude', 30, 20)` at :45, `styleQuestPay(58, 40)` at :242, and so on.

Breach pays 10,200 XP in total; the very next quest, Sternward, pays **50,800**. I simulated a player who does only the main quests and never fights outside them (one weapon style):

| After | Combat | Note |
| - | - | - |
| breach | 21 | |
| sternward | **42** | its own gate is combat 30 |
| roll-call | 84 | gate 35, already met at 42 |
| the-last-hymn | 120 | gate 45 |
| last-post | 136 | gate 52 |
| the-review | 178 | gate 55 |

At the end, Close Quarters is at the cap of 200, Fortitude 140, Research 149 and Containment 106. The strongest creature in the game is level 58.

As a result:
- These `reach` steps are complete the moment they start: roll-call/drill, the-last-hymn/drill, last-post/drill, the-review/drill, and countersong/steady (containment 35 against 68 already held).
- So are the offer gates on cantor-ysolde (combat 40) and captain-halloran (combat 50), at `farSpan.ts:573` and `:670`.
- Every Steppe and Spindle creature becomes trivial (the level gap is above `AGGRESSION_LEVEL_GAP`). This removes the late game's challenge and its grind.

**Fix:** bring the farSpan weights into the 1–4 range spinward uses, and add a test that main-path quest XP alone keeps combat level below the next act's recommended level.
**Files:** `farSpan.ts` (19 `pays` calls) and a new test. Size: S.

The skill curve itself is a related, cross-cutting issue. `experienceForLevel` grows as 12n², while `killExperience` grows roughly as level² (`catalog/creatureKit.ts:44`). One null-echo kill (19,931 XP, level 52) is worth more than three levels' worth of XP at level 50. Even after F1, the grind will be short; I raise it for the economy audit.

### F2. Hidden skill walls on gather quests

`gather` objectives count only the `gathered` event, which a node raises (`server/src/gameplay/gatheringController.ts:86`). Creature drops of the same item do not count. Three quests send you to nodes with skill requirements that nothing tells you about:

| Quest | Rec. level | Node requires | Biochemistry a player has by then |
| - | - | - | - |
| bitter-herbs | 8 | reed-bed: Biochemistry 10 | about 2 (quests give it 260 XP before Act IV) |
| bilge-broth | 30 | tide-weed: Biochemistry 30 | |
| last-meal | 50 | vault-bloom: Biochemistry 50 | |

The quests built the same way, by-weight and cuts-like-nothing, correctly open with a `reach salvage` step.

**Fix:** add a `reach biochemistry N` step with `toward: { objects: [...] }` to each, or an offer `skillLevel` condition with a `notReady` line. Size: XS.

### F3. Far-side side quests have no story or level gate

Nine side quests in `farSpan.ts` have no `offerRequires`, and their offer entry checks only `questNotStarted`: by-weight, knock-knock, bilge-broth, barefoot, coax-the-glass, refectory-silence, cuts-like-nothing, checked-on and last-meal. All Seam gates are open, so a level-3 recruit can walk to Last Post and take checked-on (null stalkers, level 56). Barefoot, Ruth's mystical errand, can be started before gone-quiet introduces her.

By contrast, every spinward side quest sets `offerRequires`, which the journal and guidance read.

**Fix:** add `offerRequires` (the act opener for each region) plus a `combatLevel` or `skillLevel` offer condition with a `notReady` line. Size: S.

### F4. Story and spec drift after the unrolling

- **Promised basements are missing.** The spec's region table (`docs/superpowers/specs/2026-11-20-the-span-design.md`) promises Tallow Holding (B1) and Vesper Deep (B1). Only `kestrel-b1`, `gallowglass-b1` and `null-b1` exist. The casualty board, the Cohort and the Precentor are all on overworld squares (site-tallow, site-vesper).
- **Stale references.** The Precentor's examine text (`span/creatures.ts:108`) still says "the dark of Vesper Deep".
- **"Two hours sternward"** appears at `farSpan.ts:31`, `:453` and `:468`, and at `span/people.ts:82`. Rustwater (12,2) is 3 squares from Site Tallow (15,2), about 1.3 minutes on foot.
- **The old west-to-east axis.** "Walk spinward / Halcyon is spinward" (`span/quests/intake.ts:63`, `:91`; `spinward.ts:73`, `:362`) assumes it. The Reach now runs clockwise round the Massif, so "spinward" should be defined in lore, or replaced with "round the Massif" or "north".

**Fix:** either build the two basements (see G3) or update the spec and the text. Size: XS for the text.

### F5. Small inconsistencies

- **QP is unused:** quest points are awarded but nothing reads them (see §1). Use them as a gate (G6) or drop them.
- **Missing `offerRequires` on main openers:** sternward, gone-quiet and last-post rely on the dialogue entry alone, so the journal cannot show their prerequisites.
- **Thin hubs:** site-vesper (20 creatures) has no NPC, and site-tallow has only Lt Osei, who carries 21 dialogue nodes. Both are fine for "Lost" and "Overrun", but they leave nobody to give follow-ups.

## 4. Findings: grow

The engine supports all of this without new code. Every proposal below uses existing objective, condition and effect types.

**G1. Turn the 13 idle NPCs into quest givers** (Size: M, about 13 quests). Each already has a title and a one-line hook in `span/people.ts`:

| NPC | Proposed quest |
| - | - |
| warden-achebe | Block K's "coat that sulks": contain and escort it below |
| quartermaster-okonkwo | "counts the people who come back": a Roster ledger quest leading into Paper Trail |
| smith-keane | **the first Refining quest**: smelt ferro and plate a windpump on windpump-rise |
| doctor-amsel | follows bitter-herbs: the seed residue turning up in patients |
| ripperdoc-sato | a Psionics and augment quest |
| tinker-ash | rebuild a holo billboard (Engineering and craft) |
| arcade-keeper-mo | ad-wraiths living in the cabinets |
| vendor-lin, noodle-cook-han, bartender-reza | Night Market errands that use alley-crawler drops |
| publican-dorrit, storekeeper-pim, lift-warden-ama | short fetch and talk chains |

**G2. Put quests in the wild districts** (Size: L). Write 3–5 quests per region whose targets sit on currently empty squares, adding `questObject` set-pieces where needed:
- **Wreckfield:** the *Meridian* hull (the-bow, keel-road, engine-field) has no quest despite being the region's landmark. Suggested: a "Ship's Manifest" chain through the bow, the engine field and the reactor scar, using rustlings and the hull.
- **Glass Steppe:** 25 of its 30 districts are untouched, including pylon fields, mirror-mere and drop-edge. Suggested: a pylon-relighting chain using prism-hounds and glass-stalkers, which no quest uses today.
- **Spindle:** cell-breakers, quiet-peaks and sealed-ground are unused.
- **Kestrel:** firing-line and range-road invite a Marksmanship qualification quest.

**G3. Build the two promised B1 levels** (Size: L each). Tallow Holding would hold the Roster's printouts and the Cohort's barracks, giving Act IV an underground finale. Vesper Deep would hold the Nave.

**G4. Give the ending consequences** (Size: M). Add an epilogue quest for each flag:
- `ending:resealed`: you go back on the Roster, and Vale sends you on the "next cohort" run.
- `ending:signed-out`: you are off the books; Mags and Juno offer freelance work.

This gives post-game content and a reason to replay.

**G5. A cross-region collection questline: "Cohort 41"** (Size: M). Dace, Vale and Lune already have reprints. A "find the other reprints" chain could spread one talk or interact target across every region, scaled by tier. It would also tie the story's central mystery to the open map.

**G6. Long-tail and repeatable content for "many hours"** (Size: M–L):
- **QP-gated elite quests** (`questPoints` condition): for example a 30-QP "Directorate Commendation" chain with bosses back at higher levels.
- **Fill the contract gaps.** Tiers 5, 11 and 13 have no contracts. There are no weekly contracts above tier 9, and no contain, gather or craft contracts above tier 9 (`contracts.ts`).
- **A second boss per region** using the encounter mechanics.
- **Quest steps that use the tram**, such as `discoverStation` as a reward and a courier quest over the Ring Line.

**G7. Variety** (Size: M). Move from 42% talk and hand-in toward more `craft`, `contain`, `useItem` and multi-objective steps. Add at least one branching choice per act through flags: Act III could choose Combine or Directorate, which Vance's 7 nodes already set up. Branches change the reward or the follow-up.

## 5. Prioritised refinements

**Fix (do first)**

1. **F1:** rescale the farSpan quest XP weights to the spinward band, and add a progression test that quest XP alone stays below each act's recommended level. Files: `span/quests/farSpan.ts`, a test under `packages/shared/test`. Size: S.
2. **F2:** add skill gates to bitter-herbs, bilge-broth and last-meal (a `reach` step or an offer condition with `notReady`). Files: `spinward.ts:224-235`, `farSpan.ts` (bilge-broth and last-meal). Size: XS.
3. **F3:** add `offerRequires` and level conditions to the nine ungated far-side side quests, and `offerRequires` to the act openers. File: `farSpan.ts`. Size: S.
4. **F4:** fix the stale "Vesper Deep", "two hours" and "spinward" text, and mark Tallow Holding and Vesper Deep in the spec as not built. Files: `span/creatures.ts:108`, `farSpan.ts:31,453,468`, `span/people.ts:82`, `intake.ts:63,91`, `spinward.ts:73,362`, `docs/superpowers/specs/2026-11-20-the-span-design.md`. Size: XS.
5. **F5:** decide what quest points are for (gate content with them, or remove them). Size: XS.

**Grow (in order)**

1. **G2:** wild-district quests in the Wreckfield and Glass Steppe first, since they have the fewest anchors. About 8 quests. Files: `span/quests/farSpan.ts`, or split into `wreckfield.ts` and `steppe.ts`; new `questObject`s placed through `districts/layouts/*.json`. Size: L.
2. **G1:** 13 quests for the idle NPCs, including the first Refining and Psionics quests. Files: `span/people.ts`, `span/quests/*`. Size: M.
3. **G4:** ending epilogues and post-game work. File: `farSpan.ts`. Size: M.
4. **G5:** the Cohort 41 reprints questline across all six regions. Files: a new questline file, plus NPCs in `span/people.ts`. Size: M.
5. **G6:** QP-gated elite quests, contracts for tiers 5, 11 and 13 with weeklies, and a second boss per region. Files: `contracts.ts`, `span/creatures.ts`. Size: M–L.
6. **G3:** the Tallow Holding and Vesper Deep basement levels. Files: `levels`, blueprint layouts, plus moving the bosses into them. Size: L.
7. **G7:** one branching choice per act, and more craft, contain and use steps. Size: M.

Doing items 1–4 of the grow list would roughly double the quest count (40 → ~80) and give the 116 empty districts reasons to be visited. That is the most direct route from about 5 hours of quests towards the "many hours" target.
