import type { ClientMessage, ServerMessage, ServerMessageOf, ServerMessageType } from '@containment/shared';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

type Listener<T extends ServerMessageType> = (message: ServerMessageOf<T>) => void;

type AnyListener = (message: ServerMessage) => void;

export class GameConnection {
  private socket: WebSocket | null = null;
  private readonly listeners = new Map<ServerMessageType, Set<AnyListener>>();
  private readonly statusListeners = new Set<(status: ConnectionStatus) => void>();
  private readonly url: string;

  constructor(url = GameConnection.defaultUrl()) {
    this.url = url;
  }

  static defaultUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}/ws`;
  }

  connect(): Promise<void> {
    this.emitStatus('connecting');
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;
      socket.addEventListener('open', () => {
        this.emitStatus('open');
        resolve();
      });
      socket.addEventListener('error', () => reject(new Error('Could not reach the game server.')));
      socket.addEventListener('close', () => this.emitStatus('closed'));
      socket.addEventListener('message', (event) => this.dispatch(event.data));
    });
  }

  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  on<T extends ServerMessageType>(type: T, listener: Listener<T>): () => void {
    const bucket = this.listeners.get(type) ?? new Set();
    const general = listener as unknown as AnyListener;
    bucket.add(general);
    this.listeners.set(type, bucket);
    return () => bucket.delete(general);
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private dispatch(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let message: ServerMessage;
    try {
      message = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    for (const listener of this.listeners.get(message.type) ?? []) listener(message);
  }

  private emitStatus(status: ConnectionStatus): void {
    for (const listener of this.statusListeners) listener(status);
  }
}
