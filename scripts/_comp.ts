import { buildCreatureModel } from '../packages/client/src/render/models/wardCreatureModels.ts';
const key = process.argv[2]!;
const m = buildCreatureModel(key);
const unseen = new Set(m.occupied());
const comps: string[][] = [];
while (unseen.size) { const s = unseen.values().next().value as string; unseen.delete(s); const q=[s]; const c=[s]; while(q.length){const [x,y,z]=q.pop()!.split(',').map(Number); for (const [a,b,d] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) { const n=`${x+a},${y+b},${z+d}`; if (unseen.delete(n)) { q.push(n); c.push(n);} } } comps.push(c); }
for (const c of comps.sort((a,b)=>a.length-b.length).slice(0,-1)) console.log(c.length, c.slice(0,6).join(' | '));
