import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  addItem,
  createDefaultDraft,
  createObjectWalkabilityGrid,
  createStartingSkills,
  experienceForLevel,
  footprintTiles,
  GAME_CONTENT,
  isInFootprint,
  maxIntegrityFor,
  samePoint,
  tileKey,
  type CharacterRecord,
  type GameContent,
  type ResolvedLevel,
  type TilePoint,
  type WorldObjectDefinition,
} from '@containment/shared';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import { Gameplay } from '../src/gameplay/gameplay.ts';
import type { Creature } from '../src/world/creature.ts';
import type { LevelInstance } from '../src/world/levelInstance.ts';
import { createHarness, inRoom, type Harness } from './support/testHarness.ts';

const veteran = (record: CharacterRecord): CharacterRecord => {
  const skills = createStartingSkills({ closeQuarters: experienceForLevel(40), fortitude: experienceForLevel(40) });
  return { ...record, location: inRoom('sector-two', 'inner-chamber', { x: 4, y: 4 }), skills, vitals: { integrity: maxIntegrityFor(skills) } };
};

function warden(harness: Harness): Creature {
  const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance('s2-warden');
  assert.ok(creature);
  return creature;
}

function assertNoOverlap(level: LevelInstance): void {
  const owners = new Map<string, string>();
  for (const creature of level.creatures.values()) {
    if (!creature.isAlive) continue;
    for (const tile of footprintTiles(creature.position, creature.size)) {
      const key = tileKey(tile);
      assert.equal(owners.get(key), undefined, `${creature.entityId} overlaps ${owners.get(key)} at ${key}`);
      owners.set(key, creature.entityId);
    }
  }
}

function wallBeside(level: LevelInstance, near: TilePoint): TilePoint {
  for (let radius = 0; radius < 40; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const point = { x: near.x + dx, y: near.y + dy };
        if (level.creatureGrid.isWalkable(point) && !level.creatureGrid.isWalkable({ x: point.x + 1, y: point.y })) return point;
      }
    }
  }
  throw new Error('no wall found');
}

describe('creature footprints', () => {
  test('a 2×2 creature cannot stand where its body would cross a wall', () => {
    const harness = createHarness({ prepare: veteran });
    const level = harness.gameplay.world.levelOf(harness.player);
    const creature = warden(harness);
    assert.equal(creature.size, 2);
    const edge = wallBeside(level, creature.home);
    assert.equal(level.creatureGridFor(1).isWalkable(edge), true);
    assert.equal(level.creatureGridFor(2).isWalkable(edge), false);
  });

  test('creature bodies never overlap while a pack chases one player', () => {
    const harness = createHarness({ prepare: veteran });
    const level = harness.gameplay.world.levelOf(harness.player);
    const creature = warden(harness);
    const others = [...level.creatures.values()].filter((other) => other !== creature && other.isAlive).slice(0, 6);
    others.forEach((other, index) => {
      level.vacate(other);
      other.position = level.freeAnchorNear(other, { x: creature.home.x - 3 + index, y: creature.home.y - 3 });
      level.occupy(other);
      other.targetId = harness.player.entityId;
    });
    creature.targetId = harness.player.entityId;
    for (let tick = 0; tick < 300; tick++) {
      harness.gameplay.tick();
      assertNoOverlap(level);
      harness.player.setIntegrity(harness.player.maxIntegrity);
    }
  });

  test('players walk straight through creature bodies', () => {
    const harness = createHarness({ prepare: veteran });
    const level = harness.gameplay.world.levelOf(harness.player);
    const creature = warden(harness);
    const covered = { x: creature.position.x + 1, y: creature.position.y + 1 };
    const path = level.pathBetween(harness.player.position, covered, false);
    assert.ok(path);
    assert.deepEqual(path.at(-1), covered);
  });

  test('wander never chooses a chokepoint', () => {
    const harness = createHarness({ prepare: veteran });
    const level = harness.gameplay.world.levelOf(harness.player);
    let checked = 0;
    for (let y = 0; y < level.layout.height && checked < 5; y++) {
      for (let x = 0; x < level.layout.width && checked < 5; x++) {
        const point = { x, y };
        if (!level.creatureGrid.isWalkable(point) || !level.isChokepoint(point)) continue;
        assert.equal(level.isWanderDestination({ entityId: 'probe', position: point, size: 1 }, point), false);
        checked++;
      }
    }
    assert.ok(checked > 0, 'the level has chokepoints to check');
  });

  test('a player standing under a 2×2 creature steps out before striking it', () => {
    const harness = createHarness({ prepare: veteran });
    const creature = warden(harness);
    harness.gameplay.teleport(harness.player, { levelId: harness.player.levelId, position: creature.position });
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 0 });
    harness.ticksUntil(() => creature.integrity < creature.definition.integrity, 60);
    assert.equal(isInFootprint(harness.player.position, creature.position, creature.size), false);
  });

  test('a 2×2 creature drops its loot on its own body', () => {
    const harness = createHarness({ prepare: veteran });
    const creature = warden(harness);
    harness.approach('s2-warden');
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 's2-warden', interactionIndex: 0 });
    harness.ticksUntil(() => !creature.isAlive, 2000);
    const drops = harness.sink.messages.filter((message) => message.type === 'world.groundItemAdded');
    assert.ok(drops.length > 0);
    for (const drop of drops) {
      if (drop.type !== 'world.groundItemAdded') continue;
      assert.ok(isInFootprint(drop.item.position, creature.position, creature.size) || samePoint(drop.item.position, harness.player.position));
    }
  });
});

