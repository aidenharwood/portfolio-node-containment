import type { ItemIconShape } from './items.ts';

export const EQUIPMENT_SLOTS = [
  'head',
  'eyes',
  'torso',
  'hands',
  'legs',
  'feet',
  'back',
  'primary',
  'secondary',
  'implant',
  'utility',
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const EQUIPMENT_SHAPES = {
  head: ['helmet', 'hood', 'cowl'],
  eyes: ['visor', 'respirator'],
  torso: ['jumpsuit', 'vest', 'coat', 'plate'],
  hands: ['gloves'],
  legs: ['trousers'],
  feet: ['boots'],
  back: ['pack', 'cape'],
  primary: ['knife', 'baton', 'blade', 'maul', 'polearm', 'pistol', 'carbine', 'rifle', 'scattergun', 'focus', 'resonator'],
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
  back: 'Back',
  primary: 'Primary',
  secondary: 'Secondary',
  implant: 'Implant',
  utility: 'Utility',
};

export const isEquipmentSlot = (value: string): value is EquipmentSlot =>
  (EQUIPMENT_SLOTS as readonly string[]).includes(value);
