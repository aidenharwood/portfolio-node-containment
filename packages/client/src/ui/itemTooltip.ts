import {
  EQUIPMENT_SLOT_LABELS,
  SKILL_INFO,
  STAT_INFO,
  type ItemDefinition,
  type SkillId,
  type StatId,
} from '@containment/shared';
import { h, replaceChildren } from './dom.ts';

const tooltip = h('div', { className: 'item-tooltip panel', hidden: true, role: 'tooltip' });
document.body.append(tooltip);

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
    equipment &&
      h('ul', { className: 'tooltip-stats' },
        ...Object.entries(equipment.stats).map(([stat, value]) => h('li', {}, h('span', {}, STAT_INFO[stat as StatId].name), h('strong', {}, `+${value}`))),
      ),
    requirementLines.length > 0 && h('p', { className: 'tooltip-requirements' }, `Requires ${requirementLines.join(', ')}`),
    h('p', { className: 'tooltip-examine' }, item.examine),
  );
}
