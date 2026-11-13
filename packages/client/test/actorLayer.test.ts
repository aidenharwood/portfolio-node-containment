import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME_CONTENT, type ResolvedLevel } from '@containment/shared';
import { actorsOf } from '../src/editor/actorSpecs.ts';
import { previewLevel } from '../src/editor/previewLevel.ts';

test('every npc placement becomes an actor with its appearance and gear', () => {
  const level = previewLevel(GAME_CONTENT, 'meridian-atrium');
  const actors = actorsOf(GAME_CONTENT, level);
  const npcs = actors.filter((actor) => actor.kind === 'npc');
  assert.equal(npcs.length, level.npcs.length);
  const okafor = npcs.find((actor) => actor.id === 'atrium-okafor');
  const definition = GAME_CONTENT.npcs.get('quartermaster-okafor');
  assert.ok(okafor && okafor.kind === 'npc' && definition);
  assert.deepEqual(okafor.appearance, definition.appearance);
  assert.deepEqual(okafor.gear, definition.gear);
  assert.deepEqual(okafor.position, level.npcs.find((npc) => npc.instanceId === 'atrium-okafor')?.position);
});

test('an npc or creature with an unknown id is skipped', () => {
  const level = previewLevel(GAME_CONTENT, 'meridian-atrium');
  const broken: ResolvedLevel = {
    ...level,
    npcs: [...level.npcs, { instanceId: 'ghost', npcId: 'no-such-npc', position: { x: 1, y: 1 } }],
    creatures: [...level.creatures, { instanceId: 'beast', creatureId: 'no-such-creature', position: { x: 1, y: 1 } }],
  };
  const ids = actorsOf(GAME_CONTENT, broken).map((actor) => actor.id);
  assert.ok(!ids.includes('ghost') && !ids.includes('beast'));
});

test('creatures become actors with their model', () => {
  const level = previewLevel(GAME_CONTENT, 'salt-cathedral');
  const creatures = actorsOf(GAME_CONTENT, level).filter((actor) => actor.kind === 'creature');
  assert.ok(creatures.length > 0);
  assert.equal(creatures.length, level.creatures.length);
  for (const actor of creatures) {
    const placement = level.creatures.find((creature) => creature.instanceId === actor.id);
    assert.equal(actor.kind === 'creature' && actor.model, GAME_CONTENT.creatures.get(placement?.creatureId ?? '')?.model);
  }
});

test('showing the same actors again reuses their models and only moves them', async () => {
  const { ActorLayer } = await import('../src/editor/actorLayer.ts');
  const level = previewLevel(GAME_CONTENT, 'meridian-atrium');
  const actors = actorsOf(GAME_CONTENT, level);
  const layer = new ActorLayer();
  layer.show(actors);
  const before = [...layer.root.children];
  const moved = actors.map((actor, index) => (index === 0 ? { ...actor, position: { x: actor.position.x + 2, y: actor.position.y } } : actor));
  layer.show(moved);
  assert.deepEqual(layer.root.children, before);
  assert.equal(layer.root.children[0]?.position.x, (moved[0]?.position.x ?? 0));
  layer.show(moved.slice(1));
  assert.equal(layer.root.children.length, before.length - 1);
});
