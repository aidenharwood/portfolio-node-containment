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

## Open items, all deprioritised by the critic

1. Salvage and Refining unlock only every 10 levels, and Refining is a pure 2→1 conversion. Add mid-tier nodes or recipes at 5, 15, 25…, or merge the two skills.
2. Levels 55–60 hold nothing. Add a capstone, or lower the cap to 55.
3. Repeat studies pay 10%, so Research after the first studies is trace clicking.
4. Ranged at 20 clears the parity floor by only one point (71% against 70%). Slowing the carbine or the rustling would trip the test.
5. Saves made on today's unreleased `dev` that sit on The Heart `tide` step would re-fight the Warden. Legacy saves without a `stepId` were already off by one after `hale`. Check the live DB before deploying.
6. `dev` is not merged to `main`. Merge it when the owner is happy.
