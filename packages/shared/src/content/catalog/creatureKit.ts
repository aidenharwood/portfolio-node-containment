import type { CreatureDefinition } from '../../combat/creatures.ts';
import type { GearMotif } from '../../gear/items.ts';

export interface Beast {
  readonly id: string;
  readonly name: string;
  readonly examine: string;
  readonly model: CreatureDefinition['model'];
  readonly level: number;
  readonly style?: CreatureDefinition['attack']['style'];
  readonly aggressive?: boolean;
  readonly wander?: number;
  readonly loot: CreatureDefinition['loot'];
  readonly containment?: CreatureDefinition['containment'];
  readonly designation?: string;
  readonly integrity?: number;
  readonly accuracy?: number;
  readonly defence?: number;
  readonly range?: number;
  readonly projectile?: CreatureDefinition['attack']['projectile'];
  readonly guard?: GearMotif;
}

const KILL_BONUS_LEVEL_CAP = 16;

const VETERAN_LEVEL = 14;

const VETERAN_LEVEL_CAP = 44;

const THREAT_LEVEL = 28;

const THREAT_ACCURACY_PER_LEVEL: Readonly<Record<CreatureDefinition['attack']['style'], number>> = { melee: 5, ranged: 2.5, psionic: 1.5 };

const THREAT_DEFENCE_PER_LEVEL = 2;

const THREAT_INTEGRITY_PER_LEVEL = 2;

const THREAT_EXPERIENCE_PER_LEVEL = 0.035;

const threatLevels = (level: number): number => Math.max(0, level - THREAT_LEVEL);

export const standardIntegrity = (level: number): number => level * 3 + 4 + THREAT_INTEGRITY_PER_LEVEL * threatLevels(level);

export const killExperience = (level: number, integrity = standardIntegrity(level)): number =>
  Math.round(
    (level * 6 + 2 * Math.min(level, KILL_BONUS_LEVEL_CAP) ** 2 + 8 * Math.max(0, Math.min(level, VETERAN_LEVEL_CAP) - VETERAN_LEVEL) ** 2) *
      (1 + THREAT_EXPERIENCE_PER_LEVEL * threatLevels(level)) *
      (integrity / standardIntegrity(level)),
  );

export const beast = (spec: Beast, style = spec.style ?? 'melee', threat = threatLevels(spec.level), integrity = spec.integrity ?? standardIntegrity(spec.level)): CreatureDefinition => ({
  id: spec.id,
  name: spec.name,
  ...(spec.designation ? { designation: spec.designation } : {}),
  examine: spec.examine,
  model: spec.model,
  level: spec.level,
  integrity,
  defence: spec.defence ?? Math.round(spec.level * 0.6) + THREAT_DEFENCE_PER_LEVEL * threat,
  attack: { style, accuracy: spec.accuracy ?? Math.round(spec.level * 0.6) + 1 + Math.round(THREAT_ACCURACY_PER_LEVEL[style] * threat), maxHit: 1 + Math.floor(spec.level / 4), range: spec.range ?? 1, speedTicks: 4, ...(spec.projectile ? { projectile: spec.projectile } : {}) },
  ...(spec.guard ? { guard: spec.guard } : {}),
  ...(spec.aggressive ? { aggressive: true } : {}),
  aggroRadius: spec.aggressive ? 3 : 0,
  leashRadius: 7,
  wanderRadius: spec.wander ?? 3,
  respawnTicks: 30 + spec.level * 3,
  experience: killExperience(spec.level, integrity),
  loot: spec.loot,
  ...(spec.containment ? { containment: spec.containment } : {}),
});
