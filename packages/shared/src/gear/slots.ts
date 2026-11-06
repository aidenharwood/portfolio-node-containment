import type { ItemIconShape } from './items.ts';

export const EQUIPMENT_SLOTS = [
  'head',
  'eyes',
  'torso',
  'hands',
  'legs',
  'feet',
  'primary',
  'secondary',
  'implant',
  'utility',
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const EQUIPMENT_SHAPES = {
  head: ['helmet'],
  eyes: ['visor', 'respirator'],
  torso: ['jumpsuit', 'vest', 'coat', 'plate'],
  hands: ['gloves'],
  legs: ['trousers'],
  feet: ['boots'],
  primary: ['baton', 'maul', 'pistol', 'carbine'],
  secondary: ['datapad', 'scanner'],
  implant: ['implant'],
  utility: ['badge'],
} as const satisfies Readonly<Record<EquipmentSlot, readonly ItemIconShape[]>>;

export type GearShape<S extends EquipmentSlot = EquipmentSlot> = (typeof EQUIPMENT_SHAPES)[S][number];

export const isShapeForSlot = (slot: EquipmentSlot, shape: ItemIconShape): boolean =>
  (EQUIPMENT_SHAPES[slot] as readonly ItemIconShape[]).includes(shape);

export const EQUIPMENT_SLOT_LABELS: Readonly<Record<EquipmentSlot, string>> = {
  head: 'Head',
  eyes: 'Eyes',
  torso: 'Torso',
  hands: 'Hands',
  legs: 'Legs',
  feet: 'Feet',
  primary: 'Primary',
  secondary: 'Secondary',
  implant: 'Implant',
  utility: 'Utility',
};

export const isEquipmentSlot = (value: string): value is EquipmentSlot =>
  (EQUIPMENT_SLOTS as readonly string[]).includes(value);
