import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '../src/content/gameContent.ts';
import { LAYOUT_SOURCES } from '../src/content/districts/layouts/index.ts';
import { findLandPlanIssues } from '../src/content/landIntegrity.ts';
import { parseTileLayout } from '../src/world/district.ts';
import { CARDINAL_OFFSETS, type TilePoint } from '../src/world/geometry.ts';
import type { LandMap } from '../src/world/landPlan.ts';
import { parseLayout } from '../src/world/layout.ts';
import { isWalkableTile } from '../src/world/tiles.ts';

const land = GAME_CONTENT.lands.get('hinterland') as LandMap;
const LOW_WARD = 'low-ward';

const LOW_WARD_SQUARES: Readonly<Record<string, TilePoint>> = {
  'terminus-square': { x: 128, y: 320 },
  tenements: { x: 128, y: 256 },
  'market-row': { x: 192, y: 256 },
  'canal-basin': { x: 192, y: 320 },
  'laundry-gardens': { x: 128, y: 384 },
  'the-cut': { x: 192, y: 384 },
  scrapyards: { x: 256, y: 256 },
  'shipyard-fringe': { x: 256, y: 320 },
  'cordon-gate': { x: 320, y: 320 },
};

const LOW_WARD_EXITS: Readonly<Record<string, { readonly side: TilePoint; readonly ward: string }>> = {
  'cordon-gate': { side: { x: 1, y: 0 }, ward: 'old-shipyards' },
  'the-cut': { side: { x: 0, y: 1 }, ward: 'tidemarsh' },
};

const CROSSINGS: Readonly<Record<string, readonly [string, string]>> = {
  'the-incline': ['old-shipyards', 'the-heights'],
  'west-gate': ['old-shipyards', 'old-town'],
  causeway: ['tidemarsh', 'old-town'],
  viaduct: ['the-heights', 'ironside'],
  floodgate: ['old-town', 'drowned-quarter'],
  seawall: ['drowned-quarter', 'the-lantern'],
  'blight-road': ['ironside', 'the-lantern'],
  'crater-rim': ['the-lantern', 'the-blight'],
};

const gateTiles = new Set(Object.values(land.gates).flatMap((tiles) => tiles.map((tile) => tile.y * land.width + tile.x)));
const walkable = (point: TilePoint): boolean => isWalkableTile(land, point);
const open = (point: TilePoint): boolean =>
  point.x >= 0 && point.y >= 0 && point.x < land.width && point.y < land.height && walkable(point) && !gateTiles.has(point.y * land.width + point.x) && land.wardAt(point) !== LOW_WARD;

test('the Hinterland land plan draws clean', () => {
  assert.equal(land.width, 768);
  assert.equal(land.height, 640);
  assert.deepEqual(findLandPlanIssues(land), []);
});

test('walkable Hinterland land never meets the edge of the plan', () => {
  for (let x = 0; x < land.width; x++) {
    for (const y of [0, land.height - 1]) assert.equal(walkable({ x, y }), false, `${x},${y}`);
  }
  for (let y = 0; y < land.height; y++) {
    for (const x of [0, land.width - 1]) assert.equal(walkable({ x, y }), false, `${x},${y}`);
  }
});

test('every ward of the Hinterland is sealed with its gates shut', () => {
  const seen = new Uint8Array(land.width * land.height);
  const leaks: string[] = [];
  for (let start = 0; start < land.width * land.height; start++) {
    const first = { x: start % land.width, y: Math.floor(start / land.width) };
    if (seen[start] === 1 || !open(first)) continue;
    const ward = land.wardAt(first);
    if (ward === undefined) leaks.push(`walkable land at ${first.x},${first.y} has no ward`);
    seen[start] = 1;
    const queue = [first];
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head] as TilePoint;
      if (land.wardAt(at) !== ward) {
        leaks.push(`${ward} reaches ${land.wardAt(at)} at ${at.x},${at.y}`);
        break;
      }
      for (const offset of CARDINAL_OFFSETS) {
        const next = { x: at.x + offset.x, y: at.y + offset.y };
        if (!open(next) || seen[next.y * land.width + next.x] === 1) continue;
        seen[next.y * land.width + next.x] = 1;
        queue.push(next);
      }
    }
  }
  assert.deepEqual(leaks, []);
});

