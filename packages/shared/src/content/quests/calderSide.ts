import type { QuestDefinition } from '../../quests/questDefinition.ts';

export const SHORT_RATIONS: QuestDefinition = {
  id: 'short-rations',
  name: 'Short Rations',
  category: 'side',
  offeredBy: 'quartermaster-sorrel',
  offerRequires: ['postmarked'],
  recommendedLevel: 42,
  summary: 'Calder has been eating the same forty-year-old stores, and Sorrel would like to cook something that was alive this decade.',
  steps: [
    {
      id: 'gather',
      journal: 'Sorrel needs rock salt from the seams in the Brine Galleries, and carapace from the brine crawlers. Salt keeps; crab, it turns out, is dinner.',
      objectives: [
        { type: 'obtainItem', itemId: 'rock-salt', count: 6, label: 'Mine Calder rock salt' },
        { type: 'obtainItem', itemId: 'crawler-carapace', count: 4, label: 'Collect crawler carapace' },
      ],
    },
    {
      id: 'deliver',
      journal: 'I have the salt and the shell. Sorrel is behind the commissary counter.',
      objectives: [{ type: 'signal', signal: 'calder.rations-delivered', npcId: 'quartermaster-sorrel', label: 'Bring Sorrel the stores' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 1500 },
    { type: 'giveItem', itemId: 'salt-poultice', count: 4 },
    { type: 'grantExperience', skill: 'salvage', amount: 2500 },
    { type: 'grantExperience', skill: 'refining', amount: 2500 },
  ],
  rewardSummary: ['1,500 Meridian Scrip', '4 Salt Poultices', '2,500 Salvage XP', '2,500 Refining XP'],
};

export const THE_LOWEST_GALLERY: QuestDefinition = {
  id: 'the-lowest-gallery',
  name: 'The Lowest Gallery',
  category: 'side',
  offeredBy: 'warden-brandt',
  offerRequires: ['salt-of-the-earth'],
  recommendedLevel: 46,
  summary: 'The three lost shifts are laid to rest, but the gallery lift keeps ringing. Somebody at the bottom is still running a shift, and Brandt knows exactly who.',
  steps: [
    {
      id: 'descend',
      journal: 'Brandt has unlocked the gallery lift in the gatehouse. It goes down to the lowest gallery.',
      objectives: [{ type: 'enterArea', districtId: 'calder-deeps', areaId: 'lift-landing', label: 'Ride the gallery lift down' }],
    },
    {
      id: 'wights',
      journal: 'The deep shift is still swinging picks in the old workings. Thin them out before the foreman notices.',
      objectives: [{ type: 'defeat', creatureId: 'deep-shift-wight', count: 6, label: 'Defeat deep shift wights' }],
    },
    {
      id: 'foreman',
      journal: "Foreman Ostrava is in his office at the bottom of the gallery, keeping time for a shift that should have ended forty years ago.",
      objectives: [{ type: 'defeat', creatureId: 'the-shift-foreman', count: 1, label: 'Defeat the Shift Foreman' }],
    },
    {
      id: 'report',
      journal: 'The lowest gallery has gone quiet. The lift bell has stopped. Brandt will have heard.',
      objectives: [{ type: 'signal', signal: 'calder.foreman-reported', npcId: 'warden-brandt', label: 'Report to Warden Brandt' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 3500 },
    { type: 'grantExperience', skill: 'fortitude', amount: 4500 },
    { type: 'grantExperience', skill: 'salvage', amount: 2000 },
  ],
  rewardSummary: ['3,500 Meridian Scrip', '4,500 Fortitude XP', '2,000 Salvage XP'],
};

export const CLOCKING_OFF: QuestDefinition = {
  id: 'clocking-off',
  name: 'Clocking Off',
  category: 'side',
  offeredBy: 'warden-brandt',
  offerRequires: ['the-lowest-gallery'],
  recommendedLevel: 48,
  summary: "Ostrava's card was never stamped. Brandt wants the lowest gallery's last shift clocked off properly, on the gallery's own clock.",
  steps: [
    {
      id: 'clock',
      journal: "Brandt gave me Foreman Ostrava's punch card. The shift clock is on the far wall of his office in the Calder Deeps.",
      objectives: [{ type: 'interactWith', objectId: 'deeps-time-clock', label: "Clock off Ostrava's shift" }],
    },
    {
      id: 'report',
      journal: 'The clock has stamped the card at last. Brandt will want to close the log.',
      objectives: [{ type: 'signal', signal: 'calder.shift-clocked-off', npcId: 'warden-brandt', label: 'Tell Brandt the shift is over' }],
    },
  ],
  rewards: [
    { type: 'giveItem', itemId: 'meridian-scrip', count: 2000 },
    { type: 'grantExperience', skill: 'research', amount: 4000 },
    { type: 'grantExperience', skill: 'containment', amount: 2000 },
  ],
  rewardSummary: ['2,000 Meridian Scrip', '4,000 Research XP', '2,000 Containment XP'],
};

export const CALDER_SIDE_QUESTS: readonly QuestDefinition[] = [SHORT_RATIONS, THE_LOWEST_GALLERY, CLOCKING_OFF];
