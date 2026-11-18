# Handoff: skills and playability critique loop

Written 2026-11-17. This loop ran on the `dev` branch, which was cut from `world-rebuild` at `3481d6a`. Every commit is pushed to `origin/dev`. `main` was not touched.

## How it ran

- **Critic.** One Opus 5.5 critic, read-only, at high effort, resumed each round with SendMessage so it kept its own grades. Verdicts:
  - round 1: **"not yet"**
  - round 2: **"not yet"**
  - round 3: **"ship it"**, once a one-line journal fix was in.
- **Implementers.** Sonnet subagents handled the small, data-first items. The two larger items, the skill-guide UI and the per-style pacing test, went to Opus subagents. They ran in parallel on separate files, and the session committed after each batch went green.
- **Critic scratch models** are in the session scratchpad: `skillmap.ts`, `tri.ts`, `tri3.ts`, `lag*.ts`.

## Grades: round 1 → round 3

| Skill | Round 1 | Round 3 |
| --- | --- | --- |
| Close Quarters | B | A− |
| Marksmanship | C | B |
| Psionics | C | B |
| Fortitude | D | B− |
| Containment | D | B |
| Research | B− | B |
| Engineering | B | B |
| Salvage | C | C |
| Refining | C− | C− |
| Biochemistry | A− | A− |
| Playability | C+ | B+ |

## What changed

**Commits:** `42082c7`, `b0e7d56`, `ceee8f5`, `717d69d`, `f587f8b`, `4031bf8` and `75ea992`.

**Combat skills**
- Bulwark plate is gated on Close Quarters, not Fortitude.
- Fortitude earns half the style share. `typicalFortitude` in `wardBalance.test.ts` models a realistic Fortitude.
- `SKILL_LEVEL_CAP` is 60, because content ends at 54.

**Containment**
- Containing a creature pays the full combat XP plus about 50% of the kill XP as Containment XP.
- Bill of Lading has a hound contain step, and The Heart a wraith contain step, which comes before the Vault.
- Both chapters open with `reach` Containment gates (15 and 25) that include routes.
- New contracts: hound-catch (tier 6) and wraith-seal (tier 8).
- A story-gate test makes any story contain above the Containment XP supplied so far sit behind a `reach` gate.

**Combat triangle**
- Guards:
  - bulwark: rustling, hull-knocker, cell-breaker;
  - skirmisher: glass-hound, cordon-stalker;
  - warden: moth-lantern, tide-wraith, vault-echo.
- Ranged attackers: magpie, silt eel, rustling, tide wraith and Cordon stalker.
- The glass hound attacks psionically.
- `THREAT_ACCURACY_PER_LEVEL.ranged` is 2.5.
- Pinned stats:
  - Warden: 340 / 28 / 32, for about 78% wins at 54 in plate;
  - vault-echo: accuracy 32;
  - rustling: accuracy 8.

**Style parity test**
- `lineFight` and `linePace` measure each style with its own armour line and its strongest weapon.
- At levels 20, 30, 40 and 50, each style must have a farm with at least 95% wins, no more than 60% integrity lost, and at least 70% of melee's XP per minute.
- CONTRIBUTING.md ("Balancing") has the table.

**Style quest XP**
- New `grantStyleExperience` effect, which pays the equipped weapon's style skill.
- Used by lost-cat, drowned-lamp and knock-back.

**Skill guides**
- `shared/src/crafting/skillGuide.ts` derives entries from content, of these kinds: gather, recipe, equip, contain, study, quest, contract, story and fight.
- Every skills tab tile opens `SkillGuideWindow`.
- The tooltip shows "Train by" (`SKILL_INFO.trainedBy`) and "Next unlock".
- Fortitude shows `skillMilestones` instead of an unlock list.
- Level-up notices list "Unlocked: …".

**Projectiles**
- `CreatureAttack.projectile` overrides the client's `projectileOf`. Rustlings fling `pellets`.

## Checks

- Typecheck is clean.
- 763 tests pass.
- `scripts/_issues.ts` reports 0 content issues.
- **Not checked in a running client:** the skill guide window and tooltip, the glass hound's lunge animation now that it attacks at range, and the rustling pellets.

## Second loop, 2026-11-18: Salvage, Refining, the cap and Research

The owner asked to work through the items the critic had deprioritised. The same critic ran rounds 4–6 with the same setup. Verdicts:
- round 4: a spec, not a verdict;
- round 5: **"not yet"**;
- round 6: **"ship it"**, once the refined fittings were wired into the kits.

**Commits:** `a0db865`, `519e607`, `380dff4`, `5d50646`, `caca004`, `367ca40` and `be0ce7f`.

**Research exploit**
- Re-studying the same creature had no limit, worth about 290k to 1.5M XP an hour.
- Each spawn now takes one note per character (`Creature.notedBy`, cleared on respawn).
- A repeat note pays 20% of the first study.
- Each character waits `REPEAT_STUDY_COOLDOWN_TICKS = 300` between repeat notes (`Player.lastNoteTick`).
- `studyCooldown.test.ts` keeps the note ceiling within 1.2× of rotating the best trace nodes.

**Salvage half-tiers**
| Node | Level | District |
| --- | --- | --- |
| cable-drum | 5 | the-cut |
| lock-gear | 15 | scrapyards |
| crusher-housing | 25 | shipyard-fringe |
| rivet-seam | 35 | cordon-gate |
| sprung-cell-door | 44 | meridian-secure |
- District tiers forced these placements, because a node can only stand in a district deep enough for its level.

**Refining field kits**
- `edge`, `sight` and `tuning` kits, tiers I–V, at levels 8, 20, 30, 40 and 45. They give +2, +3, +4, +5 and +8 for 10 minutes and do not stack with tinctures.
- Each kit is a two-step chain through refined fittings: copper coil, brass strip, bearing ring, and cell mesh plus rivets.
- New Biochemistry Amber Tincture at 20.
- New contracts: wire-pull, kit-bench and rivet-haul.
- `skillBands.test.ts` checks every 5-level band.
- `findMaterialSinkIssues` flags any gathered or refined material that nothing consumes.

**Cap and capstone**
- `SKILL_LEVEL_CAP = 55`.
- Ten mastery mantles, claimed with "Claim mastery" at the contract board through the `grantMasteryMantles` effect.
- The claim notice names the closest skill.

**Safety**
- `gatherNodeSafety.test.ts` covers creatures more than 5 levels over a node.
- Five nodes moved, including three older Fringe nodes that tide wraiths could reach.

**Checks:** typecheck is clean, 788 tests pass and content issues are 0.

## Open items

1. **Not checked in a running client:**
   - the skill guide window and tooltip;
   - the glass hound lunging at range;
   - rustling pellets;
   - the Claim mastery interaction.
2. **Fortitude mantle.** Watch its triple defence (18 in total) against the Vault pavise (23).
3. **Tight margins.**
   - Ranged at 20 clears the parity floor by only one point.
   - Moth notes pay about 16k an hour, a decorative tail.
4. **Saves.**
   - A save on The Heart's `tide` step from unreleased `dev` would re-fight the Warden.
   - Legacy saves without a `stepId` were already one step off after `hale`.
   - Check the live DB before deploying.
5. **`dev` is not merged to `main`.** Another session is also committing graphics-settings work on `dev`.
