import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, resolveLevel, type DistrictDefinition, type GameContent, type LevelDefinition } from '../src/index.ts';
import { furnish } from '../src/content/districts/furnish.ts';
import { findPlacementIssues } from '../src/content/placementIntegrity.ts';
import { drawBlueprint, room } from '../src/world/blueprint.ts';

const TRAM_CAR_PIECES = ['tram-car-nose-left', 'tram-car-nose-right', 'tram-car-door', 'tram-car-window'];

const piecesOf = (assemblyId: string): string[] => [...new Set(Object.values(GAME_CONTENT.assemblies.get(assemblyId)?.pieces ?? {}).map((piece) => piece.objectId))].sort();

describe('transit catalog', () => {
  test('the shipped assemblies include the tram car built from its four car pieces, each boarding the tram', () => {
    assert.deepEqual(piecesOf('tram-car'), [...TRAM_CAR_PIECES].sort());
    for (const objectId of TRAM_CAR_PIECES) {
      const definition = GAME_CONTENT.worldObjects.get(objectId);
      assert.ok(definition?.blocksMovement, objectId);
      assert.ok(definition?.interactions.some((interaction) => interaction.verb === 'Board' && interaction.effects.some((effect) => effect.type === 'openTramMap')), objectId);
      if (objectId !== 'tram-car-door') assert.equal(definition?.countsAs, 'tram-car-door');
    }
  });

  test('every bridge and catwalk piece is a walkable deck', () => {
    assert.deepEqual(piecesOf('bridge'), ['bridge-end-left', 'bridge-end-right', 'bridge-span']);
    assert.deepEqual(piecesOf('catwalk'), ['catwalk-end', 'catwalk-span']);
    for (const objectId of [...piecesOf('bridge'), ...piecesOf('catwalk')]) {
      const definition = GAME_CONTENT.worldObjects.get(objectId);
      assert.equal(definition?.deck, true, objectId);
      assert.equal(definition?.blocksMovement, false, objectId);
    }
  });

  test('the departure board is an examine-only wall fitting at home in a transit room', () => {
    const board = GAME_CONTENT.worldObjects.get('departure-board');
    assert.deepEqual(board?.interactions, []);
    assert.equal(board?.furnishing?.mount, 'wall');
    assert.ok(board?.furnishing?.homes.includes('transit'));
  });

  test('a transit terminal can hold the tram car, a departure board and benches without placement issues', () => {
    const plan = drawBlueprint({ width: 30, height: 22 }, [room('terminal', 1, 1, 24, 18, 'plating')]);
    const raw: DistrictDefinition = {
      id: 'test-terminal',
      name: 'Test Terminal',
      subtitle: '',
      tier: 1,
      region: [...GAME_CONTENT.regions.keys()][0] as string,
      map: plan.map,
      rooms: plan.rooms,
      exits: plan.exits,
      ambience: { darkness: 0.5, tint: '#000000', fog: '#000000' },
      areas: [],
      npcs: [],
      objects: [
        { instanceId: 'board', objectId: 'departure-board', position: plan.at('terminal', 4, 0), facing: 'south' },
        { instanceId: 'bench-a', objectId: 'street-bench', position: plan.at('terminal', 4, 6), facing: 'south' },
        { instanceId: 'bench-b', objectId: 'street-bench', position: plan.at('terminal', 14, 6), facing: 'south' },
      ],
      assemblies: [{ instanceId: 'car', assemblyId: 'tram-car', position: plan.at('terminal', 8, 14), facing: 'north' }],
      lights: [],
    };
    const district = furnish(plan, raw, { terminal: 'transit' });
    const level: LevelDefinition = {
      id: 'test-terminal-level',
      name: 'Test',
      kind: 'floor',
      depth: 0,
      districts: [{ districtId: district.id, origin: { x: 0, y: 0 } }],
      connectors: [],
      spawn: { districtId: district.id, position: plan.at('terminal', 10, 10) },
    };
    const districts = new Map([[district.id, district]]);
    const resolved = resolveLevel(level, districts, GAME_CONTENT.assemblies);
    assert.equal(resolved.objects.filter((object) => object.instanceId.startsWith('car/')).length, 12);
    const content = { ...GAME_CONTENT, districts, levels: new Map([[level.id, resolved]]), levelOfDistrict: new Map([[district.id, level.id]]) } as GameContent;
    assert.deepEqual(findPlacementIssues(content), []);
  });
});
