import { footprintsOf, type DistrictId, type GameContent, type RegionId, type ResolvedLevel, type TilePoint, type TileRect } from '@containment/shared';

export interface DistrictLabel {
  readonly districtId: DistrictId;
  readonly at: TilePoint;
  readonly bounds: TileRect;
}

export interface RegionLabel {
  readonly regionId: RegionId;
  readonly x: number;
  readonly y: number;
}

type LabelledLevel = Pick<ResolvedLevel, 'layout' | 'districts'>;

const centreOf = (rect: TileRect): TilePoint => ({ x: rect.x + Math.floor(rect.width / 2), y: rect.y + Math.floor(rect.height / 2) });

export function districtLabels(level: LabelledLevel): DistrictLabel[] {
  const footprints = footprintsOf(level);
  return level.districts.map(({ districtId, rect }) => {
    const footprint = footprints.get(districtId);
    return footprint ? { districtId, at: footprint.label, bounds: footprint.bounds } : { districtId, at: centreOf(rect), bounds: rect };
  });
}

export function regionLabels(level: LabelledLevel, content: Pick<GameContent, 'districts'>): RegionLabel[] {
  const boxes = new Map<RegionId, { minX: number; minY: number; maxX: number }>();
  for (const { districtId, bounds } of districtLabels(level)) {
    const regionId = content.districts.get(districtId)?.region;
    if (regionId === undefined) continue;
    const known = boxes.get(regionId);
    boxes.set(regionId, {
      minX: Math.min(known?.minX ?? bounds.x, bounds.x),
      minY: Math.min(known?.minY ?? bounds.y, bounds.y),
      maxX: Math.max(known?.maxX ?? bounds.x + bounds.width, bounds.x + bounds.width),
    });
  }
  return [...boxes].map(([regionId, box]) => ({ regionId, x: (box.minX + box.maxX) / 2, y: box.minY }));
}
