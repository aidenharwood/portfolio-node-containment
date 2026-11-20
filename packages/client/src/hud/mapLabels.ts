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
  const members = new Map<RegionId, DistrictLabel[]>();
  for (const label of districtLabels(level)) {
    const regionId = content.districts.get(label.districtId)?.region;
    if (regionId === undefined) continue;
    members.set(regionId, [...(members.get(regionId) ?? []), label]);
  }
  return [...members].map(([regionId, labels]) => {
    const area = labels.reduce((sum, { bounds }) => sum + bounds.width * bounds.height, 0);
    const meanX = labels.reduce((sum, { bounds }) => sum + (bounds.x + bounds.width / 2) * bounds.width * bounds.height, 0) / area;
    const meanY = labels.reduce((sum, { bounds }) => sum + (bounds.y + bounds.height / 2) * bounds.width * bounds.height, 0) / area;
    const nearest = labels.reduce((best, label) => (Math.hypot(label.at.x - meanX, label.at.y - meanY) < Math.hypot(best.at.x - meanX, best.at.y - meanY) ? label : best));
    return { regionId, x: nearest.at.x + 0.5, y: nearest.at.y + 0.5 };
  });
}
