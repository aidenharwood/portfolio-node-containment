import type { CharacterId } from '../ids.ts';
import { failure, success, type Result } from '../result.ts';

export const PARTY_SIZE_LIMIT = 5;

export const PARTY_INVITE_TICKS = 200;

export interface Party {
  readonly id: string;
  readonly leaderId: CharacterId;
  readonly memberIds: readonly CharacterId[];
}

export interface PartyMemberView {
  readonly characterId: CharacterId;
  readonly name: string;
  readonly combatLevel: number;
  readonly districtName: string | null;
  readonly integrity: number;
  readonly maxIntegrity: number;
}

export interface PartyView {
  readonly leaderId: CharacterId;
  readonly members: readonly PartyMemberView[];
}

export function inviteBlocker(party: Party | null, inviterId: CharacterId, inviteeParty: Party | null, inviteeId: CharacterId): string | null {
  if (inviterId === inviteeId) return 'You cannot invite yourself.';
  if (party && party.leaderId !== inviterId) return 'Only the party leader can invite.';
  if (party && party.memberIds.length >= PARTY_SIZE_LIMIT) return `Your party is full (${PARTY_SIZE_LIMIT}).`;
  if (inviteeParty) return party && inviteeParty.id === party.id ? 'They are already in your party.' : 'They are already in a party.';
  return null;
}

export function joinParty(party: Party, characterId: CharacterId): Result<Party> {
  if (party.memberIds.includes(characterId)) return failure('You are already in that party.');
  if (party.memberIds.length >= PARTY_SIZE_LIMIT) return failure('That party is full.');
  return success({ ...party, memberIds: [...party.memberIds, characterId] });
}

export function leaveParty(party: Party, characterId: CharacterId): Party | null {
  const memberIds = party.memberIds.filter((memberId) => memberId !== characterId);
  if (memberIds.length < 2) return null;
  const leaderId = party.leaderId === characterId ? memberIds[0]! : party.leaderId;
  return { ...party, leaderId, memberIds };
}

export function promoteLeader(party: Party, actorId: CharacterId, newLeaderId: CharacterId): Result<Party> {
  if (party.leaderId !== actorId) return failure('Only the party leader can hand over the lead.');
  if (!party.memberIds.includes(newLeaderId)) return failure('They are not in your party.');
  return success({ ...party, leaderId: newLeaderId });
}
