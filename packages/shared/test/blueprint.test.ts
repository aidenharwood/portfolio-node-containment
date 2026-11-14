import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { drawBlueprint, exit, joinDistricts, link, patch, pillars, room, track, trackBed, type DistrictDefinition } from '../src/index.ts';

const plan = drawBlueprint({ width: 24, height: 12 }, [
  room('hall', 1, 1, 10, 10, 'plating'),
  room('vault', 12, 3, 8, 6, 'carpet', 'octagon'),
  link('hall', 'vault', 2),
  exit('east', 'vault', 'east', 3),
  patch(3, 3, 2, 2, 'coolant'),
  pillars('hall', 4, 4, 1),
]);

const districtFrom = (id: string, blueprint: typeof plan): DistrictDefinition => ({
  id,
  name: id,
  subtitle: '',
  tier: 1,
  region: 'meridian-core',
  map: blueprint.map,
  rooms: blueprint.rooms,
  exits: blueprint.exits,
  ambience: { darkness: 0.5, tint: '#000000', fog: '#000000' },
  areas: [],
  npcs: [],
  objects: [],
  lights: [],
});

describe('drawBlueprint', () => {
  test('track lays a two-wide bed along a bent route and walls it through the rock', () => {
    const cut = drawBlueprint({ width: 10, height: 8 }, [track([0, 1], [5, 1], [5, 5])]);
    assert.deepEqual(cut.map, ['########  ', 'TTTTTTT#  ', 'TTTTTTT#  ', '#####TT#  ', '    #TT#  ', '    #TT#  ', '    #TT#  ', '    ####  ']);
    assert.deepEqual(trackBed([{ x: 2, y: 3 }, { x: 2, y: 0 }]), [{ x: 2, y: 0, width: 2, height: 5 }]);
    assert.throws(() => trackBed([{ x: 0, y: 0 }, { x: 3, y: 2 }]), /not straight/);
  });


  test('walls every floor tile in and leaves the rest void', () => {
    assert.equal(plan.map.length, 12);
    assert.equal(plan.map[0], `${'#'.repeat(12)}${' '.repeat(12)}`);
    assert.equal(plan.map[1]?.slice(0, 12), '#..........#');
  });

  test('links carve a doorway across the gap and remember its tiles', () => {
    assert.deepEqual(plan.links['hall>vault'], [
      { x: 11, y: 5 },
      { x: 11, y: 6 },
    ]);
    assert.equal(plan.map[5]?.[11], 'D');
    assert.deepEqual(plan.linkTile('hall', 'vault', 1), { x: 11, y: 6 });
  });

  test('exits run to the district edge', () => {
    assert.deepEqual(plan.exits.east, { side: 'east', gate: false, tiles: [4, 5, 6].map((y) => ({ x: 23, y })) });
    assert.equal(plan.map[5]?.slice(20), '____');
  });

  test('octagons cut their corners', () => {
    assert.equal(plan.map[3]?.[12], '#');
    assert.equal(plan.map[3]?.[13], '_');
  });

  test('at refuses a point that is not floor', () => {
    assert.deepEqual(plan.at('hall', 0, 0), { x: 1, y: 1 });
    assert.throws(() => plan.at('hall', 2, 2), /coolant/);
    assert.throws(() => plan.at('hall', 1, 1), /wall/);
    assert.throws(() => plan.at('hall', 10, 0), /outside/);
  });

  test('scatter is deterministic, on open floor and clear of what it must avoid', () => {
    const first = plan.scatter('hall', 4, 'litter', [{ x: 8, y: 8 }]);
    assert.deepEqual(first, plan.scatter('hall', 4, 'litter', [{ x: 8, y: 8 }]));
    assert.equal(new Set(first.map(({ x, y }) => `${x},${y}`)).size, 4);
    for (const point of first) assert.equal(plan.map[point.y]?.[point.x], '.');
    assert.throws(() => plan.scatter('hall', 500, 'too-many'));
  });

  test('scatterAlongWalls backs each spot onto a wall and faces it away', () => {
    const spots = plan.scatterAlongWalls('hall', 3, 'lockers');
    assert.deepEqual(spots, plan.scatterAlongWalls('hall', 3, 'lockers'));
    assert.ok(spots.length > 0);
    const behind = { south: [0, -1], north: [0, 1], east: [-1, 0], west: [1, 0] } as const;
    for (const { position, facing } of spots) {
      const [dx, dy] = behind[facing];
      assert.equal(plan.map[position.y]?.[position.x], '.');
      assert.equal(plan.map[position.y + dy]?.[position.x + dx], '#');
    }
  });
});

