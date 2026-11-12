import { createObjectWalkabilityGrid, resolveLevel, type DistrictId, type GameContent, type LevelDefinition, type ResolvedLevel, type TilePoint } from '@containment/shared';
import type { ActiveZone } from '../state/worldState.ts';

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
  return { definition, layout: definition.layout, grid: createObjectWalkabilityGrid(definition.layout, definition.objects, (objectId) => content.worldObjects.get(objectId)) };
}
