import {
  CONTAINMENT_CLASS_INFO,
  containmentSeals,
  containmentThreshold,
  EXPLOITED_DEFENCE_FACTOR,
  GAME_CONTENT,
  sealTierFor,
  type CreatureDefinition,
  type CreatureId,
  type LootEntry,
  type SelfState,
} from '@containment/shared';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { PanelTab } from '../sidePanel.ts';

const STYLE_LABELS = { melee: 'Melee', ranged: 'Ranged' } as const;

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

const sealName = (tier: number): string =>
  containmentSeals(GAME_CONTENT.items).find((item) => item.containmentSeal?.tier === tier)?.name ?? `Tier ${tier} seal`;

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
  const element = h('div', { className: 'tab-bestiary' }, h('header', { className: 'tab-header' }, h('h3', {}, 'Bestiary'), count), body);

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
    replaceChildren(
      body,
      h('div', { className: 'bestiary-detail' },
        h('button', { className: 'quest-back', type: 'button', onclick: () => open(null) }, '‹ All specimens'),
        h('p', { className: 'bestiary-name' }, creature.name),
        h('p', { className: 'bestiary-meta' }, [creature.designation, `Level ${creature.level}`, creature.aggressive ? 'Aggressive' : 'Passive'].filter(Boolean).join(' · ')),
        h('p', { className: 'bestiary-examine' }, creature.examine),
        h('p', { className: 'bestiary-weakness' },
          h('span', { className: 'bestiary-weakness-label' }, 'Weakness '),
          `${STYLE_LABELS[creature.weakness]}. Your ${creature.weakness} attacks ignore ${exploit}% of its Defence.`),
        h('h4', { className: 'subheading' }, 'Field profile'),
        h('table', { className: 'dossier-stats bestiary-stats' },
          h('tbody', {},
            statRow('Integrity', String(creature.integrity)),
            statRow('Defence', String(creature.defence)),
            statRow('Attack', `${STYLE_LABELS[attack.style]}, up to ${attack.maxHit}`),
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
            statRow('Requires', `Containment ${creature.level}, ${sealName(sealTierFor(creature))}`),
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
    glyph: '❖',
    element,
    update(current: SelfState) {
      self = current;
      studied = new Set(current.studiedCreatures);
      render();
    },
  };
}
