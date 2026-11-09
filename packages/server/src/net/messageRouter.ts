import type { ClientMessage, ClientMessageOf, Result } from '@containment/shared';
import type { AuthService, IssuedSession } from '../auth/authService.ts';
import type { CharacterService } from '../characters/characterService.ts';
import type { Gameplay, GameplayMessage } from '../gameplay/gameplay.ts';
import type { ClientSession } from './clientSession.ts';

const GAMEPLAY_MESSAGE_TYPES = new Set<ClientMessage['type']>([
  'world.walk',
  'world.interact',
  'dialogue.continue',
  'dialogue.choose',
  'dialogue.close',
  'inventory.equip',
  'inventory.use',
  'inventory.drop',
  'inventory.destroy',
  'world.pickup',
  'inventory.swap',
  'equipment.unequip',
  'chat.say',
  'chat.whisper',
  'party.invite',
  'party.accept',
  'party.decline',
  'party.leave',
  'party.kick',
  'party.promote',
  'friends.add',
  'friends.remove',
  'contracts.claim',
  'contracts.close',
  'shop.buy',
  'shop.sell',
  'shop.close',
  'crafting.make',
  'crafting.close',
  'storage.deposit',
  'storage.depositAll',
  'storage.withdraw',
  'storage.close',
  'market.place',
  'market.cancel',
  'market.collect',
  'market.close',
  'tram.board',
]);

const isGameplayMessage = (message: ClientMessage): message is GameplayMessage => GAMEPLAY_MESSAGE_TYPES.has(message.type);

export class MessageRouter {
  private readonly auth: AuthService;
  private readonly characters: CharacterService;
  private readonly gameplay: Gameplay;

  constructor(auth: AuthService, characters: CharacterService, gameplay: Gameplay) {
    this.auth = auth;
    this.characters = characters;
    this.gameplay = gameplay;
  }

  async dispatch(session: ClientSession, message: ClientMessage): Promise<void> {
    if (isGameplayMessage(message)) {
      if (session.player) this.gameplay.handle(session.player, message);
      return;
    }

    switch (message.type) {
      case 'auth.register':
        return this.completeAuthentication(session, await this.guardAnonymous(session, () => this.auth.register(message.username, message.password)));
      case 'auth.login':
        return this.completeAuthentication(
          session,
          await this.guardAnonymous(session, () => this.auth.login(message.username, message.password, session.remoteAddress)),
        );
      case 'auth.resume':
        return this.completeAuthentication(session, await this.guardAnonymous(session, async () => this.auth.resume(message.token)));
      case 'auth.logout':
        return this.logout(session);
      case 'character.create':
        return this.createCharacter(session, message);
      case 'character.select':
        return this.selectCharacter(session, message);
      case 'character.leaveWorld':
        return this.leaveWorld(session);
      case 'character.delete':
        return this.deleteCharacter(session, message);
    }
  }

  disconnect(session: ClientSession): void {
    if (session.player) this.gameplay.leaveWorld(session.player);
    session.player = null;
  }

  private async guardAnonymous(
    session: ClientSession,
    attempt: () => Promise<Result<IssuedSession>>,
  ): Promise<Result<IssuedSession>> {
    if (session.account) return { ok: false, error: 'You are already signed in.' };
    return attempt();
  }

  private completeAuthentication(session: ClientSession, result: Result<IssuedSession>): void {
    if (!result.ok) {
      session.send({ type: 'auth.rejected', reason: result.error });
      return;
    }
    session.account = result.value;
    session.send({ type: 'auth.accepted', token: result.value.token, username: result.value.username });
    this.sendRoster(session);
  }

  private logout(session: ClientSession): void {
    this.disconnect(session);
    if (session.account) this.auth.logout(session.account.token);
    session.account = null;
    session.send({ type: 'auth.loggedOut' });
  }

  private createCharacter(session: ClientSession, message: ClientMessageOf<'character.create'>): void {
    if (!session.account || session.player) return;
    const result = this.characters.create(session.account.accountId, message.draft);
    if (!result.ok) {
      session.send({ type: 'character.rejected', errors: result.error });
      return;
    }
    session.player = this.gameplay.enterWorld(result.value, session);
  }

  private deleteCharacter(session: ClientSession, message: ClientMessageOf<'character.delete'>): void {
    if (!session.account || session.player) return;
    if (this.gameplay.isOnline(message.characterId)) {
      session.send({ type: 'character.rejected', errors: ['That operative is deployed right now. Leave the world with them first.'] });
      return;
    }
    const result = this.characters.remove(session.account.accountId, message.characterId, message.confirmName);
    if (!result.ok) {
      session.send({ type: 'character.rejected', errors: [result.error] });
      return;
    }
    this.gameplay.forgetCharacter(message.characterId);
    this.sendRoster(session);
  }

  private selectCharacter(session: ClientSession, message: ClientMessageOf<'character.select'>): void {
    if (!session.account || session.player) return;
    const record = this.characters.load(session.account.accountId, message.characterId);
    if (!record) {
      session.send({ type: 'error', message: 'That personnel file could not be found.' });
      return;
    }
    session.player = this.gameplay.enterWorld(record, session);
  }

  private leaveWorld(session: ClientSession): void {
    this.disconnect(session);
    this.sendRoster(session);
  }

  private sendRoster(session: ClientSession): void {
    if (!session.account) return;
    session.send({
      type: 'character.roster',
      characters: this.characters.roster(session.account.accountId),
      maxCharacters: this.characters.maxCharactersPerAccount,
    });
  }
}
