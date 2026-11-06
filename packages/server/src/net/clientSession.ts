import type { ServerMessage } from '@containment/shared';
import { WebSocket } from 'ws';
import type { IssuedSession } from '../auth/authService.ts';
import type { MessageSink, Player } from '../world/player.ts';

const MESSAGE_BUDGET_PER_SECOND = 30;

export class ClientSession implements MessageSink {
  readonly remoteAddress: string;
  account: IssuedSession | null = null;
  player: Player | null = null;
  private readonly socket: WebSocket;
  private budgetWindowStart = Date.now();
  private messagesInWindow = 0;

  constructor(socket: WebSocket, remoteAddress: string) {
    this.socket = socket;
    this.remoteAddress = remoteAddress;
  }

  send(message: ServerMessage): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  detach(reason: string): void {
    this.player = null;
    this.send({ type: 'error', message: reason });
    this.socket.close(4000, 'displaced');
  }

  withinMessageBudget(now = Date.now()): boolean {
    if (now - this.budgetWindowStart >= 1000) {
      this.budgetWindowStart = now;
      this.messagesInWindow = 0;
    }
    return ++this.messagesInWindow <= MESSAGE_BUDGET_PER_SECOND;
  }
}
