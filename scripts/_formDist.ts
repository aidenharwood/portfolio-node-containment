import { GAME_CONTENT } from '../packages/shared/src/index.ts';
import { buildItemModel } from '../packages/client/src/render/items/itemModels.ts';
import { wornModelsFor } from '../packages/client/src/render/models/characterModel.ts';
const A = { physique: 'male', bodyType: 'average', height: 1, skinTone: '#c48a62', hairStyle: 'crop', hairColor: '#3b2618', eyeColor: '#3d6e9c', faceMark: 'none', augment: 'none' } as never;
const T = ['scrap', 'iron', 'steel', 'alloy', 'sinter', 'vault-glass'];
const L: Record<string, string[]> = { bulwark: T, skirmisher: ['patchwork', 'oilskin', 'rigger', 'slipway', 'cordon', 'gloam'], warden: ['sackcloth', 'felt', 'vigil', 'tidewarden', 'redline', 'hollow'] };
const P: Record<string, string[]> = { bulwark: ['helm', 'plate', 'gauntlets', 'greaves', 'boots', 'pavise'], skirmisher: ['hood', 'jacket', 'gloves', 'trousers', 'treads', 'pack'], warden: ['cowl', 'robe', 'wraps', 'breeches', 'footwraps', 'mantle'] };
const worn = (g: string[]) => { const m = wornModelsFor(A, g); const s = new Set<string>(); for (const [n, v] of Object.entries(m.parts)) for (const k of v.occupied()) s.add(n + k); for (const k of m.weapon?.occupied() ?? []) s.add('w' + k); return s; };
const N = worn([]);
const foot = (id: string) => { const w = worn([id]); const f = new Set<string>(); for (const k of w) if (!N.has(k)) f.add(k); for (const k of N) if (!w.has(k)) f.add('-' + k); return f; };
const icon = (id: string) => new Set(buildItemModel(GAME_CONTENT.items.get(id)!).occupied());
const d = (a: Set<string>, b: Set<string>) => { let s = 0; for (const k of a) if (b.has(k)) s++; return 1 - s / (a.size + b.size - s); };
const report = (label: string, ids: string[], f: (i: string) => Set<string>) => { const sets = ids.map(f); let min = 1, pair = ''; for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) { const x = d(sets[a]!, sets[b]!); if (x < min) { min = x; pair = `${ids[a]}~${ids[b]}`; } } if (min < 0.15) console.log(label.padEnd(22), (min * 100).toFixed(0).padStart(3) + '%', pair, 'sizes', sets.map(s => s.size).join(',')); };
for (const [l, ns] of Object.entries(L)) for (const p of P[l]!) { const ids = ns.map(n => `${n}-${p}`); report('worn ' + p, ids, foot); report('icon ' + p, ids, icon); }
for (const k of ['baton', 'blade', 'maul', 'pistol', 'carbine', 'rifle', 'focus', 'resonator']) { const ids = T.map(t => `${t}-${k}`); report('held ' + k, ids, foot); report('icon ' + k, ids, icon); }
