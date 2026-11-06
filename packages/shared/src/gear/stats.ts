export const STAT_IDS = ['armor', 'hazardShielding', 'cognitiveWard', 'power', 'accuracy', 'insight'] as const;

export type StatId = (typeof STAT_IDS)[number];

export type StatBlock = Readonly<Partial<Record<StatId, number>>>;

export const STAT_INFO: Readonly<Record<StatId, { name: string; summary: string }>> = {
  armor: { name: 'Armor', summary: 'Reduces physical harm from strikes, shrapnel and teeth.' },
  hazardShielding: { name: 'Hazard Shielding', summary: 'Protects against radiation, toxins and thermal exposure.' },
  cognitiveWard: { name: 'Cognitive Ward', summary: 'Shields the mind from memetic and cognitohazardous effects.' },
  power: { name: 'Power', summary: 'Raw force delivered by your equipped armament.' },
  accuracy: { name: 'Accuracy', summary: 'How reliably your strikes and shots land.' },
  insight: { name: 'Insight', summary: 'Bonus to research yields and anomaly analysis.' },
};

export function sumStats(blocks: readonly StatBlock[]): Readonly<Record<StatId, number>> {
  const totals = Object.fromEntries(STAT_IDS.map((id) => [id, 0])) as Record<StatId, number>;
  for (const block of blocks) {
    for (const id of STAT_IDS) totals[id] += block[id] ?? 0;
  }
  return totals;
}
