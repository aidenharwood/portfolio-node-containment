import { PREFABS } from '../packages/shared/src/content/prefabs/index.ts';
import { FURNISHING_PROFILES } from '../packages/shared/src/content/furnishingCatalogue.ts';
import { GAME_CONTENT } from '../packages/shared/src/index.ts';
import { objectFootprintSize } from '../packages/shared/src/world/footprint.ts';
const size = (id: string) => { const d = GAME_CONTENT.worldObjects.get(id); if (!d) return '?'; const s = objectFootprintSize(d); return `${s.width}x${s.height}`; };
for (const p of Object.values(PREFABS)) {
  let w = 0, h = 0;
  for (const piece of p.pieces) { const d = GAME_CONTENT.worldObjects.get(piece.objectId); const s = d ? objectFootprintSize(d) : { width: 1, height: 1 }; w = Math.max(w, piece.dx + s.width); h = Math.max(h, piece.dy + s.height); }
  const homes = new Set<string>();
  const counts = new Map<string, number>();
  for (const piece of p.pieces) counts.set(piece.objectId, (counts.get(piece.objectId) ?? 0) + 1);
  const hs = [...counts.keys()].map((id) => FURNISHING_PROFILES[id]?.homes).filter(Boolean) as string[][];
  const common = hs.length ? hs.reduce((a, b) => a.filter((x) => b.includes(x))) : [];
  console.log(`${p.id} [${p.roles.join(',')}] ${w}x${h}${p.rows ? ' rows' : ''}${p.clearance ? ' clr' + p.clearance : ''} :: ${[...counts].map(([k, v]) => `${k}${v > 1 ? '*' + v : ''}`).join(' ')} || ${common.length === 19 ? 'ALL' : common.join(',')}`);
}
console.log('--- sizes');
console.log(Object.keys(FURNISHING_PROFILES).map((id) => `${id}:${size(id)}:${FURNISHING_PROFILES[id]!.mount}`).join('  '));
