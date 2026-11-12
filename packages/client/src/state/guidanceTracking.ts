import type { CharacterId, GuidanceTarget, QuestId, WorldObjectId } from '@containment/shared';

const KEY_PREFIX = 'containment.guidance.';
const LEGACY_KEY_PREFIX = 'containment.trackedQuest.';

export function parseGuidanceTarget(stored: string | null, legacy: string | null, isResource: (id: string) => boolean): GuidanceTarget | null {
  if (stored === null) return legacy ? { kind: 'quest', questId: legacy } : null;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { kind, questId, objectId } = value as Record<string, unknown>;
  if (kind === 'quest' && typeof questId === 'string') return { kind, questId };
  if (kind === 'resource' && typeof objectId === 'string' && isResource(objectId)) return { kind, objectId };
  return null;
}

export class GuidanceTracking {
  private readonly isResource: (id: string) => boolean;
  private characterId: CharacterId | null = null;
  private current: GuidanceTarget | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(isResource: (id: string) => boolean) {
    this.isResource = isResource;
  }

  get target(): GuidanceTarget | null {
    return this.current;
  }

  get questId(): QuestId | null {
    return this.current?.kind === 'quest' ? this.current.questId : null;
  }

  get resourceId(): WorldObjectId | null {
    return this.current?.kind === 'resource' ? this.current.objectId : null;
  }

  questPreference(): QuestId | null | false {
    return this.current?.kind === 'resource' ? false : this.questId;
  }

  bind(characterId: CharacterId): void {
    if (this.characterId === characterId) return;
    this.characterId = characterId;
    try {
      this.current = parseGuidanceTarget(localStorage.getItem(KEY_PREFIX + characterId), localStorage.getItem(LEGACY_KEY_PREFIX + characterId), this.isResource);
    } catch {
      this.current = null;
    }
  }

  trackQuest(questId: QuestId): void {
    this.set({ kind: 'quest', questId });
  }

  trackResource(objectId: WorldObjectId): void {
    this.set({ kind: 'resource', objectId });
  }

  untrack(): void {
    this.set(null);
  }

  onChange(listener: () => void): void {
    this.listeners.add(listener);
  }

  private set(target: GuidanceTarget | null): void {
    this.current = target;
    this.persist();
    for (const listener of this.listeners) listener();
  }

  private persist(): void {
    if (!this.characterId) return;
    try {
      localStorage.removeItem(LEGACY_KEY_PREFIX + this.characterId);
      if (this.current) localStorage.setItem(KEY_PREFIX + this.characterId, JSON.stringify(this.current));
      else localStorage.removeItem(KEY_PREFIX + this.characterId);
    } catch {
      return;
    }
  }
}
