import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  BRIDGE,
  CATWALK,
  GAME_CONTENT,
  TRAM_CAR,
  assemblyFootprint,
  createObjectWalkabilityGrid,
  expandAssembly,
  findAssemblyDefinitionIssues,
  findContentIssues,
  parseTileLayout,
  resolveLevel,
  type DistrictDefinition,
  type LevelDefinition,
  type ObjectPlacement,
} from '../src/index.ts';

const at = (placements: readonly ObjectPlacement[], x: number, y: number) => placements.find((placement) => placement.position.x === x && placement.position.y === y);

describe('assemblies', () => {
  test('a south-facing tram car fills a 6 × 2 footprint with turned pieces on the far side', () => {
    const pieces = expandAssembly(TRAM_CAR, { instanceId: 'car', assemblyId: TRAM_CAR.id, position: { x: 10, y: 4 } });
    assert.equal(pieces.length, 12);
    assert.deepEqual(assemblyFootprint(TRAM_CAR), { width: 6, height: 2 });
    assert.equal(at(pieces, 10, 5)?.objectId, 'tram-car-nose-left');
    assert.equal(at(pieces, 10, 5)?.facing, 'south');
    assert.equal(at(pieces, 15, 5)?.objectId, 'tram-car-nose-right');
    assert.equal(at(pieces, 10, 4)?.objectId, 'tram-car-nose-right');
    assert.equal(at(pieces, 10, 4)?.facing, 'north');
    assert.equal(new Set(pieces.map((piece) => piece.instanceId)).size, 12);
  });

  test('turning an assembly rotates its footprint and every piece with it', () => {
    const pieces = expandAssembly(TRAM_CAR, { instanceId: 'car', assemblyId: TRAM_CAR.id, position: { x: 0, y: 0 }, facing: 'east' });
    assert.deepEqual(assemblyFootprint(TRAM_CAR, 'east'), { width: 2, height: 6 });
    assert.ok(pieces.every((piece) => piece.position.x >= 0 && piece.position.x < 2 && piece.position.y >= 0 && piece.position.y < 6));
    assert.equal(at(pieces, 1, 5)?.objectId, 'tram-car-nose-left');
    assert.equal(at(pieces, 1, 5)?.facing, 'east');
    assert.equal(at(pieces, 0, 5)?.facing, 'west');
  });

  test('a stretching assembly repeats its stretch row for the span', () => {
    const pieces = expandAssembly(BRIDGE, { instanceId: 'b', assemblyId: BRIDGE.id, position: { x: 3, y: 0 }, span: 4 });
    assert.deepEqual(assemblyFootprint(BRIDGE, 'south', 4), { width: 2, height: 6 });
    assert.equal(pieces.filter((piece) => piece.objectId === 'bridge-span').length, 8);
    assert.equal(at(pieces, 4, 5)?.objectId, 'bridge-end-left');
    assert.equal(at(pieces, 4, 5)?.facing, 'north');
  });

  test('definition checks catch ragged rows, unknown symbols and missing objects', () => {
    const issues = findAssemblyDefinitionIssues(
      { id: 'broken', name: 'Broken', pieces: { a: { objectId: 'nope' } }, layout: ['aa', 'a?'], stretchRow: 5 },
      () => false,
    );
    assert.equal(issues.length, 3);
    assert.deepEqual(findAssemblyDefinitionIssues(CATWALK, (objectId) => GAME_CONTENT.worldObjects.has(objectId)), []);
  });

  test('deck pieces make a gap walkable while blocking pieces stay solid', () => {
    const layout = parseTileLayout(['....', '    ', '    ', '....']);
    const placements = expandAssembly(CATWALK, { instanceId: 'c', assemblyId: CATWALK.id, position: { x: 1, y: 0 }, span: 2 });
    const grid = createObjectWalkabilityGrid(layout, placements, (objectId) => GAME_CONTENT.worldObjects.get(objectId));
    assert.ok(grid.isWalkable({ x: 1, y: 1 }));
    assert.ok(grid.isWalkable({ x: 1, y: 2 }));
    assert.ok(!grid.isWalkable({ x: 2, y: 1 }));
    const car = expandAssembly(TRAM_CAR, { instanceId: 'car', assemblyId: TRAM_CAR.id, position: { x: 0, y: 0 } });
    const blocked = createObjectWalkabilityGrid(parseTileLayout(['......', '......']), car, (objectId) => GAME_CONTENT.worldObjects.get(objectId));
    assert.ok(!blocked.isWalkable({ x: 3, y: 1 }));
  });

  test('floor litter can be walked over', () => {
    const grid = createObjectWalkabilityGrid(
      parseTileLayout(['..']),
      [{ instanceId: 'p', objectId: 'litter-papers', position: { x: 0, y: 0 } }],
      (objectId) => GAME_CONTENT.worldObjects.get(objectId),
    );
    assert.ok(grid.isWalkable({ x: 0, y: 0 }));
  });

  test('resolveLevel expands district assemblies into level objects', () => {
    const district: DistrictDefinition = {
      id: 'yard',
      name: 'Yard',
      subtitle: '',
      tier: 1,
      map: ['........', '........'],
      ambience: { darkness: 0.5, tint: '#000000', fog: '#000000' },
      areas: [],
      npcs: [],
      objects: [],
      assemblies: [{ instanceId: 'car', assemblyId: TRAM_CAR.id, position: { x: 1, y: 0 } }],
      lights: [],
    };
    const level: LevelDefinition = {
      id: 'yard-level',
      name: 'Yard',
      site: 'meridian',
      kind: 'floor',
      depth: 0,
      districts: [{ districtId: 'yard', origin: { x: 5, y: 5 } }],
      connectors: [],
      spawn: { districtId: 'yard', position: { x: 0, y: 0 } },
    };
    const resolved = resolveLevel(level, new Map([['yard', district]]), GAME_CONTENT.assemblies);
    assert.equal(resolved.objects.length, 12);
    assert.equal(at(resolved.objects, 6, 6)?.objectId, 'tram-car-nose-left');
  });

  test('shipped content has no assembly issues', () => {
    assert.deepEqual(findContentIssues(GAME_CONTENT).filter((issue) => issue.includes('assembly')), []);
  });
});
