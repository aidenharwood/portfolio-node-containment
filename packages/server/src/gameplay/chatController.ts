import type { Player } from '../world/player.ts';
import type { World } from '../world/world.ts';

const CONTROL_CHARACTERS = new RegExp('[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e]', 'g');
const MIN_INTERVAL_MS = 700;

export const sanitizeChat = (text: string): string => text.replace(CONTROL_CHARACTERS, '').replace(/\s+/g, ' ').trim();

export class ChatController {
  private readonly world: World;
  private readonly lastMessageAt = new Map<string, number>();

  constructor(world: World) {
    this.world = world;
  }

  say(player: Player, rawText: string, now = Date.now()): void {
    const text = sanitizeChat(rawText);
    if (!text) return;
    if (now - (this.lastMessageAt.get(player.entityId) ?? 0) < MIN_INTERVAL_MS) {
      player.send({ type: 'notice', tone: 'warning', text: 'You are speaking too quickly.' });
      return;
    }
    this.lastMessageAt.set(player.entityId, now);
    const level = this.world.levelOf(player);
    level.broadcastNear(player.position, { type: 'chat.message', channel: 'local', author: player.record.name, text });
    level.broadcastNear(player.position, { type: 'world.speech', entityId: player.entityId, text });
  }

  forget(player: Player): void {
    this.lastMessageAt.delete(player.entityId);
  }
}
