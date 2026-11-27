import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHUNK_SIZE, GAME_CONTENT, type ObjectPlacement, type WorldObjectId } from '@containment/shared';
import { Vector3 } from 'three';
import { FAR_PROP_KINDS, farPropKindOf, farPropShape, farPropTriangles, placeFarProps, propSilhouette, variantOf } from '../src/render/far/farProps.ts';
import { coarsenRows, createFarCells, FAR_SINK } from '../src/render/far/farTerrainMesher.ts';
import { createSceneRaster, kindIndexOf } from '../src/render/far/sceneRaster.ts';
import { MODEL_VOXEL_SIZE, STEP_HEIGHT } from '../src/render/world/worldScale.ts';
import { TILE_KIND_IDS } from '@containment/shared';
import { buildObjectModel } from '../src/render/models/objectModels.ts';

test('trees, rocks, crystals and scrap each fall in a far prop kind, and ordinary objects do not', () => {
  const kindOf = (id: string) => farPropKindOf(GAME_CONTENT.worldObjects.get(id as WorldObjectId));
  assert.equal(kindOf('broadleaf-tree'), 'broadleaf');
  assert.equal(kindOf('windbent-pine'), 'conifer');
  assert.equal(kindOf('hedgerow'), 'shrub');
  assert.equal(kindOf('boulder'), 'rock');
  assert.equal(kindOf('glass-crystals'), 'crystal');
  assert.equal(kindOf('scrap-mound'), 'scrap');
  assert.equal(kindOf('street-lamp'), null);
  assert.equal(kindOf('tall-grass'), null);
});

test('a far tree takes its near model variant\'s size, trunk height and leaf and bark colours', () => {
  const tree = propSilhouette('broadleafTree', 3);
  assert.ok(tree);
  const bounds = buildObjectModel('broadleafTree', 3).base.bounds;
  assert.ok(bounds);
  assert.ok(Math.abs(tree.height - bounds.max[1] * MODEL_VOXEL_SIZE) < 1e-6);
  assert.ok(tree.split > 0.1 && tree.split < 0.7, `trunk share ${tree.split}`);
  assert.ok(tree.crown[1] > tree.crown[0] && tree.crown[1] > tree.crown[2], 'leaves are green');
  assert.ok(tree.trunk[0] > tree.trunk[2], 'bark is warm');
  const boulder = propSilhouette('boulder', 0);
  assert.ok(boulder);
  assert.equal(boulder.split, 0);
});

test('every far prop shape is closed towards the outside and stays inside its unit box', () => {
  for (const kind of FAR_PROP_KINDS) {
    const shape = farPropShape(kind);
    const { positions, normals, parts } = shape;
    assert.ok(farPropTriangles(kind) <= 40, `${kind} stays low poly`);
    for (let at = 0; at < positions.length / 3; at++) {
      const point = new Vector3(positions[at * 3], positions[at * 3 + 1], positions[at * 3 + 2]);
      assert.ok(Math.abs(point.x) <= 0.5 + 1e-6 && Math.abs(point.z) <= 0.5 + 1e-6 && point.y >= -1e-6 && point.y <= 1 + 1e-6, `${kind} vertex ${point.toArray()}`);
    }
    for (let face = 0; face < shape.indices.length; face += 3) {
      const corners = [0, 1, 2].map((corner) => shape.indices[face + corner] as number);
      const centre = new Vector3();
      for (const corner of corners) centre.add(new Vector3(positions[corner * 3], positions[corner * 3 + 1], positions[corner * 3 + 2]).multiplyScalar(1 / 3));
      const first = corners[0] as number;
      const normal = new Vector3(normals[first * 3], normals[first * 3 + 1], normals[first * 3 + 2]);
      const axis = new Vector3(0, centre.y, 0);
      const part = parts[first];
      const inside = part === 0 ? axis : new Vector3(kind === 'crystal' || kind === 'scrap' ? centre.x : 0, Math.min(centre.y, 0.5), kind === 'crystal' || kind === 'scrap' ? centre.z : 0);
      const outward = centre.clone().sub(inside);
      if (outward.length() < 1e-3) continue;
      assert.ok(normal.dot(outward) > -1e-6, `${kind} face ${face / 3} faces inward`);
    }
  }
});

test('far props stand on the far ground, in their anchor chunk, sized by their model and scale', () => {
  const raster = createSceneRaster({ x: 0, y: 0, width: 64, height: 64 });
  raster.kinds.fill(kindIndexOf('grass'));
  raster.heights.fill(2);
  const cells = createFarCells(raster, 4);
  const offsets = new Float32Array(TILE_KIND_IDS.length);
  coarsenRows({ raster, topOffsets: offsets, slack: offsets, colorOf: (_k, _x, _y, out) => out.fill(0.3), sideOf: (_k, _x, _y, _t, out) => out.fill(0.2), moodAt: () => 0 }, cells, 0, cells.rows);
  const objects: ObjectPlacement[] = [
    { instanceId: 'a' as ObjectPlacement['instanceId'], objectId: 'broadleaf-tree' as WorldObjectId, position: { x: 10, y: 12 } },
    { instanceId: 'b' as ObjectPlacement['instanceId'], objectId: 'boulder' as WorldObjectId, position: { x: 40, y: 50 }, facing: 'east' },
    { instanceId: 'c' as ObjectPlacement['instanceId'], objectId: 'street-lamp' as WorldObjectId, position: { x: 20, y: 20 } },
    { instanceId: 'd' as ObjectPlacement['instanceId'], objectId: 'broadleaf-tree' as WorldObjectId, position: { x: 33, y: 5 } },
  ];
  const batches = placeFarProps({ objects, worldObjects: GAME_CONTENT.worldObjects, moodAt: () => 3 }, raster, cells);
  assert.deepEqual(batches.map((batch) => [batch.kind, batch.count]), [['broadleaf', 2], ['rock', 1]]);
  const trees = batches[0]!;
  const tree = propSilhouette('broadleafTree', variantOf(objects[0]!, 0))!;
  assert.ok(Math.abs((trees.places[1] as number) - (2 * STEP_HEIGHT - FAR_SINK)) < 1e-6, 'sunk with the far ground');
  assert.ok(Math.abs((trees.places[0] as number) - 10) < 1 && Math.abs((trees.places[2] as number) - 12) < 1);
  assert.ok(Math.abs((trees.sizes[1] as number) - tree.height * 2) < 1e-5, 'model scale applies');
  assert.deepEqual([...trees.chunks], [0, 0, Math.floor(33 / CHUNK_SIZE), 0]);
  assert.equal(trees.crowns[3], 3, 'the mood rides with the crown colour');
  const rock = batches[1]!;
  assert.ok(Math.abs((rock.places[3] as number) - Math.PI / 2) < 1e-6, 'facing turns the prop');
});
