import {
  COMBAT_STYLE_INFO,
  COMBAT_STYLES,
  CONTAINMENT_CLASS_INFO,
  creatureDefence,
  GEAR_MOTIF_INFO,
  weaknessOf,
  clearanceName,
  clearanceTierFor,
  containmentThreshold,
  EXPLOITED_DEFENCE_FACTOR,
  GAME_CONTENT,
  type CreatureDefinition,
  type CreatureId,
  type LootEntry,
  type SelfState,
} from '@containment/shared';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { PanelTab } from '../sidePanel.ts';

const habitatsByCreature = (): ReadonlyMap<CreatureId, readonly string[]> => {
  const habitats = new Map<CreatureId, string[]>();
  for (const district of GAME_CONTENT.districts.values()) {
    for (const placement of district.creatures ?? []) {
      const names = habitats.get(placement.creatureId) ?? [];
      if (!names.includes(district.name)) names.push(district.name);
      habitats.set(placement.creatureId, names);
    }
  }
  return habitats;
};

const percent = (chance: number): string => (chance >= 1 ? 'Always' : `${Math.max(1, Math.round(chance * 100))}%`);

const lootRows = (loot: readonly LootEntry[]) =>
  loot.map((entry) => h('tr', {},
    h('th', { scope: 'row' }, `${GAME_CONTENT.items.get(entry.itemId)?.name ?? entry.itemId}${entry.count > 1 ? ` × ${entry.count}` : ''}`),
    h('td', {}, percent(entry.chance)),
  ));

const statRow = (label: string, value: string, title?: string) =>
  h('tr', title ? { title } : {}, h('th', { scope: 'row' }, label), h('td', {}, value));

export function createBestiaryTab(): PanelTab {
  const creatures = [...GAME_CONTENT.creatures.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  const habitats = habitatsByCreature();
  let selected: CreatureId | null = null;
  let self: SelfState | null = null;
  let studied = new Set<CreatureId>();
  const count = h('span', { className: 'tab-hint' });
  const body = h('div', { className: 'bestiary-body' });
  const element = h('div', { className: 'tab-bestiary' }, h('header', { className: 'tab-header' }, count), body);

  const open = (creatureId: CreatureId | null) => {
    selected = creatureId;
    render();
  };

  const renderEntry = (creature: CreatureDefinition) => {
    const known = studied.has(creature.id);
    const ready = (self?.profile.analysis ?? 0) >= creature.level;
    return h('button', {
      className: `bestiary-entry${known ? ' known' : ready ? ' ready' : ''}`,
      type: 'button',
      disabled: !known,
      title: known ? `View ${creature.name}` : ready ? 'Study this anomaly in the field to catalogue it.' : `Needs Analysis ${creature.level} to study.`,
      onclick: () => open(creature.id),
    },
    h('span', { className: 'bestiary-entry-name' }, known ? creature.name : 'Uncatalogued specimen'),
    h('span', { className: 'bestiary-entry-level' }, `Lv ${creature.level}`));
  };

  const renderList = () => {
    replaceChildren(
      body,
      h('div', { className: 'bestiary-list' }, ...creatures.map(renderEntry)),
      h('p', { className: 'tab-hint' }, 'Right-click an anomaly and choose Study to catalogue it. Studying needs Analysis at or above its level.'),
    );
  };

  const renderDetail = (creature: CreatureDefinition) => {
    const attack = creature.attack;
    const containment = creature.containment;
    const places = habitats.get(creature.id) ?? [];
    const exploit = Math.round((1 - EXPLOITED_DEFENCE_FACTOR) * 100);
    const weakness = weaknessOf(creature);
    const guardName = creature.guard ? GEAR_MOTIF_INFO[creature.guard].name : '';
    replaceChildren(
      body,
      h('div', { className: 'bestiary-detail' },
        h('button', { className: 'quest-back', type: 'button', onclick: () => open(null) }, '‹ All specimens'),
        h('p', { className: 'bestiary-name' }, creature.name),
        h('p', { className: 'bestiary-meta' }, [creature.designation, `Level ${creature.level}`, creature.aggressive ? 'Aggressive' : 'Passive'].filter(Boolean).join(' · ')),
        h('p', { className: 'bestiary-examine' }, creature.examine),
        h('p', { className: 'bestiary-weakness' },
          h('span', { className: 'bestiary-weakness-label' }, 'Weakness '),
          weakness
            ? `${COMBAT_STYLE_INFO[weakness].name}. ${guardName} guard. Your ${COMBAT_STYLE_INFO[weakness].name.toLowerCase()} attacks ignore ${exploit}% of its Defence.`
            : 'None. It guards evenly against every style.'),
        h('h4', { className: 'subheading' }, 'Field profile'),
        h('table', { className: 'dossier-stats bestiary-stats' },
          h('tbody', {},
            statRow('Integrity', String(creature.integrity)),
            ...COMBAT_STYLES.map((style) => statRow(`${COMBAT_STYLE_INFO[style].name} defence`, String(creatureDefence(creature, style, false)))),
            statRow('Attack', `${COMBAT_STYLE_INFO[attack.style].name}, up to ${attack.maxHit}`),
            statRow('Range', attack.range > 1 ? `${attack.range} tiles` : 'Adjacent'),
            statRow('Attack speed', `${(attack.speedTicks * 0.3).toFixed(1)}s`),
          ),
        ),
        places.length > 0 && h('h4', { className: 'subheading' }, 'Sighted in'),
        places.length > 0 && h('p', { className: 'bestiary-habitat' }, places.join(', ')),
        h('h4', { className: 'subheading' }, 'Recovered material'),
        creature.loot.length > 0
          ? h('table', { className: 'dossier-stats bestiary-stats' }, h('tbody', {}, ...lootRows(creature.loot)))
          : h('p', { className: 'tab-hint' }, 'Nothing worth recovering.'),
        containment && h('h4', { className: 'subheading' }, 'Containment'),
        containment && h('table', { className: 'dossier-stats bestiary-stats' },
          h('tbody', {},
            statRow('Object class', CONTAINMENT_CLASS_INFO[containment.containmentClass].name, CONTAINMENT_CLASS_INFO[containment.containmentClass].summary),
            statRow('Requires', `Containment ${creature.level}, ${clearanceName(clearanceTierFor(creature))}`),
            statRow('Weakened at', `${containmentThreshold(creature.integrity)} integrity`),
            ...lootRows(containment.loot),
          ),
        ),
        containment && h('p', { className: 'bestiary-examine' }, containment.procedures),
      ),
    );
  };

  const render = () => {
    if (!self) return;
    count.textContent = `${studied.size} / ${creatures.length} catalogued`;
    const creature = selected && studied.has(selected) ? GAME_CONTENT.creatures.get(selected) : undefined;
    if (creature) renderDetail(creature);
    else renderList();
  };

  return {
    id: 'bestiary',
    label: 'Bestiary',
    icon: 'bestiary',
    element,
    update(current: SelfState) {
      self = current;
      studied = new Set(current.studiedCreatures);
      render();
    },
  };
}
