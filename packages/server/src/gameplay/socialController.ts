import {
  addFriend,
  combatLevel,
  FRIEND_LIMIT,
  inviteBlocker,
  joinParty,
  leaveParty,
  normalizeCharacterName,
  PARTY_INVITE_TICKS,
  promoteLeader,
  removeFriend,
  renameFriend,
  type CharacterId,
  type FriendEntry,
  type FriendView,
  type GameContent,
  type NoticeTone,
  type Party,
  type PartyView,
} from '@containment/shared';
import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';

const CONTROL_CHARACTERS = new RegExp('[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e]', 'g');
const MIN_INTERVAL_MS = 700;
const SITE_INTERVAL_MS = 5000;
const FRIEND_REFRESH_TICKS = 20;

export const sanitizeChat = (text: string): string => text.replace(CONTROL_CHARACTERS, '').replace(/\s+/g, ' ').trim();

export interface SocialHost {
  notify(player: Player, tone: NoticeTone, text: string): void;
  onlinePlayer(characterId: CharacterId): Player | undefined;
  onlinePlayers(): Iterable<Player>;
  findCharacter(name: string): FriendEntry | null;
}

interface PendingInvite {
  readonly inviterId: CharacterId;
  readonly expiresAtTick: number;
}

export class SocialController {
  private readonly content: GameContent;
  private readonly world: World;
  private readonly host: SocialHost;
  private readonly parties = new Map<string, Party>();
  private readonly partyOf = new Map<CharacterId, string>();
  private readonly invites = new Map<CharacterId, PendingInvite[]>();
  private readonly lastSent = new Map<CharacterId, string>();
  private readonly lastFriendsSent = new Map<CharacterId, string>();
  private readonly lastMessageAt = new Map<CharacterId, number>();
  private readonly lastSiteMessageAt = new Map<CharacterId, number>();
  private nextPartyNumber = 1;
  private tickNumber = 0;

  constructor(content: GameContent, world: World, host: SocialHost) {
    this.content = content;
    this.world = world;
    this.host = host;
  }

  partyFor(characterId: CharacterId): Party | null {
    const partyId = this.partyOf.get(characterId);
    return partyId ? (this.parties.get(partyId) ?? null) : null;
  }

  partyMatesOf(player: Player): Player[] {
    const party = this.partyFor(player.record.id);
    if (!party) return [];
    return party.memberIds.filter((memberId) => memberId !== player.record.id).flatMap((memberId) => this.host.onlinePlayer(memberId) ?? []);
  }

  arrive(player: Player): void {
    this.sendFriends(player);
    this.announcePresence(player, true);
  }

  depart(player: Player): void {
    const characterId = player.record.id;
    this.leave(player, true);
    this.invites.delete(characterId);
    for (const [inviteeId, pending] of this.invites) {
      this.invites.set(inviteeId, pending.filter((invite) => invite.inviterId !== characterId));
    }
    this.lastSent.delete(characterId);
    this.lastFriendsSent.delete(characterId);
    this.lastMessageAt.delete(characterId);
    this.lastSiteMessageAt.delete(characterId);
    this.announcePresence(player, false);
  }

  say(player: Player, rawText: string, channel: 'local' | 'party' | 'site', now: number): void {
    const text = this.acceptText(player, rawText, now);
    if (!text) return;
    if (channel === 'local') {
      const level = this.world.levelOf(player);
      level.broadcastNear(player.position, { type: 'chat.message', channel: 'local', author: player.record.name, text });
      level.broadcastNear(player.position, { type: 'world.speech', entityId: player.entityId, text });
      return;
    }
    if (channel === 'party') {
      const party = this.partyFor(player.record.id);
      if (!party) {
        this.host.notify(player, 'warning', 'You are not in a party. Invite someone with /invite Name.');
        return;
      }
      for (const memberId of party.memberIds) this.host.onlinePlayer(memberId)?.send({ type: 'chat.message', channel: 'party', author: player.record.name, text });
      return;
    }
    if (now - (this.lastSiteMessageAt.get(player.record.id) ?? -Infinity) < SITE_INTERVAL_MS) {
      this.host.notify(player, 'warning', 'Site-wide chat is limited to one message every five seconds.');
      return;
    }
    this.lastSiteMessageAt.set(player.record.id, now);
    for (const other of this.host.onlinePlayers()) other.send({ type: 'chat.message', channel: 'site', author: player.record.name, text });
  }

