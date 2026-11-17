# Handoff: gameplay critique loop

Written 2026-11-17. This loop ran the brief in `2026-11-17-gameplay-critique.md`, using the working rules from `2026-11-16-polish-loop-2.md`. Commits: `cddfbe9` (round 1) and the round 2 polish commit after it. Both are on `main`.

## How it ran

1. **Inspection.** I traced the early game through the content data:
   - `scripts/_curve.ts` (local, not committed) prints the XP curve, quest rewards, creature stats and shop stock.
   - `scripts/_places.ts` prints what each district places.
   - Two headless shots: a fresh tutorial start, and the HUD straight after the tutorial.
   - `scripts/_fresh.mjs` patches the preview character; the preview DB was backed up first and restored afterwards.
2. **Critic.** One Fable 5.2 critic, read-only, at high effort. It hit the 5-hour limit mid-round 1 and was resumed after the reset with SendMessage. Verdicts: round 1 **"not yet"**, round 2 **"ship it"**.

## Findings (round 1)

1. **Lost Cat killed fresh players.** It sent them to the Cut among aggressive L6 gutter mites, and the tutorial never made them wear the plate.
2. **No next goal after a quest.** The objective tracker went empty after the tutorial and after every main chapter. The only pointer was a one-off chat line.
3. **The Contract Board was a dead end.** Halloran advertised it, but `CONTRACTS` was empty and there was no commendation shop.
4. **Dead Band was a crafting wall.** It was gated on Engineering 15, about 1.5 hours of scrap bars, and nothing in the tracker or journal said so.
5. **Rewards were only XP and scrip.** Three NPC lines promised things the player never got: Sefa's gift, Nell's charm, and Vance's recipe arriving at the wrong level.
6. **Blades were a trap purchase.** Melee ignores Accuracy and ranged ignores Power, so the Iron Blade was strictly worse than the Iron Baton.
7. **Early combat cost more than it paid.** The smoked eel healed 5 for 12 scrip.
8. **The Lamplighter was an undisclosed gear check,** and no test locked the early balance curve.

## What changed

**Main story chain**
- `followUpQuestId` now links `last-train-in` → `rent-day` → `steel-below` → `dead-band`.
- Each follow-up opens with a talk step (Bettina, Tam, Sefa) that carries the old pitch.
- After the tutorial the tracker shows "Rent Day / Talk to Bettina Crane" with a route. Checked headlessly.

**Lost Cat**
- Pell's offer and the alley vent need combat level 4. Pell has a not-ready line, and the quest's recommended level is 5.
- The tutorial `equip` step now also requires the scrap plate.
- The mites step and Pell's waiting line say to eat between fights.

**Contracts** (`content/contracts.ts`, restored)
- Tier-1 dailies:
  - defeat rats and pigeons;
  - defeat dogs and magpies;
  - gather scrap metal;
  - gather basin eels (pays Biochemistry);
  - craft scrap bars;
  - Kit Order: craft any scrap gear (pays Engineering);
  - contain crate wisps.
- Tier-3 and tier-4 dailies:
  - mites, silt eels and crawlers;
  - silt iron, reeds (pays Biochemistry) and culvert trace (pays Research);
  - iron bars.
- Weeklies run from tier 1 to tier 4.
- Contract XP is floored at 150 for dailies and 600 for weeklies, and a contract can override which skill it pays.
- New `contracts-office` commendation shop, opened from the board's "Spend commendations" option.

**Dead Band**
- The receiver recipe needs Engineering 8, and Sefa's dialogue gate is gone. The recipe level is the server-side gate.
- Engineering XP: Valve Trouble pays 800 and Steel Below pays 800. The Scrap rung pays 14 XP per input.
- Recommended level is 12. The readings journal warns about the Scrapyards and the Fringe, and Sefa points to Kofi and the Kit Order.

**Rewards**
- Line Thief: scrap greaves. Lost Cat: scrap helm.
- Bright Things: scrap carbine, and Nell's line is reworded to match.
- Drowned Lamp: 3 iron bars and 2 culvert traces.
- Dead Band: 5 reed tonics.
- Noodle Run: 600 Biochemistry XP.

**Weapons**
- Ladder weapons carry only their style's offence stat.
- Power by level `l`: baton `4 + 0.7l`, blade `6 + 0.8l`, maul `10 + 1.3l`.

**Food**
- The smoked eel heals 8 and costs 7–8 scrip.
- Gutter mites drop basin eels at 25%.
- Sol's waiting line tells the player to take iron.

**Tests** (`packages/shared/test/wardBalance.test.ts`)
- Seeded fight bands, also listed in the CONTRIBUTING.md Balancing table.
- The storyline chain.
- Quest rewards give only craftable, non-unique gear and consumables.
- Quests before Dead Band pay enough Engineering.
- The offence-stat rule and the blade, maul and baton order.
- Food price per point healed.
- Kit Order coverage.

## Open items

1. **The Act II wall.** `dead-band` has no follow-up, so the tracker empties again there. `bill-of-lading` sits behind Research 25 (37,564 XP) while quests supply about 3,400. It is the same kind of wall that Dead Band was.
2. **Tracker level cue.** An optional client change: show "Recommended combat level N · yours M" in `objectiveTracker.ts`, reusing the logic in `questsTab.ts`.
3. **Lost Cat gauntlet.** Three mites back to back without food is about a 16% win at the gate. Only text warns about it; there is no gauntlet test.
4. **Cosmetic.** `line-mimic` drops the Okafor coat at 100% forever, and `pike-pawn` has no listings.
5. **Regeneration.** It is unchanged: 1 integrity every 20 ticks out of combat. If playtesting shows the waits drag, `REGENERATION_INTERVAL_TICKS` is a one-line change.

