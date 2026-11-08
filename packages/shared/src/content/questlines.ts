import type { QuestlineDefinition } from '../quests/questline.ts';

export const QUESTLINES: readonly QuestlineDefinition[] = [
  {
    id: 'induction',
    name: 'Induction',
    kind: 'main',
    summary: 'Intake processing for new Meridian staff, from first boots to the shuttle out of the Intake Wing.',
    questIds: ['orientation-protocol', 'field-fabrication', 'live-fire', 'cleared-for-transit'],
  },
  {
    id: 'act-one',
    name: 'Act I · The Knocking',
    kind: 'main',
    summary: 'Something behind the quarantine bulkhead has been knocking since Sector 2 was sealed.',
    questIds: ['the-knocking', 'the-far-side'],
  },
  {
    id: 'act-two',
    name: 'Act II · The Original Contract',
    kind: 'main',
    summary: 'The Council sends you into the Deep, where Meridian has been talking to the far side for forty years.',
    questIds: ['a-council-of-one', 'cold-storage', 'dead-air', 'original-contract', 'stoking-the-fire', 'the-answer'],
  },
  {
    id: 'meridian-proper',
    name: 'Meridian Proper',
    kind: 'side',
    summary: 'Odd jobs for the people keeping the upper Site running.',
    questIds: ['scrap-run', 'static-in-the-vents', 'leech-season', 'overgrowth', 'familiar-faces', 'requisition-order'],
  },
  {
    id: 'waterworks',
    name: 'The Waterworks',
    kind: 'side',
    summary: "Pumpwright Ngata keeps the Site's water moving, and something in the outfall would rather it didn't.",
    questIds: ['pressure-drop', 'bad-water', 'the-outfall'],
  },
  {
    id: 'duvals-workshop',
    name: "Duval's Workshop",
    kind: 'side',
    summary: 'Artificer Duval has patterns to prove and is happy for you to prove them.',
    questIds: ['rimeguard', 'servo-salvage', 'forge-master'],
  },
  {
    id: 'achterbergs-shift',
    name: "Achterberg's Shift",
    kind: 'side',
    summary: 'The Signal Array crew never stopped working. Officer Achterberg would like them to.',
    questIds: ['crossed-wires', 'callback'],
  },
  {
    id: 'deepwatch-requests',
    name: 'Deepwatch Requests',
    kind: 'side',
    summary: 'The forward base is short of everything, and its people keep asking.',
    questIds: ['thaw-cycle', 'fenns-inventory', 'wet-ink', 'deep-stock', 'heat-death'],
  },
  {
    id: 'kesslers-notes',
    name: "Kessler's Notes",
    kind: 'side',
    summary: 'Forty years of observations from the far side, and the man who wrote them.',
    questIds: ['what-kessler-saw'],
  },
];
