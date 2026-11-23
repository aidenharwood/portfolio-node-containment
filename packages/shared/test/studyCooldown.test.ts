import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { REPEAT_STUDY_COOLDOWN_TICKS, STUDY_TICKS } from '../src/index.ts';
import { bestMethod, gatherMethods, studyMethods } from './pacingModel.ts';

const ANALYSIS = 40;

describe('repeat study cooldown', () => {
  test('the cooldown outlasts a study, so notes need fresh specimens and cannot be spammed', () => {
    assert.ok(REPEAT_STUDY_COOLDOWN_TICKS > STUDY_TICKS * 4);
  });

  test('the note ceiling at Analysis 40 stays near the best trace node', () => {
    const notes = bestMethod(studyMethods(), ANALYSIS);
    const trace = bestMethod(gatherMethods('research'), ANALYSIS);
    assert.ok(notes && trace);
    assert.ok(notes.perTick <= trace.perTick * 1.6, `notes ${notes.perTick.toFixed(3)} a tick against trace ${trace.perTick.toFixed(3)}`);
  });
});
