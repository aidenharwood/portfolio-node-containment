import type { GameContent } from '../../../src/content/gameContent.ts';
import { buildInstallations } from '../../../src/content/installations.ts';
import { buildLevelIndex, locate } from '../../../src/content/levelIndex.ts';
import { buildTramNetwork } from '../../../src/content/tramNetwork.ts';
import { joinDistricts, placeLandSquares } from '../../../src/world/levelPlan.ts';
import type { LevelContext, LevelDefinition, LevelRecipe, WorldLocation } from '../../../src/world/level.ts';
import type { DistrictDefinition } from '../../../src/world/district.ts';
import type { LandMap } from '../../../src/world/landPlan.ts';
import { FIXTURE_CREATURES } from './creatures.ts';
import { KIT_OBJECTS } from './furnishing.ts';
import { FIXTURE_LAYOUTS, FIXTURE_ARENA, FIXTURE_FIELD, FIXTURE_HUB, FIXTURE_HUB_ANCHORS, FIXTURE_ISLAND, FIXTURE_ISLAND_ANCHORS, FIXTURE_OUTPOST, FIXTURE_OUTPOST_ANCHORS } from './districts.ts';
import { FIXTURE_ITEMS } from './items.ts';
import { FIXTURE_ASSEMBLIES, FIXTURE_OBJECTS } from './objects.ts';
import { FIXTURE_CONTRACTS, FIXTURE_DIALOGUES, FIXTURE_NPCS, FIXTURE_QUESTLINES, FIXTURE_QUESTS, FIXTURE_REGIONS, FIXTURE_SHOPS } from './people.ts';
import { FIXTURE_RECIPES } from './recipes.ts';
import { FIXTURE_LAND, FIXTURE_WILD_EAST, FIXTURE_WILD_GATE_EAST, FIXTURE_WILD_GATE_WEST, FIXTURE_WILD_WEST, FIXTURE_WILD_WEST_ANCHORS, FIXTURE_WILDS_IDS } from './wilds.ts';

export { FIXTURE_LAND, FIXTURE_WILDS_IDS, FIXTURE_WILDS_LAYOUTS } from './wilds.ts';

const indexById = <T extends { readonly id: string }>(entries: readonly T[]): ReadonlyMap<string, T> => new Map(entries.map((entry) => [entry.id, entry]));

const FLOOR_DISTRICTS: readonly DistrictDefinition[] = [FIXTURE_HUB, FIXTURE_FIELD, FIXTURE_OUTPOST, FIXTURE_ISLAND];

const FLOOR_RECIPE: LevelRecipe = (context) => ({
  id: 'fx-floor',
  name: 'Test Floor',
  kind: 'floor',
  depth: 0,
  capacity: 50,
  spawn: { districtId: 'fx-hub', position: FIXTURE_HUB_ANCHORS.start },
  districts: joinDistricts(FLOOR_DISTRICTS.map((district) => context.districtOf(district.id)), 'fx-hub', [
    { districtId: 'fx-field', exit: 'west', to: 'fx-hub', toExit: 'east' },
    { districtId: 'fx-outpost', exit: 'west', to: 'fx-field', toExit: 'east' },
    { districtId: 'fx-island', from: 'fx-outpost', offset: { x: 30, y: 0 } },
  ]),
  connectors: [],
});

const DEPTHS_RECIPE: LevelRecipe = () => ({
  id: 'fx-depths',
  name: 'Test Depths',
  kind: 'floor',
  depth: -1,
  capacity: 50,
  spawn: { districtId: 'fx-arena', position: { x: 6, y: 6 } },
  districts: [{ districtId: 'fx-arena', origin: { x: 0, y: 0 } }],
  connectors: [],
});

export const wildsRecipe =
  (ids: readonly string[]): LevelRecipe =>
  (context) => ({
    id: 'fx-wilds',
    name: 'Test Wilds',
    kind: 'floor',
    depth: 0,
    capacity: 50,
    spawn: { districtId: 'fx-wild-west', position: FIXTURE_WILD_WEST_ANCHORS.start },
    land: context.landOf('fx-land'),
    districts: placeLandSquares(context.landOf('fx-land'), ids.map(context.districtOf)),
    connectors: [],
  });

const WILDS_RECIPE = wildsRecipe(FIXTURE_WILDS_IDS);

