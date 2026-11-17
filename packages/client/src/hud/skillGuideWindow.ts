import {
  EQUIPMENT_SLOT_LABELS,
  GAME_CONTENT,
  levelForExperience,
  SKILL_INFO,
  skillGuide,
  skillGuideLabel,
  STATION_INFO,
  type SkillGuideEntry,
  type SkillId,
  type SourceLocation,
} from '@containment/shared';
import { itemIconUrl } from '../render/items/itemSprites.ts';
import type { GuidanceTracking } from '../state/guidanceTracking.ts';
import type { WorldState } from '../state/worldState.ts';
import { h, replaceChildren } from '../ui/dom.ts';
import { skillIcon } from './skillIcons.ts';

const placeName = (location: SourceLocation): string => `${location.districtName || location.levelName} (${location.count})`;

const whereText = (locations: readonly SourceLocation[]): string => (locations.length > 0 ? locations.map(placeName).join(', ') : 'Not yet sighted');

const itemName = (itemId: string): string => GAME_CONTENT.items.get(itemId)?.name ?? itemId;

function detailOf(entry: SkillGuideEntry): string {
  switch (entry.kind) {
    case 'gather':
      return `${itemName(entry.itemId)} · +${entry.experience} xp`;
    case 'recipe':
      return `${STATION_INFO[entry.station].name}${entry.count > 1 ? ` · makes ${entry.count}` : ''} · +${entry.experience} xp`;
    case 'equip':
      return `${EQUIPMENT_SLOT_LABELS[entry.slot]} gear`;
    case 'contain':
      return `Contain once weakened · +${entry.experience} xp`;
    case 'study':
      return `First study · +${entry.experience} xp · needs Analysis ${entry.level}`;
    case 'quest':
      return 'Quest requirement';
    case 'contract':
      return 'Contract requirement';
  }
}

const locationsOf = (entry: SkillGuideEntry): readonly SourceLocation[] | null =>
  entry.kind === 'gather' || entry.kind === 'contain' || entry.kind === 'study' ? entry.locations : null;

const itemOf = (entry: SkillGuideEntry): string | null =>
  entry.kind === 'gather' || entry.kind === 'recipe' || entry.kind === 'equip' ? entry.itemId : null;

export class SkillGuideWindow {
  readonly element = h('section', { className: 'skill-guide-window panel', hidden: true, role: 'dialog', ariaLabel: 'Skill guide' });
  private readonly world: WorldState;
  private readonly tracking: GuidanceTracking;
  private readonly title = h('h3', {});
  private readonly summary = h('p', { className: 'shop-greeting' });
  private readonly trainedBy = h('p', { className: 'skill-guide-where' });
  private readonly list = h('div', { className: 'skill-guide-list' });
  private readonly closeButton = h('button', { className: 'dialogue-close', type: 'button', ariaLabel: 'Close skill guide', onclick: () => this.hide() }, '×');
  private skill: SkillId = 'salvage';
  private open = false;
  private readonly unsubscribe: () => void;

  constructor(world: WorldState, tracking: GuidanceTracking) {
    this.world = world;
    this.tracking = tracking;
    tracking.onChange(() => this.render());
    this.unsubscribe = world.on('selfChanged', () => this.render());
    replaceChildren(
      this.element,
      h('header', { className: 'shop-header' }, h('div', {}, this.title, this.summary, this.trainedBy), this.closeButton),
      this.list,
    );
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(skill: SkillId): void {
    this.skill = skill;
    this.open = true;
    this.element.hidden = false;
    this.list.scrollTop = 0;
    this.render();
    this.list.querySelector<HTMLElement>('.skill-guide-row.current')?.scrollIntoView({ block: 'center' });
  }

  hide(): void {
    this.open = false;
    this.element.hidden = true;
  }

  dispose(): void {
    this.unsubscribe();
  }

  private render(): void {
    const self = this.world.self;
    if (!this.open || !self) return;
    const info = SKILL_INFO[this.skill];
    const entries = skillGuide(GAME_CONTENT, this.skill);
    const level = levelForExperience(self.skills[this.skill]);
    const next = entries.find((entry) => entry.level > level);
    const current = entries.filter((entry) => entry.level <= level).at(-1);
    this.title.textContent = `${info.name} Guide`;
    this.element.ariaLabel = `${info.name} guide`;
    this.closeButton.ariaLabel = `Close ${info.name.toLowerCase()} guide`;
    this.summary.textContent = next
      ? `${info.name} ${level} · next unlock at ${next.level}`
      : entries.length > 0 ? `${info.name} ${level} · everything unlocked` : `${info.name} ${level}`;
    this.trainedBy.textContent = `Train by: ${info.trainedBy}`;
    const scroll = this.list.scrollTop;
    replaceChildren(
      this.list,
      ...(entries.length > 0
        ? entries.map((entry) => this.row(entry, level, entry === next, entry === current))
        : [h('p', { className: 'skill-guide-where' }, `Nothing is gated by ${info.name}. Every level still makes you stronger.`)]),
    );
    this.list.scrollTop = scroll;
  }

  private row(entry: SkillGuideEntry, level: number, isNext: boolean, isCurrent: boolean): HTMLElement {
    const locked = entry.level > level;
    const itemId = itemOf(entry);
    const item = itemId ? GAME_CONTENT.items.get(itemId) : undefined;
    const locations = locationsOf(entry);
    const trackable = entry.kind === 'gather' && this.skill === 'salvage';
    const tracked = trackable && this.tracking.resourceId === entry.objectId;
    const classes = ['skill-guide-row', locked && 'locked', isNext && 'next', isCurrent && 'current'].filter(Boolean).join(' ');
    return h('div', { className: classes },
      item ? h('img', { className: 'skill-guide-icon', src: itemIconUrl(item), alt: '' }) : h('span', { className: 'skill-guide-icon' }, skillIcon(this.skill)),
      h('div', { className: 'skill-guide-text' },
        h('p', { className: 'skill-guide-name' }, skillGuideLabel(entry), h('span', { className: 'skill-guide-level' }, ` Lv ${entry.level}`)),
        h('p', { className: 'skill-guide-yield' }, `${detailOf(entry)}${locked ? ` · Requires Lv ${entry.level}` : ''}`),
        locations && h('p', { className: 'skill-guide-where' }, whereText(locations)),
      ),
      trackable
        ? h('button', {
          className: `button small skill-guide-track${tracked ? ' tracking' : ''}`,
          type: 'button',
          ariaPressed: tracked ? 'true' : 'false',
          onclick: () => (tracked ? this.tracking.untrack() : this.tracking.trackResource(entry.objectId)),
        }, tracked ? 'Tracking ◆' : 'Track')
        : h('span', {}),
    );
  }
}
