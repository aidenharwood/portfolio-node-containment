import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT } from '@containment/shared';
import { buildObjectModel } from '../src/render/models/objectModels.ts';
import { SET_PIECE_BUILDERS } from '../src/render/models/setPieceModels.ts';
import { assertModelFits } from './support/modelBounds.ts';

const SET_PIECE_HEIGHTS = { min: 4, max: 64 };
const SEEDS = [0, 3, 41, 96];
const SHELTER_HEADROOM = 38;
const SHELTER_POST_REACH = 3;

const definitionOf = (id: string) => {
  const definition = GAME_CONTENT.worldObjects.get(id);
  assert.ok(definition, `${id} is defined`);
  return definition;
};

test('every set-piece model belongs to a footprinted world object', () => {
  const footprinted = [...GAME_CONTENT.worldObjects.values()].filter((definition) => definition.model in SET_PIECE_BUILDERS);
  assert.equal(new Set(footprinted.map((definition) => definition.model)).size, Object.keys(SET_PIECE_BUILDERS).length);
  for (const definition of footprinted) assert.ok(definition.footprint, `${definition.id} has a footprint`);
});

test('every footprinted object fits its footprint and stands 4 to 64 voxels tall', () => {
  const footprinted = [...GAME_CONTENT.worldObjects.values()].filter((definition) => definition.footprint);
  assert.ok(footprinted.length >= Object.keys(SET_PIECE_BUILDERS).length);
  for (const definition of footprinted) {
    for (const seed of SEEDS) assertModelFits(`${definition.id} (seed ${seed})`, buildObjectModel(definition.model, seed), definition.footprint!, SET_PIECE_HEIGHTS);
  }
});

test('fountains run a jet, the banner sways and the timetable blinks', () => {
  for (const id of ['fountain-basin', 'fountain-grand', 'banner-mast', 'timetable-board']) {
    assert.ok(buildObjectModel(definitionOf(id).model, 0).animated.length > 0, `${id} has an animated part`);
  }
});

test('the transit shelter leaves headroom under its roof except at the corner posts', () => {
  const shelter = definitionOf('transit-shelter');
  assert.equal(shelter.deck, true);
  assert.equal(shelter.blocksMovement, false);
  const { width, height } = shelter.footprint!;
  const halfX = width * 8;
  const halfZ = height * 8;
  const built = buildObjectModel(shelter.model, 0);
  for (let x = -halfX; x < halfX; x++) {
    for (let z = -halfZ; z < halfZ; z++) {
      const nearCorner = Math.min(x + halfX, halfX - 1 - x) < SHELTER_POST_REACH && Math.min(z + halfZ, halfZ - 1 - z) < SHELTER_POST_REACH;
      if (nearCorner) continue;
      for (let y = 0; y < SHELTER_HEADROOM; y++) assert.ok(!built.base.has(x, y, z), `transit-shelter blocks headroom at ${x},${y},${z}`);
    }
  }
});
