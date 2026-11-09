import {
  experienceForLevel,
  levelForExperience,
  levelProgress,
  SKILL_IDS,
  SKILL_INFO,
  SKILL_LEVEL_CAP,
  type SkillId,
} from '@containment/shared';
import { h, replaceChildren } from '../../ui/dom.ts';
import { skillIcon } from '../skillIcons.ts';
import type { PanelTab } from '../sidePanel.ts';

interface SkillTile {
  readonly element: HTMLButtonElement;
  readonly level: HTMLSpanElement;
  readonly fill: HTMLSpanElement;
}

export function createSkillsTab(): PanelTab {
  let experienceById: Readonly<Record<SkillId, number>> | null = null;
  let shownId: SkillId | null = null;
  let pinned = false;
  let lastPointerType = '';
  let signalAttention: () => void = () => undefined;
  const shownLevels = new Map<SkillId, number>();

  const total = h('span', { className: 'tab-hint' });
  const list = h('div', { className: 'skill-grid' });
  const element = h('div', { className: 'tab-skills' }, h('header', { className: 'tab-header' }, total), list);
  const details = h('div', { className: 'item-tooltip skill-tooltip panel', hidden: true, role: 'tooltip' });
  document.body.append(details);

  const renderDetails = (id: SkillId) => {
    const experience = experienceById?.[id] ?? 0;
    const level = levelForExperience(experience);
    const mastered = level >= SKILL_LEVEL_CAP;
    const remaining = experienceForLevel(level + 1) - experience;
    replaceChildren(
      details,
      h('p', { className: 'tooltip-name' }, SKILL_INFO[id].name),
      h('p', { className: 'tooltip-meta' }, `Level ${level} / ${SKILL_LEVEL_CAP}`),
      h('dl', { className: 'skill-tooltip-stats' },
        h('dt', {}, 'Experience'), h('dd', {}, experience.toLocaleString()),
        h('dt', {}, mastered ? 'Status' : `To level ${level + 1}`), h('dd', {}, mastered ? 'Mastered' : `${remaining.toLocaleString()} XP`),
      ),
      h('div', { className: 'skill-bar' }, h('span', { style: { width: `${levelProgress(experience) * 100}%` } })),
      h('p', { className: 'tooltip-examine' }, SKILL_INFO[id].summary),
    );
  };

  const placeAt = (x: number, y: number) => {
    const bounds = details.getBoundingClientRect();
    details.style.left = `${Math.max(8, Math.min(x + 16, window.innerWidth - bounds.width - 8))}px`;
    details.style.top = `${Math.max(8, Math.min(y + 16, window.innerHeight - bounds.height - 8))}px`;
  };

  const placeBeside = (anchor: HTMLElement) => {
    const anchorBounds = anchor.getBoundingClientRect();
    const bounds = details.getBoundingClientRect();
    const above = anchorBounds.top - bounds.height - 6;
    details.style.left = `${Math.max(8, Math.min(anchorBounds.left + anchorBounds.width / 2 - bounds.width / 2, window.innerWidth - bounds.width - 8))}px`;
    details.style.top = `${above >= 8 ? above : Math.min(anchorBounds.bottom + 6, window.innerHeight - bounds.height - 8)}px`;
  };

  const show = (id: SkillId) => {
    shownId = id;
    renderDetails(id);
    details.hidden = false;
  };

  const hide = () => {
    shownId = null;
    pinned = false;
    details.hidden = true;
  };

  const tiles = new Map<SkillId, SkillTile>(SKILL_IDS.map((id) => {
    const level = h('span', { className: 'skill-level' }, '1');
    const fill = h('span');
    const tile = h('button', { className: 'skill-tile', type: 'button', ariaLabel: SKILL_INFO[id].name },
      h('span', { className: 'skill-face' }, skillIcon(id), level),
      h('span', { className: 'skill-name' }, SKILL_INFO[id].shortName),
      h('span', { className: 'skill-bar' }, fill),
    );
    tile.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || pinned) return;
      show(id);
      placeAt(event.clientX, event.clientY);
    });
    tile.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse' && !pinned && shownId === id) placeAt(event.clientX, event.clientY);
    });
    tile.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse' && !pinned) hide();
    });
    tile.addEventListener('pointerdown', (event) => {
      lastPointerType = event.pointerType;
    });
    tile.addEventListener('focus', () => {
      if (pinned || !tile.matches(':focus-visible')) return;
      show(id);
      placeBeside(tile);
    });
    tile.addEventListener('blur', () => {
      if (!pinned && shownId === id) hide();
    });
    tile.addEventListener('animationend', () => tile.classList.remove('levelled'));
    tile.addEventListener('click', (event) => {
      if (event.detail > 0 && lastPointerType === 'mouse') return;
      if (pinned && shownId === id) return hide();
      show(id);
      pinned = true;
      placeBeside(tile);
    });
    return [id, { element: tile, level, fill }];
  }));
  list.append(...[...tiles.values()].map((tile) => tile.element));

  const hideOnOutsidePress = (event: PointerEvent) => {
    if (pinned && !list.contains(event.target as Node)) hide();
  };
  window.addEventListener('pointerdown', hideOnOutsidePress, true);
  window.addEventListener('keydown', hide);

  return {
    id: 'skills',
    label: 'Skills',
    glyph: '◈',
    element,
    bindAttention(signal) {
      signalAttention = signal;
    },
    update(self) {
      experienceById = self.skills;
      let levelSum = 0;
      for (const id of SKILL_IDS) {
        const tile = tiles.get(id);
        if (!tile) continue;
        const experience = self.skills[id];
        const level = levelForExperience(experience);
        levelSum += level;
        const previous = shownLevels.get(id);
        shownLevels.set(id, level);
        if (previous !== undefined && level > previous) {
          tile.element.classList.remove('levelled');
          void tile.element.offsetWidth;
          tile.element.classList.add('levelled');
          signalAttention();
        }
        tile.level.textContent = String(level);
        tile.fill.style.width = `${levelProgress(experience) * 100}%`;
        tile.element.classList.toggle('mastered', level >= SKILL_LEVEL_CAP);
      }
      if (shownId && !details.hidden) renderDetails(shownId);
      total.textContent = `Total ${levelSum} · Combat ${self.combatLevel}`;
    },
    dispose() {
      window.removeEventListener('pointerdown', hideOnOutsidePress, true);
      window.removeEventListener('keydown', hide);
      details.remove();
    },
  };
}
