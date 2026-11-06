import type { CharacterSummary } from '@containment/shared';
import type { GameConnection } from './net/gameConnection.ts';
import { createCreatorScreen } from './screens/creatorScreen.ts';
import { createGameScreen } from './screens/gameScreen.ts';
import { createLoginScreen } from './screens/loginScreen.ts';
import { createRosterScreen } from './screens/rosterScreen.ts';
import { tokenStore } from './state/tokenStore.ts';
import { WorldState } from './state/worldState.ts';
import { h, type Screen } from './ui/dom.ts';

type ScreenName = 'login' | 'roster' | 'creator' | 'game' | 'connecting';

export interface AppNavigator {
  readonly connection: GameConnection;
  readonly world: WorldState;
  readonly username: string;
  showRoster(): void;
  showCreator(): void;
}

export class App implements AppNavigator {
  readonly connection: GameConnection;
  readonly world: WorldState;
  username = '';
  private readonly root: HTMLElement;
  private screen: Screen | null = null;
  private screenName: ScreenName = 'connecting';
  private roster: readonly CharacterSummary[] = [];
  private maxCharacters = 0;
  private resuming = false;

  constructor(root: HTMLElement, connection: GameConnection) {
    this.root = root;
    this.connection = connection;
    this.world = new WorldState(connection);
  }

  async start(): Promise<void> {
    this.listen();
    this.mount('connecting', statusScreen('Establishing secure uplink…'));
    try {
      await this.connection.connect();
    } catch {
      this.mount('connecting', statusScreen('Uplink failed. The game server is unreachable.', true));
      return;
    }
    const token = tokenStore.read();
    if (token) {
      this.resuming = true;
      this.connection.send({ type: 'auth.resume', token });
    } else {
      this.showLogin();
    }
  }

  showLogin(): void {
    this.mount('login', createLoginScreen(this.connection));
  }

  showRoster(): void {
    this.mount('roster', createRosterScreen(this, this.roster, this.maxCharacters));
  }

  showCreator(): void {
    this.mount('creator', createCreatorScreen(this, this.roster.length > 0));
  }

  private listen(): void {
    this.connection.on('auth.accepted', ({ token, username }) => {
      this.resuming = false;
      this.username = username;
      tokenStore.write(token);
    });
    this.connection.on('auth.rejected', () => {
      if (!this.resuming) return;
      this.resuming = false;
      tokenStore.clear();
      this.showLogin();
    });
    this.connection.on('auth.loggedOut', () => {
      tokenStore.clear();
      this.showLogin();
    });
    this.connection.on('character.roster', ({ characters, maxCharacters }) => {
      this.roster = characters;
      this.maxCharacters = maxCharacters;
      if (characters.length === 0) this.showCreator();
      else this.showRoster();
    });
    this.connection.on('world.entered', () => {
      if (this.screenName !== 'game') this.mount('game', createGameScreen(this));
    });
    this.connection.onStatus((status) => {
      if (status === 'closed') this.mount('connecting', statusScreen('Connection to Site Meridian lost.', true));
    });
  }

  private mount(name: ScreenName, screen: Screen): void {
    this.screen?.unmount();
    this.root.replaceChildren(screen.element);
    this.screen = screen;
    this.screenName = name;
  }
}

function statusScreen(message: string, offerReload = false): Screen {
  const element = h(
    'div',
    { className: 'screen status-screen' },
    h('div', { className: 'status-card panel' }, h('div', { className: 'status-spinner' }), h('p', {}, message), offerReload && h('button', { className: 'button primary', onclick: () => location.reload() }, 'Reconnect')),
  );
  return { element, unmount: () => undefined };
}
