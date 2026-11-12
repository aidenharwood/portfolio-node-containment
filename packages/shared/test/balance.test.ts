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

describe('act two difficulty curve', () => {
  const at = (level: number, style: 'closeQuarters' | 'marksmanship' = 'closeQuarters') =>
    createStartingSkills({ [style]: experienceForLevel(level), fortitude: experienceForLevel(level) });
  const kits: Record<string, EquipmentState> = {
    undercroft: { torso: 'composite-plate', eyes: 'filter-respirator', primary: 'shock-maul', head: 'response-helmet', hands: 'thornweave-gloves', legs: 'intake-trousers', feet: 'work-boots' },
    rimeguard: { torso: 'rimeguard-plate', eyes: 'filter-respirator', primary: 'cryo-maul', head: 'rimeguard-helm', hands: 'rimeguard-gauntlets', legs: 'rimeguard-greaves', feet: 'rimeguard-boots' },
    relay: { torso: 'relay-vest', eyes: 'choir-visor', primary: 'arc-baton', head: 'relay-helm', hands: 'relay-gloves', legs: 'relay-trousers', feet: 'relay-boots' },
    archive: { torso: 'archivist-coat', eyes: 'choir-visor', primary: 'censor-maul', head: 'inkproof-helm', hands: 'vellum-gloves', legs: 'ink-trousers', feet: 'ink-boots' },
    furnace: { torso: 'furnace-plate', eyes: 'furnace-respirator', primary: 'stoker-maul', head: 'furnace-helm', hands: 'furnace-gauntlets', legs: 'furnace-greaves', feet: 'furnace-boots' },
    threshold: { torso: 'threshold-plate', eyes: 'furnace-respirator', primary: 'the-knocker', head: 'threshold-helm', hands: 'threshold-gloves', legs: 'threshold-trousers', feet: 'threshold-boots' },
    dispatch: { torso: 'dispatch-plate', eyes: 'sorter-visor', primary: 'franking-hammer', head: 'dispatch-helm', hands: 'dispatch-gloves', legs: 'dispatch-trousers', feet: 'dispatch-boots' },
  };
  const rate = (level: number, kit: string, creature: string) => duelWinRate(at(level), kits[kit]!, creature);

  test('each deep zone opens fairly for an operative in the previous tier of gear', () => {
    assert.ok(rate(11, 'undercroft', 'frost-moth') >= 0.85);
    assert.ok(rate(15, 'rimeguard', 'relay-sentinel') >= 0.75);
    assert.ok(rate(19, 'relay', 'ink-eel') >= 0.75);
    assert.ok(rate(24, 'archive', 'cinder-wisp') >= 0.7);
    assert.ok(rate(30, 'furnace', 'hollow-operative') >= 0.75);
  });

  test('regular deep creatures are reliable once trained into their own tier of gear', () => {
    assert.ok(rate(13, 'rimeguard', 'rime-husk') >= 0.88);
    assert.ok(rate(17, 'relay', 'echo-operator') >= 0.85);
    assert.ok(rate(22, 'archive', 'redactor') >= 0.85);
    assert.ok(rate(27, 'furnace', 'slag-golem') >= 0.85);
    assert.ok(rate(31, 'threshold', 'knockling') >= 0.85);
  });

  test('upgrading gear matters: last tier\'s kit struggles against the next tier\'s regulars', () => {
    assert.ok(rate(17, 'rimeguard', 'echo-operator') < 0.6);
    assert.ok(rate(26, 'archive', 'slag-golem') < 0.75);
  });

  test('every act two boss is a real fight for a ready operative and hopeless for an unready one', () => {
    const bosses: [string, number, string, number, string][] = [
      ['the-curator', 14, 'rimeguard', 12, 'undercroft'],
      ['the-choir', 19, 'relay', 16, 'rimeguard'],
      ['last-archivist', 24, 'archive', 20, 'relay'],
      ['the-stoker', 29, 'furnace', 25, 'archive'],
      ['the-host', 34, 'threshold', 30, 'furnace'],
    ];
    for (const [boss, readyLevel, readyKit, earlyLevel, earlyKit] of bosses) {
      const ready = rate(readyLevel, readyKit, boss);
      const early = rate(earlyLevel, earlyKit, boss);
      assert.ok(ready >= 0.5 && ready <= 0.85, `${boss} ready ${ready}`);
      assert.ok(early < 0.3, `${boss} early ${early}`);
    }
  });

  test('the Dead Letter Office suits a threshold-kitted operative past the Host', () => {
    assert.ok(rate(34, 'threshold', 'franking-clerk') >= 0.85);
    assert.ok(rate(35, 'threshold', 'courier-echo') >= 0.85);
    assert.ok(rate(34, 'furnace', 'courier-echo') < 0.75);
    const ready = rate(38, 'threshold', 'the-postmaster');
    const early = rate(33, 'threshold', 'the-postmaster');
    const ranged = duelWinRate(at(38, 'marksmanship'), { ...kits.threshold!, primary: 'last-word' }, 'the-postmaster');
    assert.ok(ready >= 0.5 && ready <= 0.85, `postmaster ready ${ready}`);
    assert.ok(ranged >= 0.5 && ranged <= 0.9, `postmaster ranged ${ranged}`);
    assert.ok(early < 0.3, `postmaster early ${early}`);
  });

  test('Dispatch gear crafted from the Office is a real upgrade without trivialising the Postmaster', () => {
    assert.ok(rate(36, 'dispatch', 'courier-echo') >= 0.9);
    const threshold = rate(38, 'threshold', 'the-postmaster');
    const dispatch = rate(38, 'dispatch', 'the-postmaster');
    const ranged = duelWinRate(at(38, 'marksmanship'), { ...kits.dispatch!, primary: 'return-to-sender' }, 'the-postmaster');
    assert.ok(dispatch > threshold, `dispatch ${dispatch} vs threshold ${threshold}`);
    assert.ok(dispatch <= 0.92, `postmaster in dispatch ${dispatch}`);
    assert.ok(ranged >= 0.6 && ranged <= 0.92, `postmaster ranged in dispatch ${ranged}`);
  });

  test('every weapon variant fights its boss about as well as the weapon it is based on', () => {
    const pairs: [string, number, 'closeQuarters' | 'marksmanship', string, string, string][] = [
      ['the-curator', 14, 'closeQuarters', 'rimeguard', 'cryo-maul', 'cryo-hammer'],
      ['the-curator', 14, 'closeQuarters', 'rimeguard', 'rime-shiv', 'rime-dirk'],
      ['the-curator', 14, 'marksmanship', 'rimeguard', 'rime-carbine', 'rime-flechette'],
      ['the-choir', 19, 'closeQuarters', 'relay', 'arc-baton', 'arc-mace'],
      ['the-choir', 19, 'marksmanship', 'relay', 'arc-carbine', 'arc-stutter'],
      ['last-archivist', 24, 'closeQuarters', 'archive', 'censor-maul', 'censor-gavel'],
      ['last-archivist', 24, 'marksmanship', 'archive', 'inkshot-pistol', 'inkshot-revolver'],
      ['the-stoker', 29, 'closeQuarters', 'furnace', 'stoker-maul', 'stoker-shovel'],
      ['the-stoker', 29, 'marksmanship', 'furnace', 'cinder-carbine', 'cinder-sprayer'],
      ['the-host', 34, 'closeQuarters', 'threshold', 'the-knocker', 'the-rapper'],
      ['the-host', 34, 'marksmanship', 'threshold', 'farsight-rifle', 'nearsight-rifle'],
      ['the-postmaster', 38, 'closeQuarters', 'dispatch', 'franking-hammer', 'franking-stamp-hammer'],
      ['the-postmaster', 38, 'marksmanship', 'dispatch', 'return-to-sender', 'express-delivery'],
    ];
    for (const [boss, level, style, kit, base, variant] of pairs) {
      const original = duelWinRate(at(level, style), { ...kits[kit]!, primary: base }, boss);
      const alternative = duelWinRate(at(level, style), { ...kits[kit]!, primary: variant }, boss);
      assert.ok(Math.abs(original - alternative) <= 0.15, `${variant} ${alternative} vs ${base} ${original} against ${boss}`);
    }
  });

  test('melee and ranged training reach every boss on comparable terms', () => {
    const ranged: [string, number, EquipmentState][] = [
      ['the-curator', 14, { ...kits.rimeguard!, primary: 'rime-carbine' }],
      ['the-choir', 19, { ...kits.relay!, primary: 'arc-carbine' }],
      ['the-stoker', 29, { ...kits.furnace!, primary: 'cinder-carbine' }],
      ['the-host', 34, { ...kits.threshold!, primary: 'last-word' }],
    ];
    for (const [boss, level, kit] of ranged) {
      const winRate = duelWinRate(at(level, 'marksmanship'), kit, boss);
      assert.ok(winRate >= 0.5 && winRate <= 0.9, `${boss} ranged ${winRate}`);
    }
  });
});
