import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { assembleLevel, decalIndex, resolveLevel, type DistrictDefinition, type FloorDecal, type LevelDefinition, type ZoneAmbience } from '../src/index.ts';

const DIM: ZoneAmbience = { darkness: 0.5, tint: '#000000', fog: '#111111' };
const BRIGHT: ZoneAmbience = { darkness: 0.1, tint: '#ffffff', fog: '#eeeeee', fixtures: 'failing' };
const CORRIDOR: ZoneAmbience = { darkness: 0.3, tint: '#00ff00', fog: '#003300' };

const room = (id: string, ambience: ZoneAmbience, extras: Partial<DistrictDefinition> = {}): DistrictDefinition => ({
  id,
  name: id.toUpperCase(),
  subtitle: '',
  tier: 1,
  region: 'meridian-core',
  map: ['####', '#..#', '####'],
  ambience,
  areas: [],
  npcs: [],
  objects: [],
  lights: [],
  ...extras,
});

const districts = new Map<string, DistrictDefinition>([
  ['a', room('a', DIM)],
  [
    'b',
    room('b', BRIGHT, {
      areas: [{ id: 'hall', name: 'Hall', rect: { x: 1, y: 1, width: 2, height: 1 } }],
      npcs: [{ instanceId: 'b-guide', npcId: 'guide', position: { x: 1, y: 1 } }],
      lights: [{ position: { x: 2, y: 1 }, radius: 3, color: '#ffffff', intensity: 1 }],
    }),
  ],
]);

const level: LevelDefinition = {
  id: 'fixture',
  name: 'Fixture Level',
  kind: 'floor',
  depth: 0,
  districts: [
    { districtId: 'a', origin: { x: 0, y: 0 } },
    { districtId: 'b', origin: { x: 6, y: 0 } },
  ],
  connectors: [
    {
      id: 'link',
      name: 'Link',
      origin: { x: 4, y: 0 },
      map: ['##', '..', '##'],
      ambience: CORRIDOR,
      lights: [{ position: { x: 0, y: 1 }, radius: 2, color: '#00ff00', intensity: 0.5 }],
    },
  ],
  spawn: { districtId: 'a', position: { x: 1, y: 1 } },
};

describe('level assembly', () => {
  test('assembleLevel stamps districts and connectors at their origins', () => {
    const layout = assembleLevel(level, districts);
    assert.equal(layout.width, 10);
    assert.equal(layout.height, 3);
    assert.equal(layout.districtAt({ x: 7, y: 1 }), 'b');
    assert.equal(layout.connectorAt({ x: 4, y: 1 }), 'link');
    assert.equal(layout.tileAt({ x: 4, y: 1 }), 'plating');
    assert.equal(layout.tileAt({ x: 20, y: 1 }), 'void');
  });

  test('toLevelPoint and toLocalPoint round-trip', () => {
    const layout = assembleLevel(level, districts);
    assert.deepEqual(layout.toLevelPoint('b', { x: 1, y: 1 }), { x: 7, y: 1 });
    assert.deepEqual(layout.toLocalPoint({ x: 7, y: 1 }), { districtId: 'b', position: { x: 1, y: 1 } });
  });

  test('toLocalPoint is undefined on connectors and void', () => {
    const layout = assembleLevel(level, districts);
    assert.equal(layout.toLocalPoint({ x: 4, y: 1 }), undefined);
    assert.equal(layout.toLocalPoint({ x: 20, y: 1 }), undefined);
  });

  test('resolveLevel offsets placements, areas and lights per district', () => {
    const resolved = resolveLevel(level, districts);
    assert.deepEqual(resolved.npcs.find((npc) => npc.instanceId === 'b-guide')?.position, { x: 7, y: 1 });
    assert.deepEqual(resolved.areas, [{ id: 'hall', name: 'Hall', rect: { x: 7, y: 1, width: 2, height: 1 }, districtId: 'b' }]);
    assert.deepEqual(
      resolved.lights.map((light) => light.position),
      [
        { x: 8, y: 1 },
        { x: 4, y: 1 },
      ],
    );
    assert.deepEqual(resolved.spawn, { x: 1, y: 1 });
  });

  test('resolveLevel uses the spawn district for ambience and ambienceAt per tile', () => {
    const resolved = resolveLevel(level, districts);
    assert.equal(resolved.ambience, DIM);
    assert.equal(resolved.ambienceAt({ x: 7, y: 1 }), BRIGHT);
    assert.equal(resolved.ambienceAt({ x: 4, y: 1 }), CORRIDOR);
    assert.equal(resolved.ambienceAt({ x: 40, y: 1 }), DIM);
  });
});

describe('floor decals', () => {
  const rug: FloorDecal = { kind: 'rug', rect: { x: 2, y: 3, width: 4, height: 2 }, pattern: 'border', tint: '#aa3322' };
  const withDecals = new Map<string, DistrictDefinition>([
    ['a', room('a', DIM)],
    ['b', room('b', BRIGHT, { decals: [rug] })],
  ]);

  test('resolveLevel offsets district decals by the district origin', () => {
    const resolved = resolveLevel(level, withDecals);
    assert.deepEqual(resolved.decals, [{ ...rug, rect: { x: 8, y: 3, width: 4, height: 2 } }]);
  });

  test('resolveLevel exposes an empty decal list when no district has decals', () => {
    assert.deepEqual(resolveLevel(level, districts).decals, []);
  });

  test('decalIndex returns overlapping decals in list order with tile offsets', () => {
    const first: FloorDecal = { kind: 'rug', rect: { x: 0, y: 0, width: 3, height: 2 } };
    const second: FloorDecal = { kind: 'wear', rect: { x: 2, y: 1, width: 2, height: 2 } };
    const index = decalIndex([first, second]);
    assert.deepEqual(index.get('2,1'), [
      { decal: first, u: 2, v: 1 },
      { decal: second, u: 0, v: 0 },
    ]);
    assert.deepEqual(index.get('3,2'), [{ decal: second, u: 1, v: 1 }]);
    assert.equal(index.get('3,0'), undefined);
  });
});
