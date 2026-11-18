import { GAME_CONTENT } from '../packages/shared/src/index.ts';
import { itemIconUrl } from '../packages/client/src/render/items/itemSprites.ts';
import { lineup } from './_lineup.ts';

const ARMOUR = ['head', 'torso', 'hands', 'legs', 'feet'];
const items = [...GAME_CONTENT.items.values()];
const groups: Record<string, string[]> = {
  weapons: items.filter((i) => i.equipment?.slot === 'primary').map((i) => i.id),
  armour: items.filter((i) => ARMOUR.includes(i.equipment?.slot ?? '')).map((i) => i.id),
  misc: items.filter((i) => !i.equipment || ![...ARMOUR, 'primary'].includes(i.equipment.slot)).map((i) => i.id),
};

export const show = (group: string, size = 72): string => {
  document.getElementById('__lineup')?.remove();
  document.getElementById('__g')?.remove();
  const g = document.createElement('div');
  g.id = '__g';
  g.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1b1d24;display:flex;flex-wrap:wrap;align-content:flex-start;gap:4px;padding:6px;overflow:auto';
  for (const id of groups[group]!) {
    const it = GAME_CONTENT.items.get(id)!;
    const c = document.createElement('div');
    c.style.cssText = `width:${size + 24}px;text-align:center;font:10px sans-serif;color:#ccc`;
    c.innerHTML = `<div style="background:#2a2d36;border:1px solid #444"><img src="${itemIconUrl(it)}" style="width:${size}px;height:${size}px;image-rendering:pixelated;filter:drop-shadow(0 0 1px rgba(170,215,240,0.5))"></div>${it.name}`;
    g.append(c);
  }
  document.body.append(g);
  return `${groups[group]!.length}`;
};

export const held = (sets: string[][], opts: Parameters<typeof lineup>[1] = {}): string => {
  document.getElementById('__g')?.remove();
  return lineup(sets, { width: 1280, height: 800, ...opts });
};
