import type { CharacterId, QuestId } from '@containment/shared';

const KEY_PREFIX = 'containment.trackedQuest.';

export class QuestTracking {
  private characterId: CharacterId | null = null;
  private tracked: QuestId | null = null;
  private readonly listeners = new Set<() => void>();

  get questId(): QuestId | null {
    return this.tracked;
  }

  bind(characterId: CharacterId): void {
    if (this.characterId === characterId) return;
    this.characterId = characterId;
    try {
      this.tracked = localStorage.getItem(KEY_PREFIX + characterId);
    } catch {
      this.tracked = null;
    }
  }

  track(questId: QuestId): void {
    this.tracked = questId;
    this.persist();
    this.notify();
  }

  private persist(): void {
    if (!this.characterId || !this.tracked) return;
    try {
      localStorage.setItem(KEY_PREFIX + this.characterId, this.tracked);
    } catch {
      return;
    }
  }

  onChange(listener: () => void): void {
    this.listeners.add(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
