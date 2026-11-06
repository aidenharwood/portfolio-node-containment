export const TIER_LEVEL_FLOORS = [1, 5, 8, 12] as const;

export function tierForLevel(level: number): number {
  let tier = 1;
  TIER_LEVEL_FLOORS.forEach((floor, index) => {
    if (level >= floor) tier = index + 1;
  });
  return tier;
}