const LANDS: ReadonlyMap<string, LandMap> = new Map([[FIXTURE_LAND.plan.id, FIXTURE_LAND]]);

const DISTRICTS = indexById([...FLOOR_DISTRICTS, FIXTURE_ARENA, FIXTURE_WILD_WEST, FIXTURE_WILD_GATE_WEST, FIXTURE_WILD_GATE_EAST, FIXTURE_WILD_EAST]);

export const FIXTURE_CONTEXT: LevelContext = {
  districtOf: (id) => {
    const district = DISTRICTS.get(id);
    if (!district) throw new Error(`There is no fixture district "${id}".`);
    return district;
  },
  hollowOf: () => ({ x: 0, y: 0 }),
  landOf: (id) => {
    const land = LANDS.get(id);
    if (!land) throw new Error(`There is no land plan "${id}".`);
    return land;
  },
};

export const FIXTURE_FLOOR: LevelDefinition = FLOOR_RECIPE(FIXTURE_CONTEXT);
export const FIXTURE_DEPTHS: LevelDefinition = DEPTHS_RECIPE(FIXTURE_CONTEXT);
export const FIXTURE_WILDS: LevelDefinition = WILDS_RECIPE(FIXTURE_CONTEXT);
export const FIXTURE_LEVEL_RECIPES: ReadonlyMap<string, LevelRecipe> = new Map([['fx-floor', FLOOR_RECIPE], ['fx-depths', DEPTHS_RECIPE], ['fx-wilds', WILDS_RECIPE]]);
export const FIXTURE_LAYOUT_SOURCES: Readonly<Record<string, unknown>> = Object.fromEntries(FIXTURE_LAYOUTS);
const INSTALLED = buildInstallations([...FIXTURE_OBJECTS, ...KIT_OBJECTS]);
const ASSEMBLIES = indexById([...FIXTURE_ASSEMBLIES, ...INSTALLED.assemblies]);
const LEVELS = buildLevelIndex([FIXTURE_FLOOR, FIXTURE_DEPTHS, FIXTURE_WILDS], DISTRICTS, ASSEMBLIES);

const placed = (districtId: string, position: { readonly x: number; readonly y: number }): WorldLocation => {
  const location = locate(LEVELS, districtId, position);
  if (!location) throw new Error(`Fixture district "${districtId}" is not placed.`);
  return location;
};

const STATIONS = [
  { id: 'hub-station', name: 'Hub Station', districtId: 'fx-hub', areaId: 'tram-terminal', platform: FIXTURE_HUB_ANCHORS.tramPlatform },
  { id: 'outpost-station', name: 'Outpost Station', districtId: 'fx-outpost', areaId: 'tram-terminal', platform: FIXTURE_OUTPOST_ANCHORS.tramPlatform },
  { id: 'island-station', name: 'Island Station', districtId: 'fx-island', areaId: 'tram-terminal', platform: FIXTURE_ISLAND_ANCHORS.tramPlatform },
];

export const FIXTURE_CONTENT: GameContent = {
  items: indexById(FIXTURE_ITEMS),
  npcs: indexById(FIXTURE_NPCS),
  worldObjects: indexById(INSTALLED.objects),
  assemblies: ASSEMBLIES,
  dialogues: indexById(FIXTURE_DIALOGUES),
  quests: indexById(FIXTURE_QUESTS),
  questlines: indexById(FIXTURE_QUESTLINES),
  districts: DISTRICTS,
  levels: LEVELS.levels,
  levelOfDistrict: LEVELS.levelOfDistrict,
  lands: LANDS,
  regions: indexById(FIXTURE_REGIONS),
  tram: buildTramNetwork(STATIONS, [{ id: 'test-line', name: 'Test Line', color: '#ff4fa8', stations: ['hub-station', 'outpost-station', 'island-station'] }], DISTRICTS, LEVELS),
  creatures: indexById(FIXTURE_CREATURES),
  shops: indexById(FIXTURE_SHOPS),
  recipes: indexById(FIXTURE_RECIPES),
  contracts: indexById(FIXTURE_CONTRACTS),
  newCharacter: {
    startingLocation: placed('fx-hub', FIXTURE_HUB_ANCHORS.start),
    trainingLocation: placed('fx-hub', FIXTURE_HUB_ANCHORS.start),
    kit: { equipment: [], items: [] },
  },
};
