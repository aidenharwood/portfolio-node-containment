import {
  EQUIPMENT_SLOT_LABELS,
  GAME_CONTENT,
  GEAR_MOTIF_INFO,
  gearLineOf,
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
import { placeInViewport, VIEWPORT_MARGIN } from './placement.ts';

const tooltip = h('div', { className: 'item-tooltip panel', hidden: true, role: 'tooltip' });
document.body.append(tooltip);

const CURSOR_OFFSET = 16;
const TOUCH_OFFSET = 28;

let equipped: EquipmentState = {};
let lastPointerType = '';
const touchSources = new WeakMap<Element, () => ItemDefinition | null>();

window.addEventListener('pointerdown', (event) => {
  lastPointerType = event.pointerType;
  if (event.pointerType === 'touch') hideItemTooltip();
}, true);

const hideAfterTouch = (event: PointerEvent): void => {
  if (event.pointerType === 'touch') hideItemTooltip();
};
window.addEventListener('pointerup', hideAfterTouch);
window.addEventListener('pointercancel', hideAfterTouch);

window.addEventListener('contextmenu', (event) => {
  if (lastPointerType !== 'touch' || !(event.target instanceof Element)) return;
  if (document.querySelector('.context-menu:not([hidden])')) return;
  const definition = touchSourceFor(event.target)?.();
  if (!definition) return;
  replaceChildren(tooltip, ...describeItem(definition));
  tooltip.hidden = false;
  const bounds = tooltip.getBoundingClientRect();
  const above = event.clientY - TOUCH_OFFSET - bounds.height;
  placeInViewport(tooltip, event.clientX - bounds.width / 2, above >= VIEWPORT_MARGIN ? above : event.clientY + TOUCH_OFFSET);
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
    replaceChildren(tooltip, ...describeItem(definition));
    tooltip.hidden = false;
    position(event);
  });
  target.addEventListener('pointermove', (event) => {
    if (!tooltip.hidden) position(event);
  });
  target.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') hideItemTooltip();
  });
}

export function itemDetails(item: ItemDefinition): HTMLElement {
  return h('div', { className: 'item-details' }, ...describeItem(item));
}

export function hideItemTooltip(): void {
  tooltip.hidden = true;
}

function position(event: PointerEvent): void {
  const bounds = tooltip.getBoundingClientRect();
  const flipX = event.clientX + CURSOR_OFFSET + bounds.width > window.innerWidth - VIEWPORT_MARGIN;
  const flipY = event.clientY + CURSOR_OFFSET + bounds.height > window.innerHeight - VIEWPORT_MARGIN;
  placeInViewport(
    tooltip,
    flipX ? event.clientX - CURSOR_OFFSET - bounds.width : event.clientX + CURSOR_OFFSET,
    flipY ? event.clientY - CURSOR_OFFSET - bounds.height : event.clientY + CURSOR_OFFSET,
  );
}

function touchSourceFor(start: Element): (() => ItemDefinition | null) | undefined {
  for (let node: Element | null = start; node; node = node.parentElement) {
    const source = touchSources.get(node);
    if (source) return source;
  }
  return undefined;
}

function describeItem(item: ItemDefinition): (HTMLElement | null | false | undefined)[] {
  const equipment = item.equipment;
  const line = gearLineOf(item);
  const requirementLines = [
    ...Object.entries(equipment?.requirements?.skills ?? {}).map(([skill, level]) => `${SKILL_INFO[skill as SkillId].name} ${level}`),
  ];
  return [
    h('p', { className: `tooltip-name rarity-${item.rarity}` }, item.name),
    h('p', { className: 'tooltip-meta' }, `${item.rarity}${item.unique ? ' unique' : ''}${equipment ? ` · ${EQUIPMENT_SLOT_LABELS[equipment.slot]}` : ` · ${item.category}`}`),
    line && h('p', { className: 'tooltip-meta' }, `${GEAR_MOTIF_INFO[line].name} line · ${GEAR_MOTIF_INFO[line].summary}`),
    equipment?.weapon && h('p', { className: 'tooltip-meta' }, weaponSummary(equipment.weapon)),
    equipment && renderStats(item),
    requirementLines.length > 0 && h('p', { className: 'tooltip-requirements' }, `Requires ${requirementLines.join(', ')}`),
    h('p', { className: 'tooltip-examine' }, item.examine),
  ];
}

function weaponSummary(weapon: WeaponProfile): string {
  const info = WEAPON_KIND_INFO[weapon.kind];
  const grip = info.grip === 'twoHanded' ? 'Two-handed' : 'One-handed';
  const reach = info.style !== 'melee' ? `Range ${weapon.range}` : weapon.range > 1 ? `Reach ${weapon.range}` : 'Melee';
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
