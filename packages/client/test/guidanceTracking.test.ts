import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GuidanceTracking, parseGuidanceTarget } from '../src/state/guidanceTracking.ts';

const isSlag = (id: string): boolean => id === 'slag-heap';

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('guidance target parsing', () => {
  test('reads a stored quest or resource target', () => {
    assert.deepEqual(parseGuidanceTarget('{"kind":"quest","questId":"scrap-run"}', null, isSlag), { kind: 'quest', questId: 'scrap-run' });
    assert.deepEqual(parseGuidanceTarget('{"kind":"resource","objectId":"slag-heap"}', null, isSlag), { kind: 'resource', objectId: 'slag-heap' });
  });

  test('migrates the legacy tracked quest', () => {
    assert.deepEqual(parseGuidanceTarget(null, 'scrap-run', isSlag), { kind: 'quest', questId: 'scrap-run' });
  });

  test('rejects malformed or unknown values', () => {
    for (const stored of ['not json', '{"kind":"resource","objectId":"nope"}', '{"kind":"x"}', '[]', 'null', '{"kind":"quest","questId":4}']) {
      assert.equal(parseGuidanceTarget(stored, null, isSlag), null, stored);
    }
  });
});

describe('guidance tracking', () => {
  test('tracking a quest replaces a resource and the reverse', () => {
    const storage = new MemoryStorage();
    Object.assign(globalThis, { localStorage: storage });
    const tracking = new GuidanceTracking(isSlag);
    tracking.bind('character-1');
    tracking.trackResource('slag-heap');
    assert.equal(tracking.questPreference(), false);
    tracking.trackQuest('scrap-run');
    assert.equal(tracking.resourceId, null);
    assert.equal(tracking.questId, 'scrap-run');
    assert.equal(tracking.questPreference(), 'scrap-run');
    assert.deepEqual(JSON.parse(storage.getItem('containment.guidance.character-1') ?? 'null'), { kind: 'quest', questId: 'scrap-run' });
    tracking.trackResource('slag-heap');
    assert.equal(tracking.questId, null);
    assert.equal(tracking.questPreference(), false);
    tracking.untrack();
    assert.equal(tracking.questPreference(), null);
    assert.equal(storage.getItem('containment.guidance.character-1'), null);
  });

  test('bind restores the stored target for that character', () => {
    const storage = new MemoryStorage();
    storage.setItem('containment.trackedQuest.character-2', 'scrap-run');
    Object.assign(globalThis, { localStorage: storage });
    const tracking = new GuidanceTracking(isSlag);
    tracking.bind('character-2');
    assert.equal(tracking.questId, 'scrap-run');
  });

  test('untracking forgets the legacy quest so it does not return on the next bind', () => {
    const storage = new MemoryStorage();
    storage.setItem('containment.trackedQuest.character-3', 'scrap-run');
    Object.assign(globalThis, { localStorage: storage });
    new GuidanceTracking(isSlag).bind('character-3');
    const first = new GuidanceTracking(isSlag);
    first.bind('character-3');
    first.untrack();
    const second = new GuidanceTracking(isSlag);
    second.bind('character-3');
    assert.equal(second.target, null);
  });
});
