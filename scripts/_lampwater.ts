import { createObjectWalkabilityGrid, GAME_CONTENT, locate } from '../packages/shared/src/index.ts';
const level = GAME_CONTENT.levels.get('overworld')!;
const grid = createObjectWalkabilityGrid(level.layout, level.objects, (id) => GAME_CONTENT.worldObjects.get(id));
const lamps = level.objects.filter((o) => GAME_CONTENT.worldObjects.get(o.objectId)?.light);
const hits: string[] = [];
for (const lamp of lamps) {
  let water = 0;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (level.layout.tileAt({ x: lamp.position.x + dx, y: lamp.position.y + dy }) === 'water') water++;
  if (water < 8) continue;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
    const p = { x: lamp.position.x + dx, y: lamp.position.y + dy };
    if (grid.isWalkable(p)) { hits.push(`${water} ${lamp.objectId} level=${p.x},${p.y} local=${JSON.stringify(level.layout.toLocalPoint(p))}`); break; }
  }
}
console.log(hits.slice(0, 5).join('\n'));
const term = GAME_CONTENT.districts.get('terminus-square')!;
console.log('terminus', JSON.stringify(term.recovery ?? null));
