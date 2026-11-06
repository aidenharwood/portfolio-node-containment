import {
  experienceForLevel,
  levelForExperience,
  levelProgress,
  SKILL_IDS,
  SKILL_INFO,
  SKILL_LEVEL_CAP,
  type SelfState,
} from '@containment/shared';
import { h, replaceChildren } from '../../ui/dom.ts';
import type { PanelTab } from '../sidePanel.ts';

export function createSkillsTab(): PanelTab {
  const list = h('div', { className: 'skill-grid' });
  const total = h('span', { className: 'tab-hint' });
  const element = h('div', { className: 'tab-skills' }, h('header', { className: 'tab-header' }, h('h3', {}, 'Proficiencies'), total), list);

  return {
    id: 'skills',
    label: 'Skills',
    glyph: '◈',
    element,
    update(self) {
      let levelSum = 0;
      replaceChildren(
        list,
        ...SKILL_IDS.map((id) => {
          const experience = self.skills[id];
          const level = levelForExperience(experience);
          levelSum += level;
          const next = level >= SKILL_LEVEL_CAP ? 'Mastered' : `${(experienceForLevel(level + 1) - experience).toLocaleString()} XP to level ${level + 1}`;
          return h('div', { className: 'skill-tile', title: `${SKILL_INFO[id].summary}\n${experience.toLocaleString()} XP · ${next}` },
            h('span', { className: 'skill-name' }, SKILL_INFO[id].name),
            h('span', { className: 'skill-level' }, String(level)),
            h('div', { className: 'skill-bar' }, h('span', { style: { width: `${levelProgress(experience) * 100}%` } })),
          );
        }),
      );
      total.textContent = `Total ${levelSum} · Rating ${self.operativeRating}`;
    },
  };
}
