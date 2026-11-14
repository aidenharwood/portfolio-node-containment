import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  drawBlueprint,
  exit,
  findTerminalIssues,
  link,
  MAX_TERMINAL_DOOR_WIDTH,
  resolveLevel,
  room,
  TERMINAL_AREA_ID,
  track,
  type DistrictDefinition,
  type DistrictExit,
  type GameContent,
  type GameEffect,
  type LevelDefinition,
  type NpcPlacement,
  type ObjectPlacement,
  type PaintedTile,
  type TramStation,
  type WorldObjectDefinition,
} from '../src/index.ts';
import { findContentIssues } from '../src/content/contentIntegrity.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const DISTRICT_ID = 'terminal-test';
const LEVEL_ID = 'terminal-floor';
const ORIGIN = { x: 5, y: 3 };
const TRAM_CAR_ID = [...FIXTURE_CONTENT.worldObjects.keys()].find((id) => id.startsWith('tram-car-')) as string;

interface Fixture {
  readonly doorWidth?: number;
  readonly joined?: boolean;
  readonly areaId?: string;
  readonly safe?: boolean;
  readonly npcs?: readonly NpcPlacement[];
  readonly objects?: readonly ObjectPlacement[];
  readonly extraExits?: Readonly<Record<string, DistrictExit>>;
  readonly painted?: readonly PaintedTile[];
}

const serviceObject = (id: string, effect: GameEffect): WorldObjectDefinition => ({
  id,
  name: id,
  examine: id,
  model: 'placeholder',
  blocksMovement: true,
  interactions: [{ verb: 'Use', effects: [effect] }],
});

const SERVICE_OBJECTS: readonly WorldObjectDefinition[] = [
  serviceObject('test-storage', { type: 'openStorage' }),
  serviceObject('test-shop', { type: 'openShop', shopId: 'any' }),
  serviceObject('test-market', { type: 'openMarket' }),
  serviceObject('test-contracts', { type: 'openContracts' }),
  serviceObject('test-crafting', { type: 'openCrafting', station: 'refinery' }),
  serviceObject('test-teleport', { type: 'teleport', districtId: 'elsewhere', position: { x: 1, y: 1 } }),
];

function terminalWorld(fixture: Fixture = {}): GameContent {
  const blueprint = drawBlueprint(
    { width: 40, height: 30 },
    [
      room('hall', 2, 2, 30, 10, 'concrete'),
      room(TERMINAL_AREA_ID, 10, 14, 12, 8, 'terrazzo'),
      ...(fixture.joined === false ? [] : [link('hall', TERMINAL_AREA_ID, fixture.doorWidth ?? 3, 'door')]),
      exit('east', 'hall', 'east', 9),
      track([11, 17], [19, 17]),
    ],
    [{ x: 9, y: 17, tile: 'track' }, ...(fixture.painted ?? [])],
  );
  const area = { ...blueprint.area(TERMINAL_AREA_ID, 'Terminal', { safe: fixture.safe ?? true }), id: fixture.areaId ?? TERMINAL_AREA_ID };
  const district: DistrictDefinition = {
    id: DISTRICT_ID,
    name: 'Terminal Test',
    subtitle: '',
    tier: 1,
    region: 'test',
    rooms: blueprint.rooms,
    exits: { ...blueprint.exits, ...fixture.extraExits },
    anchors: {},
    map: blueprint.map,
    ambience: { darkness: 0, tint: '#ffffff', fog: '#000000' },
    areas: [area],
    npcs: fixture.npcs ?? [],
    objects: fixture.objects ?? [],
    lights: [],
  };
  const definition: LevelDefinition = {
    id: LEVEL_ID,
    name: 'Terminal Floor',
    kind: 'floor',
    depth: 0,
    districts: [{ districtId: DISTRICT_ID, origin: ORIGIN }],
    connectors: [],
    spawn: { districtId: DISTRICT_ID, position: { x: 3, y: 3 } },
  };
  const districts = new Map([[DISTRICT_ID, district]]);
  const level = resolveLevel(definition, districts);
  const rect = blueprint.rooms[TERMINAL_AREA_ID] as DistrictDefinition['areas'][number]['rect'];
  const station: TramStation = {
    id: 'test-terminal',
    name: 'Test Terminal',
    districtId: DISTRICT_ID,
    areaId: area.id,
    platform: { x: 12, y: 16 },
    levelId: LEVEL_ID,
    platformPoint: { x: 12 + ORIGIN.x, y: 16 + ORIGIN.y },
    area: { ...rect, x: rect.x + ORIGIN.x, y: rect.y + ORIGIN.y },
    lineIds: [],
  };
  return {
    ...FIXTURE_CONTENT,
    districts,
    levels: new Map([[LEVEL_ID, level]]),
    worldObjects: new Map([...FIXTURE_CONTENT.worldObjects, ...SERVICE_OBJECTS.map((object) => [object.id, object] as const)]),
    tram: { definitions: [station], stations: new Map([[station.id, station]]), lines: new Map() },
  };
}

const insideTerminal = { x: 13, y: 19 };
const place = (instanceId: string, objectId: string): ObjectPlacement => ({ instanceId, objectId, position: insideTerminal });

test('a terminal that follows every rule reports nothing', () => {
  const objects = [place('car', TRAM_CAR_ID), { ...place('directory', 'intake-kiosk'), position: { x: 15, y: 19 } }, { ...place('bench', 'briefing-bench'), position: { x: 17, y: 19 } }];
  assert.deepEqual(findTerminalIssues(terminalWorld({ objects })), []);
});

