import type { ConsumableBoost } from '../character/boosts.ts';
import type { SkillId } from '../character/skills.ts';
import type { WeaponProfile } from '../combat/weapons.ts';
import type { ItemId } from '../ids.ts';
import type { EquipmentSlot } from './slots.ts';
import type { StatBlock } from './stats.ts';

export const ITEM_RARITIES = ['standard', 'issued', 'restricted', 'classified', 'anomalous'] as const;

export type ItemRarity = (typeof ITEM_RARITIES)[number];

export type ItemCategory = 'equipment' | 'consumable' | 'material' | 'quest' | 'currency';

export type ItemIconShape =
  | 'helmet'
  | 'hood'
  | 'cowl'
  | 'visor'
  | 'jumpsuit'
  | 'vest'
  | 'coat'
  | 'gloves'
  | 'trousers'
  | 'boots'
  | 'pack'
  | 'cape'
  | 'shield'
  | 'baton'
  | 'pistol'
  | 'datapad'
  | 'scanner'
  | 'implant'
  | 'badge'
  | 'keycard'
  | 'vial'
  | 'scrap'
  | 'chip'
  | 'chitin'
  | 'shard'
  | 'maul'
  | 'carbine'
  | 'knife'
  | 'blade'
  | 'polearm'
  | 'rifle'
  | 'scattergun'
  | 'focus'
  | 'resonator'
  | 'plate'
  | 'respirator'
  | 'fibre'
  | 'moss'
  | 'gel'
  | 'coil'
  | 'ingot'
  | 'sheet'
  | 'cell'
  | 'seal'
  | 'credits'
  | 'loaf'
  | 'pie'
  | 'dish'
  | 'bowl'
  | 'eel'
  | 'cat'
  | 'panel'
  | 'lantern'
  | 'key'
  | 'collar'
  | 'leaf'
  | 'flower'
  | 'rotor'
  | 'tin';

export const GEAR_MOTIFS = ['bulwark', 'skirmisher', 'warden'] as const;

export type GearMotif = (typeof GEAR_MOTIFS)[number];

export const GEAR_MOTIF_INFO: Readonly<Record<GearMotif, { name: string; summary: string }>> = {
  bulwark: { name: 'Bulwark', summary: 'Heavy plate built to stand in the way.' },
  skirmisher: { name: 'Skirmisher', summary: 'Light harness cut for marksmen who keep moving.' },
  warden: { name: 'Adept', summary: 'Warded vestments for operatives who face the mind-bending.' },
};

export const GEAR_FORMS = ['scrap', 'iron', 'steel', 'alloy', 'sinter', 'vaultGlass'] as const;

export type GearForm = (typeof GEAR_FORMS)[number];

export interface GearVisual {
  readonly primary: string;
  readonly secondary: string;
  readonly emissive?: string;
  readonly motif?: GearMotif;
  readonly form?: GearForm;
}

export interface EquipRequirements {
  readonly skills?: Readonly<Partial<Record<SkillId, number>>>;
}

export interface EquipmentProperties {
  readonly slot: EquipmentSlot;
  readonly stats: StatBlock;
  readonly requirements?: EquipRequirements;
  readonly visual: GearVisual;
  readonly weapon?: WeaponProfile;
}

export type ConsumableKind = 'food' | 'medicine' | 'kit';

export interface ConsumableProperties {
  readonly kind: ConsumableKind;
  readonly verb: string;
  readonly heal: number;
  readonly boost?: ConsumableBoost;
}

export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly examine: string;
  readonly category: ItemCategory;
  readonly rarity: ItemRarity;
  readonly icon: ItemIconShape;
  readonly iconColors: readonly [primary: string, secondary: string];
  readonly maxStack: number;
  readonly value: number;
  readonly unique?: boolean;
  readonly mastery?: SkillId;
  readonly equipment?: EquipmentProperties;
  readonly consumable?: ConsumableProperties;
}

export type ItemCatalog = ReadonlyMap<ItemId, ItemDefinition>;

export const isStackable = (item: ItemDefinition): boolean => item.maxStack > 1;

export const wornVisualOf = (item: ItemDefinition): { readonly slot: EquipmentSlot; readonly visual: GearVisual } | null =>
  item.equipment ?? null;

export function gearLineOf(item: ItemDefinition): GearMotif | null {
  const equipment = item.equipment;
  if (!equipment || equipment.weapon) return null;
  if (equipment.visual.motif) return equipment.visual.motif;
  const skills = equipment.requirements?.skills;
  if (skills?.psionics) return 'warden';
  return skills?.fortitude ? 'bulwark' : null;
}