  whisper(player: Player, to: string, rawText: string, now: number): void {
    const resolved = this.resolveWhisper(to, rawText);
    if (!resolved) {
      this.host.notify(player, 'warning', `${normalizeCharacterName(to)} is not on site right now.`);
      return;
    }
    const { recipient, text: unsafe } = resolved;
    if (recipient === player) {
      this.host.notify(player, 'warning', 'Talking to yourself is a containment warning sign.');
      return;
    }
    const text = this.acceptText(player, unsafe, now);
    if (!text) return;
    recipient.lastWhisperFrom = player.record.name;
    recipient.send({ type: 'chat.message', channel: 'whisper', author: player.record.name, text });
    player.send({ type: 'chat.message', channel: 'whisper', recipient: recipient.record.name, text });
  }

  reply(player: Player, text: string, now: number): void {
    if (!player.lastWhisperFrom) {
      this.host.notify(player, 'warning', 'Nobody has whispered to you yet.');
      return;
    }
    this.whisper(player, player.lastWhisperFrom, text, now);
  }

  invite(player: Player, name: string): void {
    const invitee = this.onlineByName(name);
    if (!invitee) {
      this.host.notify(player, 'warning', `${normalizeCharacterName(name)} is not on site right now.`);
      return;
    }
    const party = this.partyFor(player.record.id);
    const blocker = inviteBlocker(party, player.record.id, this.partyFor(invitee.record.id), invitee.record.id);
    if (blocker) {
      this.host.notify(player, 'warning', blocker);
      return;
    }
    const pending = (this.invites.get(invitee.record.id) ?? []).filter((invite) => invite.inviterId !== player.record.id);
    this.invites.set(invitee.record.id, [...pending, { inviterId: player.record.id, expiresAtTick: this.tickNumber + PARTY_INVITE_TICKS }]);
    invitee.send({ type: 'party.invited', inviterId: player.record.id, inviterName: player.record.name });
    this.host.notify(player, 'info', `Party invite sent to ${invitee.record.name}.`);
  }

  private acceptText(player: Player, rawText: string, now: number): string | null {
    const text = sanitizeChat(rawText);
    if (!text) return null;
    if (now - (this.lastMessageAt.get(player.record.id) ?? -Infinity) < MIN_INTERVAL_MS) {
      this.host.notify(player, 'warning', 'You are speaking too quickly.');
      return null;
    }
    this.lastMessageAt.set(player.record.id, now);
    return text;
  }

  acceptInvite(player: Player, inviterId: CharacterId): void {
    const pending = this.invites.get(player.record.id) ?? [];
    const invite = pending.find((candidate) => candidate.inviterId === inviterId && candidate.expiresAtTick >= this.tickNumber);
    this.invites.set(player.record.id, pending.filter((candidate) => candidate.inviterId !== inviterId));
    const inviter = this.host.onlinePlayer(inviterId);
    if (!invite || !inviter) {
      this.host.notify(player, 'warning', 'That party invite has expired.');
      return;
    }
    if (this.partyFor(player.record.id)) {
      this.host.notify(player, 'warning', 'Leave your current party first.');
      return;
    }
    const existing = this.partyFor(inviterId);
    if (existing && existing.leaderId !== inviterId) {
      this.host.notify(player, 'warning', `${inviter.record.name} is no longer leading a party.`);
      return;
    }
    const base: Party = existing ?? { id: `party-${this.nextPartyNumber++}`, leaderId: inviterId, memberIds: [inviterId] };
    const joined = joinParty(base, player.record.id);
    if (!joined.ok) {
      this.host.notify(player, 'warning', joined.error);
      return;
    }
    this.store(joined.value);
    this.invites.delete(player.record.id);
    this.tellParty(joined.value, `${player.record.name} joined the party.`);
  }