const PLINTH_NOTICE = 'The plinth is cold to the touch.';
const PLINTH: WorldObjectDefinition = {
  id: 'test-plinth',
  name: 'Test plinth',
  examine: 'A broad plinth.',
  model: 'crate',
  blocksMovement: true,
  footprint: { width: 3, height: 2 },
  interactions: [{ verb: 'Examine', effects: [{ type: 'notify', text: PLINTH_NOTICE }] }],
};

function plinthScenario() {
  const levelId = GAME_CONTENT.newCharacter.startingLocation.levelId;
  const level = GAME_CONTENT.levels.get(levelId) as ResolvedLevel;
  const baseGrid = createObjectWalkabilityGrid(level.layout, level.objects, (id) => GAME_CONTENT.worldObjects.get(id));
  let origin: TilePoint | null = null;
  const spawn = level.spawn;
  for (let radius = 0; radius < 60 && !origin; radius++) {
    for (let dy = -radius; dy <= radius && !origin; dy++) {
      for (let dx = -radius; dx <= radius && !origin; dx++) {
        const candidate = { x: spawn.x + dx, y: spawn.y + dy };
        let clear = true;
        for (let y = candidate.y - 1; y <= candidate.y + 5 && clear; y++) {
          for (let x = candidate.x - 1; x <= candidate.x + 3 && clear; x++) clear = baseGrid.isWalkable({ x, y });
        }
        if (clear) origin = candidate;
      }
    }
  }
  assert.ok(origin, 'no open floor for the plinth');
  const placement = { instanceId: 'plinth-1', objectId: PLINTH.id, position: origin };
  const content: GameContent = {
    ...GAME_CONTENT,
    worldObjects: new Map([...GAME_CONTENT.worldObjects, [PLINTH.id, PLINTH]]),
    levels: new Map([...GAME_CONTENT.levels, [levelId, { ...level, objects: [...level.objects, placement] }]]),
  };
  const gameplay = new Gameplay(content, { save: () => {}, findByName: () => null }, {
    tickMs: 300,
    autosaveIntervalMs: 60_000,
    random: () => 0.99,
    combatRandom: () => 0.01,
    gatheringRandom: () => 0.01,
  });
  const created = createCharacterRecord({ ...createDefaultDraft(), name: 'Test Operative' }, { id: 'character-1', accountId: 'account-1' }, content);
  const record = { ...created, inventory: addItem(created.inventory, content.items, 'medgel', 1).inventory, quests: {} };
  const messages: { type: string; text?: string }[] = [];
  const player = gameplay.enterWorld(record, { send: (message) => messages.push(message as { type: string; text?: string }), detach: () => {} });
  const stand = (point: TilePoint): void => gameplay.teleport(player, { levelId, position: point });
  const interact = (): void => gameplay.handle(player, { type: 'world.interact', targetKind: 'object', instanceId: placement.instanceId, interactionIndex: 0 });
  const noticed = (): boolean => messages.some((message) => message.type === 'notice' && message.text === PLINTH_NOTICE);
  return { gameplay, player, origin, stand, interact, noticed };
}

describe('object footprints', () => {
  test('a player beside the middle of a wide object interacts without walking', () => {
    const { player, origin, stand, interact, noticed } = plinthScenario();
    stand({ x: origin.x + 1, y: origin.y + 2 });
    interact();
    assert.equal(noticed(), true);
    assert.equal(player.pendingInteraction, null);
    assert.deepEqual(player.position, { x: origin.x + 1, y: origin.y + 2 });
  });

  test('a player two tiles from the footprint is walked to the nearest tile beside it', () => {
    const { gameplay, player, origin, stand, interact, noticed } = plinthScenario();
    stand({ x: origin.x + 4, y: origin.y + 1 });
    interact();
    for (let tick = 0; tick < 30 && !noticed(); tick++) gameplay.tick();
    assert.equal(noticed(), true);
    assert.deepEqual(player.position, { x: origin.x + 3, y: origin.y + 1 });
  });
});
