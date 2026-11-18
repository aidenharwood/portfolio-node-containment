import { createObjectWalkabilityGrid, GAME_CONTENT, isOutdoorFloor, locate } from '../packages/shared/src/index.ts';
const districtId = process.argv[2] ?? 'canal-basin';
const district = GAME_CONTENT.districts.get(districtId)!;
const w = district.map[0]!.length, h = district.map.length;
const hits: string[] = [];
for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
  const at = locate(GAME_CONTENT, districtId, { x, y });
  if (!at) continue;
  const level = GAME_CONTENT.levels.get(at.levelId)!;
  const layout = level.layout;
  if (!createObjectWalkabilityGrid(layout, level.objects, (id) => GAME_CONTENT.worldObjects.get(id)).isWalkable(at.position)) continue;
  const t = layout.tileAt(at.position);
  if (!isOutdoorFloor(t) || t === 'water') continue;
  let water = 0;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (layout.tileAt({ x: at.position.x + dx, y: at.position.y + dy }) === 'water') water++;
  if (water >= 12 && water <= 24) hits.push(`${water} d=${x},${y} ${JSON.stringify(at)} ${t}`);
}
console.log(hits.length, hits.slice(Math.floor(hits.length / 2), Math.floor(hits.length / 2) + 3).join('\n'));
