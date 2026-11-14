# World rebuild: from an empty world

## Intent

The world has been redrawn three times and still feels soulless, because each redraw kept the same content, the same props and the same way of building places. This rebuild keeps the engine and throws away everything the engine was showing: every place, person, quest, item, creature and model. The new world is built from the owner's premise (an open, dystopian but functional city where containment facilities are the landmarks, security rises with depth, and anomalies started turning up one day for no known reason) and from RuneScape-style principles: towns with residents, small enclosed interiors, filler that serves skills, examine text on everything, and quests that change the place.

## Decisions (the owner's)

- **Keep:** the engine and game systems. That covers the server, protocol, rules, combat, skills, containment, crafting, market, contracts, trams, the quest and dialogue engines, the voxel renderer, the player character rig and the editor.
- **Remove:** all content and the models that draw it. That covers districts, levels, layouts, regions, quests, questlines, NPCs, dialogue, items, gear, recipes, creatures, shops, contracts, world objects, assemblies, prefabs and the props catalogue, plus every object, creature, prop and set-piece model, and the tests that exercised that content.
- **How:** on the `world-rebuild` branch, in phases, with the game booting and `npm run typecheck` and `npm test` green at the end of each phase.

## The line between engine and content

Engine code stays even where it lives under `content/`: the integrity checks, `gameContent.ts` as the place content is assembled, `levelIndex.ts`, the furnishing engine (`districts/furnish.ts`, `populate.ts`, `setPiece.ts`, `prefabTurns.ts`, `seededRandom.ts`), `installations.ts` as a mechanism, and `prefabs/types.ts`. Checks that name old content are made general: a rule about "every tier" applies to the tiers the world uses, a rule about Induction applies to the opening the world has, and the market hub is a named constant the new world sets.

Models for players stay: the character rig, gear shapes, weapon poses, item icons by shape, markers. A single `placeholder` world-object model and creature model stand in for anything placed before its art exists.

Engine changes made during the surface slice stay: outdoor ground tiles, room edges (`barrier`, `fence`, `rock`, `trees`) and the sky ambience.

## Phases

1. **Strip.** Remove the content and content models. Leave a seed world: one outdoor district on one level, one storage locker and one shopkeeper so a region holds, the two currencies the engine names, and no quests. It boots, you can create a character and walk around, and the checks pass.
2. **Art direction and kit.** Settle the look of the city (palette, light, materials, silhouettes) and build a model kit of buildings, street props, interiors and signage to that look. Each model is plain and readable at a distance.
3. **The overworld plan.** Lay out the first region of the city as open ground with facilities, streets, interiors and skill-serving filler, then the levels beneath its facilities.
4. **People, quests and items.** Write the opening, the first storyline and the first tiers of items, creatures and recipes for that region, with balance tests rewritten for them.

Each phase after the first gets its own design pass with the owner before it is built.

## Phase 1 outcome

Done on `world-rebuild`. Every district, level, quest, NPC, dialogue, item, creature, recipe, shop, contract, world object, assembly, prefab and content model is gone, along with the tests that only checked them. What changed in the engine so it no longer names old content:

- The market hub is the home region's hub; the contract board's "fresh character" counts the questline holding the starting quest; the starting quest is optional.
- Tram integrity reads station definitions from the content's own network.
- Props, prefabs and room signatures are registered by content (`registerFurnishingKit`); each prop carries its own `furnishing` profile, and wall fixtures are props with `mount: 'wall'` or doors, not a list of model names.
- The editor and the client's guidance and level scene take the content they work on as a parameter, defaulting to the shipped content.
- The old-save migrations for containment seals are removed.

Engine tests run against a fixture world (`packages/shared/test/fixtures/world/`); the shipped seed is checked on its own. 593 tests pass.

Next is phase 2: the art direction and model kit, designed with the owner first.
