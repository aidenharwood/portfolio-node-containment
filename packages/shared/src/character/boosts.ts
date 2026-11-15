import type { ItemId } from '../ids.ts';
import { STAT_IDS, STAT_INFO, type StatBlock, type StatId } from '../gear/stats.ts';

export const STANDARD_TICK_MS = 300;

export const boostTicksForMinutes = (minutes: number): number => Math.round((minutes * 60_000) / STANDARD_TICK_MS);

export interface ConsumableBoost {
  readonly stats: StatBlock;
  readonly durationTicks: number;
}

export interface ActiveBoost {
  readonly itemId: ItemId;
  readonly stats: StatBlock;
  readonly startedAtTick: number;
  readonly expiresAtTick: number;
}

export interface BoostView {
  readonly itemId: ItemId;
  readonly stats: StatBlock;
  readonly remainingMs: number;
  readonly durationMs: number;
}

export interface StoredBoost {
  readonly itemId: ItemId;
  readonly remainingTicks: number;
}

export function applyBoost(boosts: readonly ActiveBoost[], itemId: ItemId, boost: ConsumableBoost, tick: number): ActiveBoost[] {
  const next: ActiveBoost = { itemId, stats: boost.stats, startedAtTick: tick, expiresAtTick: tick + boost.durationTicks };
  return boosts.some((active) => active.itemId === itemId) ? boosts.map((active) => (active.itemId === itemId ? next : active)) : [...boosts, next];
}

export function supersededStats(boosts: readonly ActiveBoost[] | readonly BoostView[], itemId: ItemId): ReadonlySet<StatId> {
  const own = boosts.find((boost) => boost.itemId === itemId);
  const others = boosts.filter((boost) => boost.itemId !== itemId);
  const superseded = new Set<StatId>();
  if (!own) return superseded;
  for (const id of STAT_IDS) {
    const value = own.stats[id] ?? 0;
    if (value > 0 && others.some((other) => (other.stats[id] ?? 0) > value)) superseded.add(id);
  }
  return superseded;
}

export function isBoostRedundant(boosts: readonly ActiveBoost[], itemId: ItemId, stats: StatBlock): boolean {
  const others = boostStats(boosts.filter((boost) => boost.itemId !== itemId));
  const granted = STAT_IDS.filter((id) => (stats[id] ?? 0) > 0);
  return granted.length > 0 && granted.every((id) => others[id] > (stats[id] ?? 0));
}

export function storeBoosts(boosts: readonly ActiveBoost[], tick: number): StoredBoost[] {
  return boosts.map((boost) => ({ itemId: boost.itemId, remainingTicks: Math.max(0, boost.expiresAtTick - tick) })).filter((boost) => boost.remainingTicks > 0);
}

export function restoreBoosts(stored: readonly StoredBoost[] | undefined, boostOf: (itemId: ItemId) => ConsumableBoost | undefined, tick: number): ActiveBoost[] {
  const restored: ActiveBoost[] = [];
  for (const { itemId, remainingTicks } of stored ?? []) {
    const boost = boostOf(itemId);
    if (!boost || remainingTicks <= 0) continue;
    const remaining = Math.min(remainingTicks, boost.durationTicks);
    restored.push({ itemId, stats: boost.stats, startedAtTick: tick - (boost.durationTicks - remaining), expiresAtTick: tick + remaining });
  }
  return restored;
}

export function expireBoosts(boosts: readonly ActiveBoost[], tick: number): { readonly active: ActiveBoost[]; readonly expired: ActiveBoost[] } {
  const active: ActiveBoost[] = [];
  const expired: ActiveBoost[] = [];
  for (const boost of boosts) (boost.expiresAtTick <= tick ? expired : active).push(boost);
  return { active, expired };
}

export function boostStats(boosts: readonly ActiveBoost[]): Readonly<Record<StatId, number>> {
  const totals = Object.fromEntries(STAT_IDS.map((id) => [id, 0])) as Record<StatId, number>;
  for (const boost of boosts) for (const id of STAT_IDS) totals[id] = Math.max(totals[id], boost.stats[id] ?? 0);
  return totals;
}

export function boostViews(boosts: readonly ActiveBoost[], tick: number, tickMs: number): BoostView[] {
  return boosts.map((boost) => ({
    itemId: boost.itemId,
    stats: boost.stats,
    remainingMs: Math.max(0, boost.expiresAtTick - tick) * tickMs,
    durationMs: (boost.expiresAtTick - boost.startedAtTick) * tickMs,
  }));
}

export function formatBoostDuration(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function describeBoost(stats: StatBlock): string {
  return STAT_IDS.filter((id) => (stats[id] ?? 0) > 0)
    .map((id) => `+${stats[id]} ${STAT_INFO[id].name}`)
    .join(', ');
}

export const STAT_SHORT_NAMES: Readonly<Record<StatId, string>> = {
  armor: 'ARM',
  deflection: 'DEF',
  hazardShielding: 'HAZ',
  cognitiveWard: 'WRD',
  power: 'PWR',
  accuracy: 'ACC',
  focus: 'FOC',
  insight: 'INS',
};

export function boostGroups(stats: StatBlock): { readonly value: number; readonly stats: readonly StatId[] }[] {
  const groups: { value: number; stats: StatId[] }[] = [];
  for (const id of STAT_IDS) {
    const value = stats[id] ?? 0;
    if (value <= 0) continue;
    const group = groups.find((candidate) => candidate.value === value);
    if (group) group.stats.push(id);
    else groups.push({ value, stats: [id] });
  }
  return groups.sort((a, b) => b.value - a.value);
}
