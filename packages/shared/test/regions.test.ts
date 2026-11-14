import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { findOverworldIssues, findRegionIssues, homeRegionOf, overworldLevelOf, type GameContent } from '../src/index.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const withRegion = (id: string, hubDistrictId: string): GameContent => ({
  ...FIXTURE_CONTENT,
  regions: new Map([...FIXTURE_CONTENT.regions, [id, { id, name: id, hubDistrictId }]]),
});

const withDistrict = (districtId: string, change: object): GameContent => {
  const districts = new Map(FIXTURE_CONTENT.districts);
  districts.set(districtId, { ...districts.get(districtId)!, ...change });
  return { ...FIXTURE_CONTENT, districts };
};

describe('regions', () => {
  test('the hub region is home, and a second region is an outpost on the overworld', () => {
    assert.deepEqual(findRegionIssues(FIXTURE_CONTENT), []);
    assert.equal(homeRegionOf(FIXTURE_CONTENT), 'fx-home');
    const far = [...FIXTURE_CONTENT.districts.values()].filter((district) => district.region === 'fx-far').map((district) => district.id);
    assert.deepEqual(far, ['fx-outpost']);
    assert.equal(FIXTURE_CONTENT.levelOfDistrict.get('fx-outpost'), 'fx-floor');
  });

  test('an outpost away from home needs a locker, shopkeeper, mailbox and contract board', () => {
    assert.deepEqual(findRegionIssues(withRegion('elsewhere', 'fx-field')), [
      'Region "elsewhere": its hub district "fx-field" belongs to region "fx-home".',
      'Region "elsewhere": its outpost has no storage locker in a safe area.',
      'Region "elsewhere": its outpost has no shopkeeper in a safe area.',
      'Region "elsewhere": its outpost has no exchange mailbox in a safe area.',
      'Region "elsewhere": its outpost has no contract board in a safe area.',
    ]);
  });

  test('a hub district must exist and every district needs a known region', () => {
    assert.ok(findRegionIssues(withRegion('nowhere-region', 'nowhere')).includes('Region "nowhere-region": its hub district "nowhere" does not exist.'));
    assert.ok(findRegionIssues(withDistrict('fx-field', { region: 'atlantis' })).includes('District "fx-field" belongs to unknown region "atlantis".'));
  });
});

describe('overworld', () => {
  test('is the level holding the home hub, and every district on it can be walked to', () => {
    assert.equal(overworldLevelOf(FIXTURE_CONTENT)?.id, 'fx-floor');
    assert.deepEqual(findOverworldIssues(FIXTURE_CONTENT), []);
  });
});
