import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  contractPeriod,
  createDefaultDraft,
  createStartingSkills,
  emptyContractLedger,
  experienceForLevel,
  GAME_CONTENT,
  maxIntegrityFor,
  type CharacterRecord,
  type WorldLocation,
} from '@containment/shared';
import { createCharacterRecord } from '../src/characters/characterFactory.ts';
import type { GameplayMessage } from '../src/gameplay/gameplay.ts';
import type { Player } from '../src/world/player.ts';
import { at, createHarness, RecordingSink, type Harness, localInRoom } from './support/testHarness.ts';

const PLAZA = at('meridian-atrium', localInRoom('meridian-atrium', 'plaza', { x: 19, y: 3 }));
const DOCKS = at('service-yards', localInRoom('service-yards', 'loading-dock'));

const placed = (location: WorldLocation) => (record: CharacterRecord): CharacterRecord => ({ ...record, location });

interface Second {
  readonly player: Player;
  readonly sink: RecordingSink;
  send(message: GameplayMessage): void;
}

function joinSecond(harness: Harness, location: WorldLocation, changes: Partial<CharacterRecord> = {}): Second {
  const record = createCharacterRecord({ ...createDefaultDraft(), name: 'Second Operative' }, { id: 'character-2', accountId: 'account-2' }, GAME_CONTENT);
  const sink = new RecordingSink();
  const player = harness.gameplay.enterWorld({ ...record, quests: {}, location, ...changes }, sink);
  return { player, sink, send: (message) => harness.gameplay.handle(player, message) };
}

const chatLines = (sink: RecordingSink, channel: string) =>
  sink.messages.flatMap((message) => (message.type === 'chat.message' && message.channel === channel ? [message] : []));

describe('parties', () => {
  test('invite, accept, party chat and leaving', () => {
    const harness = createHarness({ prepare: placed(PLAZA) });
    const second = joinSecond(harness, PLAZA);

    harness.send({ type: 'party.invite', name: 'second operative' });
    const invite = second.sink.last('party.invited');
    assert.equal(invite?.inviterName, 'Test Operative');
    second.send({ type: 'party.accept', inviterId: invite!.inviterId });

    const view = harness.sink.last('party.state')?.party;
    assert.equal(view?.leaderId, harness.player.record.id);
    assert.deepEqual(view?.members.map((member) => member.name), ['Test Operative', 'Second Operative']);
    assert.equal(second.sink.last('party.state')?.party?.members.length, 2);

    second.send({ type: 'chat.say', text: 'ready when you are', channel: 'party' });
    assert.ok(chatLines(harness.sink, 'party').some((line) => line.author === 'Second Operative' && line.text === 'ready when you are'));

    harness.send({ type: 'party.leave' });
    assert.equal(harness.sink.last('party.state')?.party, null);
    assert.equal(second.sink.last('party.state')?.party, null);
  });

  test('party members nearby share kill credit for contracts, and spawn into the same layer', () => {
    const skills = createStartingSkills({ closeQuarters: experienceForLevel(30), fortitude: experienceForLevel(30) });
    const fighter = { skills, vitals: { integrity: maxIntegrityFor(skills) } };
    const harness = createHarness({ prepare: (record) => ({ ...placed(DOCKS)(record), ...fighter }) });
    const board = { ...emptyContractLedger(), daily: { period: contractPeriod('daily', Date.now()), entries: [{ contractId: 'daily:yard-sweep', progress: 0, claimed: false }] } };
    const second = joinSecond(harness, DOCKS, { contracts: board });
    harness.send({ type: 'party.invite', name: 'Second Operative' });
    second.send({ type: 'party.accept', inviterId: harness.player.record.id });

    const creature = harness.gameplay.world.levelOf(harness.player).creatureByInstance('yd-dock-drone-a');
    assert.ok(creature?.isAlive);
    harness.send({ type: 'world.interact', targetKind: 'creature', instanceId: 'yd-dock-drone-a', interactionIndex: 0 });
    harness.ticksUntil(() => !creature.isAlive, 400);
    assert.equal(second.player.record.contracts.daily?.entries[0]?.progress, 1);

    harness.gameplay.leaveWorld(second.player);
    const rejoined = harness.gameplay.enterWorld(second.player.record, second.sink);
    assert.equal(harness.gameplay.world.levelOf(rejoined), harness.gameplay.world.levelOf(harness.player));
  });
});

describe('whispers and contacts', () => {
  test('whispers resolve multi-word names and can be replied to', () => {
    const harness = createHarness({ prepare: placed(PLAZA) });
    const second = joinSecond(harness, PLAZA);
    second.send({ type: 'chat.whisper', to: 'Test', text: 'Operative meet me at the board' });
    const received = chatLines(harness.sink, 'whisper').at(-1);
    assert.deepEqual([received?.author, received?.text], ['Second Operative', 'meet me at the board']);
    assert.equal(chatLines(second.sink, 'whisper').at(-1)?.recipient, 'Test Operative');

    harness.player.lastWhisperFrom = 'Second Operative';
    harness.gameplay.handle(harness.player, { type: 'chat.whisper', to: 'Nobody Here', text: 'hello?' });
    assert.ok(harness.sink.messages.some((message) => message.type === 'notice' && message.text.includes('not on site')));
  });

  test('contacts show who is online and where', () => {
    const harness = createHarness({ prepare: placed(PLAZA) });
    const second = joinSecond(harness, PLAZA);
    harness.send({ type: 'friends.add', name: 'Second Operative' });
    assert.deepEqual(harness.player.record.friends, [{ characterId: 'character-2', name: 'Second Operative' }]);
    const online = harness.sink.last('friends.state')?.friends[0];
    assert.equal(online?.online, true);
    assert.equal(online?.districtName, 'Meridian Atrium');

    harness.gameplay.leaveWorld(second.player);
    assert.equal(harness.sink.last('friends.state')?.friends[0]?.online, false);

    harness.send({ type: 'friends.remove', characterId: 'character-2' });
    assert.deepEqual(harness.player.record.friends, []);
  });
});
