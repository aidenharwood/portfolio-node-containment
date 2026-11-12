import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { drawBlueprint, type BlueprintStep } from '../src/world/blueprint.ts';
import { anchorsOf, buildDistrict, firstHollowOf } from '../src/world/layout.ts';
import { printLayout } from '../src/world/printLayout.ts';
import { DISTRICT_LAYOUT_SCHEMA } from '../src/world/layoutSchema.ts';

const FIXTURE = new URL('./fixtures/sample-layout.json', import.meta.url);
const text = readFileSync(FIXTURE, 'utf8').replace(/\r\n/g, '\n');
const source = (): Record<string, unknown> => JSON.parse(text) as Record<string, unknown>;

describe('buildDistrict', () => {
  const district = buildDistrict(source());

  test('draws the map from the steps', () => {
    const raw = source();
    assert.deepEqual(district.map, drawBlueprint(raw.size as { width: number; height: number }, raw.steps as BlueprintStep[]).map);
    assert.deepEqual(Object.keys(district.rooms ?? {}), ['hall', 'side']);
  });

  test('places fixtures first, with their ids, positions and facings', () => {
    assert.deepEqual(district.objects.slice(0, 2), [
      { instanceId: 'hall-planter', objectId: 'planter', position: { x: 2, y: 2 } },
      { instanceId: 'hall-bench', objectId: 'briefing-bench', position: { x: 12, y: 10 }, facing: 'north' },
    ]);
  });

  test('places the set-piece under its fixed id and dresses the side room', () => {
    assert.ok(district.objects.some((object) => object.instanceId === 'sample-ring/1'));
    assert.ok(district.dressingLog?.some((room) => room.room === 'side'));
  });

  test('resolves areas, anchors, npcs, assemblies, lights and decals', () => {
    assert.deepEqual(district.areas[0], { id: 'hall', name: 'Hall', rect: { x: 1, y: 1, width: 14, height: 12 }, safe: true });
    assert.deepEqual(district.anchors?.desk, { x: 19, y: 3 });
    assert.deepEqual(district.anchors?.door, district.exits?.west?.tiles[0]);
    assert.deepEqual(district.npcs, [{ instanceId: 'hall-ames', npcId: 'staffer-ames', position: { x: 2, y: 8 } }]);
    assert.deepEqual(district.assemblies, [{ instanceId: 'hall-cables', assemblyId: 'cable-run', position: { x: 2, y: 11 }, facing: 'east', span: 3 }]);
    assert.deepEqual(district.lights, [{ position: { x: 7, y: 6 }, radius: 8, color: '#9fd8ff', intensity: 0.5 }]);
    assert.ok(district.decals?.some((decal) => decal.kind === 'mosaic' && decal.pattern === 'compass' && decal.rect.x === 9 && decal.rect.y === 9 && decal.rect.width === 3));
  });

  test('building twice gives the same district', () => {
    assert.deepEqual(buildDistrict(source()), district);
  });

  test('leaves out creatures when there are none', () => {
    assert.equal(district.creatures, undefined);
  });
});

describe('layout errors', () => {
  test('an unknown key names the district and the path', () => {
    assert.throws(() => buildDistrict({ ...source(), colour: 'red' }), (error: Error) => error.message.startsWith('sample-district: ') && error.message.includes('colour'));
  });

  test('an unknown room in an npc names the district and the path', () => {
    const raw = source();
    raw.npcs = [{ id: 'lost', npc: 'staffer-ames', at: { room: 'plazza', dx: 0, dy: 0 } }];
    assert.throws(() => buildDistrict(raw), (error: Error) => error.message.startsWith('sample-district: npcs[0].at') && error.message.includes('"plazza"'));
  });

  test('a bad value names the path inside the file', () => {
    const raw = source();
    raw.lights = [{ at: { room: 'hall', dx: 1, dy: 1 }, radius: 'wide', color: '#fff', intensity: 1 }];
    assert.throws(() => buildDistrict(raw), (error: Error) => error.message.startsWith('sample-district: lights[0].radius'));
  });
});

describe('layout geometry errors', () => {
  const withSteps = (extra: unknown[]) => {
    const raw = source();
    raw.steps = [...(raw.steps as unknown[]), ...extra];
    return raw;
  };

  test('a step naming an unknown room names the step', () => {
    assert.throws(() => buildDistrict(withSteps([{ kind: 'pillars', room: 'halle', everyX: 4, everyY: 4, inset: 2 }])), (error: Error) => error.message.startsWith('sample-district: steps[4].room') && error.message.includes('"halle"'));
  });

  test('a room outside the district size names the step', () => {
    assert.throws(() => buildDistrict(withSteps([{ kind: 'room', id: 'far', rect: { x: 20, y: 1, width: 8, height: 4 }, floor: 'plating', shape: 'rect' }])), (error: Error) => error.message.startsWith('sample-district: steps[4].rect') && error.message.includes('24x16'));
  });

  test('a painted tile outside the district names the tile', () => {
    const raw = source();
    raw.tiles = [{ x: 99, y: 0, tile: 'hazard' }];
    assert.throws(() => buildDistrict(raw), (error: Error) => error.message.startsWith('sample-district: tiles[0]') && error.message.includes('24x16'));
  });

  test('painting over an exit or link tile is refused', () => {
    const district = buildDistrict(source());
    const exitTile = district.exits?.west?.tiles[0];
    assert.ok(exitTile);
    const raw = source();
    raw.tiles = [{ ...exitTile, tile: 'wall' }];
    assert.throws(() => buildDistrict(raw), (error: Error) => error.message.startsWith('sample-district: tiles[0]') && error.message.includes('exit'));
  });

  test('any other drawing failure still names the district', () => {
    assert.throws(() => buildDistrict(withSteps([{ kind: 'link', from: 'hall', to: 'side', width: 40, floor: 'door' }])), (error: Error) => error.message.startsWith('sample-district: steps'));
  });
});

describe('anchorsOf', () => {
  const district = buildDistrict(source());

  test('returns the named anchors', () => {
    const anchors = anchorsOf(district, ['door', 'desk']);
    assert.deepEqual(anchors.desk, { x: 19, y: 3 });
  });

  test('throws for a missing anchor', () => {
    assert.throws(() => anchorsOf(district, ['door', 'vault']), /vault/);
  });
});

describe('firstHollowOf', () => {
  test('returns the corner of the first hollow step', () => {
    const raw = source();
    raw.steps = [...(raw.steps as unknown[]), { kind: 'hollow', rect: { x: 3, y: 4, width: 2, height: 2 } }];
    assert.deepEqual(firstHollowOf(raw), { x: 3, y: 4 });
  });

  test('throws when the layout has no hollow', () => {
    assert.throws(() => firstHollowOf(source()), /sample-district: .*hollow/);
  });
});

describe('printLayout', () => {
  test('prints a canonical file back byte for byte', () => {
    assert.equal(printLayout(DISTRICT_LAYOUT_SCHEMA.parse(source())), text);
  });

  test('normalises key order and spacing', () => {
    const raw = source();
    const shuffled = Object.fromEntries(Object.entries(raw).reverse().map(([key, value]) => [key, Array.isArray(value) ? value.map((item) => (item && typeof item === 'object' ? Object.fromEntries(Object.entries(item).reverse()) : item)) : value]));
    const messy = JSON.stringify(shuffled, null, 7);
    assert.equal(printLayout(JSON.parse(messy)), text);
  });
});
