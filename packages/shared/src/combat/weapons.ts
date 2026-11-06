export type CombatStyle = 'melee' | 'ranged';

export interface WeaponProfile {
  readonly style: CombatStyle;
  readonly range: number;
  readonly speedTicks: number;
}

export const UNARMED: WeaponProfile = { style: 'melee', range: 1, speedTicks: 4 };
