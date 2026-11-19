import {
  experienceForLevel,
  GAME_CONTENT,
  levelForExperience,
  levelProgress,
  nextSkillUnlocks,
  SKILL_IDS,
  SKILL_INFO,
  SKILL_LEVEL_CAP,
  skillGuide,
  skillMilestones,
  summariseUnlocks,
  type SkillId,
} from '@containment/shared';
import { h, replaceChildren } from '../../ui/dom.ts';
import { placeInViewport, VIEWPORT_MARGIN } from '../../ui/placement.ts';
import { skillIcon } from '../skillIcons.ts';
import type { PanelTab } from '../sidePanel.ts';
import { skillLayout } from './skillsLayout.ts';

interface SkillTile {
  readonly element: HTMLButtonElement;
  readonly level: HTMLSpanElement;
  readonly fill: HTMLSpanElement;
}

export function createSkillsTab(openSkillGuide: (skill: SkillId) => void): PanelTab {
  let experienceById: Readonly<Record<SkillId, number>> | null = null;
  let shownId: SkillId | null = null;
  let signalAttention: () => void = () => undefined;
  const shownLevels = new Map<SkillId, number>();

  const total = h('span', { className: 'tab-hint' });
  const list = h('div', { className: 'skill-grid' });
  const element = h('div', { className: 'tab-skills tab-fit' }, h('header', { className: 'tab-header' }, total), h('div', { className: 'fit-area' }, list));
  const details = h('div', { className: 'item-tooltip skill-tooltip panel', hidden: true, role: 'tooltip' });
  document.body.append(details);

  const renderDetails = (id: SkillId) => {
    const experience = experienceById?.[id] ?? 0;
    const level = levelForExperience(experience);
    const mastered = level >= SKILL_LEVEL_CAP;
    const remaining = experienceForLevel(level + 1) - experience;
    const milestones = skillMilestones(id);
    const upcoming = nextSkillUnlocks(skillGuide(GAME_CONTENT, id), level);
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
      h('p', { className: 'tooltip-examine' }, `Train by: ${SKILL_INFO[id].trainedBy}`),
      ...milestones.map((line) => h('p', { className: 'tooltip-meta' }, line)),
      upcoming[0] && h('p', { className: 'tooltip-meta' }, `Next unlock: ${summariseUnlocks(upcoming, 1)} at ${upcoming[0].level}`),
      h('p', { className: 'tooltip-hint' }, 'Select to open the skill guide'),
    );
  };

  const placeAt = (x: number, y: number) => {
    placeInViewport(details, x + 16, y + 16);
  };

  const placeBeside = (anchor: HTMLElement) => {
    const anchorBounds = anchor.getBoundingClientRect();
    const bounds = details.getBoundingClientRect();
    const above = anchorBounds.top - bounds.height - 6;
    placeInViewport(details, anchorBounds.left + anchorBounds.width / 2 - bounds.width / 2, above >= VIEWPORT_MARGIN ? above : anchorBounds.bottom + 6);
  };

  const show = (id: SkillId) => {
    shownId = id;
    renderDetails(id);
    details.hidden = false;
  };

  const hide = () => {
    shownId = null;
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
      if (event.pointerType !== 'mouse') return;
      show(id);
      placeAt(event.clientX, event.clientY);
    });
    tile.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse' && shownId === id) placeAt(event.clientX, event.clientY);
    });
    tile.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') hide();
    });
    tile.addEventListener('focus', () => {
      if (!tile.matches(':focus-visible')) return;
      show(id);
      placeBeside(tile);
    });
    tile.addEventListener('blur', () => {
      if (shownId === id) hide();
    });
    tile.addEventListener('animationend', () => tile.classList.remove('levelled'));
    tile.addEventListener('click', () => {
      hide();
      openSkillGuide(id);
    });
    return [id, { element: tile, level, fill }];
  }));
  list.append(...[...tiles.values()].map((tile) => tile.element));

  window.addEventListener('keydown', hide);

  return {
    id: 'skills',
    label: 'Skills',
    icon: 'skills',
    element,
    fit(space) {
      const layout = skillLayout(space);
      list.style.setProperty('--cols', String(layout.columns));
      list.style.setProperty('--rows', String(layout.rows));
      list.dataset.mode = layout.mode;
    },
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
      window.removeEventListener('keydown', hide);
      details.remove();
    },
  };
}
