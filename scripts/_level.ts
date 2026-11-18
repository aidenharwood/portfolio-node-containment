import { GAME_CONTENT } from '../packages/shared/src/index.ts';
import { TILE_KINDS } from '../packages/shared/src/world/tiles.ts';
const level = GAME_CONTENT.levels.get('the-deep')!;
const [x0, y0, x1, y1, step] = (process.argv[2] ?? '0,0,300,400,1').split(',').map(Number);
const sym: Record<string, string> = { void: ' ', wall: '#', track: 'T', door: 'D', grate: '=', hazard: '!', coolant: '~' };
const rows: string[] = [];
for (let y = y0; y < y1; y += step) {
  let r = '';
  for (let x = x0; x < x1; x += step) {
    const k = level.layout.tileAt({ x, y });
    r += sym[k] ?? (TILE_KINDS[k].walkable ? '.' : '?');
  }
  rows.push(r);
}
console.log(rows.join('\n'));
console.log(level.layout.width, level.layout.height);
for (const p of level.districts) console.log(p.districtId, JSON.stringify(p.rect));