test('every Hinterland gate joins the two wards of its crossing', () => {
  assert.deepEqual(Object.keys(land.gates).sort(), Object.keys(CROSSINGS).sort());
  for (const [gate, tiles] of Object.entries(land.gates)) {
    const wards = new Set<string>();
    for (const tile of tiles) {
      for (const offset of CARDINAL_OFFSETS) {
        const next = { x: tile.x + offset.x, y: tile.y + offset.y };
        const ward = land.wardAt(next);
        if (open(next) && ward !== undefined) wards.add(ward);
      }
    }
    assert.deepEqual([...wards].sort(), [...(CROSSINGS[gate] as readonly string[])].sort(), gate);
  }
});

test('the Low Ward squares are Low Ward land, met by other wards only at the Cordon gate and the sluice', () => {
  for (const origin of Object.values(LOW_WARD_SQUARES)) {
    for (let y = origin.y; y < origin.y + 64; y++) {
      for (let x = origin.x; x < origin.x + 64; x++) assert.equal(land.wardAt({ x, y }), LOW_WARD, `${x},${y}`);
    }
  }
  const inLowWard = (point: TilePoint): boolean => land.wardAt(point) === LOW_WARD;
  const exits = new Map<string, number>();
  for (const [districtId, origin] of Object.entries(LOW_WARD_SQUARES)) {
    const district = GAME_CONTENT.districts.get(districtId);
    assert.ok(district, districtId);
    const layout = parseTileLayout(district.map, district.heights);
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) {
        if (!isWalkableTile(layout, { x, y })) continue;
        for (const offset of CARDINAL_OFFSETS) {
          const outside = { x: origin.x + x + offset.x, y: origin.y + y + offset.y };
          if (inLowWard(outside) || !walkable(outside)) continue;
          const exit = LOW_WARD_EXITS[districtId];
          const through = exit !== undefined && exit.side.x === offset.x && exit.side.y === offset.y;
          assert.ok(through, `${land.wardAt(outside)} land at ${outside.x},${outside.y} meets ${districtId} away from its exits`);
          assert.equal(land.wardAt(outside), exit.ward, `${outside.x},${outside.y}`);
          assert.ok(Math.abs(land.heightAt(outside) - layout.heightAt({ x, y })) <= 1, `the land at ${outside.x},${outside.y} is a cliff beside ${districtId}`);
          exits.set(districtId, (exits.get(districtId) ?? 0) + 1);
        }
      }
    }
  }
  assert.deepEqual([...exits.keys()].sort(), Object.keys(LOW_WARD_EXITS).sort());
});

test('the overworld is the Hinterland, with the Low Ward pinned so Terminus Square starts at 128,320', () => {
  const overworld = GAME_CONTENT.levels.get('overworld');
  assert.ok(overworld);
  assert.equal(overworld.definition.land?.plan.id, 'hinterland');
  for (const [districtId, origin] of Object.entries(LOW_WARD_SQUARES)) {
    assert.deepEqual(overworld.definition.districts.find((placement) => placement.districtId === districtId)?.origin, origin, districtId);
  }
  for (const placement of overworld.definition.districts) {
    const square = GAME_CONTENT.districts.get(placement.districtId)?.square;
    if (square) assert.deepEqual(placement.origin, { x: square.column * 64, y: square.row * 64 }, placement.districtId);
  }
  for (const region of GAME_CONTENT.regions.values()) assert.equal(GAME_CONTENT.levelOfDistrict.get(region.hubDistrictId), 'overworld', region.id);
});

test('the Old Shipyards town squares, Site, outpost and Incline foot are blocked out round their landmarks', () => {
  const landmarks: Readonly<Record<string, string>> = {
    'slipway-row': 'beached-hull',
    'shipwrights-hard': 'boiler-stack',
    'graving-docks': 'dock-pump',
    'dry-dock-four': 'gantry-crane',
    'gatehouse-yard': 'flood-mast',
    'incline-foot': 'incline-winder',
  };
  const town = ['slipway-row', 'shipwrights-hard', 'graving-docks', 'dry-dock-four'];
  for (const [id, landmark] of Object.entries(landmarks)) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.objects.some((object) => object.object === landmark), `${id} has no ${landmark}`);
    if (town.includes(id)) assert.ok(layout.steps.filter((step) => step.kind === 'building').length >= 4, `${id} has too few buildings for a town square`);
  }
});

