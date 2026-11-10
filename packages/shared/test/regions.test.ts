import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findOverworldIssues, findRegionIssues, GAME_CONTENT, homeRegionOf, overworldLevelOf, type GameContent } from '../src/index.ts';

const withRegion = (id: string, hubDistrictId: string): GameContent => ({
  ...GAME_CONTENT,
  regions: new Map([...GAME_CONTENT.regions, [id, { id, name: id, hubDistrictId }]]),
});

const withDistrict = (districtId: string, change: object): GameContent => {
  const districts = new Map(GAME_CONTENT.districts);
  districts.set(districtId, { ...districts.get(districtId)!, ...change });
  return { ...GAME_CONTENT, districts };
};

describe('regions', () => {
  test('every district is in the Meridian Core, the home region, centred on the Atrium', () => {
    assert.deepEqual(findRegionIssues(GAME_CONTENT), []);
    assert.equal(homeRegionOf(GAME_CONTENT), 'meridian-core');
    assert.ok([...GAME_CONTENT.districts.values()].every((district) => district.region === 'meridian-core'));
  });

  test('an outpost away from the core needs a locker, shopkeeper, mailbox and contract board', () => {
    assert.deepEqual(findRegionIssues(withRegion('calder', 'service-yards')), [
      'Region "calder": its hub district "service-yards" belongs to region "meridian-core".',
      'Region "calder": its outpost has no shopkeeper in a safe area.',
      'Region "calder": its outpost has no exchange mailbox in a safe area.',
      'Region "calder": its outpost has no contract board in a safe area.',
    ]);
  });

  test('a hub district must exist and every district needs a known region', () => {
    assert.ok(findRegionIssues(withRegion('vesper', 'nowhere')).includes('Region "vesper": its hub district "nowhere" does not exist.'));
    assert.ok(findRegionIssues(withDistrict('hydroponics', { region: 'atlantis' })).includes('District "hydroponics" belongs to unknown region "atlantis".'));
  });
});

describe('overworld', () => {
  test('is the main floor, and every district on it can be walked to except the tutorial wing', () => {
    assert.equal(overworldLevelOf(GAME_CONTENT)?.id, 'main-floor');
    assert.deepEqual(findOverworldIssues(GAME_CONTENT), []);
  });

  test('a district reached only by tram is reported unless it is marked as such', () => {
    assert.deepEqual(findOverworldIssues(withDistrict('intake-wing', { reachedOnlyByTram: false })), [
      'District "intake-wing" on the overworld cannot be reached on foot from the Site Meridian spawn.',
    ]);
  });
});
