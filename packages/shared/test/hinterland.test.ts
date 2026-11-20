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

test('Ironside is industry at the falls, with the Bellows compound, Shift House at the viaduct end and its stacks over Furnace Row, each round its landmark', () => {
  const landmarks: Readonly<Record<string, string>> = {
    railhead: 'coaling-gantry',
    bellows: 'cooling-tower',
    'furnace-row': 'ironside-stack',
    'the-falls': 'penstock-gate',
  };
  const town = ['railhead', 'bellows', 'furnace-row'];
  let bridges = 0;
  for (const id of [...Object.keys(landmarks), 'mountain-foot', 'gorge-top', 'spoil-heaps', 'slag-gate']) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.square, id);
    assert.equal(layout.region, 'ironside', id);
    const landmark = landmarks[id];
    if (landmark) assert.ok(layout.objects.some((object) => object.object === landmark), `${id} has no ${landmark}`);
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
  assert.ok(bridges >= 2, `Ironside has ${bridges} bridges over the river`);
  const furnaceRow = parseLayout(LAYOUT_SOURCES['furnace-row']);
  assert.ok(furnaceRow.objects.filter((object) => object.object === 'ironside-stack').length >= 3, 'Furnace Row has too few stacks');
  const stack = GAME_CONTENT.worldObjects.get('ironside-stack');
  assert.ok(stack, 'the Ironside stack is not defined');
  for (const object of GAME_CONTENT.worldObjects.values()) {
    if (object.id !== 'ironside-stack') assert.ok((object.modelScale ?? 1) < (stack.modelScale ?? 1) || object.model !== 'chimney', `${object.id} stands as tall as the Ironside stacks`);
  }
  assert.ok((stack.modelScale ?? 1) >= 2.5, 'the Ironside stacks are too short to be seen from the crossroads');
  const bellows = parseLayout(LAYOUT_SOURCES.bellows);
  for (const room of ['bellows-station', 'turbine-hall', 'bellows-control']) {
    assert.ok(bellows.steps.some((step) => step.kind === 'building' && step.id === room), `Bellows has no ${room}`);
  }
  assert.ok(bellows.objects.some((object) => object.object === 'bellows-lift'), 'the Bellows lift is missing');
  const railhead = parseLayout(LAYOUT_SOURCES.railhead);
  const outpost = railhead.anchors.outpost;
  assert.ok(outpost && 'room' in outpost, 'Railhead has no outpost anchor');
  assert.equal(outpost.room, 'shift-house');
});

test('the Drowned Quarter is half-sunk streets on boardwalks round Site Fathom\'s derrick and the Roost, with the seawall gate and the view to the Lantern open, each round its landmark', () => {
  const landmarks: Readonly<Record<string, string>> = {
    'site-fathom': 'bell-derrick',
    'the-roost': 'drowned-belfry',
  };
  const wild = ['floodgate-moor', 'gibbet-moor', 'saltmoor', 'sunk-lane'];
  for (const id of [...Object.keys(landmarks), ...wild, 'moat-mire', 'creek-moor', 'creek-mud']) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.square, id);
    assert.equal(layout.region, 'drowned-quarter', id);
    const landmark = landmarks[id];
    if (landmark === undefined) continue;
    assert.ok(layout.objects.some((object) => object.object === landmark), `${id} has no ${landmark}`);
    assert.ok(layout.steps.filter((step) => step.kind === 'building').length >= 6, `${id} has too few buildings for a town square`);
    const flooded = layout.steps.filter((step) => step.kind === 'patch' && step.tile === 'water');
    assert.ok(flooded.length >= 2, `${id} has too few flooded streets`);
    const overlaps = (a: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }, b: typeof a): boolean =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const walks = layout.steps.filter((step) => step.kind === 'patch' && step.tile === 'boards' && flooded.some((water) => water.kind === 'patch' && overlaps(water.rect, step.rect)));
    assert.ok(walks.length >= 3, `${id} has too few boardwalks over its flooded streets`);
  }
  for (const id of wild) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.steps.some((step) => step.kind === 'rise'), `${id} is a flat field`);
    assert.ok(layout.steps.some((step) => step.kind === 'patch' && step.tile === 'trees'), `${id} has no cover`);
  }
  const fathom = parseLayout(LAYOUT_SOURCES['site-fathom']);
  for (const room of ['fathom-yard', 'fathom-headhouse', 'fathom-holding']) {
    assert.ok(fathom.steps.some((step) => step.kind === 'building' && step.id === room), `Site Fathom has no ${room}`);
  }
  for (const object of ['fathom-lift', 'diving-bell']) assert.ok(fathom.objects.some((placed) => placed.object === object), `Site Fathom has no ${object}`);
  const roost = parseLayout(LAYOUT_SOURCES['the-roost']);
  const outpost = roost.anchors.outpost;
  assert.ok(outpost && 'room' in outpost, 'the Roost has no outpost anchor');
  assert.equal(outpost.room, 'the-roost');
  assert.ok(roost.steps.some((step) => step.kind === 'building' && step.id === 'seawall-lodge'), 'the seawall gate has no lodge');
  assert.equal(roost.objects.filter((object) => object.object === 'seawall-gate-leaf').length, 2);
  for (const step of roost.steps) {
    if (step.kind !== 'building') continue;
    assert.ok(step.rect.x + step.rect.width <= 32 || step.rect.y + step.rect.height <= 18, `${step.id} stands between the Roost and the Lantern`);
  }
});

