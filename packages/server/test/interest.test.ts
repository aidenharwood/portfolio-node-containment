import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addItem, createDefaultDraft, GAME_CONTENT, type CharacterRecord, type DistrictId, type ServerMessage, type TilePoint } from '@containment/shared';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import { Gameplay } from '../src/gameplay/gameplay.ts';
import type { Player } from '../src/world/player.ts';
import { at, levelPoint, RecordingSink } from './support/testHarness.ts';

interface Placement {
  readonly districtId: DistrictId;
  readonly position: TilePoint;
  readonly flags?: readonly string[];
}

interface Operative {
  readonly player: Player;
  readonly sink: RecordingSink;
}

function deep(placements: readonly Placement[]) {
  const gameplay = new Gameplay(GAME_CONTENT, { save: () => undefined }, {
    tickMs: 300,
    autosaveIntervalMs: 60_000,
    random: () => 0.99,
    combatRandom: () => 0.01,
    levelCapacity: 50,
  });
  const operatives: Operative[] = placements.map((placement, index) => {
    const base = createCharacterRecord({ ...createDefaultDraft(), name: `Operative ${String.fromCharCode(65 + index)}` }, { id: `c-${index}`, accountId: `a-${index}` }, GAME_CONTENT);
    const inventory = addItem(base.inventory, GAME_CONTENT.items, 'medgel', 3).inventory;
    const record: CharacterRecord = { ...base, inventory, flags: [...base.flags, ...(placement.flags ?? [])], location: at(placement.districtId, placement.position) };
    const sink = new RecordingSink();
    return { player: gameplay.enterWorld(record, sink), sink };
  });
  const tickUntil = (predicate: () => boolean, limit = 200) => {
    for (let tick = 0; tick < limit && !predicate(); tick++) gameplay.tick();
    assert.ok(predicate(), 'condition not reached within tick limit');
  };
  const walk = (operative: Operative, target: TilePoint) => {
    gameplay.handle(operative.player, { type: 'world.walk', target });
    tickUntil(() => operative.player.path.length === 0);
    assert.deepEqual(operative.player.position, target);
  };
  const interact = (operative: Operative, instanceId: string) => {
    gameplay.handle(operative.player, { type: 'world.interact', targetKind: 'object', instanceId, interactionIndex: 0 });
    tickUntil(() => operative.player.pendingInteraction === null);
  };
  return { gameplay, operatives, tickUntil, walk, interact };
}

const ofType = <T extends ServerMessage['type']>(sink: RecordingSink, type: T) =>
  sink.messages.filter((message): message is Extract<ServerMessage, { type: T }> => message.type === type);

const interestMessages = (sink: RecordingSink) => sink.messages.filter((message) => message.type === 'world.chunksEntered' || message.type === 'world.chunksLeft');