## Follow-up: experience rates

The owner asked for early levels to come fairly quickly. The model in `scripts/_rates.ts` (local, not committed) simulates seeded fights in level-matched gear, with walking and regeneration time added.

**Curve**
- `experienceForLevel` now discounts early levels with `earlyLevelEase` and rejoins the old curve exactly at level 25.
- Cumulative XP for level 2 drops from 43 to 15, level 5 from 601 to 309, and level 10 from 3,736 to 2,714.
- The cost of each level still never falls below the one before it; a test checks this.

**Tutorial**
- It now pays XP: 40 Close Quarters and 30 Fortitude for the drone, 60 Containment for the wisp, 60 Biochemistry for the noodles, and 60 Close Quarters plus 40 Fortitude at the end.
- A new operative leaves it at about Close Quarters 3–4, Fortitude 3 and combat level 3, a short rat hunt away from Lost Cat.

**Kill XP**
- `beast()` creatures pay `killExperience(level)` = 6·level + 2·min(level, 16)².
- The canal rat now pays 20 and the stray dog 56.
- Before, scrap magpies (L3) were the best XP per minute all the way to level 19. Now the best target climbs: dogs, then silt eels, then scrap crawlers. A test checks that crawlers lead at level 10.
- Late creatures pay about 25% more per kill. Watch this if Act II pacing feels short.

**Ideal combat time (model)**

| Level | Before | Now |
| --- | --- | --- |
| 5 | about 5 min | about 2 min |
| 10 | about 19 min | about 10 min |
| 20 | about 63 min | about 44 min |

## Follow-up: gear models per tier and back items

The owner said the gear lines were only recolours and that back items were missing. I ran the critic loop again. Fable 5.2 needed usage credits, so the critic was Opus, as the brief allows. Verdicts: rounds 1–3 "not yet", round 4 **"ship it"**.

**Forms**
- `GearVisual.form` (`GEAR_FORMS`) comes from `MATERIAL_LADDER`. Every worn piece, held weapon and icon now changes its outline per tier:
  - Helms: dented bucket, kettle hat with nasal bar, crested T-slot sallet, porthole diving dome, sealed faceplate with canisters, crystal crown.
  - Cowls and hoods: sack hood, felt cone hat, mitre with sigil, weed tendrils with coral crown, a nimbus, a void hood.
  - Every torso, glove, leg and boot gets matching changes.
  - Maul, pistol, carbine and rifle swap their head or receiver per form.
- `reshapeForForm` remaps icons, held weapons and backs per form.
- Modules: `gearFormWorn.ts`, `itemFormPasses.ts`, `weaponHeads.ts`, `formReshape.ts`. ARCHITECTURE.md ("Gear on the character model") has the summary.

**Back line**
- 18 new craftable pieces: `{tier}-pavise` (new `shield` shape), `{line}-pack` and `{line}-mantle`.
- Stats: `HEAVY.back = 1 + 0.3l`, Hazard 1. Inputs: 2 of the tier's bar, fibre or trace.
- Kit Order picks up the scrap backs automatically.

**Guard**
- `packages/client/test/gearForms.test.ts` (52 tests) compares bounding-box-normalised 16×16 silhouettes and needs Jaccard ≥ 0.2 between any two tiers.
- `VoxelModel` gained `cells()`, `merge()` and `occupied()`. `wornModelsFor` exposes the unmeshed rig parts.

**Open polish**
- Check the Redline nimbus (radius 7, arc segments) and the reduced Cordon top cell in a fresh shot.
- `scripts/_formDist.ts` (local) prints the closest tier pair per piece.

## Follow-up: poses, animations, projectiles and particles

The owner asked for an audit of poses, animations, projectiles and particles. Fable needed credits, so the critic ran on Opus. Verdicts: rounds 1–3 "not yet", round 4 **"ship it"**. The owner asked for an early push after round 3; that went out as `ad6307d`, and the round-4 polish followed. ARCHITECTURE.md ("Animation timing and effects") has the design.

**Fixed**
- The torso came off the hips during lean and lunge, and feet floated while walking.
- Hits, flashes and health drops landed before the swing or shot.
- Swings were soft: they had no easing into contact and no hit-stop.
- Feet slid; creatures vibrated and moths spun.
- Hurt reactions were invisible.
- Creature attacks had no wind-up, and pitching sank creatures into the floor.
- Projectiles started from the body centre, and every creature projectile was the same lime green.
- There were no particles at all.
- Gun recoil peaked at release, and the left hand was off the barrel.
- Strike and slash pointed the weapon up at contact.
- Corpses reappeared after shattering, and deaths started before the killing blow landed.
- Gatherers swung their guns like hammers.

**New**
- `particleLayer.ts`, `attackTiming.ts` and `combatClock.ts`.
- The `world.entityCue` protocol message.
- Rig, timing, particle and clock tests: 715 tests in total.

**Open**
- A live in-game fight capture with bloom, recorded every 50 ms, to confirm the order in real play: kick, then muzzle, then flash and damage number, then the health bar, then death. Staged shots and tests cover the timing, but nobody has watched it in a running game.
- Optional:
  - a slightly lower rifle rest pose (`rightZ` about −0.55)
  - a graphics setting for `ParticleLayer.density`
  - camera kick on heavy hits
  - footstep dust
- Knife, polearm and scattergun motions have no items in the content, so they were never shot.
