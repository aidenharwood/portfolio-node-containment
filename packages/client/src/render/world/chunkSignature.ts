import { chunkKeyOf, tileKey, type ChunkCoord, type ObjectPlacement } from '@containment/shared';
import type { ActiveZone } from '../../state/worldState.ts';
import { chunkRegion } from './chunkView.ts';
import { decalsForLevel } from './floorDecals.ts';
import type { WallLighting } from './wallLights.ts';

const TILE_MARGIN = 2;

export interface ChunkSignature {
  readonly tiles: string;
  readonly objects: ReadonlyMap<string, { readonly placement: ObjectPlacement; readonly index: number }>;
  readonly settle: string;
}

export const EMPTY_SIGNATURE: ChunkSignature = { tiles: '', objects: new Map(), settle: '' };

export function chunkSignature(zone: ActiveZone, coord: ChunkCoord, lighting: WallLighting): ChunkSignature {
  const region = chunkRegion(coord, zone);
  if (!region) return EMPTY_SIGNATURE;
  const key = chunkKeyOf({ x: region.x, y: region.y });
  const decals = decalsForLevel(zone.definition);
  const rows: string[] = [];
  for (let y = region.y - TILE_MARGIN; y < region.y + region.height + TILE_MARGIN; y++) {
    let row = '';
    for (let x = region.x - TILE_MARGIN; x < region.x + region.width + TILE_MARGIN; x++) {
      row += zone.layout.tileAt({ x, y });
      row += ',';
      const cells = decals.get(tileKey({ x, y }));
      if (cells) row += JSON.stringify(cells);
    }
    rows.push(row);
  }
  const objects = new Map<string, { readonly placement: ObjectPlacement; readonly index: number }>();
  const settle: string[] = [];
  zone.definition.objects.forEach((placement, index) => {
    if (chunkKeyOf(placement.position) !== key) return;
    objects.set(JSON.stringify(placement), { placement, index });
    settle.push(String(index));
  });
  for (const spot of lighting.sconces) if (chunkKeyOf(spot.floor) === key) settle.push(JSON.stringify(spot));
  for (const fill of lighting.fills) if (chunkKeyOf(fill.position) === key) settle.push(JSON.stringify(fill));
  return { tiles: rows.join('\n'), objects, settle: settle.join('\n') };
}

export function objectChanges(before: ChunkSignature, after: ChunkSignature): { readonly removed: readonly ObjectPlacement[]; readonly added: readonly { readonly placement: ObjectPlacement; readonly index: number }[] } {
  const removed = [...before.objects].filter(([key]) => !after.objects.has(key)).map(([, { placement }]) => placement);
  const added = [...after.objects].filter(([key]) => !before.objects.has(key)).map(([, entry]) => entry);
  return { removed, added };
}
