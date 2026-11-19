import type { DistrictId, RegionId } from '../ids.ts';
import { createObjectWalkabilityGrid } from '../world/district.ts';
import { CARDINAL_OFFSETS } from '../world/geometry.ts';
import type { ResolvedLevel } from '../world/levelLayout.ts';
import type { GameContent } from './gameContent.ts';

function wardOf(content: GameContent, level: ResolvedLevel): (x: number, y: number) => RegionId | undefined {
  const regions = new Map<DistrictId, RegionId | undefined>();
  return (x, y) => {
    const districtId = level.layout.districtAt({ x, y });
    if (districtId === undefined) return undefined;
    if (!regions.has(districtId)) regions.set(districtId, content.districts.get(districtId)?.region);
    return regions.get(districtId);
  };
}

function findLevelLeaks(content: GameContent, level: ResolvedLevel, issues: string[]): void {
  const { width, height } = level.layout;
  const grid = createObjectWalkabilityGrid(level.layout, level.objects, (objectId) => content.worldObjects.get(objectId));
  const wardAt = wardOf(content, level);
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const reported = new Set<string>();
  for (let start = 0; start < width * height; start++) {
    if (seen[start] === 1 || !grid.isWalkable({ x: start % width, y: Math.floor(start / width) })) continue;
    const wards = new Set<RegionId>();
    seen[start] = 1;
    queue[0] = start;
    for (let head = 0, tail = 1; head < tail; head++) {
      const index = queue[head] as number;
      const x = index % width;
      const y = Math.floor(index / width);
      const ward = wardAt(x, y);
      if (ward !== undefined && !wards.has(ward)) {
        for (const earlier of wards) {
          const [a, b] = [earlier, ward].sort();
          const pair = `${a} ${b}`;
          if (reported.has(pair)) continue;
          reported.add(pair);
          issues.push(`level ${level.id}: wards ${a} and ${b} meet at ${x},${y} without a gate`);
        }
        wards.add(ward);
      }
      for (const offset of CARDINAL_OFFSETS) {
        const nx = x + offset.x;
        const ny = y + offset.y;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = ny * width + nx;
        if (seen[next] === 1 || !grid.isWalkable({ x: nx, y: ny })) continue;
        seen[next] = 1;
        queue[tail++] = next;
      }
    }
  }
}

export function findSealedWardIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const level of content.levels.values()) findLevelLeaks(content, level, issues);
  return issues;
}
