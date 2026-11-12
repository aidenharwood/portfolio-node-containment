import type { CharacterId, FriendView, PartyView } from '@containment/shared';
import type { GameConnection } from '../net/gameConnection.ts';

export interface PartyInvite {
  readonly inviterId: CharacterId;
  readonly inviterName: string;
  readonly receivedAt: number;
}

export const INVITE_LIFETIME_MS = 60_000;

export class SocialState {
  party: PartyView | null = null;
  friends: readonly FriendView[] = [];
  private invites: PartyInvite[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly unsubscribers: (() => void)[];
  private readonly connection: GameConnection;

  constructor(connection: GameConnection) {
    this.connection = connection;
    this.unsubscribers = [
      connection.on('party.state', ({ party }) => {
        this.party = party;
        if (party) this.invites = [];
        this.emit();
      }),
      connection.on('friends.state', ({ friends }) => {
        this.friends = friends;
        this.emit();
      }),
      connection.on('party.invited', ({ inviterId, inviterName }) => {
        this.invites = [...this.invites.filter((invite) => invite.inviterId !== inviterId), { inviterId, inviterName, receivedAt: Date.now() }];
        this.emit();
      }),
    ];
  }

  get pendingInvites(): readonly PartyInvite[] {
    const now = Date.now();
    return this.invites.filter((invite) => now - invite.receivedAt < INVITE_LIFETIME_MS);
  }

  respond(inviterId: CharacterId, accept: boolean): void {
    this.connection.send({ type: accept ? 'party.accept' : 'party.decline', inviterId });
    this.invites = this.invites.filter((invite) => invite.inviterId !== inviterId);
    this.emit();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
