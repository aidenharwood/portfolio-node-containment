import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { type GameContent } from '../src/index.ts';
import { auditDistrict, auditSeams, type AuditFinding } from '../src/world/audit.ts';
import type { DistrictDefinition } from '../src/world/district.ts';
import { buildDistrict, parseLayout } from '../src/world/layout.ts';
import type { DistrictLayout } from '../src/world/layoutSchema.ts';
import { FIXTURE_LAYOUTS } from './fixtures/world/districts.ts';
import { FIXTURE_CONTENT } from './fixtures/world/index.ts';

const FIXTURE = new URL('./fixtures/sample-layout.json', import.meta.url);
const sample = (): DistrictLayout => parseLayout(JSON.parse(readFileSync(FIXTURE, 'utf8')));

const withLayouts = (layouts: readonly DistrictLayout[]): GameContent => {
  const districts = new Map(FIXTURE_CONTENT.districts);
  for (const layout of layouts) districts.set(layout.id, buildDistrict(layout));
  return { ...FIXTURE_CONTENT, districts };
};

const kinds = (findings: readonly AuditFinding[], room: string): string[] => [...new Set(findings.filter((finding) => finding.room === room).map((finding) => finding.kind))].sort();

describe('auditDistrict', () => {
  test('a room with nothing in it is empty, dark and a lone dead end', () => {
    const base = sample();
    const layout = { ...base, dressing: {}, areas: base.areas.filter((area) => !('room' in area) || area.room !== 'side') };
    const findings = auditDistrict(withLayouts([layout]), 'sample-district', layout);
    assert.deepEqual(kinds(findings, 'side'), ['dark-room', 'dead-end', 'empty-room']);
  });

  test('a room crammed far beyond its neighbours is a density outlier', () => {
    const base = sample();
    const planters = Array.from({ length: 20 }, (_, index) => ({ id: `crammed-${index}`, object: 'planter', at: { room: 'side', dx: index % 5, dy: 3 + Math.floor(index / 5) } }));
    const layout: DistrictLayout = { ...base, dressing: {}, objects: [...base.objects, ...planters] };
    const findings = auditDistrict(withLayouts([layout]), 'sample-district', layout);
    assert.ok(findings.some((finding) => finding.kind === 'density' && finding.room === 'side'), JSON.stringify(findings));
  });

  test('a creature standing in a safe area is reported', () => {
    const base = sample();
    const layout: DistrictLayout = { ...base, creatures: [{ id: 'stray-mite', creature: 'gloam-mite', at: { room: 'hall', dx: 3, dy: 5 } }] };
    const findings = auditDistrict(withLayouts([layout]), 'sample-district', layout);
    assert.ok(findings.some((finding) => finding.kind === 'people' && finding.message.includes('stray-mite')));
  });

  test('a room under an area is lit by wall sconces', () => {
    const layout = { ...sample(), dressing: {} };
    const findings = auditDistrict(withLayouts([layout]), 'sample-district', layout);
    assert.equal(kinds(findings, 'side').includes('dark-room'), false);
  });

  test('rooms joined by shared floor are not dead ends', () => {
    const findings = auditDistrict(FIXTURE_CONTENT, 'fx-field', FIXTURE_LAYOUTS.get('fx-field'));
    assert.deepEqual(findings.filter((finding) => finding.kind === 'dead-end' && finding.message.includes('no way in')), []);
  });

  test('the hub plaza is not empty, dark or a dead end', () => {
    const findings = auditDistrict(FIXTURE_CONTENT, 'fx-hub', FIXTURE_LAYOUTS.get('fx-hub'));
    assert.deepEqual(kinds(findings, 'plaza').filter((kind) => kind === 'empty-room' || kind === 'dark-room' || kind === 'dead-end'), []);
  });
});

describe('auditSeams', () => {
  test('the fixture floor has matching seams', () => {
    assert.deepEqual(auditSeams(FIXTURE_CONTENT), []);
  });

  test('an exit narrower than the exit it meets is reported', () => {
    const sectorTwo = FIXTURE_CONTENT.districts.get('fx-field') as DistrictDefinition;
    const narrowed: DistrictDefinition = {
      ...sectorTwo,
      exits: Object.fromEntries(Object.entries(sectorTwo.exits ?? {}).map(([name, exit]) => [name, name === 'west' ? { ...exit, tiles: exit.tiles.slice(1) } : exit])),
    };
    const content: GameContent = { ...FIXTURE_CONTENT, districts: new Map([...FIXTURE_CONTENT.districts, ['fx-field', narrowed]]) };
    assert.ok(auditSeams(content).some((finding) => finding.kind === 'seam' && finding.message.includes('fx-field')));
  });
});