describe('joinDistricts', () => {
  const west = drawBlueprint({ width: 8, height: 9 }, [room('yard', 1, 1, 7, 7, 'concrete'), exit('east', 'yard', 'east', 3)]);
  const east = drawBlueprint({ width: 6, height: 5 }, [room('dock', 0, 1, 5, 3, 'grate'), exit('west', 'dock', 'west', 3)]);
  const districts = [districtFrom('west', west), districtFrom('east', east)];

  test('lines an exit up with the exit it attaches to', () => {
    assert.deepEqual(joinDistricts(districts, 'west', [{ districtId: 'east', exit: 'west', to: 'west', toExit: 'east' }]), [
      { districtId: 'west', origin: { x: 0, y: 0 } },
      { districtId: 'east', origin: { x: 8, y: 2 } },
    ]);
  });

  test('keeps origins non-negative when a district attaches on the far side', () => {
    assert.deepEqual(joinDistricts(districts, 'east', [{ districtId: 'west', exit: 'east', to: 'east', toExit: 'west' }]), [
      { districtId: 'east', origin: { x: 8, y: 2 } },
      { districtId: 'west', origin: { x: 0, y: 0 } },
    ]);
  });

  test('rejects exits that do not face each other', () => {
    assert.throws(() => joinDistricts(districts, 'west', [{ districtId: 'east', exit: 'west', to: 'west', toExit: 'missing' }]), /no exit/);
  });
});

describe('wall materials', () => {
  test('a building takes its own wall material and the street keeps its edge', () => {
    const plan = drawBlueprint({ width: 14, height: 12 }, [
      { ...room('shop', 2, 1, 6, 4, 'terrazzo'), wall: 'brick' },
      room('street', 1, 6, 12, 4, 'asphalt'),
      link('shop', 'street', 2),
    ]);
    assert.equal(plan.map[5]?.[2], 'K', 'the shopfront between shop and street is brick');
    assert.equal(plan.map[0]?.[3], 'K', 'the shop back wall is brick');
    assert.equal(plan.map[10]?.[5], 'B', 'the street edge stays a barrier');
  });

  test('a room without a material is walled with the Directorate panel', () => {
    const plan = drawBlueprint({ width: 8, height: 6 }, [room('office', 1, 1, 6, 4, 'plating')]);
    assert.equal(plan.map[0]?.[3], '#');
  });
});

describe('buildings on open ground', () => {
  const plan = drawBlueprint({ width: 16, height: 12 }, [
    room('ground', 0, 0, 16, 12, 'paving'),
    { kind: 'building', id: 'shop', rect: { x: 4, y: 3, width: 6, height: 4 }, floor: 'boards', wall: 'brick', doors: [{ side: 'south', width: 2, offset: 2 }] },
  ]);

  test('the ring around the interior becomes wall in the building material', () => {
    assert.equal(plan.map[2]?.[6], 'K', 'north wall');
    assert.equal(plan.map[5]?.[3], 'K', 'west wall');
    assert.equal(plan.map[7]?.[5], 'K', 'south wall beside the door');
  });

  test('the doors are cut through the ring and recorded as a link', () => {
    assert.deepEqual(plan.links['shop>outside'], [{ x: 6, y: 7 }, { x: 7, y: 7 }]);
    assert.equal(plan.rooms.shop?.width, 6);
  });

  test('the ground outside stays open and unwalled', () => {
    assert.equal(plan.map[0]?.[0], plan.map[11]?.[15]);
    assert.notEqual(plan.map[1]?.[1], 'K');
  });
});
