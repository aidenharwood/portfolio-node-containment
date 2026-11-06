export const PRONOUN_SET_IDS = ['they', 'she', 'he'] as const;

export type PronounSetId = (typeof PRONOUN_SET_IDS)[number];

export interface PronounSet {
  readonly label: string;
  readonly subject: string;
  readonly object: string;
  readonly possessive: string;
}

export const PRONOUN_SETS: Readonly<Record<PronounSetId, PronounSet>> = {
  they: { label: 'They / Them', subject: 'they', object: 'them', possessive: 'their' },
  she: { label: 'She / Her', subject: 'she', object: 'her', possessive: 'her' },
  he: { label: 'He / Him', subject: 'he', object: 'him', possessive: 'his' },
};
