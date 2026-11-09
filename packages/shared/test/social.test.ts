import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { addFriend, inviteBlocker, joinParty, leaveParty, parseChatInput, PARTY_SIZE_LIMIT, whisperPrefix, type Party } from '../src/index.ts';

describe('chat commands', () => {
  test('parses channels, whispers and party commands', () => {
    assert.deepEqual(parseChatInput('hello'), { kind: 'say', channel: 'local', text: 'hello' });
    assert.deepEqual(parseChatInput('/p on my way'), { kind: 'say', channel: 'party', text: 'on my way' });
    assert.deepEqual(parseChatInput('/s anyone selling seals?'), { kind: 'say', channel: 'site', text: 'anyone selling seals?' });
    assert.deepEqual(parseChatInput('/w "Test Operative" hi there'), { kind: 'whisper', to: 'Test Operative', text: 'hi there' });
    assert.deepEqual(parseChatInput('/w Rook hi'), { kind: 'whisper', to: 'Rook', text: 'hi' });
    assert.deepEqual(parseChatInput('/invite "Test Operative"'), { kind: 'invite', name: 'Test Operative' });
    assert.deepEqual(parseChatInput('/r thanks'), { kind: 'reply', text: 'thanks' });
    assert.deepEqual(parseChatInput('/dance'), { kind: 'unknown', command: 'dance' });
    assert.equal(parseChatInput('/w Rook'), null);
    assert.equal(whisperPrefix('Test Operative'), '/w "Test Operative" ');
  });
});

describe('parties', () => {
  const party: Party = { id: 'p', leaderId: 'a', memberIds: ['a', 'b'] };

  test('only the leader of a party with room may invite someone unpartied', () => {
    assert.equal(inviteBlocker(null, 'a', null, 'b'), null);
    assert.match(inviteBlocker(party, 'b', null, 'c') ?? '', /leader/);
    assert.match(inviteBlocker(party, 'a', party, 'b') ?? '', /already in your party/);
    const full: Party = { ...party, memberIds: Array.from({ length: PARTY_SIZE_LIMIT }, (_, index) => `m${index}`) };
    assert.match(inviteBlocker({ ...full, leaderId: 'm0' }, 'm0', null, 'z') ?? '', /full/);
  });

  test('hands the lead on when the leader leaves and disbands below two', () => {
    const grown = joinParty(party, 'c');
    assert.ok(grown.ok);
    assert.deepEqual(leaveParty(grown.value, 'a'), { id: 'p', leaderId: 'b', memberIds: ['b', 'c'] });
    assert.equal(leaveParty(party, 'b'), null);
  });
});

describe('contacts', () => {
  test('refuses yourself and duplicates and keeps the list sorted', () => {
    assert.equal(addFriend([], 'a', { characterId: 'a', name: 'Me' }).ok, false);
    const added = addFriend([{ characterId: 'z', name: 'Zed' }], 'a', { characterId: 'b', name: 'Bea' });
    assert.ok(added.ok);
    assert.deepEqual(added.value.map((friend) => friend.name), ['Bea', 'Zed']);
    assert.equal(addFriend(added.value, 'a', { characterId: 'b', name: 'Bea' }).ok, false);
  });
});
