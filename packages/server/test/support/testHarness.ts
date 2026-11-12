import {
  addItem,
  assemblyInstanceOf,
  locate,
  createDefaultDraft,
  GAME_CONTENT,
  chebyshevDistance,
  CARDINAL_OFFSETS,
  footprintTiles,
  isInFootprint,
  nearestFootprintTile,
  tileKey,
  type CharacterRecord,
  type DistrictId,
  type ServerMessage,
  type ServerMessageOf,
  type ServerMessageType,
  type TilePoint,
  type WorldLocation,
} from '@containment/shared';
import { createCharacterRecord } from '../../src/characters/characterFactory.ts';
import { Gameplay, type GameplayMessage } from '../../src/gameplay/gameplay.ts';
import type { MessageSink, Player } from '../../src/world/player.ts';

export const TEST_MEDGEL = 3;

const REACH_WITHOUT_TRAVEL = 16;
const APPROACH_DEPTH = 3;

export class RecordingSink implements MessageSink {
  readonly messages: ServerMessage[] = [];
  detachedReason: string | null = null;

  send(message: ServerMessage): void {
    this.messages.push(message);
  }

  detach(reason: string): void {
    this.detachedReason = reason;
  }

  last<T extends ServerMessageType>(type: T): ServerMessageOf<T> | undefined {
    return this.messages.findLast((message): message is ServerMessageOf<T> => message.type === type);
  }
}

export interface Harness {
  readonly gameplay: Gameplay;
  readonly player: Player;
  readonly sink: RecordingSink;
  readonly saved: CharacterRecord[];
  send(message: GameplayMessage): void;
  ticksUntil(predicate: () => boolean, limit?: number): void;
  fightUntil(predicate: () => boolean, limit?: number): void;
  interactWithObject(instanceId: string, interactionIndex?: number): void;
  talkTo(instanceId: string): void;
  approach(instanceId: string): void;
  equipItem(itemId: string): void;
}

export interface HarnessOptions {
  readonly prepare?: (record: CharacterRecord) => CharacterRecord;
  readonly combatRandom?: () => number;
  readonly gatheringRandom?: () => number;
}

const harnessWorlds = new WeakMap<Player, Gameplay>();

export function districtOf(player: Player): DistrictId | undefined {
  return harnessWorlds.get(player)?.world.districtOf(player);
}