test('the Lantern is the keepers\' hamlet at the root of the spit and the lit lighthouse at its tip, reached by the seawall path and by the Blight road on its ledge, with waystations along the road', () => {
  const ledge = ['ledge-gate', 'the-ledge', 'ledge-top', 'gallows-drop', 'rim-road', 'long-ledge', 'beacon-bend', 'ledge-foot', 'watch-road', 'sea-road'];
  const ward = [...ledge, 'hamlet-lane', 'seawall-path', 'keepers-hamlet', 'the-spit', 'the-lantern'];
  for (const id of ward) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.square, id);
    assert.equal(layout.region, 'the-lantern', id);
    assert.ok(layout.objects.some((object) => object.object === 'street-lamp'), `${id} is unlit`);
  }
  let waystations = 0;
  let milestones = 0;
  for (const id of ledge) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.square, id);
    const origin = { x: layout.square.column * 64, y: layout.square.row * 64 };
    waystations += layout.steps.filter((step) => step.kind === 'building').length;
    milestones += layout.objects.filter((object) => object.object === 'ledge-milestone').length;
    for (const object of layout.objects) {
      if (!('room' in object.at) || object.at.room !== 'ground') continue;
      const tile = land.tileAt({ x: origin.x + object.at.dx, y: origin.y + object.at.dy });
      assert.notEqual(tile, 'gravel', `${object.id} stands in the Blight road`);
    }
  }
  assert.ok(waystations >= 6, `the Blight road has only ${waystations} waystations`);
  assert.ok(milestones >= 4, `the Blight road has only ${milestones} milestones`);
  const hamlet = parseLayout(LAYOUT_SOURCES['keepers-hamlet']);
  assert.ok(hamlet.objects.some((object) => object.object === 'fog-bell'), 'the hamlet has no fog bell');
  assert.ok(hamlet.steps.filter((step) => step.kind === 'building').length >= 6, 'the hamlet has too few buildings');
  const outpost = hamlet.anchors.outpost;
  assert.ok(outpost && 'room' in outpost, 'the hamlet has no outpost anchor');
  assert.equal(outpost.room, 'keepers-post');
  const lantern = parseLayout(LAYOUT_SOURCES['the-lantern']);
  for (const room of ['lantern-precinct', 'lantern-headhouse', 'lens-store']) {
    assert.ok(lantern.steps.some((step) => step.kind === 'building' && step.id === room), `the Lantern has no ${room}`);
  }
  const lighthouse = lantern.objects.find((object) => object.object === 'lighthouse');
  assert.ok(lighthouse && 'room' in lighthouse.at, 'the Lantern has no lighthouse');
  assert.equal(lighthouse.at.room, 'lantern-precinct');
  assert.ok(GAME_CONTENT.worldObjects.get('lighthouse')?.light, 'the lighthouse is not lit');
  assert.ok(lantern.objects.some((object) => object.object === 'lantern-lift'), 'the Lantern lift is missing');
  const rim = parseLayout(LAYOUT_SOURCES['rim-road']);
  assert.equal(rim.objects.filter((object) => object.object === 'crater-rim-gate-leaf').length, 2);
  assert.ok(rim.steps.some((step) => step.kind === 'building' && step.id === 'rim-gate-lodge'), 'the rim gate has no lodge');
  const seawall = parseLayout(LAYOUT_SOURCES['seawall-path']);
  assert.ok(seawall.steps.some((step) => step.kind === 'building' && step.id === 'seawall-steps-house'), 'the seawall path has no steps house');
});

