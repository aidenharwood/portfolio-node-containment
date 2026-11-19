import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
const id = process.argv[2];
const d: any = GAME_CONTENT.districts.get(id);
const H = d.map.length, W = d.map[0].length;
const rows: string[][] = d.map.map((r: string) => r.split(''));
for (const o of d.objects) { const def: any = GAME_CONTENT.worldObjects.get(o.objectId); const fw = def?.footprint?.width ?? 1, fh = def?.footprint?.height ?? 1; const turned = o.facing === 'east' || o.facing === 'west'; for (let i = 0; i < (turned ? fh : fw); i++) for (let j = 0; j < (turned ? fw : fh); j++) { const r = rows[o.position.y + j]; if (r) r[o.position.x + i] = (o.objectId as string)[0]!.toUpperCase() + ''; } }
for (const c of d.creatures ?? []) { const r = rows[c.position.y]; if (r) r[c.position.x] = 'x'; }
for (const n of d.npcs ?? []) { const r = rows[n.position.y]; if (r) r[n.position.x] = '@'; }
console.log('    ' + Array.from({ length: W }, (_, x) => (x % 10 === 0 ? String(x / 10) : ' ')).join(''));
rows.forEach((r, y) => console.log(String(y).padStart(3) + ' ' + r.join('')));
for (const [k, r] of Object.entries(d.rooms ?? {})) console.log(k, JSON.stringify((r as any).rect ?? r));
