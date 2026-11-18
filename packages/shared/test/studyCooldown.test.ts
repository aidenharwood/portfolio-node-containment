import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GAME_CONTENT, REPEAT_STUDY_COOLDOWN_TICKS, STANDARD_TICK_MS, studyExperience } from '../src/index.ts';

const ANALYSIS = 40;
const TICKS_PER_HOUR = 3_600_000 / STANDARD_TICK_MS;

describe('repeat study cooldown', () => {
  test('the note ceiling at Analysis 40 stays near rotating the best trace nodes', () => {
    const noteCeiling =
      (TICKS_PER_HOUR / REPEAT_STUDY_COOLDOWN_TICKS) *
      Math.max(...[...GAME_CONTENT.creatures.values()].filter((creature) => creature.level <= ANALYSIS).map((creature) => studyExperience(creature, false)));
    const placedInBusiestDistrict = (objectId: string) =>
      Math.max(0, ...[...GAME_CONTENT.districts.values()].map((district) => district.objects.filter((object) => object.objectId === objectId).length));
    const traceRates = [...GAME_CONTENT.worldObjects.values()].flatMap((object) =>
      object.interactions.flatMap((interaction) => {
        const gather = interaction.gather;
        if (!gather || gather.skill !== 'research' || gather.level > ANALYSIS) return [];
        const workTicks = gather.charges * gather.attemptTicks;
        const cycleTicks = workTicks + gather.respawnTicks;
        const rotation = Math.min(placedInBusiestDistrict(object.id), cycleTicks / workTicks);
        return [(gather.experience * gather.charges * rotation * TICKS_PER_HOUR) / cycleTicks];
      }),
    );
    const bestTrace = Math.max(...traceRates);
    assert.ok(bestTrace > 0);
    assert.ok(noteCeiling <= bestTrace * 1.2, `notes ${Math.round(noteCeiling)}/h vs trace ${Math.round(bestTrace)}/h`);
  });
});
