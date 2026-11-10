import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findSiteIssues, GAME_CONTENT, homeSiteOf, type GameContent } from '../src/index.ts';

const withSite = (id: string, hubDistrictId: string): GameContent => ({
  ...GAME_CONTENT,
  sites: new Map([...GAME_CONTENT.sites, [id, { id, name: `Site ${id}`, hubDistrictId }]]),
});

describe('sites', () => {
  test('every level belongs to Site Meridian, which is the home Site', () => {
    assert.deepEqual(findSiteIssues(GAME_CONTENT), []);
    assert.equal(homeSiteOf(GAME_CONTENT), 'meridian');
    assert.ok([...GAME_CONTENT.levels.values()].every((level) => level.definition.site === 'meridian'));
  });

  test('a Site away from home needs its own floor, hub, mailbox and relay', () => {
    assert.deepEqual(findSiteIssues(withSite('calder', 'hydroponics')), [
      'Site "calder": it has no floor level.',
      'Site "calder": its hub district "hydroponics" is not on one of its levels.',
      'Site "calder": its hub has no exchange mailbox in a safe area.',
      'Site "calder": no relay from another Site arrives on any of its levels.',
    ]);
  });

  test('a hub district must exist', () => {
    assert.ok(findSiteIssues(withSite('vesper', 'nowhere')).includes('Site "vesper": its hub district "nowhere" does not exist.'));
  });
});