  declineInvite(player: Player, inviterId: CharacterId): void {
    const pending = this.invites.get(player.record.id) ?? [];
    if (!pending.some((invite) => invite.inviterId === inviterId)) return;
    this.invites.set(player.record.id, pending.filter((invite) => invite.inviterId !== inviterId));
    const inviter = this.host.onlinePlayer(inviterId);
    if (inviter) this.host.notify(inviter, 'info', `${player.record.name} declined your party invite.`);
  }

  leave(player: Player, silently = false): void {
    const party = this.partyFor(player.record.id);
    if (!party) {
      if (!silently) this.host.notify(player, 'warning', 'You are not in a party.');
      return;
    }
    this.removeMember(party, player.record.id, `${player.record.name} left the party.`);
    if (!silently) this.host.notify(player, 'info', 'You left the party.');
  }

  kick(player: Player, characterId: CharacterId): void {
    const party = this.partyFor(player.record.id);
    if (!party || party.leaderId !== player.record.id) {
      this.host.notify(player, 'warning', 'Only the party leader can remove members.');
      return;
    }
    if (characterId === player.record.id || !party.memberIds.includes(characterId)) return;
    const kicked = this.host.onlinePlayer(characterId);
    this.removeMember(party, characterId, `${kicked?.record.name ?? 'An operative'} was removed from the party.`);
    if (kicked) this.host.notify(kicked, 'warning', 'You were removed from the party.');
  }

  promote(player: Player, characterId: CharacterId): void {
    const party = this.partyFor(player.record.id);
    if (!party) return;
    const promoted = promoteLeader(party, player.record.id, characterId);
    if (!promoted.ok) {
      this.host.notify(player, 'warning', promoted.error);
      return;
    }
    this.store(promoted.value);
    this.tellParty(promoted.value, `${this.host.onlinePlayer(characterId)?.record.name ?? 'Someone'} now leads the party.`);
  }

  addFriend(player: Player, name: string): void {
    const online = this.onlineByName(name);
    const entry = online ? { characterId: online.record.id, name: online.record.name } : this.host.findCharacter(name);
    if (!entry) {
      this.host.notify(player, 'warning', `No operative named ${normalizeCharacterName(name)} is on the Site roster.`);
      return;
    }
    const added = addFriend(player.record.friends, player.record.id, entry);
    if (!added.ok) {
      this.host.notify(player, 'warning', added.error);
      return;
    }
    player.update({ friends: added.value });
    this.host.notify(player, 'success', `${entry.name} added to your contacts (${added.value.length}/${FRIEND_LIMIT}).`);
    this.sendFriends(player);
  }

  removeFriend(player: Player, characterId: CharacterId): void {
    const before = player.record.friends.length;
    const friends = removeFriend(player.record.friends, characterId);
    if (friends.length === before) return;
    player.update({ friends });
    this.sendFriends(player);
  }

  tick(tick: number): void {
    this.tickNumber = tick;
    for (const [inviteeId, pending] of this.invites) {
      const live = pending.filter((invite) => invite.expiresAtTick >= tick);
      if (live.length === 0) this.invites.delete(inviteeId);
      else if (live.length !== pending.length) this.invites.set(inviteeId, live);
    }
    for (const party of this.parties.values()) this.publish(party);
    if (tick % FRIEND_REFRESH_TICKS === 0) {
      for (const player of this.host.onlinePlayers()) if (player.record.friends.length > 0) this.sendFriends(player);
    }
  }