export function createHarness(options: HarnessOptions = {}): Harness {
  const saved: CharacterRecord[] = [];
  const gameplay = new Gameplay(GAME_CONTENT, { save: (record) => saved.push(record), findByName: () => null }, {
    tickMs: 300,
    autosaveIntervalMs: 60_000,
    random: () => 0.99,
    combatRandom: options.combatRandom ?? (() => 0.01),
    gatheringRandom: options.gatheringRandom ?? (() => 0.01),
  });
  const created = createCharacterRecord(
    { ...createDefaultDraft(), name: 'Test Operative' },
    { id: 'character-1', accountId: 'account-1' },
    GAME_CONTENT,
  );
  const carrying = { ...created, inventory: addItem(created.inventory, GAME_CONTENT.items, 'medgel', TEST_MEDGEL).inventory };
  const record = options.prepare ? options.prepare({ ...carrying, quests: {} }) : carrying;
  const sink = new RecordingSink();
  const player = gameplay.enterWorld(record, sink);
  harnessWorlds.set(player, gameplay);

  const comeWithinReach = (instanceId: string): void => {
    const level = GAME_CONTENT.levels.get(player.levelId);
    const creature = gameplay.world.levelOf(player).creatureByInstance(instanceId);
    const target = creature ?? level?.npcs.find((npc) => npc.instanceId === instanceId) ?? level?.objects.find((object) => object.instanceId === instanceId);
    if (!level || !target) return;
    const nearest = creature ? nearestFootprintTile(creature.position, creature.size, player.position) : target.position;
    if (chebyshevDistance(nearest, player.position) <= REACH_WITHOUT_TRAVEL && !(creature && isInFootprint(player.position, creature.position, creature.size))) return;
    if ('objectId' in target && GAME_CONTENT.worldObjects.get(target.objectId)?.door) return;
    const grid = gameplay.world.levelOf(player).grid;
    const seen = new Set<string>();
    const assembly = assemblyInstanceOf(instanceId);
    const footprint = creature
      ? footprintTiles(creature.position, creature.size)
      : assembly === null
        ? [target.position]
        : level.objects.filter((object) => assemblyInstanceOf(object.instanceId) === assembly).map((object) => object.position);
    const covered = new Set(footprint.map(tileKey));
    let frontier = footprint
      .flatMap((tile) => CARDINAL_OFFSETS.map((offset) => ({ x: tile.x + offset.x, y: tile.y + offset.y })))
      .filter((point) => grid.isWalkable(point) && !covered.has(tileKey(point)));
    let standing = frontier[0];
    for (let depth = 0; depth < APPROACH_DEPTH && frontier.length > 0; depth++) {
      standing = frontier[0];
      for (const point of frontier) seen.add(tileKey(point));
      frontier = frontier
        .flatMap((point) => CARDINAL_OFFSETS.map((offset) => ({ x: point.x + offset.x, y: point.y + offset.y })))
        .filter((point) => grid.isWalkable(point) && !seen.has(tileKey(point)) && !covered.has(tileKey(point)));
    }
    if (standing) gameplay.teleport(player, { levelId: level.id, position: standing });
  };

  const harness: Harness = {
    approach: comeWithinReach,
    gameplay,
    player,
    sink,
    saved,
    send: (message) => gameplay.handle(player, message),
    ticksUntil(predicate, limit = 200) {
      for (let tick = 0; tick < limit && !predicate(); tick++) gameplay.tick();
      if (!predicate()) throw new Error('Condition not reached within tick limit.');
    },
    fightUntil(predicate, limit = 200) {
      for (let tick = 0; tick < limit && !predicate(); tick++) {
        if (!player.isIncapacitated) player.setIntegrity(player.maxIntegrity);
        gameplay.tick();
      }
      if (!predicate()) throw new Error('Condition not reached within tick limit.');
    },
    interactWithObject(instanceId, interactionIndex = 0) {
      comeWithinReach(instanceId);
      harness.send({ type: 'world.interact', targetKind: 'object', instanceId, interactionIndex });
      harness.ticksUntil(() => player.pendingInteraction === null);
    },
    talkTo(instanceId) {
      comeWithinReach(instanceId);
      harness.send({ type: 'world.interact', targetKind: 'npc', instanceId, interactionIndex: 0 });
      harness.ticksUntil(() => player.dialogue !== null);
    },
    equipItem(itemId) {
      const slotIndex = player.record.inventory.findIndex((slot) => slot?.itemId === itemId);
      if (slotIndex < 0) throw new Error(`Player does not carry ${itemId}.`);
      harness.send({ type: 'inventory.equip', slotIndex });
    },
  };
  return harness;
}

export function finishDialogue(harness: Harness, preferredOption?: (text: string) => boolean): void {
  for (let guard = 0; guard < 30 && harness.player.dialogue; guard++) {
    const view = harness.sink.last('dialogue.opened')?.view;
    const option = view?.options?.find((candidate) => preferredOption?.(candidate.text)) ?? view?.options?.at(-1);
    if (option) harness.send({ type: 'dialogue.choose', optionIndex: option.index });
    else harness.send({ type: 'dialogue.continue' });
  }
}

export function at(districtId: DistrictId, local: TilePoint): WorldLocation {
  const location = locate(GAME_CONTENT, districtId, local);
  if (!location) throw new Error(`Unknown district "${districtId}".`);
  return location;
}

export function localInRoom(districtId: DistrictId, roomId: string, offset?: TilePoint): TilePoint {
  const rect = GAME_CONTENT.districts.get(districtId)?.rooms?.[roomId];
  if (!rect) throw new Error(`District "${districtId}" has no room "${roomId}".`);
  return offset ? { x: rect.x + offset.x, y: rect.y + offset.y } : { x: rect.x + Math.floor(rect.width / 2), y: rect.y + Math.floor(rect.height / 2) };
}

export function inRoom(districtId: DistrictId, roomId: string, offset?: TilePoint): WorldLocation {
  return at(districtId, localInRoom(districtId, roomId, offset));
}

export function anchor(districtId: DistrictId, anchorId: string): WorldLocation {
  const point = GAME_CONTENT.districts.get(districtId)?.anchors?.[anchorId];
  if (!point) throw new Error(`District "${districtId}" has no anchor "${anchorId}".`);
  return at(districtId, point);
}

export function exitPoint(districtId: DistrictId, exitId: string): TilePoint {
  const tiles = GAME_CONTENT.districts.get(districtId)?.exits?.[exitId]?.tiles;
  const middle = tiles?.[Math.floor(tiles.length / 2)];
  if (!middle) throw new Error(`District "${districtId}" has no exit "${exitId}".`);
  return at(districtId, middle).position;
}

export function levelPoint(districtId: DistrictId, local: TilePoint): TilePoint {
  return at(districtId, local).position;
}
