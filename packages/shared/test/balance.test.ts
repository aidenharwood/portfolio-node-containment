import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  createStartingSkills,
  creatureAttackProfile,
  defeatExperience,
  deriveCombatProfile,
  equipmentStats,
  experienceForLevel,
  GAME_CONTENT,
  levelForExperience,
  maxIntegrityFor,
  playerAttackProfile,
  rollAttack,
  type EquipmentState,
  type SkillExperience,
} from '../src/index.ts';

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function duelWinRate(skills: SkillExperience, equipment: EquipmentState, creatureId: string, trials = 400): number {
  const creature = GAME_CONTENT.creatures.get(creatureId);
  assert.ok(creature);
  const attack = playerAttackProfile(skills, equipment, GAME_CONTENT.items);
  const defence = deriveCombatProfile(skills, equipmentStats(equipment, GAME_CONTENT.items)).defence;
  const enemy = creatureAttackProfile(creature);
  let wins = 0;
  for (let trial = 0; trial < trials; trial++) {
    const random = seededRandom(trial + 1);
    let playerIntegrity = maxIntegrityFor(skills);
    let creatureIntegrity = creature.integrity;
    for (let tick = 0; playerIntegrity > 0 && creatureIntegrity > 0; tick++) {
      if (tick % attack.speedTicks === 0) creatureIntegrity -= rollAttack(attack, creature.defence, random).damage;
      if (creatureIntegrity > 0 && tick % enemy.speedTicks === 0) playerIntegrity -= rollAttack(enemy, defence, random).damage;
    }
    if (creatureIntegrity <= 0) wins++;
  }
  return wins / trials;
}

const experienceAlongStoryline = (): SkillExperience => {
  const drones = 3 * (6 * 4 + defeatExperience('melee', 10)[0]!.amount);
  const mites = 4 * (8 * 4 + defeatExperience('melee', 22)[0]!.amount);
  const closeQuarters = 150 + drones + mites + 220;
  const fortitude = 100 + 3 * (8 + 3) + 4 * (11 + 7) + 160;
  return createStartingSkills({ closeQuarters, fortitude });
};

describe('difficulty curve', () => {
  const issued: EquipmentState = { torso: 'field-vest-mk1', eyes: 'hazard-visor', primary: 'stun-baton', legs: 'intake-trousers', feet: 'work-boots' };

  test('the storyline grants enough training to reach the recommended rating before the warden', () => {
    const skills = experienceAlongStoryline();
    assert.ok(levelForExperience(skills.closeQuarters) >= 4, `close quarters ${levelForExperience(skills.closeQuarters)}`);
    assert.ok(levelForExperience(skills.fortitude) >= 3, `fortitude ${levelForExperience(skills.fortitude)}`);
  });

  test('a player who followed the storyline usually beats the Hollow Warden without healing', () => {
    const winRate = duelWinRate(experienceAlongStoryline(), issued, 'hollow-warden');
    assert.ok(winRate >= 0.7, `win rate ${winRate}`);
  });

  test('gloam mites are a fair fight straight out of Live Fire', () => {
    const afterLiveFire = createStartingSkills({ closeQuarters: 150 + 3 * 34, fortitude: 100 + 33 });
    assert.ok(duelWinRate(afterLiveFire, issued, 'gloam-mite') >= 0.95);
  });

  test('the Undercroft opens gently: leeches and lone hounds are fair right after The Knocking', () => {
    const postKnocking = createStartingSkills({ closeQuarters: 1078, fortitude: 412 });
    assert.ok(duelWinRate(postKnocking, issued, 'pipe-leech') >= 0.95);
    assert.ok(duelWinRate(postKnocking, issued, 'rust-hound') >= 0.75);
  });

  test('the Foreman demands training and Undercroft gear', () => {
    const fresh = createStartingSkills({ closeQuarters: 1078, fortitude: 412 });
    const ready = createStartingSkills({ closeQuarters: experienceForLevel(8), fortitude: experienceForLevel(8) });
    const outfitted: EquipmentState = {
      torso: 'composite-plate',
      eyes: 'filter-respirator',
      primary: 'shock-maul',
      head: 'response-helmet',
      hands: 'containment-gloves',
      legs: 'intake-trousers',
      feet: 'work-boots',
    };
    assert.ok(duelWinRate(fresh, issued, 'the-foreman') < 0.1);
    assert.ok(duelWinRate(ready, issued, 'the-foreman') < 0.5);
    assert.ok(duelWinRate(ready, outfitted, 'the-foreman') >= 0.6);
  });

  test('Verdance Hydroponics suits operatives between Sector 2 and the Undercroft', () => {
    const fresh = createStartingSkills({ closeQuarters: 150 + 3 * 34, fortitude: 100 + 33 });
    const afterWarden = experienceAlongStoryline();
    const rates = {
      crawlerFresh: duelWinRate(fresh, issued, 'thorn-crawler'),
      crawler: duelWinRate(afterWarden, issued, 'thorn-crawler'),
      drifter: duelWinRate(afterWarden, issued, 'spore-drifter'),
    };
    assert.ok(rates.crawlerFresh >= 0.6 && rates.crawlerFresh < 0.85, JSON.stringify(rates));
    assert.ok(rates.crawler >= 0.9, JSON.stringify(rates));
    assert.ok(rates.drifter >= 0.7 && rates.drifter < 0.9, JSON.stringify(rates));
  });

  test('static wraiths stay dangerous for a fresh operative', () => {
    assert.ok(duelWinRate(experienceAlongStoryline(), issued, 'static-wraith') < 0.6);
  });
});
