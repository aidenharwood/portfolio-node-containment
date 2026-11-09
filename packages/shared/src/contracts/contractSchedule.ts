import type { ContractCadence, ContractDefinition } from './contract.ts';

export const DAY_MS = 86_400_000;

const DAYS_PER_WEEK = 7;
const EPOCH_DAYS_BEFORE_MONDAY = 3;

export function contractPeriod(cadence: ContractCadence, now: number): number {
  const day = Math.floor(now / DAY_MS);
  return cadence === 'daily' ? day : Math.floor((day + EPOCH_DAYS_BEFORE_MONDAY) / DAYS_PER_WEEK);
}

export function contractPeriodEndsAt(cadence: ContractCadence, period: number): number {
  return cadence === 'daily' ? (period + 1) * DAY_MS : ((period + 1) * DAYS_PER_WEEK - EPOCH_DAYS_BEFORE_MONDAY) * DAY_MS;
}

export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffled<T>(entries: readonly T[], random: () => number): T[] {
  const copy = [...entries];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

export const PREFERRED_TIER_SPREAD = 2;

export function rollContracts(
  eligible: readonly ContractDefinition[],
  count: number,
  seed: number,
): ContractDefinition[] {
  if (eligible.length === 0) return [];
  const random = seededRandom(seed);
  const topTier = Math.max(...eligible.map((contract) => contract.tier));
  const preferred = eligible.filter((contract) => contract.tier >= topTier - PREFERRED_TIER_SPREAD);
  const fallback = eligible.filter((contract) => contract.tier < topTier - PREFERRED_TIER_SPREAD).sort((a, b) => b.tier - a.tier);
  return [...shuffled(preferred, random), ...fallback].slice(0, count);
}