test('a station outside a room called tram-terminal is reported', () => {
  const issues = findTerminalIssues(terminalWorld({ areaId: 'lift-bay' }));
  assert.ok(issues.includes('Tram station "test-terminal" stands in "lift-bay"; a terminal is a room of its own called "tram-terminal".'));
});

test('a terminal that is not a safe area is reported', () => {
  assert.deepEqual(findTerminalIssues(terminalWorld({ safe: false })).filter((issue) => issue.includes('not safe')).length, 1);
  assert.equal(findTerminalIssues(terminalWorld({ safe: false })).length, 1);
});

test('an NPC standing in the terminal is reported', () => {
  const issues = findTerminalIssues(terminalWorld({ npcs: [{ instanceId: 'loiterer', npcId: 'clerk', position: insideTerminal }] }));
  assert.equal(issues.length, 1);
  assert.ok(issues[0]?.includes('NPC "loiterer" standing in its terminal'));
});

test('an NPC outside the terminal is not reported', () => {
  assert.deepEqual(findTerminalIssues(terminalWorld({ npcs: [{ instanceId: 'bystander', npcId: 'clerk', position: { x: 4, y: 4 } }] })), []);
});

for (const object of SERVICE_OBJECTS) {
  const effect = (object.interactions[0]?.effects[0] as GameEffect).type;
  test(`an object offering ${effect} in the terminal is reported`, () => {
    const issues = findTerminalIssues(terminalWorld({ objects: [place('service', object.id)] }));
    assert.equal(issues.length, 1);
    assert.ok(issues[0]?.includes(`"service" in its terminal offering ${effect}`));
  });
}

test('a service object beside the terminal rather than in it is not reported', () => {
  const outside: ObjectPlacement = { instanceId: 'service', objectId: 'test-storage', position: { x: 4, y: 4 } };
  assert.deepEqual(findTerminalIssues(terminalWorld({ objects: [outside] })), []);
});

test('a district exit inside or beside the terminal is reported', () => {
  const inside: DistrictExit = { side: 'south', tiles: [{ x: 12, y: 15 }], gate: false };
  const beside: DistrictExit = { side: 'west', tiles: [{ x: 9, y: 17 }], gate: false };
  const far: DistrictExit = { side: 'west', tiles: [{ x: 8, y: 17 }], gate: false };
  for (const exits of [{ inside } as Record<string, DistrictExit>, { beside } as Record<string, DistrictExit>]) {
    const issues = findTerminalIssues(terminalWorld({ extraExits: exits }));
    assert.equal(issues.length, 1);
    assert.ok(issues[0]?.includes(`district exit "${Object.keys(exits)[0]}" against its terminal`));
  }
  assert.deepEqual(findTerminalIssues(terminalWorld({ extraExits: { far } })), []);
});

test('a walkable tile beside the terminal that is not a door is reported', () => {
  const issues = findTerminalIssues(terminalWorld({ painted: [{ x: 9, y: 19, tile: 'concrete' }] }));
  assert.equal(issues.length, 1);
  assert.ok(issues[0]?.includes('1 walkable tile(s) beside its terminal that are not doors'));
});

test('track beside the terminal is ignored', () => {
  assert.deepEqual(findTerminalIssues(terminalWorld({ painted: [{ x: 9, y: 19, tile: 'track' }] })), []);
});

test('a door opening wider than the limit is reported', () => {
  assert.deepEqual(findTerminalIssues(terminalWorld({ doorWidth: MAX_TERMINAL_DOOR_WIDTH })), []);
  const issues = findTerminalIssues(terminalWorld({ doorWidth: MAX_TERMINAL_DOOR_WIDTH + 1 }));
  assert.equal(issues.length, 1);
  assert.ok(issues[0]?.includes('a door opening 4 wide; terminal doors are at most 3 wide'));
});

test('a terminal with no door is reported', () => {
  const issues = findTerminalIssues(terminalWorld({ joined: false }));
  assert.equal(issues.length, 1);
  assert.ok(issues[0]?.includes('has no door into its terminal'));
});

test('two doors on one side count as separate openings', () => {
  const issues = findTerminalIssues(terminalWorld({ painted: [{ x: 10, y: 13, tile: 'door' }, { x: 11, y: 13, tile: 'door' }, { x: 12, y: 13, tile: 'door' }] }));
  assert.deepEqual(issues, []);
});

test('the Verdance terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"verdance-platform"')), []);
});

test('the Atrium terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"atrium-transit"')), []);
});

test('the Service Yards terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"yards-depot"')), []);
});

test('the Calder Gatehouse terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"calder-platform"')), []);
});

test("the Vesper Porter's Lodge terminal follows every rule", () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"vesper-platform"')), []);
});

test('the Intake Transit Bay terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"intake-transit"')), []);
});

test('the Deepwatch terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"deepwatch-platform"')), []);
});

test('the Cryovault terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"cryovault-dock"')), []);
});

test('the Signal Array terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"array-lobby"')), []);
});

test('the Drowned Archive terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"archive-stair"')), []);
});

test('the Furnace terminal follows every rule', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT).filter((issue) => issue.includes('"furnace-lock"')), []);
});

test('the shipped world has no terminal issues', () => {
  assert.deepEqual(findTerminalIssues(FIXTURE_CONTENT), []);
});

test('the content check reports a station that leaves its terminal', () => {
  const stations = new Map([...FIXTURE_CONTENT.tram.stations].map(([id, station]) => [id, id === 'outpost-station' ? { ...station, areaId: 'post' } : station]));
  const content: GameContent = { ...FIXTURE_CONTENT, tram: { ...FIXTURE_CONTENT.tram, stations } };
  assert.ok(findContentIssues(content).some((issue) => issue.startsWith('Tram station "outpost-station" stands in "post"')));
});
