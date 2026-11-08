import type { SkillId } from '../character/skills.ts';
import type { WeaponProfile } from '../combat/weapons.ts';
import type { EquipmentSlot } from '../gear/slots.ts';
import type { GearVisual, ItemDefinition, ItemIconShape, ItemRarity } from '../gear/items.ts';
import type { StatBlock } from '../gear/stats.ts';

export interface GearSpec {
  readonly id: string;
  readonly name: string;
  readonly examine: string;
  readonly rarity: ItemRarity;
  readonly icon: ItemIconShape;
  readonly slot: EquipmentSlot;
  readonly stats: StatBlock;
  readonly requires: Readonly<Partial<Record<SkillId, number>>>;
  readonly visual: GearVisual;
  readonly value: number;
  readonly weapon?: WeaponProfile;
  readonly unique?: boolean;
}

export const gear = (spec: GearSpec): ItemDefinition => ({
  id: spec.id,
  name: spec.name,
  examine: spec.examine,
  category: 'equipment',
  rarity: spec.rarity,
  icon: spec.icon,
  iconColors: [spec.visual.primary, spec.visual.emissive ?? spec.visual.secondary],
  maxStack: 1,
  value: spec.value,
  ...(spec.unique ? { unique: true } : {}),
  equipment: {
    slot: spec.slot,
    stats: spec.stats,
    requirements: { skills: spec.requires },
    visual: spec.visual,
    ...(spec.weapon ? { weapon: spec.weapon } : {}),
  },
});
