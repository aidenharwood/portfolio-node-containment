export const DEATH_ANIMATION_MS = 700;

export const DESPAWN_GRACE_MS = 50;

export const deathStartsAt = (now: number, lastImpactAt: number): number => Math.max(now, lastImpactAt);

export const despawnAt = (now: number, dyingAt: number | null): number => (dyingAt === null ? now : Math.max(now, dyingAt + DEATH_ANIMATION_MS + DESPAWN_GRACE_MS));

export class VitalsSchedule<K> {
  private readonly last = new Map<K, number>();

  slot(key: K, at: number): number {
    const slot = Math.max(at, this.last.get(key) ?? -Infinity);
    this.last.set(key, slot);
    return slot;
  }

  forget(key: K): void {
    this.last.delete(key);
  }
}
