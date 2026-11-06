import {
  addItem,
  createDefaultDraft,
  GAME_CONTENT,
  type CharacterRecord,
  type ServerMessage,
  type ServerMessageOf,
  type ServerMessageType,
} from '@containment/shared';
import { createCharacterRecord } from '../../src/characters/characterFactory.ts';
import { Gameplay, type GameplayMessage } from '../../src/gameplay/gameplay.ts';
import type { MessageSink, Player } from '../../src/world/player.ts';

export const TEST_MEDGEL = 3;

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
  interactWithObject(instanceId: string, interactionIndex?: number): void;
  talkTo(instanceId: string): void;
  equipItem(itemId: string): void;
}

export interface HarnessOptions {
  readonly prepare?: (record: CharacterRecord) => CharacterRecord;
  readonly combatRandom?: () => number;
}

export function createHarness(options: HarnessOptions = {}): Harness {
  const saved: CharacterRecord[] = [];
  const gameplay = new Gameplay(GAME_CONTENT, { save: (record) => saved.push(record) }, {
    tickMs: 300,
    autosaveIntervalMs: 60_000,
    random: () => 0.99,
    combatRandom: options.combatRandom ?? (() => 0.01),
    gatheringRandom: () => 0.01,
  });
  const created = createCharacterRecord(
    { ...createDefaultDraft(), name: 'Test Operative' },
    { id: 'character-1', accountId: 'account-1' },
    GAME_CONTENT,
  );
  const carrying = { ...created, inventory: addItem(created.inventory, GAME_CONTENT.items, 'medgel', TEST_MEDGEL).inventory };
  const record = options.prepare ? options.prepare(carrying) : carrying;
  const sink = new RecordingSink();
  const player = gameplay.enterWorld(record, sink);

  const harness: Harness = {
    gameplay,
    player,
    sink,
    saved,
    send: (message) => gameplay.handle(player, message),
    ticksUntil(predicate, limit = 200) {
      for (let tick = 0; tick < limit && !predicate(); tick++) gameplay.tick();
      if (!predicate()) throw new Error('Condition not reached within tick limit.');
    },
    interactWithObject(instanceId, interactionIndex = 0) {
      harness.send({ type: 'world.interact', targetKind: 'object', instanceId, interactionIndex });
      harness.ticksUntil(() => player.pendingInteraction === null);
    },
    talkTo(instanceId) {
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