test('Tidemarsh has a stilt village, its Site on piles, an outpost by the sluice and the causeway, each round its landmark', () => {
  const landmarks: Readonly<Record<string, string>> = {
    stiltholm: 'tide-bell',
    'tide-station': 'tide-gauge',
    brinehouse: 'windpump',
    'causeway-end': 'causeway-gate-leaf',
  };
  for (const [id, landmark] of Object.entries(landmarks)) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.objects.some((object) => object.object === landmark), `${id} has no ${landmark}`);
  }
  const village = parseLayout(LAYOUT_SOURCES.stiltholm);
  assert.ok(village.steps.filter((step) => step.kind === 'building').length >= 8, 'Stiltholm has too few buildings for a village');
  assert.ok(village.steps.some((step) => step.kind === 'patch' && step.tile === 'boards'), 'Stiltholm has no boardwalks');
});

test('the Heights have an uptown on the ridge, the Spire, Upper Station at the Incline top and the viaduct end, each round its landmark', () => {
  const landmarks: Readonly<Record<string, string>> = {
    'north-parade': 'ridge-beacon',
    'crescent-walk': 'crescent-screen',
    uptown: 'exchange-clock',
    'the-spire': 'directorate-spire',
    'upper-station': 'incline-sheave',
    'railway-cutting': 'viaduct-gate-leaf',
  };
  const town = ['north-parade', 'crescent-walk', 'uptown'];
  for (const [id, landmark] of Object.entries(landmarks)) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.objects.some((object) => object.object === landmark), `${id} has no ${landmark}`);
    if (town.includes(id)) assert.ok(layout.steps.filter((step) => step.kind === 'building').length >= 6, `${id} has too few buildings for a town square`);
  }
});

test('nothing built on the ridge edge stands within six tiles of the drop, so the view to the river stays open', () => {
  for (const id of ['cliff-gardens', 'upper-station', 'belgrave-terrace']) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.square, id);
    const origin = { x: layout.square.column * 64, y: layout.square.row * 64 };
    for (const step of layout.steps) {
      if (step.kind !== 'building') continue;
      for (let y = step.rect.y - 7; y <= step.rect.y + step.rect.height + 6; y++) {
        for (let x = step.rect.x - 7; x <= step.rect.x + step.rect.width + 6; x++) {
          assert.ok(land.heightAt({ x: origin.x + x, y: origin.y + y }) >= 6, `${id} building ${step.id} stands near the drop at ${x},${y}`);
        }
      }
    }
  }
});

test('Old Town is a walled city astride the river round its cathedral, with the Hostel inside the west gate and Gallows Hill outside the east wall, each round its landmark', () => {
  const landmarks: Readonly<Record<string, string>> = {
    westgate: 'gate-clock',
    'cathedral-close': 'bell-tower',
    wallside: 'wall-tower',
    'east-wall': 'town-pump',
    'floodgate-street': 'floodgate-winch',
    'moat-bank': 'tannery-stack',
    'water-gate': 'wharf-crane',
    'gallows-green': 'gibbet',
    'gallows-top': 'gallows',
  };
  const town = ['westgate', 'cathedral-close', 'east-wall', 'floodgate-street'];
  let bridges = 0;
  for (const [id, landmark] of Object.entries(landmarks)) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.square, id);
    assert.equal(layout.region, 'old-town', id);
    assert.ok(layout.objects.some((object) => object.object === landmark), `${id} has no ${landmark}`);
    if (town.includes(id)) assert.ok(layout.steps.filter((step) => step.kind === 'building').length >= 4, `${id} has too few buildings for a town square`);
    const origin = { x: layout.square.column * 64, y: layout.square.row * 64 };
    for (const step of layout.steps) {
      if (step.kind !== 'patch' || step.tile !== 'boards') continue;
      let water = false;
      for (let y = step.rect.y; y < step.rect.y + step.rect.height; y++) {
        for (let x = step.rect.x; x < step.rect.x + step.rect.width; x++) if (land.tileAt({ x: origin.x + x, y: origin.y + y }) === 'water') water = true;
      }
      if (water) bridges++;
    }
  }
  assert.ok(bridges >= 3, `Old Town has ${bridges} bridge spans over the river`);
  const close = parseLayout(LAYOUT_SOURCES['cathedral-close']);
  for (const room of ['cathedral-precinct', 'hollow-bay-cathedral', 'ossuary-stair', 'ossuary-holding']) {
    assert.ok(close.steps.some((step) => step.kind === 'building' && step.id === room), `Cathedral Close has no ${room}`);
  }
  assert.ok(close.objects.some((object) => object.object === 'ossuary-lift'), 'the Ossuary lift is missing');
  const westgate = parseLayout(LAYOUT_SOURCES.westgate);
  const outpost = westgate.anchors.outpost;
  assert.ok(outpost && 'room' in outpost, 'Westgate has no outpost anchor');
  assert.equal(outpost.room, 'the-hostel');
});
