import { CARDINAL_OFFSETS, rectContains, type TilePoint, type TileRect } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import { TILE_KINDS } from '../world/tiles.ts';
import type { TramStation } from '../world/tram.ts';
import type { GameContent } from './gameContent.ts';

export const TERMINAL_AREA_ID = 'tram-terminal';
export const MAX_TERMINAL_DOOR_WIDTH = 3;

const SERVICE_EFFECTS: ReadonlySet<string> = new Set(['openStorage', 'openShop', 'openMarket', 'openContracts', 'openCrafting', 'teleport']);

const besideRect = (rect: TileRect, point: TilePoint): boolean =>
  rectContains(rect, point) || CARDINAL_OFFSETS.some((offset) => rectContains(rect, { x: point.x + offset.x, y: point.y + offset.y }));

function servicesOf(content: GameContent, objectId: string): string[] {
  const effects = (content.worldObjects.get(objectId)?.interactions ?? []).flatMap((interaction) => interaction.effects.map((effect) => effect.type));
  return [...new Set(effects.filter((type) => SERVICE_EFFECTS.has(type)))];
}

function sideRuns(rect: TileRect, level: ResolvedLevel): { readonly nonDoors: number; readonly longest: number; readonly runs: number } {
  const sides: TilePoint[][] = [[], [], [], []];
  for (let x = rect.x; x < rect.x + rect.width; x++) {
    sides[0]?.push({ x, y: rect.y - 1 });
    sides[1]?.push({ x, y: rect.y + rect.height });
  }
  for (let y = rect.y; y < rect.y + rect.height; y++) {
    sides[2]?.push({ x: rect.x - 1, y });
    sides[3]?.push({ x: rect.x + rect.width, y });
  }
  let nonDoors = 0;
  let longest = 0;
  let runs = 0;
  for (const side of sides) {
    let run = 0;
    for (const point of side) {
      const kind = level.layout.tileAt(point);
      if (TILE_KINDS[kind].walkable) {
        if (kind !== 'door') nonDoors++;
        if (run === 0) runs++;
        run++;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }
  }
  return { nonDoors, longest, runs };
}

function terminalIssues(content: GameContent, station: TramStation, level: ResolvedLevel): string[] {
  const issues: string[] = [];
  const name = `Tram station "${station.id}"`;
  const district = content.districts.get(station.districtId);
  if (station.areaId !== TERMINAL_AREA_ID) issues.push(`${name} stands in "${station.areaId}"; a terminal is a room of its own called "${TERMINAL_AREA_ID}".`);
  if (district?.areas.find((area) => area.id === station.areaId)?.safe !== true) issues.push(`${name} stands in an area that is not safe; a terminal must be a safe area.`);

  for (const npc of level.npcs) {
    if (rectContains(station.area, npc.position)) issues.push(`${name} has NPC "${npc.instanceId}" standing in its terminal; a terminal holds no one but travellers.`);
  }
  for (const object of level.objects) {
    if (!rectContains(station.area, object.position)) continue;
    const services = servicesOf(content, object.objectId);
    if (services.length > 0) issues.push(`${name} has "${object.instanceId}" in its terminal offering ${services.join(', ')}; a terminal offers the tram and nothing else.`);
  }

  for (const [exitId, exit] of Object.entries(district?.exits ?? {})) {
    if (exit.tiles.some((tile) => besideRect(station.area, level.layout.toLevelPoint(station.districtId, tile)))) {
      issues.push(`${name} has the district exit "${exitId}" against its terminal; a terminal is entered only through its own doors.`);
    }
  }

  const { nonDoors, longest, runs } = sideRuns(station.area, level);
  if (nonDoors > 0) issues.push(`${name} has ${nonDoors} walkable tile(s) beside its terminal that are not doors; the terminal must be walled apart from its doors.`);
  if (longest > MAX_TERMINAL_DOOR_WIDTH) issues.push(`${name} has a door opening ${longest} wide; terminal doors are at most ${MAX_TERMINAL_DOOR_WIDTH} wide.`);
  if (runs === 0) issues.push(`${name} has no door into its terminal; travellers must be able to walk in.`);
  return issues;
}

export function findTerminalIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const station of content.tram.stations.values()) {
    const level = content.levels.get(station.levelId);
    if (level) issues.push(...terminalIssues(content, station, level));
  }
  return issues;
}
