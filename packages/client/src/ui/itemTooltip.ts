import {
  EQUIPMENT_SLOT_LABELS,
  GAME_CONTENT,
  STAT_IDS,
  type EquipmentState,
  SKILL_INFO,
  STAT_INFO,
  type ItemDefinition,
  type SkillId,
  type StatId,
} from '@containment/shared';
import { h, replaceChildren } from './dom.ts';

const tooltip = h('div', { className: 'item-tooltip panel', hidden: true, role: 'tooltip' });
document.body.append(tooltip);

let equipped: EquipmentState = {};

export function setTooltipEquipment(equipment: EquipmentState): void {
  equipped = equipment;
}

export function attachItemTooltip(target: HTMLElement, item: () => ItemDefinition | null): void {
  target.addEventListener('pointerenter', (event) => {
    const definition = item();
    if (!definition) return;
    renderTooltip(definition);
    tooltip.hidden = false;
    position(event);
  });
  target.addEventListener('pointermove', position);
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

function renderTooltip(item: ItemDefinition): void {
  const equipment = item.equipment;
  const requirementLines = [
    ...Object.entries(equipment?.requirements?.skills ?? {}).map(([skill, level]) => `${SKILL_INFO[skill as SkillId].name} ${level}`),
  ];
  replaceChildren(
    tooltip,
    h('p', { className: `tooltip-name rarity-${item.rarity}` }, item.name),
    h('p', { className: 'tooltip-meta' }, `${item.rarity}${equipment ? ` · ${EQUIPMENT_SLOT_LABELS[equipment.slot]}` : ` · ${item.category}`}`),
    equipment && renderStats(item),
    requirementLines.length > 0 && h('p', { className: 'tooltip-requirements' }, `Requires ${requirementLines.join(', ')}`),
    h('p', { className: 'tooltip-examine' }, item.examine),
  );
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