  private resolveWhisper(to: string, text: string): { readonly recipient: Player; readonly text: string } | null {
    const direct = this.onlineByName(to);
    if (direct) return { recipient: direct, text };
    const words = `${to} ${text}`.split(/\s+/);
    for (let length = words.length - 1; length >= 1; length--) {
      const recipient = this.onlineByName(words.slice(0, length).join(' '));
      if (recipient) return { recipient, text: words.slice(length).join(' ') };
    }
    return null;
  }

  private onlineByName(name: string): Player | undefined {
    const wanted = normalizeCharacterName(name).toLowerCase();
    for (const player of this.host.onlinePlayers()) {
      if (player.record.name.toLowerCase() === wanted) return player;
    }
    return undefined;
  }

  private store(party: Party): void {
    this.parties.set(party.id, party);
    for (const memberId of party.memberIds) this.partyOf.set(memberId, party.id);
    this.publish(party);
  }

  private removeMember(party: Party, characterId: CharacterId, announcement: string): void {
    this.partyOf.delete(characterId);
    this.lastSent.delete(characterId);
    this.host.onlinePlayer(characterId)?.send({ type: 'party.state', party: null });
    const remaining = leaveParty(party, characterId);
    if (remaining) {
      this.store(remaining);
      this.tellParty(remaining, announcement);
      return;
    }
    this.parties.delete(party.id);
    for (const memberId of party.memberIds.filter((memberId) => memberId !== characterId)) {
      this.partyOf.delete(memberId);
      this.lastSent.delete(memberId);
      const member = this.host.onlinePlayer(memberId);
      if (!member) continue;
      member.send({ type: 'party.state', party: null });
      this.host.notify(member, 'info', 'The party has disbanded.');
    }
  }

  private tellParty(party: Party, text: string): void {
    for (const memberId of party.memberIds) this.host.onlinePlayer(memberId)?.send({ type: 'chat.message', channel: 'party', text });
  }

  private publish(party: Party): void {
    const view = this.viewOf(party);
    const serialized = JSON.stringify(view);
    for (const memberId of party.memberIds) {
      if (this.lastSent.get(memberId) === serialized) continue;
      const member = this.host.onlinePlayer(memberId);
      if (!member) continue;
      this.lastSent.set(memberId, serialized);
      member.send({ type: 'party.state', party: view });
    }
  }

  private viewOf(party: Party): PartyView {
    return {
      leaderId: party.leaderId,
      members: party.memberIds.flatMap((memberId) => {
        const member = this.host.onlinePlayer(memberId);
        if (!member) return [];
        return [{
          characterId: memberId,
          name: member.record.name,
          combatLevel: combatLevel(member.record.skills),
          districtName: this.districtNameOf(member),
          integrity: member.integrity,
          maxIntegrity: member.maxIntegrity,
        }];
      }),
    };
  }

  private districtNameOf(player: Player): string | null {
    const districtId = this.world.districtOf(player);
    return districtId ? (this.content.districts.get(districtId)?.name ?? null) : null;
  }

  private sendFriends(player: Player): void {
    const friends: FriendView[] = player.record.friends.map((friend) => {
      const online = this.host.onlinePlayer(friend.characterId);
      return { ...friend, name: online?.record.name ?? friend.name, online: Boolean(online), districtName: online ? this.districtNameOf(online) : null };
    });
    const serialized = JSON.stringify(friends);
    if (this.lastFriendsSent.get(player.record.id) === serialized) return;
    this.lastFriendsSent.set(player.record.id, serialized);
    player.send({ type: 'friends.state', friends });
  }

  private announcePresence(player: Player, online: boolean): void {
    for (const other of this.host.onlinePlayers()) {
      if (other === player || !other.record.friends.some((friend) => friend.characterId === player.record.id)) continue;
      other.update({ friends: renameFriend(other.record.friends, player.record.id, player.record.name) });
      this.host.notify(other, 'info', `${player.record.name} has ${online ? 'come on site' : 'gone off site'}.`);
      this.sendFriends(other);
    }
  }
}
