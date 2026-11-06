export const PHYSIQUES = ['male', 'female'] as const;
export const BODY_TYPES = ['slight', 'average', 'broad'] as const;
export const HAIR_STYLES = ['shaved', 'buzz', 'crop', 'undercut', 'swept', 'long', 'braids', 'bun', 'mohawk'] as const;
export const FACE_MARKS = ['none', 'scarBrow', 'scarCheek', 'freckles', 'barcodeTattoo', 'burnMark'] as const;
export const AUGMENTS = ['none', 'ocularImplant', 'jawPlate', 'neuralPort', 'circuitTrace', 'respirator'] as const;

export const SKIN_TONES = [
  '#f6d7c3',
  '#eac0a0',
  '#d9a37f',
  '#c48a62',
  '#a86f4c',
  '#8a5537',
  '#6b3f28',
  '#4a2b1c',
  '#b7c7cf',
] as const;

export const HAIR_COLORS = [
  '#151214',
  '#3b2618',
  '#6b4423',
  '#a5763d',
  '#d8b46a',
  '#e8e2d4',
  '#8f2f2a',
  '#4f6f9e',
  '#5fd1b8',
  '#b25bd6',
] as const;

export const EYE_COLORS = ['#3b2a1a', '#6a4b2b', '#4f7a3a', '#3d6e9c', '#7c8a92', '#c2a03c', '#d43c3c', '#57e3ff'] as const;

export type Physique = (typeof PHYSIQUES)[number];
export type BodyType = (typeof BODY_TYPES)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];
export type FaceMark = (typeof FACE_MARKS)[number];
export type Augment = (typeof AUGMENTS)[number];

export interface CharacterAppearance {
  readonly physique: Physique;
  readonly bodyType: BodyType;
  readonly height: number;
  readonly skinTone: string;
  readonly hairStyle: HairStyle;
  readonly hairColor: string;
  readonly eyeColor: string;
  readonly faceMark: FaceMark;
  readonly augment: Augment;
}

export const normalizeAppearance = (stored: Omit<CharacterAppearance, 'physique'> & Partial<Pick<CharacterAppearance, 'physique'>>): CharacterAppearance => ({
  ...stored,
  physique: stored.physique ?? 'male',
});

export const HEIGHT_RANGE = { minimum: 0.9, maximum: 1.1 } as const;

export const APPEARANCE_LABELS: Readonly<Record<string, string>> = {
  male: 'Male',
  female: 'Female',
  slight: 'Slight',
  average: 'Average',
  broad: 'Broad',
  shaved: 'Shaved',
  buzz: 'Buzz Cut',
  crop: 'Cropped',
  undercut: 'Undercut',
  swept: 'Swept Back',
  long: 'Long',
  braids: 'Braids',
  bun: 'Regulation Bun',
  mohawk: 'Ridge',
  none: 'None',
  scarBrow: 'Brow Scar',
  scarCheek: 'Cheek Scar',
  freckles: 'Freckles',
  barcodeTattoo: 'Intake Barcode',
  burnMark: 'Exposure Burn',
  ocularImplant: 'Ocular Implant',
  jawPlate: 'Jaw Plate',
  neuralPort: 'Neural Port',
  circuitTrace: 'Circuit Trace',
  respirator: 'Respirator Graft',
};

export const labelFor = (optionId: string): string => APPEARANCE_LABELS[optionId] ?? optionId;

const includes = <T extends string>(options: readonly T[], value: string): value is T =>
  (options as readonly string[]).includes(value);

export function appearanceErrors(appearance: CharacterAppearance): string[] {
  const errors: string[] = [];
  if (!includes(PHYSIQUES, appearance.physique)) errors.push('Unknown physique.');
  if (!includes(BODY_TYPES, appearance.bodyType)) errors.push('Unknown body type.');
  if (!includes(HAIR_STYLES, appearance.hairStyle)) errors.push('Unknown hair style.');
  if (!includes(FACE_MARKS, appearance.faceMark)) errors.push('Unknown face marking.');
  if (!includes(AUGMENTS, appearance.augment)) errors.push('Unknown augment.');
  if (!includes(SKIN_TONES, appearance.skinTone)) errors.push('Unknown skin tone.');
  if (!includes(HAIR_COLORS, appearance.hairColor)) errors.push('Unknown hair color.');
  if (!includes(EYE_COLORS, appearance.eyeColor)) errors.push('Unknown eye color.');
  if (!(appearance.height >= HEIGHT_RANGE.minimum && appearance.height <= HEIGHT_RANGE.maximum)) {
    errors.push('Height is outside the permitted range.');
  }
  return errors;
}

const pick = <T>(options: readonly T[], random: () => number): T =>
  options[Math.floor(random() * options.length)] as T;

export function randomAppearance(random: () => number = Math.random): CharacterAppearance {
  return {
    physique: pick(PHYSIQUES, random),
    bodyType: pick(BODY_TYPES, random),
    height: Math.round((HEIGHT_RANGE.minimum + random() * (HEIGHT_RANGE.maximum - HEIGHT_RANGE.minimum)) * 100) / 100,
    skinTone: pick(SKIN_TONES, random),
    hairStyle: pick(HAIR_STYLES, random),
    hairColor: pick(HAIR_COLORS, random),
    eyeColor: pick(EYE_COLORS, random),
    faceMark: random() < 0.5 ? 'none' : pick(FACE_MARKS, random),
    augment: random() < 0.5 ? 'none' : pick(AUGMENTS, random),
  };
}
