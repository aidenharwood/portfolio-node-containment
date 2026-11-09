import {
  EQUIPMENT_SLOT_LABELS,
  GAME_CONTENT,
  STAT_IDS,
  type EquipmentState,
  SKILL_INFO,
  STAT_INFO,
  WEAPON_KIND_INFO,
  attackPace,
  type WeaponProfile,
  type ItemDefinition,
  type SkillId,
  type StatId,
} from '@containment/shared';
import { h, replaceChildren } from './dom.ts';

const tooltip = h('div', { className: 'item-tooltip panel', hidden: true, role: 'tooltip' });
document.body.append(tooltip);

const EDGE_MARGIN = 8;
const MENU_GAP = 6;

let equipped: EquipmentState = {};
let lastPointerType = '';
const touchSources = new WeakMap<Element, () => ItemDefinition | null>();

window.addEventListener('pointerdown', (event) => {
  lastPointerType = event.pointerType;
  if (event.pointerType === 'touch') hideItemTooltip();
}, true);

window.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch' && !document.querySelector('.context-menu:not([hidden])')) hideItemTooltip();
});

window.addEventListener('contextmenu', (event) => {
  if (lastPointerType !== 'touch' || !(event.target instanceof Element)) return;
  const definition = touchSourceFor(event.target)?.();
  if (!definition) return;
  renderTooltip(definition);
  tooltip.hidden = false;
  placeForTouch(event.clientX, event.clientY);
});

export function setTooltipEquipment(equipment: EquipmentState): void {
  equipped = equipment;
}

export function attachItemTooltip(target: HTMLElement, item: () => ItemDefinition | null): void {
  touchSources.set(target, item);
  target.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    const definition = item();
    if (!definition) return;
    renderTooltip(definition);
    tooltip.hidden = false;
    position(event);
  });
  target.addEventListener('pointermove', (event) => {
    if (!tooltip.hidden) position(event);
  });
  target.addEventListener('pointerleave', hideItemTooltip);
}

export function hideItemTooltip(): void {
  tooltip.hidden = true;
}

function position(event: PointerEvent): void {
  const bounds = tooltip.getBoundingClientRect();
  tooltip.style.left = `${Math.min(event.clientX + 16, window.innerWidth - bounds.width - 8)}px`;
  tooltip.style.top = `${Math.min(event.clientY + 16, window.innerHeight - bounds.height - 8)}px`;
}

function touchSourceFor(start: Element): (() => ItemDefinition | null) | undefined {
  for (let node: Element | null = start; node; node = node.parentElement) {
    const source = touchSources.get(node);
    if (source) return source;
  }
  return undefined;
}

function placeForTouch(clientX: number, clientY: number): void {
  const bounds = tooltip.getBoundingClientRect();
  const menu = document.querySelector<HTMLElement>('.context-menu:not([hidden])')?.getBoundingClientRect();
  const anchor = menu ?? new DOMRect(clientX, clientY, 0, 0);
  const clampX = (x: number) => Math.max(EDGE_MARGIN, Math.min(x, window.innerWidth - bounds.width - EDGE_MARGIN));
  const clampY = (y: number) => Math.max(EDGE_MARGIN, Math.min(y, window.innerHeight - bounds.height - EDGE_MARGIN));
  const centredX = clampX(anchor.left + anchor.width / 2 - bounds.width / 2);
  const above = anchor.top - MENU_GAP - bounds.height;
  const below = anchor.bottom + MENU_GAP;
  const right = anchor.right + MENU_GAP;
  const left = anchor.left - MENU_GAP - bounds.width;
  let x = centredX;
  let y: number;
  if (above >= EDGE_MARGIN) y = above;
  else if (below + bounds.height <= window.innerHeight - EDGE_MARGIN) y = below;
  else if (right + bounds.width <= window.innerWidth - EDGE_MARGIN) [x, y] = [right, clampY(anchor.top)];
  else if (left >= EDGE_MARGIN) [x, y] = [left, clampY(anchor.top)];
  else y = EDGE_MARGIN;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function renderTooltip(item: ItemDefinition): void {
  const equipment = item.equipment;
  const requirementLines = [
    ...Object.entries(equipment?.requirements?.skills ?? {}).map(([skill, level]) => `${SKILL_INFO[skill as SkillId].name} ${level}`),
  ];
  replaceChildren(
    tooltip,
    h('p', { className: `tooltip-name rarity-${item.rarity}` }, item.name),
    h('p', { className: 'tooltip-meta' }, `${item.rarity}${item.unique ? ' unique' : ''}${equipment ?` · ${EQUIPMENT_SLOT_LABELS[equipment.slot]}` : ` · ${item.category}`}`),
    equipment?.weapon && h('p', { className: 'tooltip-meta' }, weaponSummary(equipment.weapon)),
    equipment && renderStats(item),
    requirementLines.length > 0 && h('p', { className: 'tooltip-requirements' }, `Requires ${requirementLines.join(', ')}`),
    h('p', { className: 'tooltip-examine' }, item.examine),
  );
}

function weaponSummary(weapon: WeaponProfile): string {
  const info = WEAPON_KIND_INFO[weapon.kind];
  const grip = info.grip === 'twoHanded' ? 'Two-handed' : 'One-handed';
  const reach = info.style === 'ranged' ? `Range ${weapon.range}` : weapon.range > 1 ? `Reach ${weapon.range}` : 'Melee';
  return `${grip} ${info.name.toLowerCase()} · ${attackPace(weapon.speedTicks)} · ${reach}`;
}

function renderStats(item: ItemDefinition): HTMLElement | null {
  const equipment = item.equipment;
  if (!equipment) return null;
  const currentId = equipped[equipment.slot];
  const isEquipped = currentId === item.id;
  const current = currentId && !isEquipped ? GAME_CONTENT.items.get(currentId) : undefined;
  const compareWith = isEquipped ? null : (current?.equipment?.stats ?? {});
  const stats = STAT_IDS.filter((stat) => (equipment.stats[stat] ?? 0) !== 0 || (compareWith?.[stat] ?? 0) !== 0);
  return h('div', { className: 'tooltip-comparison' },
    h('ul', { className: 'tooltip-stats' },
      ...stats.map((stat: StatId) => {
        const value = equipment.stats[stat] ?? 0;
        const delta = compareWith ? value - (compareWith[stat] ?? 0) : 0;
        return h('li', {},
          h('span', {}, STAT_INFO[stat].name),
          h('strong', {}, value >= 0 ? `+${value}` : String(value)),
          compareWith && delta !== 0 && h('em', { className: delta > 0 ? 'stat-better' : 'stat-worse' }, delta > 0 ? `▲${delta}` : `▼${-delta}`),
        );
      }),
    ),
    h('p', { className: 'tooltip-compare-note' },
      isEquipped ? 'Currently equipped' : current ? `Compared with ${current.name}` : `${EQUIPMENT_SLOT_LABELS[equipment.slot]} slot is empty`),
  );
}
