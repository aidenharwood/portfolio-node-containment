import { GAME_CONTENT } from '../packages/shared/src/content/gameContent.ts';
for (const d of GAME_CONTENT.districts.values()) {
  const cr: Record<string, number> = {};
  for (const p of d.creatures ?? []) cr[p.creatureId] = (cr[p.creatureId] ?? 0) + 1;
  const objs: Record<string, number> = {};
  for (const o of (d as any).objects ?? []) objs[o.objectId ?? o.id] = (objs[o.objectId ?? o.id] ?? 0) + 1;
  const npcs = ((d as any).npcs ?? []).map((n: any) => n.npcId ?? n.id);
  console.log(`== ${d.id} tier ${d.tier}`);
  console.log('  creatures', JSON.stringify(cr));
  console.log('  npcs', npcs.join(','));
  console.log('  objects', Object.keys(objs).filter(k => !/lamp|bench|crate|barrel|sign|plant|bin|bollard|chair|table|tree/.test(k)).map(k=>`${k}x${objs[k]}`).join(' '));
}
