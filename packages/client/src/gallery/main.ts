import { GAME_CONTENT, GEAR_FORMS, GEAR_MOTIFS, type CharacterAppearance, type Facing, type GearForm, type GearMotif, type ItemDefinition, type WeaponKind } from '@containment/shared';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import { AvatarPreview } from '../ui/avatarPreview.ts';
import { h } from '../ui/dom.ts';

const APPEARANCE: CharacterAppearance = {
  physique: 'male',
  bodyType: 'average',
  height: 1,
  skinTone: '#b07a56',
  hairStyle: 'crop',
  hairColor: '#2a1d16',
  eyeColor: '#3a6a8a',
  faceMark: 'none',
  augment: 'none',
};

const WEAPON_FOR: Readonly<Record<GearMotif, readonly WeaponKind[]>> = {
  bulwark: ['maul', 'blade', 'baton'],
  skirmisher: ['rifle', 'carbine', 'pistol'],
  warden: ['resonator', 'focus'],
};

const ladderItems = (form: GearForm): ItemDefinition[] =>
  [...GAME_CONTENT.items.values()].filter((item) => item.equipment?.visual.form === form && !item.unique);

const params = new URLSearchParams(location.search);
const onlyForms = params.get('forms')?.split(',') ?? null;
const mannequinsOnly = params.has('mannequins');
const onlyLines = params.get('lines')?.split(',') ?? null;
const facing = (params.get('facing') ?? 'south') as Facing;
const scale = Number(params.get('scale') ?? '1');
const iconPixels = `${Number(params.get('icon') ?? '72')}px`;
const weaponsPerLine = params.has('one') ? 1 : undefined;

function mannequin(gear: readonly ItemDefinition[], label: string): HTMLElement {
  const preview = new AvatarPreview({ appearance: APPEARANCE, gear: gear.map((item) => item.id), facing, walking: false }, { width: Math.round(150 * scale), height: Math.round(210 * scale), zoom: 1.15 });
  return h('figure', { className: 'mannequin' }, preview.element, h('figcaption', {}, label));
}

function tierSection(form: GearForm): HTMLElement {
  const items = ladderItems(form);
  const armour = (motif: GearMotif) => items.filter((item) => !item.equipment?.weapon && item.equipment?.visual.motif === motif);
  const weapon = (kind: WeaponKind) => items.find((item) => item.equipment?.weapon?.kind === kind);
  const figures: HTMLElement[] = [];
  for (const motif of GEAR_MOTIFS.filter((line) => !onlyLines || onlyLines.includes(line))) {
    for (const kind of WEAPON_FOR[motif].slice(0, weaponsPerLine)) {
      const held = weapon(kind);
      figures.push(mannequin([...armour(motif), ...(held ? [held] : [])], `${motif} · ${held?.name ?? kind}`));
    }
  }
  const icons = mannequinsOnly ? [] : items.map(iconTile);
  return h('section', { className: 'tier' }, h('h2', {}, form), h('div', { className: 'mannequins' }, ...figures), h('div', { className: 'icons' }, ...icons));
}

function iconTile(item: ItemDefinition): HTMLElement {
  return h('div', { className: 'icon' }, h('img', { src: itemIconUrl(item), alt: item.name, style: { width: iconPixels, height: iconPixels } }), h('strong', {}, item.name), h('span', {}, item.id));
}

function componentSection(): HTMLElement {
  const components = [...GAME_CONTENT.items.values()].filter((item) => item.category === 'material' || item.consumable?.kind === 'kit');
  return h('section', { className: 'tier' }, h('h2', {}, 'components and kits'), h('div', { className: 'icons' }, ...components.map(iconTile)));
}

const root = document.getElementById('gallery');
if (root && params.has('components')) root.append(componentSection());
if (root) for (const form of GEAR_FORMS) if (!onlyForms || onlyForms.includes(form)) root.append(tierSection(form));
