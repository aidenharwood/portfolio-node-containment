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
  | 'visor'
  | 'jumpsuit'
  | 'vest'
  | 'coat'
  | 'gloves'
  | 'trousers'
  | 'boots'
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
  | 'plate'
  | 'respirator'
  | 'fibre'
  | 'moss'
  | 'gel'
  | 'coil'
  | 'ingot'
  | 'sheet'
  | 'cell'
  | 'credits';

export interface GearVisual {
  readonly primary: string;
  readonly secondary: string;
  readonly emissive?: string;
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

export interface ConsumableProperties {
  readonly verb: string;
  readonly heal: number;
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
  readonly equipment?: EquipmentProperties;
  readonly consumable?: ConsumableProperties;
}

export type ItemCatalog = ReadonlyMap<ItemId, ItemDefinition>;

export const isStackable = (item: ItemDefinition): boolean => item.maxStack > 1;