test('the Blight is wild land gone wrong round the crater lake, with the rim camp just inside the rim gate and the rim kept clear', () => {
  const ward = ['ash-margin', 'ash-fells-edge', 'cinder-waste', 'rust-flats', 'scar-fields', 'rim-camp', 'the-crater', 'glass-moor', 'crater-south', 'the-sores', 'ash-fells', 'dead-orchard', 'burnt-shore', 'blight-shore', 'ashen-cove'];
  const count = { pylons: 0, wrecks: 0, stands: 0, pools: 0, rises: 0 };
  for (const id of ward) {
    const layout = parseLayout(LAYOUT_SOURCES[id]);
    assert.ok(layout.square, id);
    assert.equal(layout.region, 'the-blight', id);
    assert.equal(layout.tier, 28, id);
    assert.equal(layout.condition, 'alien', id);
    assert.ok(layout.objects.some((object) => object.object === 'street-lamp'), `${id} is unlit`);
    const origin = { x: layout.square.column * 64, y: layout.square.row * 64 };
    count.pylons += layout.objects.filter((object) => object.object === 'blight-pylon').length;
    count.wrecks += layout.objects.filter((object) => object.object === 'scrap-heap' || object.object === 'parked-car').length;
    count.stands += layout.steps.filter((step) => step.kind === 'patch' && step.tile === 'trees').length;
    count.pools += layout.steps.filter((step) => step.kind === 'patch' && step.tile === 'coolant').length;
    count.rises += layout.steps.filter((step) => step.kind === 'rise').length;
    for (const step of layout.steps) {
      if (step.kind !== 'patch' && step.kind !== 'rise' && step.kind !== 'building') continue;
      for (let y = step.rect.y - 1; y <= step.rect.y + step.rect.height; y++) {
        for (let x = step.rect.x - 1; x <= step.rect.x + step.rect.width; x++) {
          assert.notEqual(land.tileAt({ x: origin.x + x, y: origin.y + y }), 'gravel', `${id}: ${step.kind} touches the crater rim`);
        }
      }
    }
    for (const object of layout.objects) {
      if (!('room' in object.at) || object.at.room !== 'ground') continue;
      assert.notEqual(land.tileAt({ x: origin.x + object.at.dx, y: origin.y + object.at.dy }), 'gravel', `${object.id} stands on the crater rim`);
    }
    let open = 0;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (land.wardAt({ x: origin.x + x, y: origin.y + y }) === 'the-blight' && walkable({ x: origin.x + x, y: origin.y + y }) && land.tileAt({ x: origin.x + x, y: origin.y + y }) !== 'gravel') open++;
    if (open > 1500) {
      assert.ok(layout.steps.filter((step) => step.kind === 'patch' && (step.tile === 'trees' || step.tile === 'coolant' || step.tile === 'glass')).length >= 3, `${id} is an open field`);
      assert.ok(layout.steps.some((step) => step.kind === 'rise'), `${id} is flat`);
    }
  }
  assert.ok(count.pylons >= 10, `the Blight has only ${count.pylons} broken pylons`);
  assert.ok(count.wrecks >= 10, `the Blight has only ${count.wrecks} wrecks`);
  assert.ok(count.stands >= 15, `the Blight has only ${count.stands} dead stands`);
  assert.ok(count.pools >= 12, `the Blight has only ${count.pools} glassy pools`);
  assert.ok(count.rises >= 12, `the Blight has only ${count.rises} rises`);
  const camp = parseLayout(LAYOUT_SOURCES['rim-camp']);
  assert.ok(camp.square);
  const outpost = camp.anchors.outpost;
  assert.ok(outpost && 'room' in outpost, 'the rim camp has no outpost anchor');
  assert.equal(outpost.room, 'rim-camp-post');
  const buildings = camp.steps.filter((step) => step.kind === 'building');
  assert.ok(buildings.length >= 3, 'the rim camp has too few buildings');
  const post = buildings.find((step) => step.id === 'rim-camp-post');
  assert.ok(post, 'the rim camp has no post');
  const gate = { x: 662 - camp.square.column * 64, y: 297 - camp.square.row * 64 };
  assert.ok(Math.abs(post.rect.x - gate.x) + Math.abs(post.rect.y - gate.y) <= 24, 'the rim camp post is not by the rim gate');
  assert.ok(camp.objects.some((object) => object.object === 'rim-searchlight'), 'the rim camp has no searchlight on the lake');
  assert.ok(GAME_CONTENT.worldObjects.get('rim-searchlight')?.light, 'the searchlight is not lit');
  assert.ok(!GAME_CONTENT.levels.has('the-hollow'), 'the Hollow is reserved');
});
