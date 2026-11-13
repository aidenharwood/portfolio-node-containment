import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findFurnishingIssues, findSafetyIssues, GAME_CONTENT, objectiveAreas, objectiveObjectIds, type GameContent, type QuestLog } from '../src/index.ts';

const activeAt = (questId: string, stepIndex: number, objectiveCount = 1): QuestLog => ({
  [questId]: { questId, status: 'active', stepIndex, objectiveProgress: Array.from({ length: objectiveCount }, () => 0) },
});

const tutorialQuests = [...GAME_CONTENT.quests.values()].filter((quest) => quest.category === 'tutorial');

describe('world audit', () => {
  test('the shipped content keeps friendly NPCs in safe areas and creatures out of them', () => {
    assert.deepEqual(findSafetyIssues(GAME_CONTENT), []);
  });

  test('every district is furnished honestly', () => {
    assert.deepEqual(findFurnishingIssues(GAME_CONTENT), []);
  });

  test('the world decays with depth', () => {
    const conditions: Record<string, readonly string[]> = {
      pristine: ['meridian-atrium', 'vesper-lodge'],
      worn: ['meridian-circuit', 'service-concourse', 'service-yards', 'verdance-concourse', 'calder-gatehouse', 'deepwatch'],
      breached: ['intake-wing', 'sector-two', 'vesper-wards', 'vesper-pharmacy', 'vesper-causeway', 'calder-causeway', 'vesper-cellars'],
      overgrown: ['hydroponics'],
      flooded: ['waterworks', 'drowned-archive', 'undercroft', 'brine-galleries'],
      alien: ['deep-concourse', 'cryovault', 'signal-array', 'furnace', 'furnace-causeway', 'sector-three', 'salt-cathedral', 'calder-deeps'],
      uncanny: ['meridian-below', 'dead-letter-office', 'verdant-fold'],
    };
    for (const district of GAME_CONTENT.districts.values()) {
      const expected = Object.entries(conditions).find(([, ids]) => ids.includes(district.id))?.[0];
      assert.equal(district.condition, expected, district.id);
    }
  });

  test('an NPC outside a safe area on a floor level is reported', () => {
    const intake = GAME_CONTENT.districts.get('intake-wing');
    assert.ok(intake);
    const unsafe: GameContent = {
      ...GAME_CONTENT,
      districts: new Map([...GAME_CONTENT.districts, ['intake-wing', { ...intake, areas: intake.areas.map((area) => ({ ...area, safe: false })) }]]),
    };
    assert.ok(findSafetyIssues(unsafe).some((issue) => issue.includes('intake-reyes')));
  });

  test('every tutorial objective happens inside the Intake Wing, apart from the ride out', () => {
    for (const quest of tutorialQuests) {
      for (const step of quest.steps) {
        for (const objective of step.objectives) {
          if (objective.type === 'enterArea') {
            assert.ok(objective.districtId === 'intake-wing' || step.id === 'ride', `${quest.id}/${step.id}`);
            continue;
          }
          if (objective.type !== 'talkTo' && objective.type !== 'signal') continue;
          const npcId = objective.npcId;
          const homes = [...GAME_CONTENT.districts.values()].filter((district) => district.npcs.some((npc) => npc.npcId === npcId));
          assert.deepEqual(homes.map((district) => district.id), ['intake-wing'], `${quest.id}/${step.id}`);
        }
      }
    }
  });

  test('the tutorial chain covers gear, crafting, storage, combat, healing, trading and trams', () => {
    const objectives = tutorialQuests.flatMap((quest) => quest.steps.flatMap((step) => step.objectives));
    const types = new Set(objectives.map((objective) => objective.type));
    for (const type of ['talkTo', 'interactWith', 'equipItem', 'gather', 'craft', 'defeat', 'useItem', 'obtainItem', 'enterArea'] as const) {
      assert.ok(types.has(type), type);
    }
    const touched = new Set(objectives.flatMap((objective) => (objective.type === 'interactWith' ? [objective.objectId] : [])));
    for (const objectId of ['storage-locker', 'med-bed', 'tram-car-door']) assert.ok(touched.has(objectId), objectId);
  });

  test('area objectives produce beacons and object objectives produce rings', () => {
    assert.deepEqual(objectiveAreas(activeAt('orientation-protocol', 4), GAME_CONTENT.quests, null), [{ districtId: 'intake-wing', areaId: 'observation' }]);
    assert.deepEqual(objectiveAreas(activeAt('cleared-for-transit', 3), GAME_CONTENT.quests, null), [{ districtId: 'meridian-atrium', areaId: 'tram-terminal' }]);
    const tramRings = objectiveObjectIds(activeAt('cleared-for-transit', 2), GAME_CONTENT.quests, null, GAME_CONTENT.worldObjects);
    for (const objectId of ['tram-car-door', 'tram-car-window', 'tram-car-nose-left', 'tram-car-nose-right']) assert.ok(tramRings.has(objectId), objectId);
  });

  test('the Atrium hub has no hostile creatures or gathering nodes', () => {
    const atrium = GAME_CONTENT.districts.get('meridian-atrium');
    assert.ok(atrium);
    assert.equal(atrium.creatures?.length ?? 0, 0);
    const gathers = atrium.objects.filter((placement) => GAME_CONTENT.worldObjects.get(placement.objectId)?.interactions.some((interaction) => interaction.gather));
    assert.deepEqual(gathers, []);
    assert.ok(atrium.areas.every((area) => area.safe));
  });

  test('outside the tutorial, gathering nodes on the main floor sit in hostile territory', () => {
    for (const districtId of ['service-yards', 'hydroponics', 'sector-two']) {
      const district = GAME_CONTENT.districts.get(districtId);
      assert.ok(district);
      const safe = district.areas.filter((area) => area.safe);
      for (const placement of district.objects) {
        const gathers = GAME_CONTENT.worldObjects.get(placement.objectId)?.interactions.some((interaction) => interaction.gather);
        const inSafe = safe.some(({ rect }) => placement.position.x >= rect.x && placement.position.y >= rect.y && placement.position.x < rect.x + rect.width && placement.position.y < rect.y + rect.height);
        if (gathers) assert.ok(!inSafe, `${districtId}/${placement.instanceId}`);
      }
    }
  });

  test('every hub and outpost platform is on a tram line', () => {
    for (const stationId of ['intake-transit', 'atrium-transit', 'verdance-platform', 'yards-depot', 'deepwatch-platform']) {
      assert.ok((GAME_CONTENT.tram.stations.get(stationId)?.lineIds.length ?? 0) > 0, stationId);
    }
  });
});
