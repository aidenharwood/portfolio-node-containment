import { CHUNK_SIZE } from './chunks.ts';
import type { TileLayout } from './district.ts';
import type { TilePoint, TileRect } from './geometry.ts';
import type { LandMap } from './landPlan.ts';
import type { TileKindId } from './tiles.ts';

export const LAND_MARGIN = CHUNK_SIZE;

export interface SceneLayout extends TileLayout {
  readonly bounds: TileRect;
}

const clamp = (value: number, size: number): number => Math.min(size - 1, Math.max(0, value));

export function sceneOf(layout: TileLayout, land?: LandMap): SceneLayout {
  if (!land) {
    return {
      width: layout.width,
      height: layout.height,
      bounds: { x: 0, y: 0, width: layout.width, height: layout.height },
      tileAt: (point) => layout.tileAt(point),
      heightAt: (point) => layout.heightAt(point),
    };
  }
  const width = Math.max(layout.width, land.width);
  const height = Math.max(layout.height, land.height);
  const bounds = { x: -LAND_MARGIN, y: -LAND_MARGIN, width: width + 2 * LAND_MARGIN, height: height + 2 * LAND_MARGIN };
  const inBounds = ({ x, y }: TilePoint): boolean => x >= bounds.x && y >= bounds.y && x < bounds.x + bounds.width && y < bounds.y + bounds.height;
  const onLand = ({ x, y }: TilePoint): TilePoint => ({ x: clamp(x, land.width), y: clamp(y, land.height) });
  const tileAt = (point: TilePoint): TileKindId => {
    if (!inBounds(point)) return 'void';
    const tile = layout.tileAt(point);
    return tile === 'void' ? land.tileAt(onLand(point)) : tile;
  };
  const heightAt = (point: TilePoint): number => {
    if (!inBounds(point)) return 0;
    return layout.tileAt(point) === 'void' ? land.heightAt(onLand(point)) : layout.heightAt(point);
  };
  return { width, height, bounds, tileAt, heightAt };
}
