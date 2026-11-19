import { createObjectWalkabilityGrid, resolveLevel, sceneOf, type DistrictId, type GameContent, type LandMap, type LevelDefinition, type LevelLayout, type ResolvedLevel, type TilePoint, type ZoneAmbience } from '@containment/shared';
import type { ActiveZone } from '../state/worldState.ts';

const LAND_AMBIENCE: ZoneAmbience = { darkness: 0.2, tint: '#2a3038', fog: '#4a5866', sky: '#7b8fa3' };

const spawnOf = (content: GameContent, districtId: DistrictId): TilePoint => {
  const district = content.districts.get(districtId);
  if (!district) throw new Error(`There is no district "${districtId}".`);
  const anchor = Object.values(district.anchors ?? {})[0];
  if (anchor) return anchor;
  const room = Object.values(district.rooms ?? {})[0];
  if (room) return { x: room.x + Math.floor(room.width / 2), y: room.y + Math.floor(room.height / 2) };
  return { x: Math.floor((district.map[0]?.length ?? 1) / 2), y: Math.floor(district.map.length / 2) };
};

export function previewLevel(content: GameContent, districtId: DistrictId): ResolvedLevel {
  const definition: LevelDefinition = {
    id: `preview-${districtId}`,
    name: content.districts.get(districtId)?.name ?? districtId,
    kind: 'pocket',
    depth: 0,
    districts: [{ districtId, origin: { x: 0, y: 0 } }],
    connectors: [],
    spawn: { districtId, position: spawnOf(content, districtId) },
  };
  return resolveLevel(definition, content.districts, content.assemblies);
}

export function previewZone(content: GameContent, districtId: DistrictId): ActiveZone {
  const definition = previewLevel(content, districtId);
  return { definition, layout: definition.scene, grid: createObjectWalkabilityGrid(definition.layout, definition.objects, (objectId) => content.worldObjects.get(objectId)) };
}

export function zoneOfLevel(content: GameContent, definition: ResolvedLevel): ActiveZone {
  return { definition, layout: definition.scene, grid: createObjectWalkabilityGrid(definition.layout, definition.objects, (objectId) => content.worldObjects.get(objectId)) };
}

export function landLevel(land: LandMap, id: string): ResolvedLevel {
  const { width, height } = land;
  const layout: LevelLayout = {
    width,
    height,
    tileAt: () => 'void',
    heightAt: () => 0,
    districtAt: () => undefined,
    connectorAt: () => undefined,
    toLevelPoint: (_districtId, local) => local,
    toLocalPoint: () => undefined,
  };
  const spawn = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  const definition: LevelDefinition = { id: 'land-' + id, name: id, kind: 'pocket', depth: 0, districts: [], connectors: [], spawn: { districtId: '', position: spawn }, land };
  return {
    definition,
    id: definition.id,
    name: id,
    layout,
    scene: sceneOf(layout, land),
    spawn,
    ambience: LAND_AMBIENCE,
    areas: [],
    districts: [],
    npcs: [],
    objects: [],
    creatures: [],
    lights: [],
    decals: [],
    ambienceAt: () => LAND_AMBIENCE,
  };
}