describe('chunked interest', () => {
  test('world.entered carries only the interest set', () => {
    const { operatives } = deep([{ districtId: 'cryovault', position: { x: 4, y: 4 } }]);
    const [a] = operatives;
    assert.ok(a);
    const entered = a.sink.last('world.entered');
    assert.ok(entered);
    assert.ok(entered.entities.some((entity) => entity.id === a.player.entityId));
    assert.ok(entered.entities.every((entity) => entity.position.x < 64));
    const farPlacements = GAME_CONTENT.levels.get('the-deep')?.creatures.filter((creature) => creature.position.x >= 96) ?? [];
    assert.ok(farPlacements.length > 0);
  });

  test('a far player receives no movement ticks', () => {
    const { operatives, walk } = deep([
      { districtId: 'cryovault', position: { x: 4, y: 4 } },
      { districtId: 'drowned-archive', position: { x: 4, y: 4 } },
    ]);
    const [a, b] = operatives;
    assert.ok(a && b);
    b.sink.messages.length = 0;
    walk(a, levelPoint('cryovault', { x: 5, y: 4 }));
    assert.ok(ofType(b.sink, 'world.tick').every((tick) => tick.movements.every((movement) => movement.entityId !== a.player.entityId)));
  });

  test('walking across a chunk boundary sends chunksLeft then chunksEntered', () => {
    const { operatives, walk } = deep([{ districtId: 'deepwatch', position: { x: 2, y: 10 } }]);
    const [a] = operatives;
    assert.ok(a);
    walk(a, levelPoint('deepwatch', { x: 10, y: 10 }));
    const [left, entered] = interestMessages(a.sink).slice(-2);
    assert.equal(left?.type, 'world.chunksLeft');
    assert.equal(left?.chunks.length, 3);
    assert.equal(entered?.type, 'world.chunksEntered');
    assert.equal(entered?.chunks.length, 3);
  });

  test('an entity crossing into view spawns for the observer', () => {
    const { operatives, walk } = deep([
      { districtId: 'deepwatch', position: { x: 2, y: 10 } },
      { districtId: 'drowned-archive', position: { x: 4, y: 20 } },
    ]);
    const [a, b] = operatives;
    assert.ok(a && b);
    assert.ok(!b.sink.last('world.entered')?.entities.some((entity) => entity.id === a.player.entityId));
    walk(a, levelPoint('deepwatch', { x: 10, y: 10 }));
    assert.ok(ofType(b.sink, 'world.entitySpawned').some((message) => message.entity.id === a.player.entityId));
  });

  test('a same-level teleport swaps interest', () => {
    const { operatives, interact } = deep([
      { districtId: 'deepwatch', position: { x: 25, y: 21 }, flags: ['clearance.cryovault'] },
      { districtId: 'deepwatch', position: { x: 24, y: 21 } },
    ]);
    const [a, b] = operatives;
    assert.ok(a && b);
    a.sink.messages.length = 0;
    interact(a, 'dw-cryovault-lift');
    assert.equal(a.player.levelId, 'the-deep');
    assert.equal(ofType(a.sink, 'world.entered').length, 0);
    assert.ok(ofType(a.sink, 'world.chunksLeft').length > 0);
    assert.ok(ofType(a.sink, 'world.chunksEntered').length > 0);
    assert.ok(ofType(b.sink, 'world.entityDespawned').some((message) => message.entityId === a.player.entityId));
  });

  test('chunk entry respects ground-item privacy', () => {
    const { gameplay, operatives, interact } = deep([
      { districtId: 'cryovault', position: { x: 4, y: 4 }, flags: ['clearance.cryovault'] },
      { districtId: 'deepwatch', position: { x: 24, y: 21 }, flags: ['clearance.cryovault'] },
    ]);
    const [a, b] = operatives;
    assert.ok(a && b);
    const slotIndex = a.player.record.inventory.findIndex((slot) => slot?.itemId === 'medgel');
    gameplay.handle(a.player, { type: 'inventory.drop', slotIndex });
    const dropped = a.sink.last('world.groundItemAdded')?.item;
    assert.ok(dropped);

    interact(a, 'cv-lift');
    assert.equal(a.player.levelId, 'the-deep');
    a.sink.messages.length = 0;
    interact(a, 'dw-cryovault-lift');
    assert.ok(ofType(a.sink, 'world.chunksEntered').some((message) => message.groundItems.some((item) => item.id === dropped.id)));

    b.sink.messages.length = 0;
    interact(b, 'dw-cryovault-lift');
    const bEntered = ofType(b.sink, 'world.chunksEntered');
    assert.ok(bEntered.length > 0);
    assert.ok(bEntered.every((message) => message.groundItems.every((item) => item.id !== dropped.id)));
  });

  test('local chat only reaches nearby players', () => {
    const { gameplay, operatives } = deep([
      { districtId: 'cryovault', position: { x: 4, y: 4 } },
      { districtId: 'cryovault', position: { x: 5, y: 4 } },
      { districtId: 'drowned-archive', position: { x: 4, y: 4 } },
    ]);
    const [speaker, near, far] = operatives;
    assert.ok(speaker && near && far);
    gameplay.handle(speaker.player, { type: 'chat.say', text: 'Anyone down here?' });
    assert.ok(ofType(near.sink, 'chat.message').some((message) => message.channel === 'local'));
    assert.ok(!ofType(far.sink, 'chat.message').some((message) => message.channel === 'local'));
  });
});
